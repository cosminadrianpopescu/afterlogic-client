import { BaseComponent } from '../base';
import {Component, Input, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import {NgCycle} from '../decorators';

@Component({
  selector: 'al-editor',
  templateUrl: '../../html/editor.html',
  styleUrls: ['../../assets/scss/editor.scss']
})
export class Editor extends BaseComponent {
  @Input() public model: string;
  @Output() public modelChange: EventEmitter<string> = new EventEmitter<string>();

  protected _html: string;
  @ViewChild('editor') private _editor: ElementRef<any>;

  @NgCycle('init')
  protected _initMe() {
    this._html = this.model;
  }

  protected _keyup() {
    this.model = this._editor.nativeElement.innerHTML;
    this.modelChange.emit(this.model);
  }

  public focus() {
    this._editor.nativeElement.focus();
  }
}
