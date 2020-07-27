import { filter } from 'rxjs/operators';
import { BaseTestUnit } from '../base';
import { NgInject, NgTest } from '../decorators';
import { Api } from '../services/api';
import { Settings } from '../services/settings';
import { Store } from '../services/store';
import { MOCK_SERVER } from './mocks';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

export class ApiTest extends BaseTestUnit {
  @NgInject(Settings) private _settings: Settings;
  @NgInject(Api) private _api: Api

  constructor() {
    super([Settings, Api, Store]);
  }

  private async _init() {
    await this._settings.setServer(MOCK_SERVER);
  }

  @NgTest()
  public async testGetAccounts() {
    // await this._init();
    await new Promise(resolve => this._api.ready$.pipe(filter(result => result === true)).subscribe(resolve));
    const result = await this._api.getAccounts();
    const messages = await this._api.getMessages(result[1], 'Inbox', 0, 20);
    // console.log('messages are', messages);

    const body = await this._api.getMessageBody(result[1], messages[0]);
    console.log('body is', body);
  }
}
