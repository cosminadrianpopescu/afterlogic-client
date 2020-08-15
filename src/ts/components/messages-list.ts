import {Component, EventEmitter, Input, Output, SimpleChanges, ViewChild, ViewEncapsulation, ElementRef} from '@angular/core';
import {LazyLoadEvent} from 'primeng/api/public_api';
import {Table} from 'primeng/table/table';
import {merge, Observable} from 'rxjs';
import {skip, tap, filter} from 'rxjs/operators';
import {BaseComponent} from '../base';
import {NgCycle, NgInject} from '../decorators';
import {Account, COMBINED_ACCOUNT_ID, Folder, FolderType, Message, SearchConvertor, SearchModel, to} from '../models';
import {Api} from '../services/api';
import {Background} from '../services/background';
import {Mails} from '../services/mails';
import {Settings} from '../services/settings';
import {Utils} from '../services/utils';
import {Store} from '../services/store';

const DEFAULT = 'Inbox';

@Component({
  selector: 'al-messages-list',
  templateUrl: '../../html/messages-list.html',
  styleUrls: ['../../assets/scss/messages-list.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class MessagesList extends BaseComponent {
  @Input() public account: Account;
  @Input() public folder: string;
  @Input() public fixSearchForm: boolean = false;

  @Output() public notify: EventEmitter<Message> = new EventEmitter<Message>();
  @Output() public selectionChanged: EventEmitter<Array<Message>> = new EventEmitter<Array<Message>>();

  public get rows(): Array<Message> {
    return this._messages;
  }

  @NgInject(Settings) private _settings: Settings;
  @NgInject(Store) private _store: Store;
  @NgInject(Mails) private _mails: Mails;
  @NgInject(Api) private _api: Api;
  @NgInject(Background) private _background: Background;
  @ViewChild('table', {static: true}) private _table: Table;
  @ViewChild('all', {static: false}) private _all: ElementRef<any>;

  protected _loading: boolean = true;
  protected _pageSize: number = 0;
  protected _totalRecords: number = 0;
  protected _search: SearchModel = new SearchModel();
  protected _selected: Message;
  protected _messages: Array<Message> = [];
  protected _combinedMessages: Array<Message> = [];
  protected _showSearch: boolean = false;
  protected _combinedView: boolean = false;
  protected _style: string = null;
  private _oldestMessage: Message = null;
  private _folder: Folder;
  private _subscriptions: boolean = false;
  protected _account$: Observable<Account>

  constructor() {
    super();
  }

  @NgCycle('init')
  protected async _initMe(folder?: string) {
    this.connect(this._api.ready$.pipe(skip(1)), () => {
      this._subscriptions = false;
      this.softRefresh();
    });
    this._pageSize = await this._settings.getPageSize();
    if (!this.account) {
      return ;
    }
    this._combinedView = this.account.AccountID == COMBINED_ACCOUNT_ID;
    const d = this.account.AccountID == COMBINED_ACCOUNT_ID ? FolderType.Inbox : DEFAULT;
    this._folder = await this._mails.folderById$(this.account, folder || d.toString()).toPromise();
    this._messages = [];
    this._reset();
    this._initSubscriptions();
  }

  @NgCycle('change')
  protected _change(changes: SimpleChanges) {
    if (!this.account) {
      this._messages = [];
      return ;
    }

    if (changes['folder'] && changes['folder'].previousValue && Utils.foldersDiff(changes['folder'].previousValue, changes['folder'].currentValue)) {
      this._initMe(this.folder);
      return ;
    }

    if (changes['account']) {
      this._initMe();
    }
  }

  private _messagesRemoved(messages: Array<Message>) {
    if (!messages || !Array.isArray(messages)) {
      return ;
    }

    const map = messages.map(m => m.Uid);

    this._combinedMessages = this._combinedMessages.filter(m => map.indexOf(m.Uid) == -1);
    this._table.selection = this._table.selection.filter((m: Message) => map.indexOf(m.Uid) == -1);
    this.selectionChanged.emit(this._table.selection);
  }

  private async _initSubscriptions() {
    if (this._subscriptions) {
      return ;
    }
    this._subscriptions = true;
    const f = await this._store.getFolderSearch();
    this._account$ = this._mails.currentAccount$.pipe(
      tap(account => {
        const result = Utils.folderById(account.FoldersOrder, f);
        this._search.folder = result ? result.Id : null;
      }),
      filter(account => !!account),
    );
    const msgChanged = merge(this._api.messagesDeleted$, this._api.messagesMoved$, this._mails.refresh$);
    this.connect(
      msgChanged.pipe(
        tap(messages => this._messagesRemoved(messages as Array<Message>)),
      ),
      () => this._loadMessages(<LazyLoadEvent>{first: this._table.first})
    );
    this._background.configure(this._checkMailsAuto.bind(this));
    this._search.folder = await this._store.getFolderSearch();
    console.log('search is', this._search);
  }

  private _waitNewMails(): boolean {
    return this._oldestMessage && this._folder && this._folder.Type == FolderType.Inbox && Utils.emptySearch(this._search);
  }

  private async _checkMailsAuto() {
    console.log('checking mails automatically', new Date());
    if (!this._waitNewMails()) {
      console.log('not waiting for new messages');
      return ;
    }
    const [err, msgs] = await to(this._api.getMessages(this.account, this._folder.Id, 0, 1));
    if (err) {
      throw err;
    }

    console.log('fetched', msgs.length, new Date());
    if (!this._waitNewMails() || msgs.length == 0) {
      return ;
    }

    if (msgs.filter(m => m.TimeStampInUTC > this._oldestMessage.TimeStampInUTC).length > 0) {
      this._fetchMailsAuto();
    }
  }

  private async _fetchMailsAuto() {
    if (!this._folder) {
      return ;
    }
    console.log('fetching mails automatically', new Date());
    const initialType = this._folder.Type;
    this._messages = await this._fetch(this._table.first, true);
    console.log('messages fetched', this._messages.length);
    const selection = ((this._table.selection || []) as Array<Message>).map(s => s.Uid);
    if (this._folder.Type == FolderType.Inbox && initialType == FolderType.Inbox) {
      this._mails.showNotifications(this._oldestMessage, this._messages);
    }
    this._setOldestMessage();
    this._table.selection = this._messages.filter(m => selection.indexOf(m.Uid) != -1);
    this.selectionChanged.emit(this._table.selection);
  }

  private _setOldestMessage() {
    if (this._table.first != 0 || !this._folder && this._folder.Type != FolderType.Inbox || !Array.isArray(this._messages) || this._messages.length == 0) {
      return ;
    }

    this._oldestMessage = this._messages[0];
  }

  private async _fetch(first: number, auto: boolean = false): Promise<Array<Message>>{
    const [txt, searchFolder] = Utils.searchFolder(this._search.simple);
    const id = searchFolder || this._folder.Id;
    let [err, result] = await to(this._api.getMessages(this.account, id, first, this._pageSize, txt, '', auto));
    if (err) {
      this.alert('There was an error fetching the messages', err.message, 'error');
      return [];
    }
    if (typeof(this._search.folder) != 'undefined' && this._search.folder != null) {
      this._store.setFolderSearch(this._search.folder);
    }
    if (this._folder.Id != id && !searchFolder) {
      return this._messages.length > 0 && this._mails.messageInComposedFolder(this._messages[0], this._folder) ? this._messages : [];
    }
    if (this.account.AccountID != COMBINED_ACCOUNT_ID) {
      return result;
    }

    if (first == 0) {
      this._combinedMessages = [];
    }

    const uids = result.map(x => x.Uid);
    this._combinedMessages = this._combinedMessages.filter(m => uids.indexOf(m.Uid) == -1).concat(result);
    this._combinedMessages.sort((a, b) => b.TimeStampInUTC - a.TimeStampInUTC);
    return this._combinedMessages.slice(first, first + this._pageSize);
  }

  private _reset() {
    this._combinedMessages = [];
    this._table.reset();
    this.selectionChanged.emit([]);
    this._table.selection = [];
  }

  protected async _loadMessages(ev: LazyLoadEvent) {
    this._loading = true;
    if (this.account == null || this._folder == null) {
      return ;
    }
    this._messages = await this._fetch(ev.first);
    this._setOldestMessage();
    this._totalRecords = this._api.lastSearchResults;
    this._loading = false;
    this._mails.refreshed$.emit();
  }

  protected _keyup(ev: KeyboardEvent) {
    if (ev.keyCode != 13) {
      return ;
    }
    this._reset();
  }

  protected _advSearch() {
    this._showSearch = false;
    const conv = new SearchConvertor();
    this._search.simple = conv.convert(this._search);
    this._reset();
  }

  protected async _clearSearch() {
    this._search = new SearchModel();
    this._reset();
    this._search.folder = await this._store.getFolderSearch();
  }

  protected _select(row: Message) {
    this.notify.emit(row);
    this._selected = row;
  }

  protected _selectionChanged() {
    this.selectionChanged.emit(this._table.selection);
  }

  public unselect() {
    this._table.selection = [];
    this._table.clearState();
    this._selected = null;
    this._selectionChanged();
  }

  protected _clickAdvSearch() {
    this._showSearch = true;
    setTimeout(() => this._all.nativeElement.focus(), 151);
  }

  protected _keyup2(ev: KeyboardEvent) {
    if (ev.keyCode != 13) {
      return ;
    }
    this._advSearch();
  }
}
