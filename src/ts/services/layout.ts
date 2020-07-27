import { BaseClass } from '../base';
import {Injectable} from '@angular/core';
import {NgInject} from '../decorators';
import {Platform} from '@ionic/angular';

@Injectable()
export class Layout extends BaseClass {
  @NgInject(Platform) private _platform: Platform;

  public get isMobile() {
    return (this._platform.is('desktop') && this._platform.width() < 1024) || this._platform.is('mobile');
  }
}
