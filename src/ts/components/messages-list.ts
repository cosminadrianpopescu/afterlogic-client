import {Component, EventEmitter, Input, NgZone, Output, SimpleChanges, ViewChild, ViewEncapsulation} from '@angular/core';
import {Platform} from '@ionic/angular';
import {LazyLoadEvent} from 'primeng/api/public_api';
import {Table} from 'primeng/table/table';
import {interval, merge} from 'rxjs';
import {filter, map, skip, tap} from 'rxjs/operators';
import {BaseComponent} from '../base';
import {NgCycle, NgInject} from '../decorators';
import {Account, COMBINED_ACCOUNT_ID, Folder, FolderType, Message, SearchConvertor, SearchModel, to} from '../models';
import {Api} from '../services/api';
import {Mails} from '../services/mails';
import {Settings} from '../services/settings';
import {Utils} from '../services/utils';

const DEFAULT = 'Inbox';
const MAX_INTERVAL = 60 * 1000 * 15;
const MAX_BACKGROUND_RETRIES = 3;

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
  @NgInject(Mails) private _mails: Mails;
  @NgInject(Api) private _api: Api;
  @NgInject(Platform) private _platform: Platform;
  @NgInject(NgZone) private _zone: NgZone;
  private _backgroundTimer: any;
  @ViewChild('table', {static: true}) private _table: Table;

  protected _loading: boolean = true;
  protected _pageSize: number = 0;
  protected _totalRecords: number = 0;
  protected _search: SearchModel = new SearchModel();
  protected _selected: Message;
  protected _messages: Array<Message> = [];
  protected _combinedMessages: Array<Message> = [];
  protected _combinedView: boolean = false;
  protected _style: string = null;
  private _oldestMessage: Message = null;
  private _folder: Folder;
  private _subscriptions: boolean = false;
  private _checkInterval: number = null;
  private _errors: number = 0;

  constructor() {
    super();
    this._configureBackend();
  }

  private async _configureBackend() {
    this._backgroundTimer = window['BackgroundTimer'];
    console.log('background timer is', this._backgroundTimer);
    if (!this._backgroundTimer) {
      return ;
    }
    this._backgroundTimer.onTimerEvent(this._backgroundRun.bind(this));
  }

  protected _backgroundFails(err: any) {
    console.log('background config failed', err);
  }

  @NgCycle('init')
  protected async _initMe(folder?: string) {
    this.connect(this._api.ready$.pipe(skip(1)), () => {
      this._subscriptions = false;
      this.softRefresh();
    });
    this._checkInterval = await this._settings.getCheckoutEmailInterval();
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
  }

  private _backgroundSuccess() {
    console.log('executed background thing successfully');
  }

  private _backgroundFailure(e: Error) {
    console.log('error with background timer', e);
  }

  private _backgroundRun() {
    return new Promise(resolve => {
      this._zone.run(async () => {
        await this._checkMailsAuto.bind(this)();
        resolve();
      });
    });
  }

  private _stopBackgroundTimer() {
    this._backgroundTimer.stop(this._backgroundSuccess.bind(this), this._backgroundFailure.bind(this));
  }

  private async _startBackgroundTimer() {
    console.log('starting the interval');
    this._backgroundTimer.start(this._backgroundSuccess.bind(this), this._backgroundFailure.bind(this), {
      timerInterval: this._checkInterval,
      startOnBoot: false,
      stopOnTerminate: true,
    });
  }

  private async _initSubscriptions() {
    if (this._subscriptions) {
      return ;
    }
    this._subscriptions = true;
    this.connect(this._api.requestStart$, () => this._loading = true);
    this.connect(this._api.requestEnd$, () => this._loading = false);
    const msgChanged = merge(this._api.messagesDeleted$, this._api.messagesMoved$, this._mails.refresh$);
    this.connect(
      msgChanged.pipe(
        tap(messages => this._messagesRemoved(messages as Array<Message>)),
      ),
      () => this._loadMessages(<LazyLoadEvent>{first: this._table.first})
    );

    if (this._platform.is('desktop')) {
      this._startMailsCheck();
    }
    const obs = merge(this._platform.pause.pipe(map(() => 'pause')), this._platform.resume.pipe(map(() => 'resume')));
    this.connect(obs, ev => {
      if (ev == 'resume') {
        console.log('stopping the interval');
        this._stopBackgroundTimer();
        // this._zone.run(() => this._loadMessages({first: this._table.first}));
      }

      if (ev == 'pause') {
        this._startBackgroundTimer();
      }
    });
  }

  private async _startMailsCheck() {
    interval(this._checkInterval).pipe(
      filter(() => Utils.emptySearch(this._search) && this._folder.Type == FolderType.Inbox),
    ).subscribe(() => this._checkMailsAuto());
  }

  private _waitNewMails(): boolean {
    return this._oldestMessage && this._folder && this._folder.Type == FolderType.Inbox && !this._search.simple;
  }

  private async _checkMailsAuto() {
    console.log('checking mails automatically', new Date());
    if (!this._waitNewMails()) {
      return ;
    }
    const [err, msgs] = await to(this._api.getMessages(this.account, this._folder.Id, 0, 1));
    if (err && ++this._errors >= MAX_BACKGROUND_RETRIES && this._checkInterval < MAX_INTERVAL) {
      console.log('setting the interval to max, due to 3 errors in a row', err);
      this._checkInterval = MAX_INTERVAL;
      this._stopBackgroundTimer();
      this._startBackgroundTimer();
      console.log('set done');
      return ;
    }

    if (err) {
      console.log('no action taken due to error', err);
      return ;
    }
    else if (this._errors >= MAX_BACKGROUND_RETRIES) {
      this._checkInterval = await this._settings.getCheckoutEmailInterval();
      console.log('setting the interval back to', this._checkInterval, 'due to no error now');
      this._stopBackgroundTimer();
      this._startBackgroundTimer();
      console.log('set done');
    }

    this._errors = 0;
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
    const id = this._folder.Id;
    let result = await this._api.getMessages(this.account, this._folder.Id, first, this._pageSize, this._search.simple, '', auto);
    if (this._folder.Id != id) {
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
  }

  protected _keyup(ev: KeyboardEvent) {
    if (ev.keyCode != 13) {
      return ;
    }
    this._reset();
  }

  protected _advSearch() {
    const conv = new SearchConvertor();
    this._search.simple = conv.convert(this._search);
    this._reset();
  }

  protected _clearSearch() {
    this._search = new SearchModel();
    this._reset();
  }

  protected _select(row: Message) {
    this.notify.emit(row);
    this._selected = row;
  }

  protected _selectionChanged() {
    this.selectionChanged.emit(this._table.selection);
  }
}
