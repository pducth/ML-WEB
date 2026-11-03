import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { guestGuard } from '../../core/guards/guest.guard';

/** Customer screens C01–C16 (docs/HairCare_proposal.md, Part II). */
export const STOREFRONT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', title: 'FOLMARÉ | Botanical Haircare Edit', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent) },
  { path: 'shop', title: 'Shop | FOLMARÉ', loadComponent: () => import('./pages/shop/shop.component').then((m) => m.ShopComponent) },
  { path: 'products/:productId', title: 'Product | FOLMARÉ', loadComponent: () => import('./pages/product-detail/product-detail.component').then((m) => m.ProductDetailComponent) },
  { path: 'quiz', title: 'Hair Quiz | FOLMARÉ', loadComponent: () => import('./pages/hair-quiz/hair-quiz.component').then((m) => m.HairQuizComponent) },
  { path: 'quiz/results', title: 'Your Routine | FOLMARÉ', loadComponent: () => import('./pages/quiz-result/quiz-result.component').then((m) => m.QuizResultComponent) },
  { path: 'cart', title: 'Shopping Bag | FOLMARÉ', loadComponent: () => import('./pages/cart/cart.component').then((m) => m.CartComponent) },
  { path: 'checkout', canActivate: [authGuard], title: 'Checkout | FOLMARÉ', loadComponent: () => import('./pages/checkout/checkout.component').then((m) => m.CheckoutComponent) },
  { path: 'payment/:orderId', canActivate: [authGuard], title: 'Complete Payment | FOLMARÉ', loadComponent: () => import('./pages/payment-pending/payment-pending.component').then((m) => m.PaymentPendingComponent) },
  { path: 'order-success/:orderId', canActivate: [authGuard], title: 'Thank You | FOLMARÉ', loadComponent: () => import('./pages/order-success/order-success.component').then((m) => m.OrderSuccessComponent) },
  { path: 'login', canActivate: [guestGuard], title: 'Sign In | FOLMARÉ', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', canActivate: [guestGuard], title: 'Create Account | FOLMARÉ', loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent) },
  { path: 'forgot-password', canActivate: [guestGuard], title: 'Reset Password | FOLMARÉ', loadComponent: () => import('./pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent) },
  { path: 'profile', canActivate: [authGuard], title: 'My Profile | FOLMARÉ', loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent) },
  { path: 'orders', canActivate: [authGuard], title: 'Order History | FOLMARÉ', loadComponent: () => import('./pages/order-history/order-history.component').then((m) => m.OrderHistoryComponent) },
  { path: 'orders/:orderId', canActivate: [authGuard], title: 'Order Details | FOLMARÉ', loadComponent: () => import('./pages/order-detail/order-detail.component').then((m) => m.OrderDetailComponent) },
  { path: 'about', title: 'About & Policies | FOLMARÉ', loadComponent: () => import('./pages/about-policies/about-policies.component').then((m) => m.AboutPoliciesComponent) },
  { path: '403', title: 'Access denied | FOLMARÉ', loadComponent: () => import('./pages/forbidden/forbidden.component').then((m) => m.ForbiddenComponent) },
];
