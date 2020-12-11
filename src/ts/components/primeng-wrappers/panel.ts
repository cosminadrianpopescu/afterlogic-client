import {Component, Input, TemplateRef, ViewEncapsulation, ViewChild} from '@angular/core';
import {BaseComponent} from '../../base';
import {Panel as PanelWidget} from 'primeng/panel';
import {ReplaySubject} from 'rxjs';
import {NgCycle} from '../../decorators';

@Component({
  selector: 'al-panel',
  templateUrl: '../../../html/primeng-wrappers/panel.html',
  styleUrls: ['../../../assets/scss/primeng-wrappers/panel.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class Panel extends BaseComponent {
  @Input() public toggleable: boolean = true;
  @Input() public collapsed: boolean = true;
  @Input() public headerTpl: TemplateRef<any>;

  @ViewChild('panel', {static: true}) private _panel: PanelWidget;
  protected _collapsed$: ReplaySubject<boolean> = new ReplaySubject<boolean>();

  @NgCycle('init')
  protected _initMe() {
    this._collapsed$.next(this.collapsed);
  }

  protected _click() {
    const ev = document.createEvent('MouseEvent');
    this._panel.toggle(ev);
    this._collapsed$.next(this._panel.collapsed);
  }
}
