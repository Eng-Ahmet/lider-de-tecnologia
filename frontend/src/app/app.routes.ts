import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/report-list/report-list.component').then(m => m.ReportListComponent)
  },
  {
    path: 'reports/new',
    loadComponent: () => import('./pages/report-create/report-create.component').then(m => m.ReportCreateComponent)
  },
  {
    path: 'reports/:id',
    loadComponent: () => import('./pages/report-detail/report-detail.component').then(m => m.ReportDetailComponent)
  },
  {
    path: 'map',
    loadComponent: () => import('./pages/map-view/map-view.component').then(m => m.MapViewComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
