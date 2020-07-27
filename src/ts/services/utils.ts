import {MenuItem} from 'primeng/api';
import {Collection, COMBINED_ACCOUNT_ID, ComposedResult, Contact, Folder, FolderType, MessageCompose, SearchModel, ServerSetting, UserSetting} from '../models';

export class Utils {
  public static avatarColor(contact: Contact): string {
    const name = contact.DisplayName || contact.Email;
    let hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    let h = hash % 360;
    return 'hsl('+h+', 50%, 50%)';
  }

  public static extractCollection<T>(c: Collection<T>): Array<T> {
    if (!c || !Array.isArray(c.Collection)) {
      return [];
    }

    return c.Collection;
  }

  public static userByEmail(users: Array<UserSetting>, email: string): UserSetting {
    return users.find(u => u.email == email);
  }

  private static _searchFolder(folders: Array<Folder>, predicate: (f: Folder) => boolean): Folder {
    if (!Array.isArray(folders) || folders.length == 0) {
      return null;
    }
    const result = folders.find(predicate);

    return result || Utils._searchFolder(folders.map(f => f.SubFolders).reduce((acc, v) => acc.concat(v), []), predicate);

  }

  public static folderByType(type: FolderType, folders: Array<Folder>): Folder {
    return Utils._searchFolder(folders, (f => f.Type == type));
  }

  public static setFolderTypes(data: Array<Object>, folders: Array<Folder>) {
    if (data.length == 0) {
      return ;
    }

    data.forEach(_f => {
      const f = Utils.folderById(folders, _f['FullName']);
      if (!f) {
        return ;
      }

      f.Type = _f['Type'];
    });

    this.setFolderTypes(
      data
        .filter(d => !!d['SubFolders'] && Array.isArray(d['SubFolders']['@Collection']))
        .map(d => d['SubFolders']['@Collection'])
        .reduce((acc, v) => acc.concat(v), []),
      folders
    );
  }

  public static folderById(folders: Array<Folder>, id: string): Folder {
    return Utils._searchFolder(folders, (f => f.Id == id));
  }

  public static isDraftReply(msg: MessageCompose): boolean {
    return !!msg.DraftUid && msg.DraftInfo && Array.isArray(msg.DraftInfo) && msg.DraftInfo.length >= 3;
  }

  public static emptySearch(model: SearchModel): boolean {
    return !model.from && !model.to && !model.text && !model.till
      && !model.since && !model.simple && !model.subject && !model.attachments;
  }

  public static buildUserMenu(server: ServerSetting, callback: Function): Array<MenuItem> {
    if (!server || !Array.isArray(server.users)) {
      return [];
    }
    const f = (ev: any) => callback(ev.item);
    const result = server.users.map(u => <MenuItem>{
      label: u.email, icon: "fa fa-user", command: f, id: u.email,
    });
    if (server.users.length > 1) {
      result.push({label: 'Combined view', icon: 'fa fa-users', command: f, id: COMBINED_ACCOUNT_ID});
    }
    result.push({label: 'Settings', icon: 'fa fa-cog', command: f, id: 'settings'});

    return result;
  }

  public static isComposedResult<T>(x: T): boolean {
    return Array.isArray(x) && x.length > 0 && x[0] instanceof ComposedResult;
  }

  public static isCombinedFolder(id: string): boolean {
    if (!id.match(/^[0-9]+$/)) {
      return false;
    }
    return [FolderType.Sent, FolderType.Spam, FolderType.Inbox, FolderType.Trash, FolderType.Drafts].indexOf(parseInt(id)) != -1;
  }

  public static foldersFlatList(folders: Array<Folder>, result: Array<Folder>){
    result.push.apply(result, folders);
    folders.forEach(f => Utils.foldersFlatList(f.SubFolders, result));
  }

  public static foldersDiff(f1: string, f2: string) {
    if (f1.toLowerCase() == f2.toLowerCase()) {
      return false;
    }

    if (f1.toLowerCase() == "inbox" && f2.toLowerCase() == FolderType.Inbox.toString()) {
      return false;
    }

    return f1.toLowerCase() != f2.toLowerCase();
  }
}
