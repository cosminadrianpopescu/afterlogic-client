import {Injectable} from '@angular/core';
import {fromEvent} from 'rxjs';
import {take} from 'rxjs/operators';
import {BaseClass} from '../base';
import {FileResult, FormDataSerialized, ModelFactory} from '../models';

@Injectable()
export class FileService extends BaseClass {
  private _callback: Function = null;

  public async read(f: Blob): Promise<string>{
    const reader = new FileReader();
    const r: FileReader = reader['__zone_symbol__originalInstance'] || reader;

    return new Promise((resolve, reject) => {
      r.onloadend = function() {
        resolve(this.result as string);
      }
      r.onerror = async function() {
        reject(this.error);
      }
      r.readAsBinaryString(f);
    })
  }

  public async get(el: HTMLInputElement): Promise<Array<FileResult>> {
    if (this._callback) {
      this._callback([]);
    }
    el.click();
    const files: FileList = await new Promise(resolve => {
      this._callback = resolve;
      fromEvent(el, 'change').pipe(take(1)).subscribe(() => {
        console.log('files are', el.files);
        resolve(<any>el.files);
      });
    });

    const result = Array.from(files).map(f => ModelFactory.instance(<FileResult>{content: f}, FileResult) as FileResult);
    el.value = '';
    return result;
  }

  public async serialize(form: FormData): Promise<FormDataSerialized> {
    const result = new FormDataSerialized();
    result.boundary = '------WebKitFormBoundaryt32h1LxhGa2YJU6X';
    result.data = '';
    let fileKey: string;
    form.forEach((value, key) => {
      if (value instanceof File) {
        fileKey = key;
        return ;
      }
      result.data += `${result.boundary}\x0d\x0aContent-Disposition: form-data; name="${key}"\x0d\x0a\x0d\x0a${value}\x0d\x0a`;
    });

    const f = form.get(fileKey) as File;
    const content = await this.read(f);
    result.data += `${result.boundary}\x0d\x0aContent-Disposition: form-data; name="${fileKey}"; filename="${f.name}"\x0d\x0aContent-Type: ${f.type}\x0d\x0a\x0d\x0a${content}\x0d\x0a${result.boundary}--\x0d\x0a`;

    return result;
  }
}
