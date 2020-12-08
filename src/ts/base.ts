import {EventEmitter, Injector, Provider, SimpleChanges, ComponentFactoryResolver, ApplicationRef, ComponentRef, EmbeddedViewRef, ElementRef, Directive, Input, Output} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {Observable, Subscription} from 'rxjs';
import {CycleType, METADATA, NgInject} from './decorators';
import {Logger, LoggingInstance} from './services/logging';
import {Loading} from './components/loading';
import {MessageService, BlockableUI} from 'primeng/api';
import {BlockUI} from 'primeng/blockui';

class BlockableComponent implements BlockableUI {
  public el: HTMLElement;
  public getBlockableElement() {
    return this.el;
  }
}

BlockUI.prototype.block = function() {
  if (this.target) {
    const el = this.target.getBlockableElement ? this.target.getBlockableElement() : this.target;
    el.appendChild(this.mask.nativeElement);
    let style = this.target.style || {};
    style.position = 'relative';
    this.target.style = style;
  }
  else {
    document.body.appendChild(this.mask.nativeElement);
  }
  if (this.autoZIndex) {
    this.mask.nativeElement.style.zIndex = String(this.baseZIndex + (10000));
  }
}

export class Statics {
  public static injector: Injector;
}

class BaseClassWithDecorations {
  public static UUID(): string {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  protected __resolveDecorations__(protoName: string, component: any, callback: Function) {
    if (component.name == '') {
      return ;
    }
    const values: Map<string, Array<Object>> = METADATA.get(component) || new Map<string, Array<Object>>();
    if (Array.isArray(values.get(protoName))) {
      values.get(protoName).forEach(<any>callback.bind(this));
    }

    this.__resolveDecorations__(protoName, component.__proto__, callback);
  }

  protected __resolveInjectors__() {
    this.__resolveDecorations__('__injectors__', this.constructor, (obj: Object) => this[obj['prop']] = Statics.injector.get(obj['arg']));
  }
}

export class BaseClass extends BaseClassWithDecorations {

  protected _logger: Logger = LoggingInstance.logger;

  constructor() {
    super();
    this.__resolveInjectors__();
  }
}

@Directive({
  selector: 'al-base-component',
})
export class BaseComponent extends BaseClass {
  @Input() public label: string;
  @Input() public id: string;
  @Input() public model: any;

  @Output() modelChange: EventEmitter<any> = new EventEmitter<any>();

  @NgInject(Router) protected _router: Router;
  @NgInject(<any>ComponentFactoryResolver) private __factoryResolver__: ComponentFactoryResolver;
  @NgInject(ApplicationRef) private __appRef__: ApplicationRef;
  @NgInject(MessageService) private _toast: MessageService;

  public get view(): any {
    return this;
  }

  private __cycles__: Map<string, Array<string>> = new Map<string, Array<string>>();
  private __subscriptions__: Array<Subscription> = [];
  private __loadingComponent__: ComponentRef<any> = null;

  protected _isValid: boolean = true;

  constructor() {
    super();
    this.__resolveDecorations__('__cycles__', this.constructor, (obj: Object) => {
      if (!this.__cycles__.get(obj['arg'])) {
        this.__cycles__.set(obj['arg'], []);
      }
      this.__cycles__.get(obj['arg']).push(obj['prop']);
    });
  }

  private _runCycle(cycle: CycleType, args?: any) {
    const cycles = [].concat(this.__cycles__.get(cycle) || []);
    cycles.reverse().forEach(method => this[method](args));
  }

  private ngOnDestroy() {
    this._runCycle('destroy');
    this.__subscriptions__.forEach(s => s.unsubscribe());
  }

  private ngAfterViewInit() {
    this._runCycle('afterViewInit');
  }

  private ngOnChanges(changes: SimpleChanges) {
    this._runCycle('change', changes);
  }

  protected async _handleError(err: Error) {
    this.hideLoading();
    console.error(err);
    this.alert(err.message || err['error'] || err.name || err.constructor.name, '');
  }

  private async ngOnInit() {
    if (!this.id) {
      this.id = BaseComponent.UUID();
    }
    this._runCycle('init');
  }

  protected softRefresh() {
    this.ngOnDestroy();
    this.ngOnInit();
  }

  protected connect<T>(obs: Observable<T>, callback: (t: T) => void) {
    this.__subscriptions__.push(obs.subscribe(callback));
  }

  protected navigate(url: string): Promise<boolean>{
    return this._router.navigateByUrl(url);
  }

  protected showLoading(el?: ElementRef<any>) {
    this.__loadingComponent__ = this.__factoryResolver__.resolveComponentFactory(Loading).create(Statics.injector);
    if (!el && document.querySelectorAll('al-loading').length > 0) {
      return ;
    }
    if (el) {
      const component = new BlockableComponent();
      component.el = el.nativeElement;
      this.__loadingComponent__.instance.target = component;
    }
    this.__loadingComponent__.instance.uuid = BaseComponent.UUID();
    this.__loadingComponent__.instance.initMe();
    this.__appRef__.attachView(this.__loadingComponent__.hostView);
    const node = (this.__loadingComponent__.hostView as EmbeddedViewRef<any>).rootNodes[0];
    document.body.appendChild(node);
  }

  protected hideLoading() {
    if (!this.__loadingComponent__) {
      return ;
    }
    this.__appRef__.detachView(this.__loadingComponent__.hostView);
    const el = document.querySelectorAll('al-loading');
    el.forEach(e => document.body.removeChild(e));
    this.__loadingComponent__ = null;
  }

  protected get isJobPage(): boolean {
    return this._router.url.match(/job$/) ? true : false;
  }

  protected alert(title: string, message: string, severity: 'error' | 'success' = 'success', sticky: boolean = false) {
    this._toast.add({severity: severity, summary: title, detail: message, key: 'abc', sticky: sticky});
  }
}

export class BaseTestUnit extends BaseClassWithDecorations {
  protected initialized = new EventEmitter();
  constructor(private _providers: Array<Provider>) {
    super();
  }

  private __init__() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: this._providers});
    Statics.injector = TestBed;
    this.__resolveInjectors__();
    this.initialized.emit();
  }
}
