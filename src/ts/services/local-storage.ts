import {Injectable} from '@angular/core';
import {BaseClass} from '../base';

@Injectable()
export class LocalStorage extends BaseClass {
  public set(key: string, value: Object) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  public get(key: string): any {
    const result = localStorage.getItem(key);
    if (!result) {
      return null;
    }

    return JSON.parse(result);
  }
}
