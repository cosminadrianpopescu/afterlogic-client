import {Platform} from '../models';

export class DummyPlatform implements Platform {
  public width(): number {
    return window.innerWidth;
  }

  public height(): number {
    return window.innerHeight;
  }

  public ready(): Promise<string> {
    return new Promise(resolve => {
      window.document.onload = () => resolve();
    });
  }

  public is(name: "ipad" | "iphone" | "ios" | "android" | "phablet" | "tablet" | "cordova" | "capacitor" | "electron" | "pwa" | "mobile" | "mobileweb" | "desktop" | "hybrid"): boolean {
    if (name == 'android') {
      return false;
    }

    return true;
  }
}
