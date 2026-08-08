import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/news-list/news-list.page').then((m) => m.NewsListPage),
  },
];
