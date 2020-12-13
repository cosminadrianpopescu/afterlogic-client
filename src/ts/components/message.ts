import {Component, ElementRef, EventEmitter, Input, NgZone, Output, ViewChild, ViewEncapsulation} from '@angular/core';
import {FilesystemDirectory} from '@capacitor/core';
import {MenuItem} from 'primeng/api/public_api';
import {from} from 'rxjs';
import {switchMap, take, tap} from 'rxjs/operators';
import {BaseComponent} from '../base';
import {NgCycle, NgInject} from '../decorators';
import {Account, Attachment, ComposeType, Contact, FolderType, Message as Model, MessageBody, MessageNotify, ModelFactory, ServerSetting} from '../models';
import {Api} from '../services/api';
import {Mails} from '../services/mails';
import {Settings} from '../services/settings';
import {Utils} from '../services/utils';
import {Contacts} from '../services/contacts';
import {MessageFrom} from '../pipes';

@Component({
  selector: 'al-message',
  templateUrl: '../../html/message.html',
  styleUrls: ['../../assets/scss/message.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class Message extends BaseComponent {
  @Input() public set maximized(x: boolean) {
    this._maximized = x;
  }

  @NgInject(Api) private _api: Api;
  @NgInject(Mails) private _mails: Mails;
  @NgInject(Settings) private _settings: Settings;
  @NgInject(NgZone) private _zone: NgZone;
  @NgInject(Contacts) private _contacts: Contacts;
  @ViewChild('messageBody', {static: false}) private _body: ElementRef<any>;
  @Input() public set message(m: Model) {
    this._message = m as MessageBody;
    const c = (new MessageFrom()).transform(this._message);
    if (c) this._contact = this._contacts.contactByEmail(c.Email);
    this._originalMessage = m;
    this._html = '';
    if (!m) {
      return ;
    }
    if (this._body) {
      this._body.nativeElement.innerHTML = '';
    }
    this._loading = true;
    this._detailsHidden = true;
    this._quotedText = false;
    this._hasImages = false;
    // Keep the real account id (in case of combined view)
    this._accountId = m.AccountID;
    this._mails.currentAccount$.pipe(
      take(1),
      tap(account => this._account = account),
      switchMap(() => from(this._api.getMessageBody(this._account, m))),
      take(1),
    ).subscribe(async body => {
      this._message = body;
      this._appendBody();
      if (!m.IsSeen) {
        this._api.markRead(this._account, m.Folder, [m], true);
      }
    });
  }

  public maximize() {
    this._action('open-window');
  }

  @Output() public notify: EventEmitter<MessageNotify> = new EventEmitter<MessageNotify>();
  @Output() public close = new EventEmitter();

  protected _originalMessage: Model;
  protected _maximized: boolean = false;
  protected _quotedText: boolean = false;
  protected _isDraft: boolean = false;
  protected _detailsHidden: boolean = true;
  private _account: Account;
  protected _hasImages: boolean = false;
  protected _html: string;
  protected _server: ServerSetting;
  private _accountId: string;
  protected _maxWidth: string = null;
  private _width: number;
  protected _contact: Contact;

  protected _actions: Array<MenuItem> = [
    {label: 'Reply all', icon: 'fa fa-reply-all', command: () => this._action('reply-all')},
    {label: 'Forward', icon: 'fa fa-share', command: () => this._action('forward')},
    {label: 'Download', icon: 'fa fa-download', command: () => this._download()},
  ];

  private async _setMaxWidth() {
    await new Promise(resolve => setTimeout(resolve));
    const el = document.querySelector('#pinch');
    if (!el) {
      return ;
    }
    this._width = el.clientWidth;
    this._maxWidth = `max-width: ${this._width}px`;
  }

  private async _transform() {
    await this._setMaxWidth();
    if (!this._body) {
      return ;
    }
    const div: HTMLElement = this._body.nativeElement.querySelector('*');
    if (!div) {
      return ;
    }
    div.setAttribute('style', '');
    setTimeout(() => div.setAttribute('style', Utils.transformMessageBody(this._width, div)));
  }

  @NgCycle('init')
  protected async _initMe() {
    console.log('init message');
    this._server = await this._settings.getServer();
    this.connect(this._mails.folderChanged$, f => this._isDraft = f.Type == FolderType.Drafts);
    window.onresize = () => this._zone.run(this._transform.bind(this));
  }

  private async _appendBody() {
    const el: HTMLElement = this._body.nativeElement;
    let html = this._message.Html || this._message.Plain;
    if (this._contact && this._contact.IsTrusted) {
      html = html.replace(/data-x-src/g, 'src');
    }
    this._html = html;
    setTimeout(() => {
      this._quotedText = el.querySelector('blockquote') != null;
      this._hasImages = el.querySelectorAll("*[data-x-src]").length > 0;
      this._loading = false;

      Array.from(el.querySelectorAll('a'))
        .filter(el => el.href.match("^mailto:"))
        .forEach(a => {
          const email = a.href.replace(/^mailto:(.*)$/g, '$1');
          a.href = "javascript: ";
          a.target = '_self';
          a.onclick = () => this._emailClick(ModelFactory.instance({Email: email}, Contact) as Contact);
        });

      this._transform();

      const att = this._message.Attachments;

      if (!att || !Array.isArray(att.Collection)) {
        return ;
      }

      const a = this._mails.accountById(this._accountId);
      const user = Utils.userByEmail(this._server.users, a.Email);
      att.Collection
        .filter(a => a.CID)
        .map(a => <{a: Attachment, img: HTMLImageElement}>{a: a, img: el.querySelector(`*[data-x-src-cid="${a.CID}"]`)})
        .filter(obj => !!obj.a && !!obj.img)
        .forEach(obj => {
          obj.img.src = `${this._server.url}/${obj.a.Actions.view}`;
          obj.img.onerror = () => {
            fetch(
              `${this._server.url}/${obj.a.Actions.view}`,
              {headers: {Authorization: `Bearer ${user.token}`}}
            )
              .then(img => img.blob())
              .then(d => obj.img.src = window.URL.createObjectURL(d));
          }
        });

      this.hideLoading();
    });
  }

  protected _message: MessageBody;
  protected _loading: boolean = true;

  protected _showHiddenContent() {
    this._quotedText = false;
  }

  protected _emailClick(c: Contact) {
    const ev = ModelFactory.instance(<MessageNotify>{contact: c, type: 'new'}, MessageNotify) as MessageNotify;
    this.notify.emit(ev);
  }

  protected _action(type: ComposeType | 'download' | 'open-window') {
    if (type == 'download') {
      this._download();
      return ;
    }

    if (type == 'open-window') {
      this._maximized = true;
      return ;
    }

    const ev = ModelFactory.instance(<MessageNotify>{message: this._message, type: type}, MessageNotify) as MessageNotify;
    this.notify.emit(ev);
  }

  protected async _download() {
    if (!this._message) {
      return ;
    }
    const result = await this._api.downloadUrl(
      this._account, `${this._server.url}/${this._message.DownloadAsEmlUrl}`,
      `${this._message.Uid}.eml`, FilesystemDirectory.Documents, this._message
    );
    if (result == null) {
      return ;
    }

    this.alert('Message downloaded', result.uri);
  }

  protected async _star() {
    if (!this._message || !this._account) {
      return ;
    }

    this._message.IsFlagged = !this._message.IsFlagged;
    await this._api.flag(this._account, this._message.Folder, [this._message], this._message.IsFlagged);
    this._originalMessage.IsFlagged = this._message.IsFlagged;
  }

  protected _showImages(always: boolean) {
    this._html = this._html.replace(/data-x-src/g, 'src');
    // (this._body.nativeElement as HTMLElement).querySelectorAll("*[data-x-src]").forEach(n => n.setAttribute('src', n.getAttribute('data-x-src')))
    this._transform();
    this._hasImages = false;
    if (always) this._contacts.setTrusted(this._contact, true);
  }

  protected _close() {
    this.close.emit();
  }

  protected _untrust() {
    if (!this._contact) {
      return ;
    }
    this._contacts.setTrusted(this._contact, false);
  }
}
