import {Type} from '@angular/core';
import * as dateFormat from 'dateformat';
import {ReplaySubject} from 'rxjs';
import {Convertor, deserialize, deserializers} from './decorators';

export const COMBINED_ACCOUNT_ID = "-1";

export enum LogLevel {DEBUG = 0, INFO = 1, ERROR = 2};
export enum FolderType {Inbox = 1, Sent = 2, Drafts = 3, Spam = 4, Trash = 5, Other = 10};

export type Primitive = boolean | string | number;
export type ObjectType<T> = T | Primitive | Array<T | Primitive>;

export type ThemeType = 'dark' | 'light';

export type AttPreviewType = 'local' | 'cloud';

export interface Collection<T> {
  Count: number;
  Collection: Array<T>;
}

export class ModelFactory {
  private static _primitive(obj: Primitive): Primitive {
    if (typeof(obj) == 'boolean') {
      return obj as boolean;
    }

    if (typeof(obj) == 'string') {
      return obj as string;
    }

    if (typeof(obj) == 'number') {
      return obj as number;
    }
  }

  private static _create<T>(json: Object, type: Type<T>): T {
    const result = new type();
    Object.keys(json).map(k => k.replace(/^@/g, '')).forEach(k => {
      const d = deserializers(type).find(d => d.prop == k);
      const value = typeof(json['@' + k]) == 'undefined' ? json[k] : json['@' + k];
      if (!d || typeof(value) == undefined || value == null) {
        result[k] = value;
        return ;
      }
      if (d.arg == 'date') {
        result[k] = new Date(json[k]);
        return ;
      }
      if (typeof(d.arg) == 'function' && !!d.arg.prototype['convert']) {
        const convertor: Convertor<any> = new d.arg();
        result[k] = convertor.convert(value);
        return ;
      }
      result[k] = ModelFactory.instance(value, d.arg);
    });
    return result;
  }
  public static instance<T>(json: ObjectType<Object>, type?: Type<T>): ObjectType<T> {
    if (typeof(json) == undefined || json == null) {
      return null;
    }

    if (typeof(type) == 'undefined') {
      if (typeof(json) == 'object' && !Array.isArray(json)) {
        throw Error('UNKNOWN_TYPE');
      }

      if (Array.isArray(json)) {
        return json.map(o => ModelFactory._primitive(o as Primitive) as Primitive);
      }

      return ModelFactory._primitive(json) as Primitive;
    }

    if (Array.isArray(json)) {
      return json.map(j => ModelFactory._create(j, type));
    }
    return ModelFactory._create(json, type);
  }
}

export async function to<T>(promise: Promise<T>): Promise<[Error, T]> {
  try {
    const data = await promise;
    return [null, data];
  }
  catch (err) {
    return [err, null];
  }
}

export class UserSetting {
  email: string;
  pass: string;
  token?: string;
}

export class ServerSetting {
  url: string;
  users: Array<UserSetting>;
}

export class HttpResponse {
  Module: string;
  Method: string;
  Result: Object;
  ErrorCode?: number;
  ErrorMessage?: string;
}

export class Server {
  EntityId: number;
  UUID: string;
  TenantId: number;
  Name: string;
  IncomingServer: string;
  IncomingPort: number;
  IncomingUseSsl: boolean;
  OutgoingServer: string;
  OutgoingPort: number;
  OutgoingUseSsl: boolean;
  SmtpAuthType: string;
  OwnerType: string;
  Domaina: string;
  ServerId: number;
}

export class Authentication {
  AuthToken: string;
}

export class Folder {
  Id: string;
  Name: string;
  Count?: number;
  Unread?: number;
  @deserialize(Folder)
  SubFolders?: Array<Folder>;
  AccountID: string;
  Type?: FolderType;
}

export class Contact {
  DisplayName?: string;
  Email: string;
  IsTrusted?: boolean;
}

export class Contacts {
  Count: number;
  @deserialize(Contact)
  Collection: Array<Contact>;
}

export class Message {
  Folder: string;
  AccountID: string;
  Uid: string;
  Subject: string;
  MessageId: string;
  Size: number;
  TextSize: number;
  InternalTimeStampInUTC: number;
  ReceivedOrDateTimeStampInUTC: number;
  TimeStampInUTC: number;
  @deserialize(Contacts)
  From: Contacts;
  @deserialize(Contacts)
  To: Contacts;
  @deserialize(Contacts)
  Cc: Contacts;
  @deserialize(Contacts)
  Bcc: Contacts;
  @deserialize(Contacts)
  ReplyTo: Contacts;
  IsSeen: boolean;
  IsFlagged: boolean;
  IsAnswered: boolean;
  IsForwarded: boolean;
  HasAttachments: boolean;
  HasVcardAttachment: boolean;
  HasIcalAttachment: boolean;
  Importance: number;
  // TODO: check an example and see how this goes
  DraftInfo: Array<any>;
  Sensitivity: number;
  TrimmedTextSize: number;
  DownloadAsEmlUrl: string;
  Hash: string;
  Threads: Array<string>;
}

export class Messages {
  Count: number;
  @deserialize(Message)
  Collection: Array<Message>;
  Uids: Array<string>;
  UidNext: string;
  FolderHash: string;
  MessageCount: number;
  MessageUnseenCount: number;
  MessageResultCount: number;
  FolderName: string;
  Offset: number;
  Limit: number;
  Search: number;
  Filters: string;
  // TODO: check out the type
  New: Array<any>;
}

export class Action {
  view: string;
  download: string;
}

class ActionConvertor implements Convertor<Object> {
  public convert(src: Object): Action {
    const result = new Action();
    if (src['view']) {
      result.view = src['view'].url;
    }

    if (src['download']) {
      result.download = src['download'].url;
    }

    return result;
  }
}

export class SearchConvertor implements Convertor<string> {
  private _add(result: string, key: string, value: string): string {
    if (!value) {
      return result;
    }
    return result + (result == '' ? '' : ' ') + `${key}:"${value}"`;
  }

  private _date(d: Date): string {
    if (!d) {
      return '';
    }

    return dateFormat(d, 'yyyy.mm.dd');
  }
  public convert(src: SearchModel): string {
    let result = '';
    result = this._add(result, 'from', src.from);
    result = this._add(result, 'to', src.to);
    result = this._add(result, 'subject', src.subject);
    result = this._add(result, 'text', src.text);
    if (src.unseen && src.attachments) {
      result = this._add(result, 'has', 'attachments unseen');
    }
    else if (src.attachments) {
      result = this._add(result, 'has', 'attachments');
    }
    else if (src.unseen) {
      result = this._add(result, 'has', 'unseen');
    }
    if (src.since || src.till) {
      result = this._add(result, 'date', `${this._date(src.since)}/${this._date(src.till)}`)
    }
    result = this._add(result, 'folder', src.folder);
    return result;
  }
}

export class FoldersConvertor implements Convertor<Array<Folder>> {
  private _addNewFolder(x: string, possibleParents: Array<Folder>) {
    const parts = x.split('/');
    const name = parts[parts.length - 1];
    const f = new Folder();
    f.Id = x;
    f.Count = 0;
    f.Unread = 0;
    f.Name = name;
    f.SubFolders = [];

    if (parts.length == 1) {
      possibleParents.push(f);
      return ;
    }
    const parentName = parts[parts.length - 2];
    const parent = possibleParents.find(p => p.Name == parentName);
    if (!parent) {
      return ;
    }

    parent.SubFolders.push(f);
  }
  public convert(src: string): Array<Folder> {
    if (!src) {
      return [];
    }

    let arr: Array<string>
    try {
      arr = JSON.parse(src);
    }
    catch {
      arr = [];
    }

    arr.sort((a, b) => a.split('/').length - b.split('/').length);
    const levels = arr[arr.length - 1].split('/').length;

    const result: Array<Folder> = [];

    const tree: Map<number, Array<Folder>> = new Map<number, Array<Folder>>();

    for (let level = 1; level <= levels; level++) {
      const items = arr.filter(x => x.split('/').length == level);
      if (level == 1) {
        items.forEach(i => this._addNewFolder(i, result));
        tree.set(level, result);
        continue;
      }

      items.forEach(i => this._addNewFolder(i, tree.get(level - 1)))
      tree.set(level, tree.get(level - 1).map(x => x.SubFolders).reduce((acc, v) => acc.concat(v), []));
    }

    return result;
  }
}

export class Attachment {
  FileName: string;
  MimeType: string;
  MimePartIndex: string;
  EstimatedSize: number;
  Size: number;
  CID: string;
  ContentLocation: string;
  Content: string;
  IsInline: boolean;
  IsLinked: boolean;
  TempName: string;
  ThumbnailUrl: string;
  Hash: string;
  @deserialize(ActionConvertor)
  Actions: {view?: string; download?: string};
}

export class Attachments {
  Count: number;
  @deserialize(Attachment)
  Collection: Array<Attachment>;
}

export class MessageBody extends Message {
  // TODO: For the moment, we can't deserialize the parent class.
  // This should be fixed.
  @deserialize(Contacts)
  From: Contacts;
  @deserialize(Contacts)
  To: Contacts;
  @deserialize(Contacts)
  Cc: Contacts;
  @deserialize(Contacts)
  Bcc: Contacts;
  @deserialize(Contacts)
  ReplyTo: Contacts;
  Headers: string;
  InReplyTo: string;
  References: string;
  ReadingConfirmationAddressee: string;
  Html: string;
  Trimmed: boolean;
  Plain: string;
  PlainRaw: string;
  Rtl: boolean;
  Extend: Array<string>;
  Safety: boolean;
  HasExternals: boolean;
  FoundedCIDs: Array<string>;
  FoundedContentLocationUrls: Array<string>;
  @deserialize(Attachments)
  Attachments: Attachments;
}

export class Account {
  AccountID: string;
  UUID: string;
  UseToAuthorize: boolean;
  Email: string;
  FriendlyName: string;
  @deserialize(Server)
  Server: Server;
  CanBeUsedToAuthorize: boolean;
  UseThreading: boolean;
  @deserialize(FoldersConvertor)
  FoldersOrder: Array<Folder>;
  Folders$: ReplaySubject<Array<Folder>> = new ReplaySubject<Array<Folder>>();
  TypesSet: boolean = false;
}

export class FoldersInfoResult {
  Counts: {[key: string]: Array<string | number>};
}

export class SearchModel {
  simple: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  since: Date;
  till: Date;
  attachments: boolean;
  unseen: boolean;
  folder: string;
}

export type ComposeNotifyType = 'sent' | 'cancel' | 'error';
export type ComposeType = 'new' | 'from-draft' | 'reply' | 'reply-all' | 'forward' | 'edit-new';

export class MessageNotify {
  type: ComposeType;
  contact?: Contact;
  message?: Message;
}

export class DisplayContact extends Contact {
  display: string;
}

export class MessageCompose {
  To: Array<DisplayContact>;
  Cc: Array<DisplayContact>;
  Bcc: Array<DisplayContact>;
  ReplyTo: Array<DisplayContact>;
  InReplyTo: string;
  References: string;
  Body: string;
  Subject: string;
  Attachments: Array<Attachment>;
  AccountID: string;
  DraftUid: string;
  DraftInfo: Array<string | number> = [];
}

export class ContactConvertor implements Convertor<DisplayContact> {
  public convert(src: Contact): DisplayContact {
    const result = ModelFactory.instance(src, DisplayContact) as DisplayContact;
    result.display = result.DisplayName || result.Email;

    return result;
  }
}

export class ReplyToBodyConvertor implements Convertor<string> {
  public convert(msg: MessageBody): string {
    const d = new Date(msg.TimeStampInUTC * 1000);
    const c = msg.From.Collection[0];
    return `
<br/>
<br/>
On ${dateFormat(d, 'ddd, mmm dd "at" HH:MM')}, ${c.DisplayName || c.Email} wrote:
<blockquote>${msg.Html || msg.Plain}</blockquote>
`;
  }
}

export class ForwardBodyConvertor implements Convertor<string> {
  private _collection(contacts: Collection<Contact>): string {
    if (!contacts || !Array.isArray(contacts.Collection)) {
      return '';
    }
    return contacts.Collection.map(c => c.DisplayName ? `${c.DisplayName} &lt;${c.Email}&gt;` : c.Email).join(', ');
  }
  public convert(msg: MessageBody): string {
    const d = new Date(msg.TimeStampInUTC * 1000);
    const cc = this._collection(msg.Cc);
    return `
<br/>
---- Original message ----<br/>
From: ${this._collection(msg.From)}<br/>
To: ${this._collection(msg.To)}<br/>
${cc ? 'CC: ' + cc + '<br/>' : ''}
Sent: ${dateFormat(d, 'ddd, mmm dd, yyyy HH:MM')}<br/>
Subject: ${msg.Subject}<br/>
<br/>
${msg.Html || msg.Plain}
`;
  }
}

export class MessageComposeConvertor implements Convertor<MessageCompose> {
  public composeType: ComposeType = 'new';
  public currentEmail: string = null;
  private _conv: ContactConvertor = new ContactConvertor();
  private _convertCollection(c: Collection<Contact>): Array<DisplayContact> {
    if (!c || !Array.isArray(c.Collection)) {
      return [];
    }

    return c.Collection.map(c => this._conv.convert(c));
  }
  public convert(src: MessageBody): MessageCompose {
    const result = new MessageCompose();
    if (!src) {
      result.Body = '';
      result.Subject = '';
      result.Attachments = [];
      result.Bcc = [];
      result.Cc = [];
      result.To = [];
      result.ReplyTo = [];
      result.DraftInfo = [];
    }
    else {
      result.Body = src.Html || src.Plain;
      result.Subject = src.Subject;
      result.Attachments = src.Attachments ? src.Attachments.Collection : [];
      result.Bcc = this._convertCollection(src.Bcc);
      result.AccountID = src.AccountID;
      result.Cc = this._convertCollection(src.Cc);
      result.To = this._convertCollection(src.To);
      result.ReplyTo = this._convertCollection(src.ReplyTo);
      result.DraftInfo = src.DraftInfo;
      if (this.composeType == 'from-draft') {
        result.DraftUid = src.Uid;
      }
      if (['reply', 'reply-all'].indexOf(this.composeType) != -1) {
        result.To = this._convertCollection(src.From)
        if (this.composeType == 'reply-all') {
          result.To = result.To
            .concat(this._convertCollection(src.To).filter(c => c.Email != this.currentEmail));
          result.Cc = this._convertCollection(src.Cc).filter(c => c.Email != this.currentEmail);
        }
        const conv = new ReplyToBodyConvertor();
        result.Body = conv.convert(src);
        result.Attachments = [];
        result.Subject = `Re: ${result.Subject}`;
        result.InReplyTo = src.MessageId;

        if (!result.DraftInfo || !Array.isArray(result.DraftInfo) || result.DraftInfo.length == 0) {
          result.DraftInfo = [this.composeType, src.Uid, src.Folder];
        }
      }

      if (this.composeType == 'forward') {
        result.To = [];
        result.Cc = [];
        result.References = ` ${src.MessageId}`;
        result.InReplyTo = src.MessageId;
        const conv = new ForwardBodyConvertor();
        result.Body = conv.convert(src);
        result.Subject = `Fwd: ${src.Subject}`;
        if (!result.DraftInfo || !Array.isArray(result.DraftInfo) || result.DraftInfo.length == 0) {
          result.DraftInfo = ["forward", src.Uid, src.Folder];
        }
      }
    }
    return result;
  }
}

export type MessageComposeType = 'HTML' | 'TEXT';

export class FileResult {
  content: File;
  path: string;
  type: string;
}

export class UploadResult {
  @deserialize(Attachment)
  Attachment: Attachment;
}

export class Identity {
  EntityId: string;
  UUID: string;
  IdUser: string;
  IdAccount: string;
  Email: string;
  FriendlyName: string;
  UseSignature: boolean;
  Signature: string;
}

export class MessageSave {
  FetcherID: string = '';
  DraftInfo: Array<any> = [];
  DraftUid: string;
  To: string;
  Cc: string;
  Bcc: string;
  Subject: string;
  Text: string;
  IsHtml: boolean;
  Importance: number = 3;
  SendReadingConfirmation: boolean = false;
  Attachments: Object;
  InReplyTo: string;
  References: string = ''
  Sensitivity: number = 0;
}

export class MessageSaveConvertor implements Convertor<MessageSave> {
  private _mapCollection(arr: Array<DisplayContact>): string {
    return arr.map(a => a.DisplayName ? `${a.DisplayName} <${a.Email}>` : a.Email).join(",");
  }
  public convert(src: MessageCompose): MessageSave {
    const result = new MessageSave();
    result.To = this._mapCollection(src.To);
    result.Cc = this._mapCollection(src.Cc);
    result.Bcc = this._mapCollection(src.Bcc);
    result.Subject = src.Subject;
    result.DraftUid = src.DraftUid;
    result.DraftInfo = src.DraftInfo;
    result.Text = src.Body;
    result.IsHtml = true;
    result.Attachments = src.Attachments.reduce((acc, v) => {
      acc[v.TempName] = [v.FileName, "", "0", "0", ""];
      return acc;
    }, {});
    result.InReplyTo = src.InReplyTo;
    result.References = src.References;
    return result;
  }
}

export class SaveMessageResponse {
  NewFolder: string;
  NewUid: string;
}

export class ComposedResult<T> {
  account: Account;
  result: T | Array<T>;
}

export class FormDataSerialized {
  data: string;
  boundary: string;
}

export class LabelValue {
  label: string;
  value: string | number | boolean;

  public getValue?(): LabelValue {
    console.log('this is', this);
    return this;
  }
}

export class AppSetting {
  model: LabelValue;
  options: Array<LabelValue>;
}

export class AppSettings {
  @deserialize(ServerSetting)
  server: ServerSetting;
  @deserialize(AppSetting)
  pageSize: AppSetting;
  @deserialize(AppSetting)
  composeType: AppSetting;
  @deserialize(AppSetting)
  checkEmailInterval: AppSetting;
  previewInCloud: boolean;
  backgroundImage: boolean;
  compact: boolean;
  showAvatar: boolean;
  nextcloudUrl: string;
  @deserialize(AppSetting)
  theme: AppSetting;
}

export class StringParsing {
  constructor(public operator: string, public operand?: string){}
}

export const ALL_MAIL = '[Gmail]/All Mail';
