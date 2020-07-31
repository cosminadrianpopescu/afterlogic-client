import {Injectable} from '@angular/core';
import {BaseClass} from '../base';
import {FilePicker} from './filepicker';
import {NgInject} from '../decorators';
import {Store} from './store';

const PATH_KEY = 'nextcloud-last-path';

@Injectable()
export class Nextcloud extends BaseClass {
  @NgInject(Store) private _store: Store;

  public isNextcloud(): boolean {
    return window.top && window.top['OC'];
  }

  private async _processLastPath(x: Array<string>) {
    if (x.length > 0) {
      await this._store.save(PATH_KEY, x[0].replace(/^(.*)\/[^\/]+$/g, '$1'))
    }
  }

  public async pickFile(): Promise<Array<string>> {
    const lastPath = await this._store.load(PATH_KEY, undefined, '/') as string;
    const picker = new FilePicker('Choose a file', true, [], true, 1, false, lastPath);
    const result: Array<string> = await picker.pick() as any;
    await this._processLastPath(result);
    return result;
  }

  public async pickFolder(): Promise<string> {
    const lastPath = await this._store.load(PATH_KEY, undefined, '/') as string;
    const picker = new FilePicker('Choose a folder', false, ['*.zzz'], true, 1, true, lastPath);
    const result: string = await picker.pick();
    await this._processLastPath([result]);
    return result;
  }

  public async download(path: string): Promise<ArrayBuffer> {
    const content = await fetch(`${FilePicker.basePath}/${path}`);
    const blob = await content.blob();
    const bin = await blob.arrayBuffer();
    return bin;
    // return new File([content], path.replace(/^.*\/([^\/]+)$/, '$1'));
  }

  public async upload(path: string, content: Blob): Promise<string> {
    return FilePicker.upload(path, content);
  }
}
