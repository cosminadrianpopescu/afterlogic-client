import {BaseComponent} from '../../base';
import {Component, Input, SimpleChanges} from '@angular/core';
import {LabelValue} from '../../models';
import {NgCycle} from '../../decorators';

@Component({
  selector: 'al-dropdown',
  templateUrl: '../../../html/primeng-wrappers/dropdown.html',
})
export class Dropdown extends BaseComponent {
  @Input() public options: Array<LabelValue> = [];
  @Input() public isPrimitive: boolean = false;
  @Input() public disabled: boolean = false;
  @Input() public optionLabel: string = "label";

  protected _model: LabelValue = null;

  @NgCycle('change')
  protected _change(changes: SimpleChanges) {
    if (!this.isPrimitive || !changes['model']) {
      this._model = this.model;
      return ;
    }

    this._model = this.options.find(o => o.value == this.model);
  }

  protected _modelChange(x: LabelValue) {
    if (!this.isPrimitive) {
      this.modelChange.emit(x);
      return ;
    }

    this.modelChange.emit(x.value);
  }
}
