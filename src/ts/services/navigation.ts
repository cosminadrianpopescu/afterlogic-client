import {Injectable} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {ReplaySubject} from 'rxjs';
import {distinctUntilChanged, filter, map} from 'rxjs/operators';
import {BaseClass} from '../base';
import {NgInject} from '../decorators';

@Injectable()
export class Navigation extends BaseClass {
  @NgInject(Router) private _router: Router;
  @NgInject(ActivatedRoute) private _route: ActivatedRoute;

  public routeData$: ReplaySubject<Object> = new ReplaySubject<Object>(1);
  public routeParams$: ReplaySubject<Object> = new ReplaySubject<Object>(1);

  constructor() {
    super();
    this._router.events.pipe(filter(ev => ev instanceof NavigationEnd)).subscribe(() => {
      this.routeData$.next(this._route.root.firstChild.snapshot.data);
      this.routeParams$.next(this._route.firstChild.snapshot.params);
    });
  }

  public connectToRoute(key: string) {
    return this.routeParams$.pipe(
      filter(p => Object.keys(p).indexOf(key) != -1),
      map(p => p[key]),
      distinctUntilChanged(), 
    );

  }
}
