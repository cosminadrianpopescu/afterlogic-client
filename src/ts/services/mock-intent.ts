import {BaseClass} from '../base';
import {ReplaySubject, Observable} from 'rxjs';
import {Intent} from '@ionic-native/web-intent/ngx';

export class MockWebIntent extends BaseClass {
  private _intent: ReplaySubject<Intent> = new ReplaySubject<Intent>(1);

  public onIntent(): Observable<Intent> {
    return this._intent;
  }

  constructor() {
    super();
    window['MockWebintent'] = this;
  }
}
