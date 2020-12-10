import {MenuItem} from 'primeng/api';
import {Collection, COMBINED_ACCOUNT_ID, ComposedResult, Contact, Folder, FolderType, MessageCompose, SearchModel, ServerSetting, UserSetting} from '../models';

const EXTRA_STYLES_ID = 'extra-styles';

export class Utils {
  public static avatarColor(contact: Contact): string {
    const name = contact.Email;
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
      && !model.since && !model.simple && !model.subject && !model.attachments && !model.unseen;
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

  public static foldersFlatList2(folders: Array<Folder>): Array<Folder> {
    const result = [];
    folders.forEach(f => {
      result.push(f);
      result.push(...Utils.foldersFlatList2(f.SubFolders));
    });

    return result;
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

  public static transformMessageBody(clientWidth: number, el: HTMLElement): string {
    if (el.scrollWidth <= clientWidth) {
      return null;
    }

    console.log('widths are', clientWidth, el.scrollWidth);

    const scale = clientWidth / el.scrollWidth;
    const x = (el.scrollWidth - clientWidth) / 2;
    const height = el.scrollHeight * scale;
    const y = (el.scrollHeight - height) / 2;
    // return '';
    return `transform: scale(${scale}) translate(-${x}px, -${y}px); max-height: ${height}px`;
  }

  /**
   * Returns an array. First result is the txt being searched
   * and the second one is the folder (if it is set in the criterias)
   */
  public static searchFolder(txt: string): Array<string> {
    if (!txt) {
      return ['', null];
    }
    const p = /^(.*) folder:"([^"]+)"$/;
    if (!txt.match(p)) {
      return [txt, null];
    }

    return [txt.replace(p, '$1'), txt.replace(p, '$2')];
  }

  public static parseThemeStyles(theme: string, image: boolean, isMobile: boolean) {
    if (isMobile) {
      return ;
    }
    if (!image) {
      const tag = document.querySelector(`#${EXTRA_STYLES_ID}`);
      if (tag) {
        document.head.removeChild(tag);
      }
      return ;
    }
    const html = document.querySelector('#theme-styles').innerHTML;
    const style = html.replace(/\{\{([^\}]+)\}\}/ig, (_substr: string, js: string) => {
      return eval(js);
    });

    let tag: HTMLStyleElement = document.querySelector(`#${EXTRA_STYLES_ID}`);
    if (!tag) {
      tag = document.createElement('style');
      tag.setAttribute('id', EXTRA_STYLES_ID)
      document.querySelector('head').append(tag);
    }

    tag.innerText = style;
  }
}
