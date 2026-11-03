import { Routes } from '@angular/router';
import { adminGuard, adminGuestGuard } from '../../core/guards/admin.guard';

/** Admin screens A01–A14 (docs/HairCare_proposal.md, Part II §4). */
export const ADMIN_ROUTES: Routes = [
  { path: 'login', canActivate: [adminGuestGuard], title: 'Admin sign-in | FOLMARÉ', loadComponent: () => import('./pages/login/admin-login.component').then((m) => m.AdminLoginComponent) },
  {
    path: '',
    canActivateChild: [adminGuard],
    canActivate: [adminGuard],
    loadComponent: () => import('../../core/layouts/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Overview | Admin', data: { screenTitle: 'Overview' }, loadComponent: () => import('./pages/dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent) },
      { path: 'forecast', title: 'Revenue forecast | Admin', data: { screenTitle: 'Revenue forecast' }, loadComponent: () => import('./pages/forecast/forecast.component').then((m) => m.ForecastComponent) },
      { path: 'products', title: 'Products | Admin', data: { screenTitle: 'Product management' }, loadComponent: () => import('./pages/product-list/product-list.component').then((m) => m.ProductListComponent) },
      { path: 'products/new', title: 'Add product | Admin', data: { screenTitle: 'Add product' }, loadComponent: () => import('./pages/product-form/product-form.component').then((m) => m.ProductFormComponent) },
      { path: 'products/:productId/edit', title: 'Edit product | Admin', data: { screenTitle: 'Edit product' }, loadComponent: () => import('./pages/product-form/product-form.component').then((m) => m.ProductFormComponent) },
      { path: 'inventory', title: 'Inventory | Admin', data: { screenTitle: 'Inventory management' }, loadComponent: () => import('./pages/inventory/inventory.component').then((m) => m.InventoryComponent) },
      { path: 'orders', title: 'Orders | Admin', data: { screenTitle: 'Order management' }, loadComponent: () => import('./pages/order-list/order-list.component').then((m) => m.OrderListComponent) },
      { path: 'orders/:orderId', title: 'Order details | Admin', data: { screenTitle: 'Order details' }, loadComponent: () => import('./pages/order-detail/admin-order-detail.component').then((m) => m.AdminOrderDetailComponent) },
      { path: 'vouchers', title: 'Discount codes | Admin', data: { screenTitle: 'Discount codes' }, loadComponent: () => import('./pages/voucher-list/voucher-list.component').then((m) => m.VoucherListComponent) },
      { path: 'vouchers/new', title: 'Create voucher | Admin', data: { screenTitle: 'Create discount code' }, loadComponent: () => import('./pages/voucher-form/voucher-form.component').then((m) => m.VoucherFormComponent) },
      { path: 'vouchers/:voucherId/edit', title: 'Edit voucher | Admin', data: { screenTitle: 'Edit discount code' }, loadComponent: () => import('./pages/voucher-form/voucher-form.component').then((m) => m.VoucherFormComponent) },
      { path: 'settings', title: 'Settings | Admin', data: { screenTitle: 'Store settings' }, loadComponent: () => import('./pages/settings/settings.component').then((m) => m.SettingsComponent) },
      { path: 'customers', title: 'Customers | Admin', data: { screenTitle: 'Customer management' }, loadComponent: () => import('./pages/customer-list/customer-list.component').then((m) => m.CustomerListComponent) },
      { path: 'customers/:userId', title: 'Customer profile | Admin', data: { screenTitle: 'Customer profile' }, loadComponent: () => import('./pages/customer-detail/customer-detail.component').then((m) => m.CustomerDetailComponent) },
      { path: 'reviews', title: 'Reviews | Admin', data: { screenTitle: 'Review moderation' }, loadComponent: () => import('./pages/reviews/reviews.component').then((m) => m.ReviewsComponent) },
    ],
  },
];
