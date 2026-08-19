import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/professionals-list/professionals-list.page').then((m) => m.ProfessionalsListPage),
  },
];
