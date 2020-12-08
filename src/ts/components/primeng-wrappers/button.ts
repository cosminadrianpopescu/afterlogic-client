import {Component, Input, ViewEncapsulation, Output, EventEmitter} from '@angular/core';
import {BaseComponent} from '../../base';

@Component({
  selector: 'al-button', 
  templateUrl: '../../../html/primeng-wrappers/button.html',
  encapsulation: ViewEncapsulation.None,
})
export class Button extends BaseComponent {
  @Input() public disabled: boolean = false;
  @Input() public icon: string;
  @Input() public tabindex: number = -1;
  @Input() public styleClass: string;

  @Output() public notify: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

  protected _click(ev: MouseEvent) {
    if (this.disabled) {
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      ev.preventDefault();
      return ;
    }

    this.notify.emit(ev);
  }
}
