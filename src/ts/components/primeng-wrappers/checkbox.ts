import {Component, Input} from '@angular/core';
import {BaseComponent} from '../../base';

@Component({
  selector: 'al-checkbox',
  templateUrl: '../../../html/primeng-wrappers/checkbox.html',
  styleUrls: ['../../../assets/scss/primeng-wrappers/checkbox.scss'],
})
export class Checkbox extends BaseComponent {
  @Input() public withSwitch: boolean = true;
}
