import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '',
    loadComponent: () => import('./core/layouts/storefront-layout/storefront-layout.component').then((m) => m.StorefrontLayoutComponent),
    loadChildren: () => import('./features/storefront/storefront.routes').then((m) => m.STOREFRONT_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
