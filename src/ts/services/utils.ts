import {Collection, ComposedResult, Contact, Folder, FolderType, MessageCompose, SearchModel, StringParsing, UserSetting} from '../models';
import {AsciiMap} from '../map';

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

  private static _parseSearch(s: string): Array<StringParsing> {
    const result: Array<StringParsing> = [];
    let inQ: boolean = false;
    let inS: boolean = false;
    let token: string = '';

    const add = (token: string): void => {
      if (!token) {
        return ;
      }
      if (result.length > 0 && result[result.length - 1].operator && !result[result.length - 1].operand) {
        result[result.length - 1].operand = token;
      }
      else {
        const f = result.find(s => s.operator == 'body');
        if (f) {
          f.operand += ` ${token}`;
        }
        else {
          result.push(new StringParsing("body", token));
        }
      }
    }

    for (let i = 0; i < s.length; i++) {
      if (s[i] == ":" && !token && !inQ && !inS) {
        return [];
      }

      if (s[i] == ":" && !inQ && !inS) {
        result.push(new StringParsing(token));
        token = '';
        continue;
      }

      if (s[i] == "'" && !inQ && !inS) {
        inQ = true;
        continue ;
      }
      else if (s[i] == '"' && !inQ && !inS) {
        inS = true;
        continue ;
      }
      else if ((s[i] == "'" && inQ) || (s[i] == '"' && inS) || (s[i] == ' ' && !inS && !inQ)) {
        inQ = false;
        inS = false;

        add(token);

        token = '';
        continue;
      }

      token += s[i];
    }

    if (token != '') {
      add(token);
    }
    return result;
  }

  public static normalizeSearch(s: string): string {
    const c = Utils._parseSearch(s);

    return c.map(s => `${s.operator}:"${s.operand}"`).join(' ');
  }

  public static addThemeToBody(t: string) {
    document.body.className = `${document.body.className || ''} ${t}`;
  }
/*
  public static toAscii(sStr: string): string {
    const sArray = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S',
      'T','U','V','W','X','Y','Z', 'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o',
      'p','q','r','s','t','u','v','w','x','y','z', '0','1','2','3','4','5','6','7','8','9','+',','];

    let sLen = sStr.length;
    let bIsB = false;
    let iIndex = 0, iN = 0;
    let sReturn = '';
    let iCh = 0, iB = 0, iK = 0;
    let iC: number, iO: number;

    while (sLen)
    {
      iC = sStr.charCodeAt(iIndex);
      if (iC < 0x80)
      {
        iCh = iC;
        iN = 0;
      }
      else if (iC < 0xc2)
      {
        throw new Error('ENCODING');
      }
      else if (iC < 0xe0)
      {
        iCh = iC & 0x1f;
        iN = 1;
      }
      else if (iC < 0xf0)
      {
        iCh = iC & 0x0f;
        iN = 2;
      }
      else if (iC < 0xf8)
      {
        iCh = iC & 0x07;
        iN = 3;
      }
      else if (iC < 0xfc)
      {
        iCh = iC & 0x03;
        iN = 4;
      }
      else if (iC < 0xfe)
      {
        iCh = iC & 0x01;
        iN = 5;
      }
      else
      {
        throw new Error('ENCODING');
      }

      iIndex++;
      sLen--;

      if (iN > sLen)
      {
        throw new Error('ENCODING');
      }

      for (let iJ = 0; iJ < iN; iJ++)
      {
        iO = sStr.charCodeAt(iIndex + iJ);
        if ((iO & 0xc0) != 0x80)
        {
          throw new Error('ENCODING');
        }

        iCh = (iCh << 6) | (iO & 0x3f);
      }

      if (iN > 1 && !(iCh >> (iN * 5 + 1)))
      {
        throw new Error('ENCODING');
      }

      iIndex += iN;
      sLen -= iN;

      if (iCh < 0x20 || iCh >= 0x7f)
      {
        if (!bIsB)
        {
          sReturn += '&';
          bIsB = true;
          iB = 0;
          iK = 10;
        }

        if (iCh & ~0xffff)
        {
          iCh = 0xfffe;
        }

        sReturn += sArray[(iB | iCh >> iK)];
        iK -= 6;
        for (; iK >= 0; iK -= 6)
        {
          sReturn += sArray[((iCh >> iK) & 0x3f)];
        }

        iB = (iCh << (-iK)) & 0x3f;
        iK += 16;
      }
      else
      {
        if (bIsB)
        {
          if (iK > 10)
          {
            sReturn += sArray[iB];
          }
          sReturn += '-';
          bIsB = false;
        }

        sReturn += String.fromCharCode(iCh);
        if ('&' === String.fromCharCode(iCh))
        {
          sReturn += '-';
        }
      }
    }

    if (bIsB)
    {
      if (iK > 10)
      {
        sReturn += sArray[iB];
      }

      sReturn += '-';
    }

    return sReturn;
  }

  public static fromAscii(s: string): string {
    let result = '';
    let i = 0;
    const entries = Object.entries(AsciiMap);
    while (i < s.length) {
      if (s[i] != '&') {
        result += s[i];
        i++;
        continue;
      }

      if (i + 1 < s.length && s[i + 1] == '-') {
        result += String.fromCharCode(43);
        i += 2;
        continue;
      }

      if (i + 4 < s.length && s[i + 4] == '-') {
        const value = `${s[i]}${s[i + 1]}${s[i + 2]}${s[i + 3]}${s[i + 4]}`;
        const idx = entries.map(e => e[1]).indexOf(value);
        result += idx == -1 ? s[i] : String.fromCharCode(parseInt(entries[idx][0]));
        i += idx == -1 ? 1 : 5;
        continue;
      }

      result += s[i];
      i++;
      continue;
    }

    return result;
  }
*/
  public static setFoldersAccounts(id: string, folders: Array<Folder>) {
    folders.forEach(f => {
      f.AccountID = id;
      if (!Array.isArray(f.SubFolders)) {
        return ;
      }
      Utils.setFoldersAccounts(id, f.SubFolders);
    });
  }
}
