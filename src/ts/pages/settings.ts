import {Component, ViewEncapsulation} from '@angular/core';
import {BaseComponent} from '../base';
import {NgCycle, NgInject} from '../decorators';
import {ServerSetting, UserSetting, AppSettings, COMBINED_ACCOUNT_ID, to} from '../models';
import {Settings as SettingsService} from '../services/settings';
import {Store} from '../services/store';
import {Api} from '../services/api';
import {take} from 'rxjs/operators';
import {Mails} from '../services/mails';

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
  protected _model: AppSettings;
  protected _validate: boolean = false;
  protected _loading: boolean = true;
  protected _urlFixed: boolean = false;

  @NgCycle('init')
  protected async _initMe() {
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

  protected async _save() {
    if (!this._model.server && !Array.isArray(this._model.server.users) || this._model.server.users.length == 0) {
      this.alert('You have to have at least one account', '');
      return ;
    }
    const users = await this._settings.needAuthenticating(this._model.server);
    console.log('model is', JSON.parse(JSON.stringify(this._model)), users);
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
}
