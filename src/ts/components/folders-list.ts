import {Component, Input, ViewEncapsulation} from '@angular/core';
import {take} from 'rxjs/operators';
import {BaseComponent} from '../base';
import {NgInject} from '../decorators';
import {Account, Folder, FolderType, COMBINED_ACCOUNT_ID} from '../models';
import {Api} from '../services/api';
import {Mails} from '../services/mails';

@Component({
  selector: 'al-folders-list',
  templateUrl: '../../html/folders-list.html',
  styleUrls: ['../../assets/scss/folders-list.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class FoldersList extends BaseComponent {
  @NgInject(Mails) private _mails: Mails;
  @NgInject(Api) private _api: Api;
  @Input() public set account(a: Account) {
    this._loading = true;
    if (!a) {
      return ;
    }
    this._account = a;
    this._account.Folders$.pipe(take(1)).subscribe(() => this._loading = false);
    this._init();
  }

  protected async _init() {
    const inbox = await this._api.folderByType(FolderType.Inbox, this._account)
    this._mails.folderChanged$.emit(inbox);
  }

  protected _account: Account;
  protected _loading: boolean = true;
  protected _selected: Folder = null;

  protected _select(folder: Folder) {
    if (!folder) {
      return ;
    }

    this._selected = folder;
    this._mails.folderChanged$.emit(folder);
  }
}
