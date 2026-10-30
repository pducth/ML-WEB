import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { guestGuard } from '../../core/guards/guest.guard';

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
  {
    path: 'quiz',
    data: { screenTitle: 'Hair Routine Quiz', title: 'Hair quiz', customerPage: 'quiz' },
    loadComponent: () => import('./pages/hair-quiz/hair-quiz.component').then((module) => module.HairQuizComponent),
  },
  {
    path: 'quiz/results',
    data: { screenTitle: 'Quiz Results & Routine', title: 'Your hair routine', customerPage: 'quiz-results' },
    loadComponent: () => import('./pages/hair-quiz/hair-quiz.component').then((module) => module.HairQuizComponent),
  },
  {
    path: 'cart',
    data: { screenTitle: 'Shopping Cart', title: 'Cart', customerPage: 'cart' },
    loadComponent: () => import('./pages/commerce/customer-commerce.component').then((module) => module.CustomerCommerceComponent),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    data: { screenTitle: 'Checkout & Payment', title: 'Checkout', customerPage: 'checkout' },
    loadComponent: () => import('./pages/commerce/customer-commerce.component').then((module) => module.CustomerCommerceComponent),
  },
  {
    path: 'payment/pending',
    canActivate: [authGuard],
    data: { screenTitle: 'Pending Payment', title: 'Pending payment', customerPage: 'pending' },
    loadComponent: () => import('./pages/commerce/customer-commerce.component').then((module) => module.CustomerCommerceComponent),
  },
  {
    path: 'order/success',
    canActivate: [authGuard],
    data: { screenTitle: 'Order Success', title: 'Order success', customerPage: 'success' },
    loadComponent: () => import('./pages/commerce/customer-commerce.component').then((module) => module.CustomerCommerceComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    data: { screenTitle: 'Login & Register', title: 'Login', customerPage: 'login' },
    loadComponent: () => import('./pages/account/customer-account.component').then((module) => module.CustomerAccountComponent),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    data: { screenTitle: 'Forgot Password', title: 'Forgot password', customerPage: 'forgot' },
    loadComponent: () => import('./pages/account/customer-account.component').then((module) => module.CustomerAccountComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    data: { screenTitle: 'Profile & VIP Club', title: 'My profile', customerPage: 'profile' },
    loadComponent: () => import('./pages/account/customer-account.component').then((module) => module.CustomerAccountComponent),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    data: { screenTitle: 'Order History', title: 'My orders', customerPage: 'orders' },
    loadComponent: () => import('./pages/commerce/customer-commerce.component').then((module) => module.CustomerCommerceComponent),
  },
  {
    path: 'orders/:orderId',
    canActivate: [authGuard],
    data: { screenTitle: 'Order Details & Returns', title: 'Order details', customerPage: 'order-detail' },
    loadComponent: () => import('./pages/commerce/customer-commerce.component').then((module) => module.CustomerCommerceComponent),
  },
  {
    path: 'about',
    data: { screenTitle: 'About & Policies', title: 'About & Policies' },
    loadComponent: () => import('./pages/about-policies/about-policies.component').then((module) => module.AboutPoliciesComponent),
  },
];
