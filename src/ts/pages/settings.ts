import {Component, ViewEncapsulation} from '@angular/core';
import {BaseComponent} from '../base';
import {NgCycle, NgInject} from '../decorators';
import {ServerSetting, UserSetting, AppSettings, COMBINED_ACCOUNT_ID, to} from '../models';
import {Settings as SettingsService} from '../services/settings';
import {Store} from '../services/store';
import {Api} from '../services/api';
import {take} from 'rxjs/operators';
import {Mails} from '../services/mails';
import {Nextcloud} from '../nextcloud/nextcloud';

@Component({
  selector: 'al-settings',
  templateUrl: '../../html/settings.html',
  styleUrls: ['../../assets/scss/settings.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class Settings extends BaseComponent {
  @NgInject(Store) private _store: Store;
  @NgInject(Api) private _api: Api;
  @NgInject(Mails) private _mails: Mails;
  @NgInject(SettingsService) private _settings: SettingsService;
  @NgInject(Nextcloud) private _nc: Nextcloud;
  protected _model: AppSettings;
  protected _validate: boolean = false;
  protected _loading: boolean = true;
  protected _urlFixed: boolean = false;
  protected _style = {'margin-top': '1rem'};
  protected _isNc: boolean = false;

  @NgCycle('init')
  protected async _initMe() {
    this._isNc = this._nc.isNextcloud;
    this._model = await this._settings.appSettings;
    if (!this._model.server) {
      this._model.server = new ServerSetting();
      this._model.server.users = [];
    }
  }

  protected _setFixUrl(value: boolean) {
    this._urlFixed = value;
  }

  protected _remove(user: UserSetting) {
    this._model.server.users = this._model.server.users.filter(u => u.email != user.email);
  }

  protected _add() {
    this._model.server.users.push(new UserSetting());
  }

  private _waitApiReady() {
    return this._api.ready$.pipe(take(1)).toPromise();
  }

  public async save() {
    if (!this._model.server && !Array.isArray(this._model.server.users) || this._model.server.users.length == 0) {
      this.alert('You have to have at least one account', '');
      return ;
    }
    const users = await this._settings.needAuthenticating(this._model.server);
    if (users.length > 0) {
      this.showLoading();
      // To be able to do anything with the API we need a server url, at least.
      // So, we set this before.
      const server = new ServerSetting();
      server.url = this._model.server.url;
      server.users = [];
      await this._settings.setServer(server);
      await this._waitApiReady();
      const [err, result] = await to(this._api.login(users));
      this._validate = true;
      this.hideLoading();

      if (err || !result) {
        this.alert('Some accounts could not be logged in', '');
        console.log('err is', err);
        return ;
      }

      await this._waitApiReady();
    }
    const email = await this._store.getCurrentAccount();
    let x: boolean = false;
    if (email != COMBINED_ACCOUNT_ID && !this._model.server.users.find(u => u.email == email)) {
      x = true;
    }
    await this._settings.saveSettings(this._model);
    if (x) {
      await this._mails.setCurrentAccount(this._model.server.users[0].email);
      this.navigate('').then(() => window.location.reload());
      return ;
    }
    await this._mails.setCurrentAccount(null);
    this.navigate('settings:saved');
    // window.location.reload();
    // this.navigate('settings:' + op);
  }

  protected async _nextcloudLogin() {
    this.showLoading();
    const [err, result] = await to(this._nc.login(this._model.nextcloudUrl));

    if (err) {
      console.error(err);
      this.alert('There was an error performing login to nextcloud', err.message);
      this.hideLoading();
      return ;
    }

    this._settings.setNextcloudLogin(result);
    this.alert('You have been authenticated to nextcloud', '', 'success', true);
    this.hideLoading();
    return ;
  }
}
