import {Routes} from '@angular/router';
import {Home} from './pages/home';
import {Playground} from './pages/playground';

export const routes: Routes = [
  {path: 'playground', component: Playground, data: {withToolbar: true}},
  {path: ':action', component: Home, data: {withToolbar: true}},
  {path: '', component: Home, data: {withToolbar: true}},
];
