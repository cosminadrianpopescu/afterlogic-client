import {Component, Input} from '@angular/core';
import {FilesystemDirectory, FileWriteResult} from '@capacitor/core';
import {WebIntent} from '@ionic-native/web-intent/ngx';
import {BaseComponent} from '../base';
import {NgInject} from '../decorators';
import {Account, Attachment, MessageBody} from '../models';
import {Api} from '../services/api';

@Component({
  selector: 'al-attachments',
  templateUrl: '../../html/attachments.html',
  styleUrls: ['../../assets/scss/attachments.scss']
})
export class Attachments extends BaseComponent {
  @Input() public attachments: Array<Attachment> = [];
  @Input() public message: MessageBody = null;
  @Input() public account: Account;

  @NgInject(Api) private _api: Api;
  @NgInject(WebIntent) private _intent: WebIntent;
  protected _attDownloading: boolean = false;

  protected async _doDownload(a: Attachment, where: FilesystemDirectory): Promise<FileWriteResult> {
    this._attDownloading = true;
    const fileName = this.message ? `${this.message.Uid}-${a.FileName}` : a.FileName;
    const result = await this._api.downloadAttachment(this.account, a, fileName, where, this.message);
    this._attDownloading = false;
    return result;
  }

  protected async _downloadAttachment(att: Attachment) {
    const result = await this._doDownload(att, FilesystemDirectory.Documents);
    if (result == null) {
      return ;
    }
    this.alert('Attachment downloaded', result.uri);
  }

  protected async _viewAttachment(a: Attachment) {
    const result = await this._doDownload(a, FilesystemDirectory.Documents);
    if (result == null) {
      return ;
    }
    this._intent.startActivity({
      action: this._intent.ACTION_VIEW, 
      url: result.uri, 
      type: a.MimeType,
    });
  }

  protected _removeAttachment(a: Attachment) {
    const idx = this.attachments.findIndex(_a => _a.Actions.view == a.Actions.view);
    if (idx != -1) {
      this.attachments.splice(idx, 1);
    }
  }
}
