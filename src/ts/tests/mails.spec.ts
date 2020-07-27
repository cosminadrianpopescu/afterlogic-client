import { BaseTestUnit } from '../base';
import {Settings} from '../services/settings';
import {Api} from '../services/api';
import {Store} from '../services/store';
import {Mails} from '../services/mails';
import {NgInject, NgTest} from '../decorators';
import {take} from 'rxjs/operators';

export class MailsTestUnit extends BaseTestUnit {
  @NgInject(Mails) private _service: Mails;

  constructor() {
    super([
      Settings, Api, Store, Mails,
    ]);
  }

  @NgTest()
  public async testService() {
    const account = await this._service.currentAccount$.pipe(take(1)).toPromise();
    console.log('account is', account);
  }
}
