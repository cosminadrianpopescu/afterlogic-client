import {EventEmitter, Injectable, Type} from '@angular/core';
import {FilesystemDirectory, FileWriteResult, Plugins} from '@capacitor/core';
import {HTTP} from '@ionic-native/http/ngx';
import {Platform} from '@ionic/angular';
import {ReplaySubject} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';
import {BaseClass} from '../base';
import {NgInject} from '../decorators';
import {Account, Attachment, Authentication, COMBINED_ACCOUNT_ID, FileResult, Folder, FoldersInfoResult, FolderType, HttpResponse, Message, MessageBody, MessageCompose, Messages, MessageSave, ModelFactory, ObjectType, SaveMessageResponse, ServerSetting, to, UploadResult, UserSetting} from '../models';
import {Settings} from './settings';
import {Utils} from './utils';

const {Filesystem} = Plugins;
type PayloadInfoType = {account: Account, folder: string, msgs: Array<Message>};


@Injectable()
export class Api extends BaseClass {
  @NgInject(Settings) private _settings: Settings;
  @NgInject(Platform) private _platform: Platform;
  @NgInject(HTTP) private _http: HTTP;
  public ready$: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
  public lastSearchResults: number = 0;
  public folderUpdated$: EventEmitter<Folder> = new EventEmitter<Folder>();
  public messagesDeleted$: EventEmitter<Array<Message>> = new EventEmitter<Array<Message>>();
  public messagesMoved$: EventEmitter<Array<Message>> = new EventEmitter<Array<Message>>();
  public messagesUpdated$: EventEmitter<Array<Message>> = new EventEmitter<Array<Message>>();
  public sessionExpired$: EventEmitter<UserSetting> = new EventEmitter<UserSetting>();

  private _ready: boolean = false;
  private _server: ServerSetting;
  private _url: string = null;
  private _accounts: Array<Account> = [];

  private async _init() {
    this._server = await this._settings.getServer();
    if (!!this._server) {
      this._url = `${this._server.url}?/Api/`;
      this._ready = true;
      this.ready$.next(true);
      return ;
    }
    this._ready = false;
    this.ready$.next(false);
  }

  constructor() {
    super();
    this._init();
    this._settings.serverSet$.subscribe(() => this._init());
  }

  private _checkReady() {
    if (!this._ready) {
      throw new Error('API_NOT_READY');
    }
  }

  private async _passRequest<T>(token: string, module: string, method: string, parameters: Object, type?: Type<ObjectType<T>>, file?: FileResult): Promise<T> {
    this._checkReady();
    let data: string | FormData | Object;
    const headers = {'Content-Type': 'application/x-www-form-urlencoded'};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (method != 'UploadAttachment') {
      data = this._platform.is('desktop') ? 
        `Module=${module}&Method=${method}&Parameters=${encodeURIComponent(JSON.stringify(parameters))}`
        : {Module: module, Method: method, Parameters: JSON.stringify(parameters)};
    }
    else  {
      data = new FormData();
      (data as FormData).append('Module', module);
      (data as FormData).append('Method', method);
      (data as FormData).append('jua-post-type', 'ajax');
      (data as FormData).append('Parameters', JSON.stringify(parameters));
      (data as FormData).append('jua-uploader', file.content);
      delete headers['Content-Type'];
    }

    let json: ObjectType<Object>;
    if (this._platform.is('desktop') || method == 'UploadAttachment') {
      const result = await fetch(this._url, {
        method: 'POST',
        body: data as (string | FormData),
        headers: headers,
      });
      json = await result.json();
    }
    else {
      console.log('posting request', data, headers);
      const result = await this._http.sendRequest(this._url, {
        method: 'post', data: data as Object, headers: headers, responseType: 'json',
      });
      json = result.data;
    }

    const response = ModelFactory.instance(json, HttpResponse) as HttpResponse;

    if (typeof(response.ErrorCode) != 'undefined' && response.ErrorCode != null) {
      throw Error(`${[102, 108].indexOf(response.ErrorCode) != -1 ? 'AUTH_ERROR' : 'HTTP_ERROR'} ${response.ErrorMessage || response.ErrorCode}`);
    }

    return ModelFactory.instance(response.Result, type) as T;
  }

  private async _login(u: UserSetting): Promise<boolean> {
    const result: Authentication = await this._passRequest(null, 'Core', 'Login', {Login: u.email, Password: u.pass, SignMe: false}, Authentication);
    if (!result || !result.AuthToken) {
      return false;
    }
    u.token = result.AuthToken;

    return true;
  }

  public async login(users: Array<UserSetting>): Promise<boolean> {
    const p: Array<Promise<boolean>> = [];

    users.forEach(u => p.push(this._login(u)));

    const results = await Promise.all(p);

    return results.filter(r => !r).length == 0;
  }

  private _handleUserExpired(u: UserSetting) {
      this.sessionExpired$.emit(u);
      console.log('user expired', u);
      throw Error('USER_EXPIRED');
  }

  private async _request<T>(
    email: string, module: string,
    method: string, parameters: Object,
    type?: Type<ObjectType<T>>, file?: FileResult,
  ): Promise<T | Array<T>> {
    const u = this._userByEmail(email);
    if (!u) {
      throw {
        message: 'Could not find user for request',
        user: email, 
        method: method, 
        parameters: parameters,
        type: type, 
        file: file,
      }
    }
    if (!u.token) {
      this._handleUserExpired(u);
      return null;
    }
    const [err, result] = await to(this._passRequest(u.token, module, method, parameters, type, file));

    if (err) {
      if (err.message.match(/^AUTH_ERROR/)) {
        this._handleUserExpired(u);
        return ;
      }
      throw err;
    }

    return result;
  }

  private _userByEmail(email: string): UserSetting {
    this._checkReady();
    return this._server.users.find(u => u.email == email);
  }

  // Patched
  public async getAccounts(): Promise<Array<Account>> {
    let p = [];

    this._server.users.forEach(u => p.push(this._request(u.email, 'Mail', 'GetAccounts', null, Account)))

    const accounts: Array<Account> = await Promise.all(p);
    const result: Array<Account> = accounts.reduce((acc, v) => acc.concat(v), []);
    this._accounts = result;
    result.forEach(async a => {
      a.Folders$ = new ReplaySubject<Array<Folder>>(1);
      const u = this._userByEmail(a.Email);
      if (!u) {
        a.Folders$.next([]);
        return ;
      }
      const list: Array<Folder> = [];
      Utils.foldersFlatList(a.FoldersOrder, list);
      await this._setFoldersTypes(a, a.FoldersOrder);
      list.forEach(l => l.AccountID = a.AccountID);
      a.Folders$.next(a.FoldersOrder);
    });
    const r = result.reduce((acc, v) => acc.concat(v), []);
    if (accounts.length > 1) {
      const a = new Account();
      a.Email = accounts.reduce((acc, v) => acc.concat(v), []).map(a => a.Email).join(",");
      a.AccountID = COMBINED_ACCOUNT_ID;
      a.FriendlyName = 'Composed view';
      a.FoldersOrder = [
        {AccountID: a.AccountID, SubFolders: [], Type: FolderType.Inbox, Name: 'Inbox', Id: FolderType.Inbox.toString()},
        {AccountID: a.AccountID, SubFolders: [], Type: FolderType.Sent, Name: 'Sent mails', Id: FolderType.Sent.toString()},
        {AccountID: a.AccountID, SubFolders: [], Type: FolderType.Drafts, Name: 'Drafts', Id: FolderType.Drafts.toString()},
        {AccountID: a.AccountID, SubFolders: [], Type: FolderType.Spam, Name: 'Spam', Id: FolderType.Spam.toString()},
        {AccountID: a.AccountID, SubFolders: [], Type: FolderType.Trash, Name: 'Trash', Id: FolderType.Trash.toString()},
      ];
      a.TypesSet = true;
      a.Folders$.next(a.FoldersOrder);
      r.push(a);
    }
    return r;
  }

  // Patched
  public async getFoldersInfo(account: Account, list: Array<Folder>, auto: boolean): Promise<FoldersInfoResult | Array<FoldersInfoResult>>{
    if (account.AccountID != COMBINED_ACCOUNT_ID) {
      return this._request(
        account.Email, 'Mail', 'GetRelevantFoldersInformation',
        {AccountID: account.AccountID, Folders: list.map(x => x.Id)}, FoldersInfoResult,
        undefined,
      ) as Promise<FoldersInfoResult>;
    }

    const p = [];
    account.Email.split(',').forEach(e => {
      const a = this._accounts.find(a => a.Email.toLowerCase() == e.toLowerCase());
      if (!a) {
        return ;
      }

      const list: Array<Folder> = [];
      Utils.foldersFlatList(a.FoldersOrder, list);
      p.push(this.getFoldersInfo(a, list, auto));
    });

    const result = await Promise.all(p);
    return result;
  }

  private async _combinedFoldersResult(account: Account, result: Array<FoldersInfoResult>) {
    account.FoldersOrder.forEach(f => {
      f.Count = 0;
      f.Unread = 0;
      account.Email.split(",").forEach((e, idx) => {
        const a = this._accounts.find(a => a.Email == e);
        if (!a) {
          return ;
        }

        const _f = Utils.folderByType(f.Type, a.FoldersOrder);
        f.Count += result[idx].Counts[_f.Id][0] as number;
        f.Unread += result[idx].Counts[_f.Id][1] as number;
      });

      this.folderUpdated$.emit(f);
    });
  }

  private _processMessages(account: Account, msgs: Messages) {
    msgs.Collection.forEach(m => m.AccountID = account.AccountID);
    return msgs;
  }

  private async _waitFoldersLoaded() {
    const p = [];
    this._accounts.forEach(a => p.push(a.Folders$.pipe(take(1)).toPromise()));
    await Promise.all(p);
  }

  // Patched
  private async _getMessages(
    account: Account, folder: string, offset: number, pageSize: number,
    search: string, filters: string, withThreads: boolean, auto: boolean, lastUid: string,
  ): Promise<Messages> {
    if (account.AccountID != COMBINED_ACCOUNT_ID) {
      const params = {
        AccountID: account.AccountID, Folder: folder, Offset: offset,
        Limit: pageSize, Search: search, Filters: filters, UseThreading: withThreads
      };
      if (lastUid) {
        params['InboxUixnext'] = lastUid;
      }
      return this._request(
        account.Email, 'Mail', 'GetMessages', params, Messages, undefined,
      ).then(msgs => this._processMessages(account, msgs as Messages)) as Promise<Messages>;
    }

    await this._waitFoldersLoaded();
    const _folder = account.FoldersOrder.find(f => f.Id == folder);
    if (!_folder) {
      return ModelFactory.instance({
        Filters: filters, Search: search, Limit: pageSize, Offset: offset, Count: 0, 
        Collection: [], MessageResultCount: 0, Uids: [], MessageCount: 0, MessageUnseenCount: 0,
        FolderName: _folder.Name,
      }, Messages) as Messages;
    }

    const p = [];
    account.Email.split(',').forEach(e => {
      const a = this._accounts.find(a => a.Email == e);
      if (!a) {
        return ;
      }

      const f = Utils.folderByType(_folder.Type, a.FoldersOrder);

      const result = this._getMessages(a, f.Id, offset, pageSize, search, filters, withThreads, auto, lastUid).then(msgs => this._processMessages(a, msgs as Messages));
      p.push(result);
    });

    const result = await Promise.all(p);
    return (result as Array<Messages>)
    .reduce((acc: Messages, v) => {
      if (!acc) {
        return v;
      }
      acc.MessageResultCount += v.MessageResultCount;
      acc.Count += v.Count;
      acc.Collection = acc.Collection.concat(v.Collection);
      return acc;
    }, null);
  }

  public async getMessages(
    account: Account,
    folder: string,
    offset: number, 
    pageSize: number,
    search: string = '',
    filters: string = '',
    auto: boolean = false,
    lastUid: string = null,
  ): Promise<Array<Message>> {
    if (pageSize != 1) account.Folders$.pipe(take(1)).subscribe(async folders => {
      const list: Array<Folder> = [];
      Utils.foldersFlatList(folders, list);
      const result = await this.getFoldersInfo(account, list, auto);
      if (Array.isArray(result)) {
        await this._combinedFoldersResult(account, result);
        return ;
      }
      Object.keys(result.Counts).forEach(k => {
        const f = list.find(l => l.Id == k);
        if (!f) {
          return ;
        }

        f.Count = result.Counts[k][0] as number;
        f.Unread = result.Counts[k][1] as number;
        this.folderUpdated$.emit(f);
      });
    });

    const result = await this._getMessages(account, folder, offset, pageSize, search, filters, false, auto, lastUid);

    this.lastSearchResults = result.MessageResultCount;

    this.messagesUpdated$.emit(result.Collection);
    return result.Collection;
  }

  // Patched
  public async getMessageBody(account: Account, msg: Message): Promise<MessageBody> {
    const id = msg.AccountID ? msg.AccountID : account.AccountID;
    const a = this._accounts.find(a => a.AccountID == id);
    if (!a) {
      return null;
    }
    const result: Array<MessageBody> = await this._request(
      a.Email, 'Mail', 'GetMessagesBodies', 
      {AccountID: a.AccountID, Folder: msg.Folder, Uids: [msg.Uid]}, MessageBody
    ) as Array<MessageBody>

    if (!Array.isArray(result) || result.length != 1) {
      return null;
    }

    result[0].AccountID = id;

    // const draft = await this._getFolder(FolderType.Drafts, account);
    // result[0].IsDraft = folder == draft.Id;

    return result[0];
  }

  // For a combined folder, when we perform an operation on a collection of messages, 
  // we need to separate each message and each account and each folder
  private _getPayloadInfos(account: Account, folder: string, msgs: Array<Message>): Array<PayloadInfoType> {
    const result: Array<PayloadInfoType> = [];
    // Get the original folder if it is a special folder.
    const _folder = Utils.isCombinedFolder(folder) ? Utils.folderById(account.FoldersOrder, folder) : null;
    Array.from(new Set(msgs.map(m => m.AccountID))).forEach(async accountId => {
      const a = this._accounts.find(a => a.AccountID == accountId);
      if (!a) {
        return ;
      }
      // Search the folder of the given type inside the original account
      const f = _folder == null ? {Id: folder} : Utils.folderByType(_folder.Type, a.FoldersOrder);
      result.push({account: a, folder: f.Id, msgs: msgs.filter(m => m.AccountID == a.AccountID)});
    });

    return result;
  }

  private async _executeCombinedAccount(account: Account, folder: string, msgs: Array<Message>, operation: Function) {
    const promises = [];
    // Get the original folder if it is a special folder.
    this._getPayloadInfos(account, folder, msgs).forEach(p => {
      promises.push(operation(p.account, p.folder, p.msgs));
    });

    return Promise.all(promises);
  }

  // Patched
  private async _doFlag(flag: string, account: Account, folder: string, msgs: Array<Message>, action: boolean) {
    if (account.AccountID != COMBINED_ACCOUNT_ID) {
      await this._request(
        account.Email, 'Mail', flag,
        {AccountID: account.AccountID, Folder: folder, Uids: msgs.map(m => m.Uid).join(","), SetAction: action}
      );
      return ;
    }

    const callback = (account: Account, folder: string, msgs: Array<Message>) => {
      return this._doFlag(flag, account, folder, msgs, action);
    }

    await this._executeCombinedAccount(account, folder, msgs, callback.bind(this));
  }

  // Patched
  public async markRead(account: Account, folder: string, messages: Array<Message>, action: boolean) {
    await this._doFlag('SetMessagesSeen', account, folder, messages, action);
    account.Folders$.pipe(
      take(1),
      map(folders => Utils.folderById(folders, folder)),
      filter(f => !!f),
    ).subscribe(folder => {
      const factor = action ? -1 : 1
      folder.Unread += factor * messages.length;
      folder.Count -= factor * messages.length;
      this.folderUpdated$.emit(folder);
    });
    messages.forEach(m => m.IsSeen = action);
  }

  // Patched
  public async flag(account: Account, folder: string, messages: Array<Message>, action: boolean) {
    await this._doFlag('SetMessageFlagged', account, folder, messages, action);
    messages.forEach(m => m.IsFlagged = action);
  }

  private async _doDeleteMessages(account: Account, folder: string, messages: Array<Message>) {
    if (account.AccountID != COMBINED_ACCOUNT_ID) {
      return this._request(
        account.Email,
        'Mail', 'DeleteMessages',
        {AccountID: account.AccountID, Folder: folder, Uids: messages.map(m => m.Uid).join(",")}
      );
    }

    const callback = (account: Account, folder: string, msgs: Array<Message>) => {
      return this._doDeleteMessages(account, folder, msgs);
    }

    return this._executeCombinedAccount(account, folder, messages, callback.bind(this));
  }

  public async _doMoveMessages(account: Account, folder: string, toFolder: string, messages: Array<Message>) {
    if (account.AccountID != COMBINED_ACCOUNT_ID) {
      const params = {AccountID: account.AccountID, Folder: folder, ToFolder: toFolder, Uids: messages.map(m => m.Uid).join(',')};
      await this._request(account.Email, 'Mail', 'MoveMessages', params);
      return ;
    }

    const callback = (account: Account, toFolder: string, msgs: Array<Message>) => {
      if (!Array.isArray(msgs) || msgs.length == 0) {
        return ;
      }
      const x = msgs[0].Folder;
      const folder = Utils.isCombinedFolder(x) ? Utils.folderByType(<any>x, account.FoldersOrder).Id : x;
      return this._doMoveMessages(account, folder, toFolder, msgs);
    };

    return this._executeCombinedAccount(account, toFolder, messages, callback);
  }

  // Patched
  public async deleteMessages(account: Account, folder: string, messages: Array<Message>) {
    await this._doDeleteMessages(account, folder, messages);
    this.messagesDeleted$.emit(messages);
  }

  // Patched
  public async moveMessages(account: Account, folder: string, toFolder: string, messages: Array<Message>) {
    await this._doMoveMessages(account, folder, toFolder, messages);
    this.messagesMoved$.emit(messages);
  }

  // Patched
  public async downloadUrl(account: Account, url: string, fileName: string, where: FilesystemDirectory, msg?: Message): Promise<FileWriteResult> {
    this._checkReady();
    if (msg) {
      account = this._accounts.find(a => a.AccountID == msg.AccountID);
    }
    if (!account) {
      throw {message: "ACCOUNT_NOT_FOUND", msg: msg};
    }
    const user = this._userByEmail(account.Email);
    const data = await fetch(url, {headers: {Authorization: `Bearer ${user.token}`}});
    if (this._platform.is('desktop')) {
      const bin = await data.blob();
      const buf = await bin.arrayBuffer();
      const blob = new Blob([buf], {type: 'application/octet-stream'});
      const a = document.createElement('a');
      a.download = fileName;
      const url = URL.createObjectURL(blob);
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return null;
    }

    const content = await new Promise(async (resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(reader.error);
      const blob = await data.blob();
      reader.readAsBinaryString(blob);
    }) as string;

    const result = await Filesystem.writeFile({
      path: fileName,
      data: btoa(content),
      directory: where,
    });
    return result;
  }

  // Patched
  public async downloadAttachment(account: Account, att: Attachment, fileName: string, where: FilesystemDirectory, msg?: Message): Promise<FileWriteResult> {
    this._checkReady();
    if (!att.Actions || !att.Actions.download) {
      return null;
    }
    return this.downloadUrl(account, `${this._server.url}/${att.Actions.download}`, fileName, where, msg);
  }

  // Patched
  public async uploadAttachment(account: Account, file: FileResult): Promise<UploadResult> {
    return this._request(account.Email, 'Mail', 'UploadAttachment', {AccountID: account.AccountID}, UploadResult, file) as Promise<UploadResult>;
  }

  private async _setFoldersTypes(account: Account, folders: Array<Folder>) {
    const result = await this._request(account.Email, 'Mail', 'GetFolders', {AccountID: account.AccountID}, Object) as Object;
    Utils.setFolderTypes(result['Folders']['@Collection'], folders);
    account.TypesSet = true;
  }

  private _getFolders(account: Account): Promise<Array<Folder>> {
    return new Promise<Array<Folder>>(resolve => account.Folders$.pipe(take(1)).subscribe(folders => resolve(folders)));
  }

  public async folderByType(type: FolderType, account: Account): Promise<Folder> {
    const folders = await this._getFolders(account);
    if (!account.TypesSet) {
      await this._setFoldersTypes(account, folders);
    }
    return Utils.folderByType(type, folders);
  }

  public isSpamFolder(f: Folder): boolean {
    return f.Type == FolderType.Spam;
  }

  // Patched
  public async saveMessage(account: Account, msg: MessageSave): Promise<SaveMessageResponse> {
    const draft = await this.folderByType(FolderType.Drafts, account);
    const params = <Object>msg;
    params['AccountID'] = account.AccountID;
    params['DraftFolder'] = draft.Id;
    return this._request(account.Email, 'Mail', 'SaveMessage', params, SaveMessageResponse) as Promise<SaveMessageResponse>;
  }

  // Patched
  public async sendMessage(account: Account, msg: MessageSave): Promise<boolean> {
    const sent = await this.folderByType(FolderType.Sent, account);
    const draft = await this.folderByType(FolderType.Drafts, account);
    const params = <Object>msg;
    params['AccountID'] = account.AccountID;
    params['DraftFolder'] = draft.Id;
    params['SentFolder'] = sent.Id;
    return this._request(account.Email, 'Mail', 'SendMessage', params) as Promise<boolean>;
  }

  // Patched
  public async reloadAttachments(account: Account, attachments: Array<Attachment>) {
    if (!Array.isArray(attachments) || attachments.length == 0) {
      return ;
    }
    const result: Object = await this._request(
      account.Email, 'Mail', 'SaveAttachmentsAsTempFiles',
      {Attachments: attachments.map(a => a.Hash), AccountID: account.AccountID},
      Object
    ) as Object;

    Object.keys(result).forEach(k => {
      const a = attachments.find(a => a.Hash == result[k]);
      if (!a) {
        return ;
      }

      a.TempName = k;
    });
  }

  // Patched
  public getOriginalDraftReply(account: Account, msg: MessageCompose): Promise<MessageBody> {
    const m = ModelFactory.instance({Uid: msg.DraftInfo[1], Folder: msg.DraftInfo[2]}, Message);
    return this.getMessageBody(account, m as Message);
  }

  // Patched
  public async moveOrDeleteMessages(account: Account, folder: string, messages: Array<Message>) {
    const trash = await this.folderByType(FolderType.Trash, account);

    if (trash.Id == folder) {
      await this.deleteMessages(account, folder, messages);
    }
    else {
      await this.moveMessages(account, folder, trash.Id, messages);
    }
  }

  // Patched
  public async markSpam(account: Account, folder: string, messages: Array<Message>) {
    const spam = await this.folderByType(FolderType.Spam, account);
    const to = spam.Id == folder ? 'inbox' : spam.Id;
    await this.moveMessages(account, folder, to, messages);
  }
}
