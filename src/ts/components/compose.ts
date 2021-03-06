import {Component, ElementRef, EventEmitter, Input, Output, ViewChild, ViewEncapsulation} from '@angular/core';
import {AutoComplete} from 'primeng/autocomplete';
import {interval, Observable, Subscription} from 'rxjs';
import {debounceTime, finalize, map, take, takeWhile, tap} from 'rxjs/operators';
import {BaseComponent} from '../base';
import {NgCycle, NgInject} from '../decorators';
import {Account, COMBINED_ACCOUNT_ID, ComposeNotifyType, MessageComposeType, Contact, ContactConvertor, DisplayContact, MessageBody, MessageCompose, MessageComposeConvertor, MessageSaveConvertor, ComposeType, ModelFactory, to, UploadResult, FileResult, SaveMessageResponse} from '../models';
import {Api} from '../services/api';
import {Contacts} from '../services/contacts';
import {FileService} from '../services/file';
import {Mails} from '../services/mails';
import {Settings} from '../services/settings';
import {Utils} from '../services/utils';
import {Editor} from './editor';
import {Nextcloud} from '../nextcloud/nextcloud';
import {Platform} from '@ionic/angular';
import {Store} from '../services/store';

/**
 * * button for editing drafts.
 */

type ACContact = Contact & {
  display: string;
}

@Component({
  selector: 'al-compose',
  templateUrl: '../../html/compose.html',
  styleUrls: ['../../assets/scss/compose.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class Compose extends BaseComponent {
  @Input() public message: MessageBody;
  @Input() public to: Array<Contact>;
  @Input() public composeType: ComposeType;

  @Output() notify: EventEmitter<ComposeNotifyType> = new EventEmitter<ComposeNotifyType>();
  @Output() draftSaved: EventEmitter<SaveMessageResponse> = new EventEmitter<SaveMessageResponse>();

  @NgInject(Contacts) private _contactsService: Contacts;
  @NgInject(Settings) private _settings: Settings;
  @NgInject(Api) private _api: Api;
  @NgInject(Mails) private _mails: Mails;
  @NgInject(FileService) private _fileService: FileService;
  @NgInject(Store) private _store: Store;
  @NgInject(Nextcloud) private _nc: Nextcloud;
  @NgInject(Platform) private _platform: Platform;

  @ViewChild('file', {static: false}) private _file: ElementRef<any>;
  @ViewChild('editor', {static: false}) private _editor: Editor;
  @ViewChild('autocomplete', {static: false}) private _acl: AutoComplete;

  protected _showCc: boolean = false;
  protected _contacts: Array<ACContact> = [];
  private _convertor: ContactConvertor = new ContactConvertor();
  private _account: Account;
  protected _type: MessageComposeType;
  protected _model: MessageCompose;
  protected _combinedView: boolean = false;
  private _saveSubscription: Subscription;
  protected _accounts$: Observable<Array<Account>>;
  protected _attaching: boolean = false;
  protected _saving: boolean = false;
  protected _cloudAttaching: boolean = false;
  protected _incloud: boolean = false;

  @NgCycle('init')
  protected _initMe() {
    this._accounts$ = this._mails.accounts$.pipe(
      tap(accounts => !this._account && setTimeout(async () => {
        const selected = (await this._store.getSelectedEmails()).split(',');
        this._account = accounts.find(a => a.Email == selected[0]) || accounts[0];
      })),
      map(accounts => accounts.filter(a => a.AccountID != COMBINED_ACCOUNT_ID)),
    );
    this.connect(this._mails.currentAccount$.pipe(take(1)), async account => {
      this._account = this.message ? this._mails.accountById(this.message.AccountID) : account;
      if (this._account.AccountID == COMBINED_ACCOUNT_ID) {
        this._combinedView = true;
        this._account = undefined;
      }
      await new Promise(resolve => setTimeout(resolve));
      this._setModel();
      this._start();
      this._waitEditorReady();
      this._type = await this._settings.getMessageType();
    });
    this._incloud = this._nc.isNextcloud;
  }

  @NgCycle('afterViewInit')
  protected async _afterViewInit() {
    if (['new', 'forward'].indexOf(this.composeType) == -1) {
      return ;
    }
    await new Promise(resolve => setTimeout(resolve));
    this._acl.focusInput();
  }

  private _setModel() {
    const conv = new MessageComposeConvertor();
    conv.composeType = this.composeType;
    conv.currentEmail = this._account ? this._account.Email : '';
    this._model = conv.convert(this.message);
    if (this._model.Cc && ['reply', 'forward'].indexOf(this.composeType) != -1) {
      this._model.Bcc = [];
      this._model.Cc = [];
    }
    if (Array.isArray(this.to) && this.to.length > 0) {
      const conv = new ContactConvertor();
      this._model.To = (this.to as Array<DisplayContact>).map(c => conv.convert(c));
    }
  }

  private async _start() {
    if (!this._account) {
      return ;
    }

    this._setModel();
    if (this._model.Cc.length > 0) {
      this._showCc = true;
    }
    if (Utils.isDraftReply(this._model)) {
      const orig = await this._api.getOriginalDraftReply(this._account, this._model);
      this._model.InReplyTo = orig.MessageId;
    }
    await this._api.reloadAttachments(this._account, this._model.Attachments);
    this._contacts = this._contactsService.contacts.map(c => this._convertor.convert(c));
  }

  private _waitEditorReady() {
    interval(100).pipe(
      takeWhile(() => !this._editor),
      finalize(() => {
        if (['reply', 'reply-all'].indexOf(this.composeType) != -1) {
          this._editor.focus();
        }
        this._viewInit();
      }),
    ).toPromise();
  }

  protected _viewInit() {
    this._saveSubscription = this._editor.modelChange.pipe(
      debounceTime(2000),
    ).subscribe(() => this._save());
  }

  @NgCycle('destroy')
  protected _destroy() {
    if (this._saveSubscription) {
      this._saveSubscription.unsubscribe();
    }
  }

  protected _filterContact(ev: {query: string}) {
    this._contacts = this._contactsService.contacts
      .filter(c => c.Email.toLowerCase().indexOf(ev.query.toLowerCase()) != -1)
      .map(c => this._convertor.convert(c));

    this._contacts.push(ModelFactory.instance(<DisplayContact>{Email: ev.query, display: ev.query}, DisplayContact) as DisplayContact);
  }

  protected async _send() {
    if (this._model.To.length == 0) {
      this.alert('No recepient', 'Please add a recipient to receive the e-mail');
      return ;
    }
    if (!this._mails.validate(this._model.To.concat(this._model.Cc).concat(this._model.Bcc))) {
      this.alert('Invalid address', 'Please check your addressed');
      return ;
    }
    this._destroy();
    this.showLoading();
    const conv = new MessageSaveConvertor();
    const model = conv.convert(this._model);
    const [err, result] = await to(this._api.sendMessage(this._account, model));
    this.hideLoading();
    if (err) {
      this._save();
      this.alert('Error sending e-mail', err.message, 'error');
      return ;
    }
    if (!result) {
      this._save();
      this.alert('Error sending e-mail', '', 'error');
      return ;
    }
    this.notify.emit('sent');
  }

  protected async _save() {
    this._saving = true;
    this._destroy();
    const conv = new MessageSaveConvertor();
    const model = conv.convert(this._model);
    const result = await this._api.saveMessage(this._account, model);
    this._model.DraftUid = result.NewUid;
    if (Utils.isDraftReply(this._model)) {
      this.draftSaved.emit(result);
    }
    this._viewInit();
    this._saving = false;
  }

  private async _doAttach(promises: Array<Promise<UploadResult>>) {
    const attachments = await Promise.all(promises);
    this._model.Attachments.push.apply(this._model.Attachments, attachments.map(a => a.Attachment));
  }

  protected async _attach() {
    const files = await this._fileService.get(this._file.nativeElement);
    this._attaching = true;
    const p: Array<Promise<UploadResult>> = [];
    for (let i = 0; i < files.length; i++) {
      p.push(this._api.uploadAttachment(this._account, files[i]));
    }
    await this._doAttach(p);
    this._attaching = false;
  }

  protected async _cloudAttach() {
    const files = await this._nc.pickFile(this._platform.is('android'));
    this._cloudAttaching = true;
    let p = [];
    files.forEach(file => {
      p.push(this._nc.download(file));
    });
    const contents = await Promise.all(p);

    p = [];

    files.forEach((file, idx) => {
      const f = new FileResult();
      const F = window['OriginalFileApi'] ? window['OriginalFileApi'] : File;
      f.content = new F([contents[idx]], file.replace(/^.*\/([^\/]+)$/, '$1'));
      console.log('content is', f);
      p.push(this._api.uploadData(this._account, f));
    });
    await this._doAttach(p);
    this._cloudAttaching = false;
  }

  protected async _blur(a: AutoComplete) {
    if (Array.isArray(a.suggestions) && a.suggestions.length > 0) {
      await new Promise(resolve => setTimeout(resolve));
      if (!a.focus) {
        a.selectItem(a.suggestions[0], false);
      }
    }
    a.suggestions = [];
  }

  protected _focus(a: AutoComplete) {
    a.suggestions = [];
  }
}
