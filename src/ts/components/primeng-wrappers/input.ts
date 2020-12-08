import {Component, EventEmitter, Input, Output, SimpleChanges, ElementRef, ViewChild} from '@angular/core';
import {BaseComponent} from '../../base';
import {NgCycle} from '../../decorators';

@Component({
  selector: 'al-input',
  templateUrl: '../../../html/primeng-wrappers/input.html',
  styleUrls: ['../../../assets/scss/primeng-wrappers/input.scss'],
})
export class TextInput extends BaseComponent {
  @Input() public icon: string = null;
  @Input() public validator: 'required' | 'custom' | 'none' = 'none';
  @Input() public isValid: boolean = true;
  @Input() public isFloatLabel: boolean = true;

  @Output() public iconClick = new EventEmitter();
  @Output() public keyup: EventEmitter<KeyboardEvent> = new EventEmitter<KeyboardEvent>();
  
  @ViewChild('input') private _input: ElementRef<any>;

  public focus() {
    this._input.nativeElement.focus();
  }

  @NgCycle('change')
  protected _change(changes: SimpleChanges) {
    if (!changes['model'] || this.validator != 'required') {
      return ;
    }

    this.isValid = !!this.model;
  }
}
