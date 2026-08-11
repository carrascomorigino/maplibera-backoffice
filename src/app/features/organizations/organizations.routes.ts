import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/organizations-list/organizations-list.page').then((m) => m.OrganizationsListPage),
  },
];
