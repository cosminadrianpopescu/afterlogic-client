import { Plugins } from '@capacitor/core';
import { ServerSetting } from '../models';
import * as fs from 'fs';

type ParamsType = {key: string, value?: any};

export const MOCK_SERVER = <ServerSetting> {
  url: process.env.WEBMAIL_URL,
  users: [
    {email: process.env.WEBMAIL_USER1, pass: process.env.WEBMAIL_PASS1},
    {email: process.env.WEBMAIL_USER2, pass: process.env.WEBMAIL_PASS2},
  ]
}

export class MockRouter {
  public async navigateByUrl(url: string) {
    console.log('navigating to', url);
  }
}

class MockStorage {
  constructor() {
    process.on('exit', () => {
      fs.writeFileSync('db', JSON.stringify(this._map));
    });

    if (fs.existsSync('db')) {
      const data = fs.readFileSync('db');
      this._map = JSON.parse(data.toString());
    }
  }
  private _map: Object = {};

  public get(params: ParamsType): Promise<any> {
    return new Promise(resolve => resolve({value: this._map[params.key] || null}));
  }

  public set(params: ParamsType): Promise<void> {
    return new Promise(resolve => {
      this._map[params.key] = params.value;
      resolve();
    });
  }

  public remove(params: ParamsType): Promise<void> {
    return new Promise(resolve => {
      if (!this._map[params.key]) {
        resolve();
        return;
      }
      delete this._map[params.key]
      resolve();
    });
  }
}

export function initMocks() {
  Plugins.Storage = <any>(new MockStorage());
  window['OC'] = {
    Files: {
      getClient: () => <Object>{
        getFileInfo: async (path: string): Promise<Object> => {
          if (['abc', 'abc-1'].indexOf(path) != -1) {
            return {};
          }

          throw 'NOT_FOUND';
        }
      }
    }
  }
}
