import {EventEmitter, Injectable} from '@angular/core';
import {combineLatest, from, Observable, ReplaySubject} from 'rxjs';
import {filter, map, mergeMap, shareReplay, take, tap} from 'rxjs/operators';
import {BaseClass} from '../base';
import {NgInject} from '../decorators';
import {Account, COMBINED_ACCOUNT_ID, DisplayContact, Folder, Message} from '../models';
import {Api} from './api';
import {Store} from './store';
import { Platform } from '@ionic/angular';
import {Plugins, LocalNotification} from '@capacitor/core';
import {Utils} from './utils';
import { Router } from '@angular/router';

const {LocalNotifications} = Plugins;

@Injectable()
export class Mails extends BaseClass {
  @NgInject(Api) private _api: Api;
  @NgInject(Store) private _store: Store;
  @NgInject(Platform) private _platform: Platform;
  @NgInject(Router) private _router: Router;

  public refresh$ = new EventEmitter();
  public refreshed$ = new EventEmitter();
  public newEmails$ = new EventEmitter();
  public folderChanged$: EventEmitter<Folder> = new EventEmitter<Folder>();
  public currentAccount$: ReplaySubject<Account> = new ReplaySubject<Account>(1);

  private _accounts: Array<Account> = null;
  private _subscription: Observable<Array<Account>> = null;

  constructor() {
    super();
    this.setCurrentAccount(null);

    LocalNotifications.addListener('localNotificationActionPerformed', async n => {
      this._messageClicked(n.notification.extra);
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        LocalNotifications.cancel(pending);
      }
    });
  }

  public get accounts$(): Observable<Array<Account>> {
    if (this._subscription) {
      return this._subscription;
    }

    this._subscription = this._api.ready$.pipe(
      filter(result => result), 
      mergeMap(() => from(this._api.getAccounts())),
      tap(accounts => this._accounts = accounts),
      shareReplay(),
    );

    return this._subscription;
  }

  public accountById(id: string): Account {
    if (!Array.isArray(this._accounts)) {
      return null;
    }

    return this._accounts.find(a => a.AccountID == id) || null;
  }

  private _retrieveFolderById(id: string, folders: Array<Folder>): Folder {
    if (folders.length == 0) {
      return null;
    }
    const folder = folders.find(f => f.Id.toLowerCase() == id.toLowerCase());
    if (folder) {
      return folder;
    }

    const subFolders = folders.map(f => f.SubFolders).reduce((acc, v) => acc.concat(v), []);
    return this._retrieveFolderById(id, subFolders);
  }

  public folderById$(account: Account, id: string): Observable<Folder> {
    return account.Folders$.pipe(
      take(1),
      map(folders => this._retrieveFolderById(id, folders))
    );
  }

  public async setCurrentAccount(email: string) {
    if (email != null) {
      await this._store.setCurrentAccount(email);
    }

    return new Promise(resolve => {
      combineLatest(from(this._store.getCurrentAccount()), this.accounts$).pipe(
        map(([email, accounts]) => accounts.length > 0 ? (accounts.find(a => a.Email == email || (email == COMBINED_ACCOUNT_ID && a.AccountID == email)) || accounts[0]) : null),
        take(1),
        tap(account => this.currentAccount$.next(account)),
        tap(() => resolve()),
      ).toPromise();
    });
  }

  public validate(addresses: Array<DisplayContact>): boolean {
    if (!Array.isArray(addresses)) {
      return true;
    }
    return addresses.reduce((acc, v) => !acc ? acc : <any>v.Email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i), true);
  }

  private _messageClicked(m: Message) {
    this._router.navigateByUrl(`readmail:${m.Uid}`);
  }

  private _getFrom(m: Message): string {
    const from = m.From && Array.isArray(m.From.Collection) && m.From.Collection.length > 0 ? m.From.Collection[0] : null;
    if (!from) {
      return 'New message';
    }

    return from.DisplayName || from.Email;
  }

  private async _doNotify(messages: Array<Message>) {
    const callback = this._messageClicked.bind(this);
    if (this._platform.is('desktop')) {
      if (window.Notification.permission != 'granted') {
        const perm = await window.Notification.requestPermission();
        if (perm != 'granted') {
          return ;
        }
      }
      const notifications: Array<Notification> = [];
      messages.forEach(m => {
        const x = new window.Notification(this._getFrom(m), {body: m.Subject});
        x.onclick = () => {
          callback(m);
          notifications.forEach(n => n.close());
        };
        notifications.push(x);
      });

      return ;
    }

    const perm = await LocalNotifications.requestPermission();
    if (!perm.granted) {
      return ;
    }

    await LocalNotifications.schedule({
      notifications: messages.map(m => <LocalNotification>{
        title: this._getFrom(m),
        body: m.Subject,
        id: parseInt(m.Uid),
        extra: m,
      }),
    });
  }

  public showNotifications(lastMsg: Message, messages: Array<Message>) {
    const ts = (lastMsg && lastMsg.TimeStampInUTC) || 1;
    if (messages[0].TimeStampInUTC <= ts) {
      return ;
    }

    this._doNotify(messages.filter(m => m.TimeStampInUTC > ts));
  }

  public messageInComposedFolder(msg: Message, folder: Folder): boolean {
    if (!Utils.isCombinedFolder(folder.Id)) {
      return msg.Folder == folder.Id;
    }

    if (!this._accounts) {
      return false;
    }

    const a = this._accounts.find(a => a.AccountID == msg.AccountID);

    if (!a) {
      return false;
    }

    const f = a.FoldersOrder.find(f => f.Id == msg.Folder);
    if (!f) {
      return false;
    }

    return f.Type == folder.Type;
  }
}
