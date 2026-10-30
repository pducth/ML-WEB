import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./core/layouts/storefront-layout/storefront-layout.component').then(
        (module) => module.StorefrontLayoutComponent,
      ),
    loadChildren: () =>
      import('./features/storefront/storefront.routes').then((module) => module.STOREFRONT_ROUTES),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((module) => module.ADMIN_ROUTES),
  },
  {
    path: '403',
    data: { screenTitle: '403 - Access denied', title: 'Access denied' },
    loadComponent: () =>
      import('./shared/components/screen-placeholder/screen-placeholder.component').then(
        (module) => module.ScreenPlaceholderComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
