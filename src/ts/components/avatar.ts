import { BaseClass } from '../base';
import {Component, Input} from '@angular/core';
import {Contact} from '../models';

@Component({
  selector: 'al-avatar',
  templateUrl: '../../html/avatar.html',
  styleUrls: ['../../assets/scss/avatar.scss'],
})
export class Avatar extends BaseClass {
  @Input() contact: Contact;
}
