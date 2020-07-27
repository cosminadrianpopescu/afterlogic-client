import { BaseTestUnit } from "../base";
import {NgTest} from '../decorators';
import {FoldersConvertor} from '../models';

export class FoldersTestCase extends BaseTestUnit {

  @NgTest('test folders algorithm', true)
  public testFolders() {
    const conv = new FoldersConvertor();
    let s = '["INBOX","[Gmail]","[Gmail]\\/Sent Mail","[Gmail]\\/Drafts","[Gmail]\\/Spam","[Gmail]\\/Trash","[Gmail]\\/All Mail","[Gmail]\\/Important","[Gmail]\\/Starred","amazon-kindle","Ce era prin Inbox","Code Project","De acasa","Drafts","Operate","Sent","TAID","TAID-PAS-SURE","Trash"]';
    let folders = conv.convert(s);
    console.log('folders are', folders[1]);

    s = '["INBOX","[Gmail]","[Gmail]\\/Sent Mail","[Gmail]\\/Sent Mail\\/another folder 1","[Gmail]\\/Sent Mail\\/another folder 2","[Gmail]\\/Drafts","[Gmail]\\/Spam","[Gmail]\\/Trash","[Gmail]\\/All Mail","[Gmail]\\/Important","[Gmail]\\/Starred","amazon-kindle","Ce era prin Inbox","Code Project","De acasa","Drafts","Operate","Sent","TAID","TAID-PAS-SURE","Trash"]';

    folders = conv.convert(s);
    console.log('second round of folders are', folders[1].SubFolders[0]);
  }
}
