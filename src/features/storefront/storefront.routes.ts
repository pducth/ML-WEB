import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { guestGuard } from '../../core/guards/guest.guard';

const placeholder = () =>
  import('../../shared/components/screen-placeholder/screen-placeholder.component').then(
    (module) => module.ScreenPlaceholderComponent,
  );

export const STOREFRONT_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: { screenTitle: 'Home', title: 'Home' },
    loadComponent: () => import('./pages/home/home.component').then((module) => module.HomeComponent),
  },
  {
    path: 'shop',
    data: { screenTitle: 'Shop & Search', title: 'Shop' },
    loadComponent: () => import('./pages/shop/shop.component').then((module) => module.ShopComponent),
  },
  {
    path: 'products/:productId',
    data: { screenTitle: 'Product Details', title: 'Product details' },
    loadComponent: () =>
      import('./pages/product-detail/product-detail.component').then(
        (module) => module.ProductDetailComponent,
      ),
  },
  { path: 'quiz', data: { screenTitle: 'Hair Routine Quiz', title: 'Hair quiz' }, loadComponent: placeholder },
  {
    path: 'quiz/results',
    data: { screenTitle: 'Quiz Results & Routine', title: 'Your hair routine' },
    loadComponent: placeholder,
  },
  { path: 'cart', data: { screenTitle: 'Shopping Cart', title: 'Cart' }, loadComponent: placeholder },
  {
    path: 'checkout',
    canActivate: [authGuard],
    data: { screenTitle: 'Checkout & Payment', title: 'Checkout' },
    loadComponent: placeholder,
  },
  {
    path: 'payment/pending',
    canActivate: [authGuard],
    data: { screenTitle: 'Pending Payment', title: 'Pending payment' },
    loadComponent: placeholder,
  },
  {
    path: 'order/success',
    canActivate: [authGuard],
    data: { screenTitle: 'Order Success', title: 'Order success' },
    loadComponent: placeholder,
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    data: { screenTitle: 'Login & Register', title: 'Login' },
    loadComponent: placeholder,
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    data: { screenTitle: 'Forgot Password', title: 'Forgot password' },
    loadComponent: placeholder,
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    data: { screenTitle: 'Profile & VIP Club', title: 'My profile' },
    loadComponent: placeholder,
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    data: { screenTitle: 'Order History', title: 'My orders' },
    loadComponent: placeholder,
  },
  {
    path: 'orders/:orderId',
    canActivate: [authGuard],
    data: { screenTitle: 'Order Details & Returns', title: 'Order details' },
    loadComponent: placeholder,
  },
  { path: 'about', data: { screenTitle: 'C15 - TODO: chờ UI', title: 'About & Policies' }, loadComponent: placeholder },
];
