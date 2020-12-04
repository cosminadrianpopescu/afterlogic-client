import {Injectable} from '@angular/core';
import {BaseClass} from '../base';
import {NgInject} from '../decorators';
import {Store} from './store';
import {Contact, Message, Contacts as Model} from '../models';
import {Api} from './api';
import {ReplaySubject} from 'rxjs';
import {take} from 'rxjs/operators';

const CONTACTS_KEY = 'contacts';

@Injectable()
export class Contacts extends BaseClass {
  @NgInject(Store) private _store: Store;
  @NgInject(Api) private _api: Api;
  public contacts: Array<Contact> = [];
  private _ready$ = new ReplaySubject(1);

  private _getCollection(a: Model): Array<Contact> {
    if (!a || !Array.isArray(a.Collection)) {
      return [];
    }

    return a.Collection;
  }
  
  private async _init() {
    this.contacts = await this._store.load(CONTACTS_KEY, Contact, []) as Array<Contact>;
    this._ready$.next();
    this._api.messagesUpdated$.subscribe((messages: Array<Message>) => {
      const list = messages.map(m => this._getCollection(m.From)
        .concat(this._getCollection(m.To))
        .concat(this._getCollection(m.Bcc))
        .concat(this._getCollection(m.Cc)))
        .reduce((acc, v) => acc.concat(v), []);

      this.add(list);
    })
  }

  constructor() {
    super();
    this._init();
  }

  public async add(what: Contact | Array<Contact>) {
    await new Promise(resolve => this._ready$.pipe(take(1)).subscribe(resolve));
    (Array.isArray(what) ? what : [what])
      .forEach(c => {
        if (this.contacts.map(c => c.Email).indexOf(c.Email) == -1) {
          this.contacts.push(c);
          return ;
        }

        const contact = this.contacts.find(_c => _c.Email == c.Email);
        contact.DisplayName = c.DisplayName;
      });
    await this._store.save(CONTACTS_KEY, this.contacts);
  }
}
