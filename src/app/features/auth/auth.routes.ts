import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
];
