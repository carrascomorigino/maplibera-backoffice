import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'guide/sections',
    loadChildren: () => import('./features/guide/guide.routes').then((m) => m.routes),
  },
  {
    path: 'resources',
    loadChildren: () => import('./features/resources/resources.routes').then((m) => m.routes),
  },
  {
    path: 'news',
    loadChildren: () => import('./features/news/news.routes').then((m) => m.routes),
  },
];
