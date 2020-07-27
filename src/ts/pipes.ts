import {Pipe} from '@angular/core';
import * as dateFormat from 'dateformat';
import {TreeNode} from 'primeng/api';
import {merge, Observable, of} from 'rxjs';
import {map, filter} from 'rxjs/operators';
import {BaseClass} from './base';
import {NgInject} from './decorators';
import {Account, Folder, Message, Contact, Contacts, MessageBody, Attachment, COMBINED_ACCOUNT_ID, ModelFactory} from './models';
import {Api} from './services/api';
import {Utils} from './services/utils';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {Mails} from './services/mails';

@Pipe({name: 'foldersTree'})
export class FoldersTree extends BaseClass {
  public transform(folders: Array<Folder>): Array<TreeNode> {
    if (!folders || !Array.isArray(folders)) {
      return [];
    }
    return folders.map(f => <TreeNode> {
      label: f.Unread > 0 ? `${f.Name} (${f.Unread})` : f.Name,
      children: this.transform(f.SubFolders),
      data: f,
      selectable: f.SubFolders.length == 0,
   })
  }
}

@Pipe({name: 'folderLabel'})
export class FolderLabel extends BaseClass {
  @NgInject(Api) private _api: Api;
  private _label(f: Folder) {
    return f.Unread > 0 ? `${f.Name} (${f.Unread})` : f.Name;
  }
  transform(folder: Folder): Observable<string> {
    return merge(
      of(this._label(folder)),
      this._api.folderUpdated$.pipe(filter(f => f.Id == folder.Id)),
    ).pipe(
      map(result => {
        if (typeof(result) == 'string') {
          return result;
        }

        return this._label(result as Folder);
      })
    )
  }
}

@Pipe({name: 'attachmentsList'})
export class AttachmentsList extends BaseClass {
  transform(m: MessageBody): Array<Attachment> {
    return Utils.extractCollection(m.Attachments);
  }
}

@Pipe({name: 'messageDate'})
export class MessageDate extends BaseClass {
  private _sameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() == d2.getFullYear() && d1.getMonth() == d2.getMonth() && d1.getDate() == d2.getDate();
  }

  public transform(message: Message): string {
    const d1 = new Date();
    const d2 = new Date(message.TimeStampInUTC * 1000);
    if (this._sameDay(d1, d2)) {
      return dateFormat(d2, 'hh:MM');
    }

    const d3 = new Date(d2.getTime() + 24 * 60 * 60 * 1000);
    if (this._sameDay(d1, d3)) {
      return 'Yesterday, ' + dateFormat(d2, 'hh:MM');
    }

    if (d1.getTime() - d2.getTime() <= 15 * 24 * 60 * 60 * 1000) {
      return dateFormat(d2, 'mmm dd');
    }

    return dateFormat(d2, 'mmm dd, yyyy');
  }
}

@Pipe({name: 'messageFrom'})
export class MessageFrom extends BaseClass {
  public transform(msg: Message): Contact {
    if (!msg.From && msg.From.Count < 1) {
      return null;
    }

    return msg.From.Collection[0];
  }
}

@Pipe({name: 'messageFromTxt'})
export class MessageFromTxt extends BaseClass {
  transform(c: Contact): string {
    return c.DisplayName || c.Email;
  }
}

@Pipe({name: 'messageFromTxtFull'})
export class MessageFromTxtFull extends BaseClass {
  transform(c: Contact): string {
    const toSpan = (x: string) => `<span style="color: blue">${x}</span>`;
    return c.DisplayName ? `${c.DisplayName} (${toSpan(c.Email)})` : toSpan(c.Email);
  }
}

@Pipe({name: 'asHtml'})
export class AsHtml extends BaseClass {
  @NgInject(<any>DomSanitizer) private _sanitizer: DomSanitizer;
  transform(html: string): SafeHtml {
    return this._sanitizer.bypassSecurityTrustHtml(html);
  }
}

@Pipe({name: 'contactsListTxt'})
export class ContactsListTxt extends BaseClass {
  transform(c: Contacts): string {
    const collection = Utils.extractCollection(c);
    if (collection.length == 0) {
      return '';
    }

    const pipe = new MessageFromTxtFull();
    return collection
      .map(c => pipe.transform(c))
      .reduce((acc, v) => acc + (acc == '' ? '' : ', ') + v, '');
  }
}

@Pipe({name: 'contactsArray'})
export class ContactsArray extends BaseClass {
  transform(c: Contacts) : Array<Contact>{
    return Utils.extractCollection(c);
  }
}

@Pipe({name: 'avatarColor'})
export class AvatarColor extends BaseClass {
  public transform(c: Contact): string {
    return Utils.avatarColor(c);
  }
}

@Pipe({name: 'accountToContact'})
export class AccountToContact extends BaseClass {
  public transform(a: Account): Contact {
    return ModelFactory.instance(<Contact>{Email: a.Email, DisplayName: a.FriendlyName}, Contact) as Contact;
  }
}

@Pipe({name: 'avatarText'})
export class AvatarText extends BaseClass {
  public transform(c: Contact): string {
    const x = c.DisplayName || c.Email;
    return x.substr(0, 1).toUpperCase();
  }
}

@Pipe({name: 'humanFileSize'})
export class HumanFileSize extends BaseClass {
  public transform(size: number): string {
    const i = Math.floor( Math.log(size) / Math.log(1024) );
    return ( size / Math.pow(1024, i) ).toFixed(2) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
  }
}

@Pipe({name: 'fileIcon'})
export class FileIconPipe extends BaseClass {
  public transform(a: Attachment): string {
    if (a.MimeType.match(/pdf/i)) {
      return "file-pdf-o";
    }

    if (a.MimeType.match(/text|txt/i))  {
      return 'file-text-o';
    }

    if (a.MimeType.match(/excel/i)) {
      return 'file-excel-o';
    }

    if (a.MimeType.match(/word/i)) {
      return 'file-word-o';
    }

    if (a.MimeType.match(/gif|jpg|jpeg|png|bmp/i)) {
      return 'file-image-o';
    }

    return 'file-o';
  }
}

@Pipe({name: 'currentEmail'})
export class CurrentEmail extends BaseClass {
  public transform(a: Account): string {
    if (!a) {
      return '';
    }

    return a.FriendlyName ? `${a.FriendlyName} (${a.Email})` : a.Email;
  }
}

@Pipe({name: 'borderRight'})
export class BorderRight extends BaseClass {
  @NgInject(Mails) private _service: Mails;
  public transform(msg: Message): Observable<Object> {
    return this._service.currentAccount$.pipe(
      map(account => {
        if (account.AccountID != COMBINED_ACCOUNT_ID) {
          return {}
        };

        const a = this._service.accountById(msg.AccountID);

        if (!a) {
          return {};
        }

        const pipe = new AccountToContact();

        return {borderRight: `10px solid ${Utils.avatarColor(pipe.transform(a))}`};
      })
    );
  }
}

@Pipe({name: 'isCombinedAccount'})
export class IsCombinedAccount extends BaseClass {
  public transform(a: Account): boolean {
    return a.AccountID == COMBINED_ACCOUNT_ID;
  }
}

@Pipe({name: 'count'})
export class Count extends BaseClass {
  public transform(a: Array<any>): number {
    if (!Array.isArray(a)) {
      return 0;
    };

    return a.length;
  }
}