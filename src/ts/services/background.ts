import {Injectable, NgZone} from '@angular/core';
import {BaseClass} from '../base';
import {NgInject} from '../decorators';
import {Platform} from '@ionic/angular';
import {merge, interval} from 'rxjs';
import {map} from 'rxjs/operators';
import {Settings} from './settings';
import {to} from '../models';

const MAX_BACKGROUND_RETRIES = 3;
const MAX_INTERVAL = 60 * 1000 * 15;

@Injectable()
export class Background extends BaseClass {
  @NgInject(NgZone) private _zone: NgZone;
  @NgInject(Platform) private _platform: Platform;
  @NgInject(Settings) private _settings: Settings;

  private _backgroundTimer: any;
  private _callback: Function;
  private _errors: number = 0;
  private _checkInterval: number = null;

  constructor() {
    super();
  }

  public async configure(callback: Function) {
    this._callback = callback;
    this._checkInterval = await this._settings.getCheckoutEmailInterval();
    if (this._checkInterval == 0) {
      return ;
    }
    if (this._platform.is('desktop')) {
      this._startMailsCheck();
      return ;
    }
    this._backgroundTimer = window['BackgroundTimer'];
    console.log('background timer is', this._backgroundTimer);
    if (!this._backgroundTimer) {
      return ;
    }
    this._backgroundTimer.onTimerEvent(this._backgroundRun.bind(this));

    const obs = merge(this._platform.pause.pipe(map(() => 'pause')), this._platform.resume.pipe(map(() => 'resume')));
    obs.subscribe(async ev => {
      if (ev == 'resume') {
        console.log('stopping the interval');
        this._stopBackgroundTimer();
        // this._zone.run(() => this._loadMessages({first: this._table.first}));
        if (this._errors >= MAX_BACKGROUND_RETRIES) {
          this._checkInterval = await this._settings.getCheckoutEmailInterval();
        }
      }

      if (ev == 'pause') {
        this._startBackgroundTimer();
      }
    });
  }

  private async _startBackgroundTimer() {
    this._stopBackgroundTimer();
    console.log('starting the interval');
    this._backgroundTimer.start(this._backgroundSuccess.bind(this), this._backgroundFailure.bind(this), {
      timerInterval: this._checkInterval,
      startOnBoot: false,
      stopOnTerminate: true,
    });
  }

  private _backgroundSuccess() {
    console.log('executed background thing successfully');
  }

  private _backgroundFailure(e: Error) {
    console.log('error with background timer', e);
  }

  private _stopBackgroundTimer() {
    this._backgroundTimer.stop(this._backgroundSuccess.bind(this), this._backgroundFailure.bind(this));
  }

  private _backgroundRun() {
    return new Promise(resolve => {
      this._zone.run(async () => {
        await this._run();
        resolve();
      });
    });
  }

  private async _run() {
    const [err] = await to(this._callback());
    console.log('err is', err);

    if (err && ++this._errors >= MAX_BACKGROUND_RETRIES && this._checkInterval < MAX_INTERVAL) {
      console.log('setting the interval to max, due to 3 errors in a row', err);
      this._checkInterval = MAX_INTERVAL;
      this._startBackgroundTimer();
      console.log('set done');
      return ;
    }

    if (err) {
      console.log('no action taken due to error', err);
      return ;
    }
    else if (this._errors >= MAX_BACKGROUND_RETRIES) {
      this._checkInterval = await this._settings.getCheckoutEmailInterval();
      console.log('setting the interval back to', this._checkInterval, 'due to no error now');
      this._startBackgroundTimer();
      console.log('set done');
    }

    this._errors = 0;
  }

  private async _startMailsCheck() {
    interval(this._checkInterval).subscribe(() => this._callback());
  }

}
