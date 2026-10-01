import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.routes),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.routes),
  },
  {
    path: 'guide/sections',
    canActivate: [authGuard],
    loadChildren: () => import('./features/guide/guide.routes').then((m) => m.routes),
  },
  {
    path: 'resources',
    canActivate: [authGuard],
    loadChildren: () => import('./features/resources/resources.routes').then((m) => m.routes),
  },
  {
    path: 'news',
    canActivate: [authGuard],
    loadChildren: () => import('./features/news/news.routes').then((m) => m.routes),
  },
  {
    path: 'organizations',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/organizations/organizations.routes').then((m) => m.routes),
  },
  {
    path: 'professionals',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/professionals/professionals.routes').then((m) => m.routes),
  },
];
