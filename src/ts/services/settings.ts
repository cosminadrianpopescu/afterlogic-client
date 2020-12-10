import {Injectable, EventEmitter} from '@angular/core';
import {BaseClass} from '../base';
import {NgInject} from '../decorators';
import {Store} from './store';
import {ServerSetting, MessageComposeType, AppSettings, LabelValue, AppSetting, UserSetting, ThemeType} from '../models';
import {NextcloudCredentials} from '../nextcloud/models';
import {Nextcloud} from '../nextcloud/nextcloud';
import {Utils} from './utils';
import {BehaviorSubject} from 'rxjs';
import {Layout} from './layout';

const SERVER_KEY = 'server';
const PAGE_SIZE_KEY = 'page-size';
const MESSAGE_TYPE_KEY = 'message-type';
const CHECK_INTERVAL = 'check-emails-interval';
const NEXTCLOUD_CREDENTIALS = 'nextcloud-credentials';
const CLOUD_PREVIEW = 'preview-in-cloud';
const NEXTCLOUD_URL = 'nextcloud-url';
const THEME = 'theme';
const IMAGE = 'background-image';

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
];

const THEME_OPTIONS: Array<LabelValue> = [
  {label: 'Light', value: <ThemeType>'light'},
  {label: 'Dark', value: <ThemeType>'dark'},
];

@Injectable()
export class Settings extends BaseClass {
  @NgInject(Store) private _store: Store;
  @NgInject(Nextcloud) private _nc: Nextcloud;
  @NgInject(Layout) private _layout: Layout;
  public serverSet$ = new EventEmitter();
  public themeLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  private async _initTheme() {
    this.themeLoading$.next(true);
    const p = [this.getTheme(), this.getBackgroundImage(), new Promise(resolve => setTimeout(resolve, 3000))];
    const [theme, image] = await Promise.all(<any>p);
    Utils.parseThemeStyles(theme as string, image as boolean, this._layout.isMobile);
    document.body.className = <any>theme;
    document.querySelector('#theme-link').setAttribute('href', `assets/themes/${theme == 'dark' ? 'vela' : 'saga'}-blue/theme.css`)
    this.themeLoading$.next(false);
  }
  
  constructor() {
    super();
    this._initTheme();
    this._initNextcloud();
  }

  private async _initNextcloud() {
    const c = await this.getNextcloudLogin();
    if (!c) {
      return ;
    }

    this._nc.credentials = c;
  }

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

  public getNextcloudLogin(): Promise<NextcloudCredentials> {
    return this._store.load(NEXTCLOUD_CREDENTIALS, NextcloudCredentials) as Promise<NextcloudCredentials>;
  }

  public setNextcloudLogin(x: NextcloudCredentials) {
    return this._store.save(NEXTCLOUD_CREDENTIALS, x);
  }

  public getNextcloudUrl(): Promise<string> {
    return this._store.load(NEXTCLOUD_URL) as Promise<string>;
  }

  public setNextcloudUrl(x: string): Promise<void> {
    return this._store.save(NEXTCLOUD_URL, x);
  }

  public getTheme(): Promise<ThemeType> {
    return this._store.load(THEME) as Promise<ThemeType>;
  }

  public setTheme(x: ThemeType): Promise<void> {
    return this._store.save(THEME, x);
  }

  public async getBackgroundImage(): Promise<boolean> {
    const result = await (this._store.load(IMAGE) as Promise<boolean>);
    if (result == null) {
      return false;
    }

    return result;
  }

  public setBackgroundImage(x: boolean): Promise<void> {
    return this._store.save(IMAGE, x);
  }

  public async getCloudPreview(): Promise<boolean> {
    const result = await (this._store.load(CLOUD_PREVIEW) as Promise<boolean>);
    if (result == null) {
      return false;
    }
    return result;
  }

  public setCloudPreview(x: boolean): Promise<void> { return this._store.save(CLOUD_PREVIEW, x); }

  private _toAppSetting(x: number | string, options: Array<LabelValue>): AppSetting {
    const result = new AppSetting();
    result.model = options.find(o => o.value == x);
    if (!result.model) {
      result.model = options[0];
    }
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
      p.push(this.getNextcloudUrl().then(x => model.nextcloudUrl = x));
      p.push(this.getCloudPreview().then(x => model.previewInCloud = x));
      p.push(this.getBackgroundImage().then(x => model.backgroundImage = x));
      p.push(this.getTheme().then(x => model.theme = this._toAppSetting(x, THEME_OPTIONS)));

      Promise.all(p).then(() => resolve(model));
    });
  }

  public async saveSettings(settings: AppSettings): Promise<void> {
    const current = await this.appSettings;
    const p = [];
    p.push(this.setServer(settings.server));
    p.push(this.setCheckoutEmailInterval(settings.checkEmailInterval.model.value as number));
    p.push(this.setMessageType(settings.composeType.model.value as MessageComposeType));
    p.push(this.setPageSize(settings.pageSize.model.value as number));
    p.push(this.setNextcloudUrl(settings.nextcloudUrl));
    p.push(this.setCloudPreview(settings.previewInCloud));
    p.push(this.setBackgroundImage(settings.backgroundImage));
    p.push(this.setTheme(settings.theme.model.value as ThemeType));
    await Promise.all(p);
    if (current.theme != settings.theme || current.backgroundImage != settings.backgroundImage) {
      this._initTheme();
    }
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
