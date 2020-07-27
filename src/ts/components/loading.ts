import {Component, Input, ChangeDetectorRef} from '@angular/core';
import {BlockableUI} from 'primeng/api/public_api';
import {NgCycle} from '../decorators';

@Component({
  selector: 'al-loading',
  templateUrl: '../../html/loading.html'
})
export class Loading {
  @Input() public target: BlockableUI;

  constructor(private _cd: ChangeDetectorRef) {}

  @NgCycle('init')
  public initMe() {
    if (!this.target) {
      this.target = <any>document.body;
    }
    setTimeout(() => this._cd.detectChanges());
  }
}
