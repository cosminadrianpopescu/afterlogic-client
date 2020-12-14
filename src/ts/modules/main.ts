import { Injector, NgModule, NgZone} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PreloadAllModules, RouteReuseStrategy, RouterModule } from '@angular/router';
import { FileChooser } from '@ionic-native/file-chooser/ngx';
import { HTTP } from '@ionic-native/http/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { WebIntent } from '@ionic-native/web-intent/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { BlockUIModule } from 'primeng/blockui';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipsModule } from 'primeng/chips';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule, Dropdown } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { SidebarModule } from 'primeng/sidebar';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TreeModule } from 'primeng/tree';
import { Statics, BaseComponent } from '../base';
import { Attachments } from '../components/attachments';
import { Avatar } from '../components/avatar';
import { Compose } from '../components/compose';
import { Editor } from '../components/editor';
import { FoldersList } from '../components/folders-list';
import { Loading } from '../components/loading';
import { Message } from '../components/message';
import { MessagesList } from '../components/messages-list';
import { Home } from '../pages/home';
import { Main as MainComponent } from '../pages/main';
import { Playground } from '../pages/playground';
import { Settings as SettingsPage } from '../pages/settings';
import * as pipes from '../pipes';
import { routes } from '../routing';
import { Api } from '../services/api';
import { Contacts } from '../services/contacts';
import { FileService } from '../services/file';
import { Layout } from '../services/layout';
import { Mails } from '../services/mails';
import { Navigation } from '../services/navigation';
import { DefaultRouteReuseStrategy } from '../services/route-reuse';
import { Settings } from '../services/settings';
import { Store } from '../services/store';
import {Background} from '../services/background';
import {Nextcloud} from '../nextcloud/nextcloud';
import {DynamicDialogModule, DialogService} from 'primeng/dynamicdialog';
import {Webdav} from '../nextcloud/webdav';
import {Filepick} from '../nextcloud/filepick';
import {PinchZoomModule} from 'ngx-pinch-zoom';
import {SplitButtonModule} from 'primeng/splitbutton';
import {RippleModule} from 'primeng/ripple';
import {Button} from '../components/primeng-wrappers/button';
import {TextInput} from '../components/primeng-wrappers/input';
import {Dropdown as MyDropdown} from '../components/primeng-wrappers/dropdown';
import {CardModule} from 'primeng/card';
import {InputSwitchModule} from 'primeng/inputswitch';
import {Checkbox} from '../components/primeng-wrappers/checkbox';
import {LocalStorage} from '../services/local-storage';
import {PanelModule} from 'primeng/panel';
import {Panel} from '../components/primeng-wrappers/panel';
import {DoubleClick} from '../directives/double-click';
import {Platform as PlatformInterface} from '../models';
import {DummyPlatform} from '../services/dummy-platform';

function PlatformFactory(zone: NgZone): PlatformInterface {
  if (window.navigator.userAgent == 'desktop-touch') {
    return new DummyPlatform();
  }

  return new Platform(window.document, zone);
}

Dropdown.prototype.getOptionValue = function(option: any) {
  return option;
}

@NgModule({
  declarations: [
    MainComponent, Home, SettingsPage, Loading, Playground, FoldersList, pipes.FoldersTree,
    MessagesList, pipes.MessageDate, pipes.MessageFrom, pipes.FolderLabel, Message, Avatar,
    pipes.AvatarText, pipes.AvatarColor, pipes.MessageFromTxt, pipes.MessageFromTxtFull,
    pipes.ContactsListTxt, pipes.ContactsArray, pipes.AsHtml, pipes.AttachmentsList,
    pipes.HumanFileSize, pipes.FileIconPipe, Compose, Attachments, Editor, pipes.CurrentEmail,
    pipes.BorderRight, pipes.AccountToContact, pipes.IsCombinedAccount, pipes.Count,
    Filepick, pipes.HasArchive, pipes.FoldersFlatList, pipes.IsOfType, Button,
    BaseComponent, TextInput, MyDropdown, Checkbox, Panel, pipes.TotalSize,
    DoubleClick,
  ],
  entryComponents: [Loading, Filepick],
  imports: [
    BrowserModule, IonicModule.forRoot(), 
    BrowserAnimationsModule, SidebarModule, ButtonModule, ToolbarModule, CardModule,
    InputTextModule, FormsModule, MessageModule, BlockUIModule, TreeModule,
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules, useHash: true }),
    TableModule, OverlayPanelModule, CalendarModule, CheckboxModule, ChipsModule, ToastModule,
    AutoCompleteModule, InputTextareaModule, MenuModule, DialogModule, DropdownModule, 
    DynamicDialogModule, PinchZoomModule, SplitButtonModule, RippleModule, InputSwitchModule,
    PanelModule,
  ],
  providers: [
    StatusBar, Settings,
    SplashScreen, Api, Contacts, Layout, Navigation, Store,
    Mails, MessageService, FileService, 
    { provide: RouteReuseStrategy, useClass: DefaultRouteReuseStrategy },
    { provide: Platform, useFactory: PlatformFactory, deps: [NgZone]},
    HTTP, FileChooser, Background, Nextcloud, DialogService, Webdav,
    WebIntent, LocalStorage,
    // {provide: WebIntent, useClass: MockWebIntent},
  ],
  bootstrap: [MainComponent]
})
export class Main {
  constructor(i: Injector) {
    Statics.injector = i;
  }
}
