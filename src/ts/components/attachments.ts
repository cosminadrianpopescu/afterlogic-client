import {Component, Input} from '@angular/core';
import {FilesystemDirectory, FileWriteResult} from '@capacitor/core';
import {WebIntent} from '@ionic-native/web-intent/ngx';
import {BaseComponent} from '../base';
import {NgInject, NgCycle} from '../decorators';
import {Account, Attachment, MessageBody} from '../models';
import {Api} from '../services/api';
import {Mails} from '../services/mails';
import {Settings} from '../services/settings';
import {Nextcloud} from '../nextcloud/nextcloud';
import {Platform} from '@ionic/angular';

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
  @NgInject(Nextcloud) private _nc: Nextcloud;
  @NgInject(Mails) private _mails: Mails;
  @NgInject(Settings) private _settings: Settings;
  @NgInject(Platform) private _platform: Platform;
  protected _attDownloading: boolean = false;
  protected _isCloud: boolean = false;

  @NgCycle('init')
  protected _initMe() {
    this._isCloud = this._nc.isNextcloud;
  }

  protected async _doDownload(a: Attachment, where: FilesystemDirectory, preview: boolean = false): Promise<FileWriteResult> {
    this._attDownloading = true;
    const fileName = this.message ? `${this.message.Uid}-${a.FileName}` : a.FileName;
    const result = await this._api.downloadAttachment(this.account, a, fileName, where, this.message, preview);
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
    const result = await this._doDownload(a, FilesystemDirectory.Documents, true);
    if (result == null) {
      return ;
    }
    this._intent.startActivity({
      action: this._intent.ACTION_VIEW, 
      url: decodeURIComponent(result.uri), 
      type: a.MimeType,
    });
  }

  protected _removeAttachment(a: Attachment) {
    const idx = this.attachments.findIndex(_a => _a.Actions.view == a.Actions.view);
    if (idx != -1) {
      this.attachments.splice(idx, 1);
    }
  }

  protected async _uploadToCloud(att: Attachment) {
    if (!this.message) {
      return ;
    }

    if (!att.Actions.download) {
      throw 'NO_DOWNLOAD_ACTION';
    }
    const server = await this._settings.getServer();
    const folder = await this._nc.pickFolder(this._platform.is('android'));
    if (!folder) {
      return ;
    }
    const a = this._mails.accountById(this.message.AccountID);
    const content = await this._api.getAttachmentContent(a, `${server.url}/${att.Actions.download}`);
    const path = `${folder}/${att.FileName}`;
    const uPath = await this._nc.upload(path, content);
    this.alert('File uploaded to the cloud', uPath);
  }
}
