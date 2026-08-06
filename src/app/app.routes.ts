import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'guide/sections',
    loadChildren: () => import('./features/guide/guide.routes').then((m) => m.routes),
  },
];
