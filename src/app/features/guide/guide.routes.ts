import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/sections-list/sections-list.page').then((m) => m.SectionsListPage),
  },
];
