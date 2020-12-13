import {Directive, HostListener, Output, EventEmitter} from '@angular/core';
import {BaseComponent} from '../base';
import { Subscription, timer } from 'rxjs';
import { tap } from 'rxjs/operators';

@Directive({
  selector: '[double-click]'
})
export class DoubleClick extends BaseComponent {
  @Output() public single: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();
  @Output() public double: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

  private _s: Subscription = null;

  @HostListener('click', ['$event'])
  protected _click(ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if (this._s) {
      this._s.unsubscribe();
      this._s = null;
      this.double.emit(ev);
      return ;
    }
    this._s = timer(200).pipe(tap(() => this._s = null)).subscribe(() => this.single.emit(ev));
  }
}
