import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/resources-list/resources-list.page').then((m) => m.ResourcesListPage),
  },
];
