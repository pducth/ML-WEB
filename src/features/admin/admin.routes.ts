import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin.guard';

const adminWorkspace = () =>
  import('./pages/workspace/admin-workspace.component').then(
    (module) => module.AdminWorkspaceComponent,
  );

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    data: { screenTitle: 'Admin Login', title: 'Admin login' },
    loadComponent: () =>
      import('./pages/login/admin-login.component').then((module) => module.AdminLoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('../../core/layouts/admin-layout/admin-layout.component').then(
        (module) => module.AdminLayoutComponent,
      ),
    canActivateChild: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        data: { screenTitle: 'Admin Dashboard', title: 'Admin dashboard', adminPage: 'dashboard' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'forecasts',
        data: { screenTitle: 'AI Sales Forecast', title: 'Sales forecast', adminPage: 'forecasts' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'products',
        data: { screenTitle: 'Product Management', title: 'Products', adminPage: 'products' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'products/new',
        data: { screenTitle: 'Add Product', title: 'Add product', adminPage: 'product-form' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'products/:productId/edit',
        data: { screenTitle: 'Edit Product', title: 'Edit product', adminPage: 'product-form' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'inventory',
        data: { screenTitle: 'Inventory Management', title: 'Inventory', adminPage: 'inventory' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'orders',
        data: { screenTitle: 'Order Management', title: 'Orders', adminPage: 'orders' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'orders/:orderId',
        data: { screenTitle: 'Order Details & Processing', title: 'Order details', adminPage: 'order-detail' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'vouchers',
        data: { screenTitle: 'Voucher Management', title: 'Vouchers', adminPage: 'vouchers' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'vouchers/new',
        data: { screenTitle: 'Create or Edit Voucher', title: 'Edit voucher', adminPage: 'voucher-form' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'vouchers/:voucherId/edit',
        data: { screenTitle: 'Edit Voucher', title: 'Edit voucher', adminPage: 'voucher-form' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'settings',
        data: { screenTitle: 'Store Settings', title: 'Settings', adminPage: 'settings' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'customers',
        data: { screenTitle: 'Customer Management', title: 'Customers', adminPage: 'customers' },
        loadComponent: adminWorkspace,
      },
      {
        path: 'reviews',
        data: { screenTitle: 'Review Moderation', title: 'Reviews', adminPage: 'reviews' },
        loadComponent: adminWorkspace,
      },
    ],
  },
];
