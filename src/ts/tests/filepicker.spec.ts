import { BaseTestUnit } from '../base';
import {NgTest} from '../decorators';
import {FilePicker} from '../services/filepicker';

export class FilepickerTest extends BaseTestUnit {
  @NgTest('tests the get path', true)
  public async testGetPath() {
    let info = await FilePicker['_getPath']('abc');
    console.log('info is', info);
    info = await FilePicker['_getPath']('new');
    console.log('info is', info);
  }
}
