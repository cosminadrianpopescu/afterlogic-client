import {Component, ViewEncapsulation, NgZone} from '@angular/core';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {Platform} from '@ionic/angular';
import {BaseComponent} from '../base';
import {NgInject} from '../decorators';
import {Api} from '../services/api';
import {Layout} from '../services/layout';
import { WebIntent } from '@ionic-native/web-intent/ngx';
import { filter, tap } from 'rxjs/operators';

@Component({
  selector: 'main-page',
  templateUrl: '../../html/main.html',
  styleUrls: ['../../assets/scss/main.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class Main extends BaseComponent {
  @NgInject(Platform) private _platform: Platform;
  @NgInject(SplashScreen) private _splash: SplashScreen;
  @NgInject(Layout) private _layout: Layout;
  @NgInject(Api) private _api: Api;
  @NgInject(WebIntent) private _intent: WebIntent;
  @NgInject(NgZone) private _zone: NgZone;

  protected _mobile: boolean = true;
  protected _ready: boolean = false;

  constructor() {
    super();
    this._initializeApp();
    this.connect(this._api.ready$, result => {
      if (!result) {
        this.navigate('settings:empty');
        this._ready = true;
        return ;
      }
      this._ready = true;
    });
  }

  private _initializeApp() {
    this._platform.ready().then(() => {
      document.addEventListener('backbutton', ev => {
        ev.stopPropagation();
        ev.preventDefault();
        this._zone.run(() => {
          this.navigate('');
        });
      }, false);
      this._mobile = this._layout.isMobile;
      this._splash.hide();
      if (this._platform.is('desktop')) {
        return ;
      }
      this.connect(this._intent.onIntent().pipe(
        filter(i => i.action == this._intent.ACTION_VIEW && !!i['data'])
      ), i => this._zone.run(() => this.navigate(i['data'])));
    });
  }
}
