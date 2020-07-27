import {BaseTestUnit} from '../base';
import {NgTest, deserialize, Convertor} from '../decorators';
import {ModelFactory} from '../models';

const json = {"AuthenticatedUserId":5,"@Time":0.3407,"Module":"Mail","Method":"GetFolders","Result":{"Folders":{"@Object":"Collection\/FolderCollection","@Count":12,"@Collection":[{"@Object":"Object\/Folder","Type":1,"Name":"INBOX","FullName":"INBOX","FullNameRaw":"INBOX","FullNameHash":"7e33429f656f1e6e9d79b29c3f82c57e","Delimiter":"\/","IsSubscribed":true,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"[Gmail]","FullName":"[Gmail]","FullNameRaw":"[Gmail]","FullNameHash":"8bcb23ae1b35cdfdb017df42ffb61f66","Delimiter":"\/","IsSubscribed":true,"IsSelectable":false,"Exists":true,"Extended":null,"SubFolders":{"@Object":"Collection\/FolderCollection","@Count":7,"@Collection":[{"@Object":"Object\/Folder","Type":2,"Name":"Sent Mail","FullName":"[Gmail]\/Sent Mail","FullNameRaw":"[Gmail]\/Sent Mail","FullNameHash":"97a3fe945b16b28b31fd08730150ddd0","Delimiter":"\/","IsSubscribed":true,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":3,"Name":"Drafts","FullName":"[Gmail]\/Drafts","FullNameRaw":"[Gmail]\/Drafts","FullNameHash":"023f1f563cfd0eaa6fac2077dd2b05ed","Delimiter":"\/","IsSubscribed":true,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":4,"Name":"Spam","FullName":"[Gmail]\/Spam","FullNameRaw":"[Gmail]\/Spam","FullNameHash":"7c9ae773e0cf26f7b28e8602409a6b82","Delimiter":"\/","IsSubscribed":true,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":5,"Name":"Trash","FullName":"[Gmail]\/Trash","FullNameRaw":"[Gmail]\/Trash","FullNameHash":"3caddd10709a0b878921395fbbd856dc","Delimiter":"\/","IsSubscribed":true,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"All Mail","FullName":"[Gmail]\/All Mail","FullNameRaw":"[Gmail]\/All Mail","FullNameHash":"e5b16880bf86ed7af066aa97fb0288d8","Delimiter":"\/","IsSubscribed":true,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"Important","FullName":"[Gmail]\/Important","FullNameRaw":"[Gmail]\/Important","FullNameHash":"929eccfa78dc0e3d56d275c4c435e137","Delimiter":"\/","IsSubscribed":false,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"Starred","FullName":"[Gmail]\/Starred","FullNameRaw":"[Gmail]\/Starred","FullNameHash":"650836de11dcd46f0ee1e34984b3bc72","Delimiter":"\/","IsSubscribed":false,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false}]},"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"amazon-kindle","FullName":"amazon-kindle","FullNameRaw":"amazon-kindle","FullNameHash":"d29c2d91738bcd34c1b1ccf9b5ba532a","Delimiter":"\/","IsSubscribed":false,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"Ce era prin Inbox","FullName":"Ce era prin Inbox","FullNameRaw":"Ce era prin Inbox","FullNameHash":"87d461855249e5bf686628ec56f6ab65","Delimiter":"\/","IsSubscribed":false,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"Code Project","FullName":"Code Project","FullNameRaw":"Code Project","FullNameHash":"3801fc731b420c6c08e454dd98b765cf","Delimiter":"\/","IsSubscribed":false,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"De acasa","FullName":"De acasa","FullNameRaw":"De acasa","FullNameHash":"999b0fe6681483a6dc188ae288caf81a","Delimiter":"\/","IsSubscribed":false,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"Drafts","FullName":"Drafts","FullNameRaw":"Drafts","FullNameHash":"db3af42ba64b595db6ab3ea999fe0bb1","Delimiter":"\/","IsSubscribed":false,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"Operate","FullName":"Operate","FullNameRaw":"Operate","FullNameHash":"3ff3e785fa31392aee9c595f14477dff","Delimiter":"\/","IsSubscribed":false,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"Sent","FullName":"Sent","FullNameRaw":"Sent","FullNameHash":"7f8c0283f16925caed8e632086b81b9c","Delimiter":"\/","IsSubscribed":false,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"TAID","FullName":"TAID","FullNameRaw":"TAID","FullNameHash":"55a1d5d2adbcc5273f4a70524ad50fa0","Delimiter":"\/","IsSubscribed":false,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"TAID-PAS-SURE","FullName":"TAID-PAS-SURE","FullNameRaw":"TAID-PAS-SURE","FullNameHash":"0087d0b8eb11c1ea9052dfa663d12582","Delimiter":"\/","IsSubscribed":false,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false},{"@Object":"Object\/Folder","Type":10,"Name":"Trash","FullName":"Trash","FullNameRaw":"Trash","FullNameHash":"a7e253cd8dd95da3e20daf45519a8dc2","Delimiter":"\/","IsSubscribed":false,"IsSelectable":true,"Exists":true,"Extended":null,"SubFolders":null,"AlwaysRefresh":false}]},"Namespace":""},"SubscriptionsResult":null,"@TimeApiInit":0.0727}

class ToBeConverted {
  p1: string;
  p2: string;
}

class DummyConvertor implements Convertor<ToBeConverted> {
  public convert(src: {a1: any; a2: any;}): ToBeConverted {
    const result = new ToBeConverted();
    result.p1 = src.a1;
    result.p2 = src.a2;
    return result;
  }
}

class Model1 {
  prop1: string;
  prop2: string;
  @deserialize('date')
  d: Date;
  @deserialize(DummyConvertor)
  conv: ToBeConverted;
}

class Model2 {
  public prop3: string;
  public prop4: string;
  @deserialize(Model1)
  public models: Array<Model1>;
}

export class DeserializerTest extends BaseTestUnit {
  
  @NgTest()
  public testDeserializer() {
    const json = {
      prop3: 'href',
      prop4: 'name', 
      models: [
        {prop1: 'url1', prop2: 'etag1', d: 'Tue May 19 2020 09:14:45 GMT+0200 (Central European Summer Time)'},
        {prop1: 'url2', prop2: 'etag2', d: null, conv: {a1: 'a1', a2: 'a2'}}
      ],
    }

    const obj: Model2 = ModelFactory.instance(json, Model2) as Model2;
    expect(obj instanceof Model2).toBeTruthy();
    expect(obj.models[0].d instanceof Date).toBeTruthy();
    expect(obj.models[1].d).toBeNull();
    expect(obj.models[1].conv instanceof ToBeConverted).toBeTruthy();
    expect(obj.models[1].conv.p1).toEqual('a1');
  }
}
