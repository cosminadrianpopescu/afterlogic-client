import {Component} from '@angular/core';
import {BaseComponent} from '../base';
import {NgCycle, NgInject} from '../decorators';
import {Account, Folder, Message, Contact, ModelFactory, MessageNotify, MessageBody, LabelValue} from '../models';
import {Mails} from '../services/mails';
import {Api} from '../services/api';
import {NextcloudItem} from '../nextcloud/models';

@Component({
  selector: 'al-playground', 
  templateUrl: '../../html/playground.html'
})
export class Playground extends BaseComponent {
  @NgInject(Mails) private _mails: Mails;
  @NgInject(Api) private _api: Api;

  protected _account: Account;
  protected _message: Message = null;
  protected _body: MessageBody = null;
  protected _folder: string;
  protected _inputModel: string = '';
  protected _contact: Contact;
  protected _city: LabelValue = null;

  protected _cities = [
    {label: 'New York', value: 'NY'},
    {label: 'Rome', value: 'RM'},
    {label: 'London', value: 'LDN'},
    {label: 'Istanbul', value: 'IST'},
    {label: 'Paris', value: 'PRS'}
  ];

  @NgCycle('init')
  protected async _initMe() {
    this._contact = ModelFactory.instance(<Contact>{Email: 'cosmin@taid.be', DisplayName: 'Cosmin Popescu'}, Contact) as Contact;
    this.showLoading();
    this.connect(this._mails.currentAccount$, async account => {
      this._account = account;
      this.hideLoading();
      // this._body = await this._api.getMessageBody(this._account, '[Gmail]/Drafts', '11021');
    });
  }

  protected _folderNotify(f: Folder) {
    console.log('selected folder', f);
    this._folder = f.Id;
  }

  protected _messageNotify(m: Message) {
    this._message = m;
    console.log('message is', m);
  }

  protected _msgBodyNotify(ev: MessageNotify) {
    console.log('notified with', ev);
  }

  protected _choose(ev: Array<NextcloudItem>) {
    console.log('selection is', ev);
  }

  protected _iconClick() {
    console.log('click icon');
  }
}
