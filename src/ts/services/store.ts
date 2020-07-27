import { Injectable, Type } from '@angular/core';
import { Plugins } from '@capacitor/core';
import { BaseClass } from '../base';
import {ModelFactory, ObjectType} from '../models';

const { Storage } = Plugins;

const PREFIX = 'afterlogic-client-';
const CURRENT_ACCOUNT = 'current-account'

@Injectable()
export class Store extends BaseClass {
  public async load<T>(key: string, type?: Type<T>, defValue?: T | Array<T>): Promise<ObjectType<T>> {
    const result = await Storage.get({key: PREFIX + key});
    if (!result.value) {
      return defValue ? defValue : null;
    }
    return ModelFactory.instance(JSON.parse(result.value).data, type);
  }

  public async save(key: string, data: any): Promise<void> {
    Storage.set({key: PREFIX + key, value: JSON.stringify({data: data, date: new Date()})});
  }

  public async getCurrentAccount(): Promise<string> {
    return this.load(CURRENT_ACCOUNT) as Promise<string>;
  }

  public async setCurrentAccount(email: string) {
    return this.save(CURRENT_ACCOUNT, email);
  }
}
