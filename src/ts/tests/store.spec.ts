import {BaseTestUnit} from '../base';
import {NgInject, NgTest} from '../decorators';
import {Store} from '../services/store';
import { Primitive } from '../models';

class Model {
  a: string;
  b: number;
}


export class StoreTest extends BaseTestUnit {
  @NgInject(Store) private _store: Store;
  constructor() {
    super([Store]);
  }

  @NgTest()
  protected async _test() {
    const model = new Model();
    model.a = 'a';
    model.b = 100;
    let x: Model = await this._store.load('x', Model) as Model;
    expect(x).toBeNull();
    await this._store.save('x', model);
    x = await this._store.load('x', Model) as Model;
    expect(x instanceof Model).toBeTruthy();
    expect(x.a).toEqual('a');
    expect(x.b).toEqual(100);

    let y = 'abc';
    await this._store.save('x', y);
    y = await this._store.load('x') as string;
    expect(typeof(y) == 'string').toBeTruthy();

    let z = 100;
    await this._store.save('x', z);
    z = await this._store.load('x') as number;
    expect(typeof(z) == 'number').toBeTruthy();

    let a: Array<Primitive> = [1, 2, '123', 4, 5];
    await this._store.save('x', a);
    a = await this._store.load('x') as Array<Primitive>;
    expect(Array.isArray(a)).toBeTruthy();
    expect(typeof(a[0]) == 'number').toBeTruthy();
    expect(typeof(a[2]) == 'string').toBeTruthy();
  }
}
