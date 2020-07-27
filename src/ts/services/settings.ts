import {Injectable, EventEmitter} from '@angular/core';
import {BaseClass} from '../base';
import {NgInject} from '../decorators';
import {Store} from './store';
import {ServerSetting, MessageComposeType, AppSettings, LabelValue, AppSetting, UserSetting} from '../models';

const SERVER_KEY = 'server';
const PAGE_SIZE_KEY = 'page-size';
const MESSAGE_TYPE_KEY = 'message-type';
const CHECK_INTERVAL = 'check-emails-interval';

const EMAIL_INTERVAL_OPTIONS: Array<LabelValue> = [
  {label: '1 minute', value: 60 * 1000}, 
  {label: '5 minutes', value: 60 * 1000 * 5},
  {label: '10 minutes', value: 60 * 1000 * 10},
  {label: '15 minutes', value: 60 * 1000 * 15},
  {label: 'Never', value: 0},
];

const MESSAGE_TYPE_OPTIONS: Array<LabelValue> = [
  {label: 'Html', value: 'HTML'},
  {label: 'Plain text', value: 'TEXT'},
];

const PAGE_SIZE: Array<LabelValue> = [
  {label: '20 messages', value: 20},
  {label: '50 messages', value: 50},
  {label: '100 messages', value: 100},
]

@Injectable()
export class Settings extends BaseClass {
  @NgInject(Store) private _store: Store;
  public serverSet$ = new EventEmitter();

  public getServer(): Promise<ServerSetting> {
    return this._store.load(SERVER_KEY, ServerSetting) as Promise<ServerSetting>;
  }

  public async setServer(servers: ServerSetting) {
    servers.users.forEach(u => u.pass = null);
    const result = await this._store.save(SERVER_KEY, servers);
    this.serverSet$.emit();
    return result;
  }

  public async getPageSize(): Promise<number> {
    return this._store.load(PAGE_SIZE_KEY, undefined, 20) as Promise<number>;
  }

  public setPageSize(s: number) {
    return this._store.save(PAGE_SIZE_KEY, s);
  }

  public getMessageType(): Promise<MessageComposeType> {
    return this._store.load(MESSAGE_TYPE_KEY, undefined, 'HTML') as Promise<MessageComposeType>;
  }

  public setMessageType(type: MessageComposeType) {
    return this._store.save(MESSAGE_TYPE_KEY, type);
  }

  public getCheckoutEmailInterval(): Promise<number> {
    return this._store.load(CHECK_INTERVAL, undefined, 60 * 1000 * 15) as Promise<number>;
  }

  public setCheckoutEmailInterval(value: number) {
    return this._store.save(CHECK_INTERVAL, value);
  }

  private _toAppSetting(x: number | string, options: Array<LabelValue>): AppSetting {
    const result = new AppSetting();
    result.model = options.find(o => o.value == x);
    result.options = options;
    return result;
  }

  public get appSettings(): Promise<AppSettings> {
    return new Promise(resolve => {
      const model = new AppSettings();
      const p = [];
      p.push(this.getCheckoutEmailInterval().then(x => model.checkEmailInterval = this._toAppSetting(x, EMAIL_INTERVAL_OPTIONS)));
      p.push(this.getMessageType().then(x => model.composeType = this._toAppSetting(x, MESSAGE_TYPE_OPTIONS)));
      p.push(this.getPageSize().then(x => model.pageSize = this._toAppSetting(x, PAGE_SIZE)));
      p.push(this.getServer().then(x => model.server = x));

      Promise.all(p).then(() => resolve(model));
    });
  }

  public async saveSettings(settings: AppSettings): Promise<void> {
    const p = [];
    p.push(this.setServer(settings.server));
    p.push(this.setCheckoutEmailInterval(settings.checkEmailInterval.model.value as number));
    p.push(this.setMessageType(settings.composeType.model.value as MessageComposeType));
    p.push(this.setPageSize(settings.pageSize.model.value as number));
    await Promise.all(p);
  }

  public async needAuthenticating(server: ServerSetting): Promise<Array<UserSetting>>{
    if (!server) {
      return [];
    }

    const current = await this.getServer();

    if (!current || current.url != server.url) {
      return server.users;
    }

    return server.users.filter(u => !u.token || u.pass);
  }
}
