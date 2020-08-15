import {Component, NgZone, ViewChild, ViewEncapsulation} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {MenuItem} from 'primeng/api';
import {Observable} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {BaseComponent} from '../base';
import {MessagesList} from '../components/messages-list';
import {NgCycle, NgInject} from '../decorators';
import {Account, COMBINED_ACCOUNT_ID, ComposeNotifyType, ComposeType, Contact, Folder, Message, MessageBody, MessageNotify, ModelFactory, to} from '../models';
import {Api} from '../services/api';
import {Contacts} from '../services/contacts';
import {Layout} from '../services/layout';
import {Mails} from '../services/mails';
import {Settings} from '../services/settings';
import {Utils} from '../services/utils';
import { Navigation } from '../services/navigation';

type ActionType = 'mark-read' | 'mark-unread' | 'delete' | 'spam' | 'archive';

@Component({
  selector: 'app-home',
  templateUrl: '../../html/home.html',
  styleUrls: ['../../assets/scss/home.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class Home extends BaseComponent {
  @NgInject(Api) private _api: Api;
  @NgInject(Layout) private _layout: Layout;
  @NgInject(Mails) private _mails: Mails;
  @NgInject(Settings) private _settings: Settings;
  @NgInject(Contacts) private _contacts: Contacts;
  @NgInject(NgZone) private _zone: NgZone;
  @NgInject(Navigation) private _nav: Navigation;

  @ViewChild('messagesList', {static: false}) private _list: MessagesList;

  protected _isMobile: boolean = true;
  protected _account: Account;
  protected _messages: Array<Message> = [];
  protected _row: Array<string> = [''];
  protected _folder: string = 'inbox';
  protected _selection: Array<Message> = [];
  protected _message: Message = null;
  protected _spamFolder: boolean = false;
  protected _userMenu: Array<MenuItem> = [];
  protected _compose: boolean = false;
  protected _composer: boolean = false;
  protected _composeType: ComposeType = 'new';
  protected _composeTo: Array<Contact>;
  protected _composeMessage: MessageBody;
  protected _toolbarVisible: boolean = false;
  protected _composeTitle: string = '';
  protected _accounts$: Observable<Array<Account>>;
  protected _mobileViewType: 'list' | 'message' | 'compose' | 'settings' = 'list';
  protected _showSettings: boolean = false;
  protected _refreshing: boolean = false;

  constructor(private _route: ActivatedRoute) {
    super();
    this._contacts.add([]);
  }

  @NgCycle('init')
  protected async _initMe() {
    console.log('init main component');
    this.showLoading();
    this._accounts$ = this._mails.accounts$;
    this._isMobile = this._layout.isMobile;
    this.connect(this._mails.currentAccount$, async account => {
      this._account = account;
      this.hideLoading();
    });

    this.connect(this._mails.refreshed$, () => this._refreshing = false);

    this.connect(this._api.sessionExpired$, u => {
      this.alert('Session expired', `User: ${u.email}`);
      this.navigate('settings:empty');
    })

    this.connect(this._mails.folderChanged$, f => this._folderNotify(f));
    const server = await this._settings.getServer();
    this._userMenu = Utils.buildUserMenu(server, this._onMenu.bind(this));
    this.connect(
      this._route.paramMap.pipe(
        filter(map => map.has('action')),
        map(map => map.get('action')),
      ),
      async url => {
        const p = /^(.*):(.*)$/g
        if (!url.match(p)) {
          return ;
        }

        const action = url.replace(p, '$1');
        const param = url.replace(p, '$2');

        if (action == 'mailto') {
          this._newMessage('new', undefined, [ModelFactory.instance({Email: param}, Contact) as Contact]);
        }
        else if (action == 'readmail') {
          if (!this._list) {
            return ;
          }
          const m = this._list.rows.find(m => m.Uid == param);
          if (!m) {
            return ;
          }
          this._zone.run(() => this._messageNotify(m));
        }
        else if (action == 'settings') {
          this._zone.run(async () => {
            if (param == 'empty') {
              this.hideLoading();
              this._showSettings = true;
              this._mobileViewType = 'settings';
              return ;
            }
            this._showSettings = false;
            this._mobileViewType = 'list';
            this._router.navigateByUrl('').then(() => {
              this.softRefresh();
            });
          })
        }
      }
    );

    this.connect(this._nav.backButton$, () => this._toolbarBack());
  }

  protected async _folderNotify(f: Folder) {
    this._folder = f.Id;
    this._message = null;
    this._spamFolder = this._api.isSpamFolder(f);
    this._toolbarVisible = false;
  }

  protected _messageNotify(m: Message) {
    console.log('message notify');
    this._list.unselect();
    this._message = m;
    this._mobileViewType = 'message';
  }

  protected _selectionChanged(messages: Array<Message>) {
    console.log('selection changed with', messages);
    this._selection = messages;
  }

  protected async _actionIcon(which: ActionType) {
    if (this._selection.length == 0 && !this._message) {
      return ;
    }

    this.showLoading();
    await to(this._action(which));
    if (this._message) {
      this._toolbarBack();
    }
    this.hideLoading();
  }

  protected async _action(which: ActionType) {
    let row: Message;
    if (this._message) {
      row = this._list.rows.find(r => r.Uid == this._message.Uid);
    }
    const arr = this._selection.length > 0 ? this._selection : [row || this._message];
    let err: Error = null;
    if (which == 'mark-read' || which == 'mark-unread') {
      [err, ] = await to(this._api.markRead(this._account, this._folder, arr, which == 'mark-read'));
    }

    if (which == 'delete') {
      [err, ] = await to(this._api.moveOrDeleteMessages(this._account, this._folder, arr));
      if (!err) {
        if (arr.indexOf(this._message) != -1) {
          this._message = null;
        }
      }
    }

    if (which == 'spam') {
      [err, ] = await to(this._api.markSpam(this._account, this._folder, arr));
    }

    if (which == 'archive') {
      [err, ] = await to(this._api.archive(this._account, this._folder, arr));
    }

    if (err) {
      this.alert('Error performing the action', err.message);
    }
  }

  protected _refresh() {
    this._refreshing = true;
    this._mails.refresh$.emit();
  }

  protected async _changeAccount(email: string) {
    this._toolbarVisible = false;
    this._account = null;
    this.showLoading();
    await this._mails.setCurrentAccount(email.match(/,/) ? COMBINED_ACCOUNT_ID : email);
    this._message = null;
    this.hideLoading();
  }

  protected async _onMenu(item: MenuItem) {
    if (item.id != 'settings') {
      await this._changeAccount(item.id);
      return ;
    }

    this._showSettings = true;
  }

  protected _newMessage(type: ComposeType, msg?: MessageBody, to?: Array<Contact>) {
    const title = type == 'new' ? 'Compose new message' : (['reply', 'reply-all'].indexOf(type) != -1 ? 'Reply to message' : 'Forward message');
    this._composer = true;
    this._composeType = type;
    this._composeTitle = title;
    this._composeMessage = msg;
    this._mobileViewType = 'compose';
    if (type == 'new') {
      this._composeTo = to;
    }
    setTimeout(() => {
      this.hideLoading();
      this._compose = true;
    });
  }

  protected _hideCompose(ev: ComposeNotifyType) {
    this._compose = false;
    this._composeTo = [];
    this._composeMessage = null;
    this._mobileViewType = 'list';
    setTimeout(() => this._composer = false);
    if (ev == 'sent') {
      this._refresh();
    }
  }

  protected _toolbarBack() {
    this._message = null;
    this._hideCompose('cancel');
    if (['', '/'].indexOf(this._router.url) == -1) {
      this.navigate('');
    }

    if (this._layout.isMobile) {
      this._list.unselect();
    }
  }

  protected _msgBodyNotify(ev: MessageNotify) {
    this._newMessage(ev.type, ev.message as MessageBody, [ev.contact]);
  }

  protected _settingsClick() {
    this._mobileViewType = 'settings';
    this._toolbarVisible = false;
  }
}
