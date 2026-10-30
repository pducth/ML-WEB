import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { ErrorNotificationService } from '../../services/error-notification.service';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../../shared/components/header/header.component';

@Component({
  selector: 'app-storefront-layout',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterOutlet],
  templateUrl: './storefront-layout.component.html',
  styleUrl: './storefront-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontLayoutComponent implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(ErrorNotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly cartItemCount = this.cartService.itemCount;
  readonly accountLabel = computed(() => this.authService.currentUser()?.fullName ?? 'Sign In');
  readonly isAdmin = computed(() => this.authService.role() === 'Admin');

  ngOnInit(): void {
    this.cartService.refreshItemCount(this.authService.currentUser()?.id ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.notification.show('Your cart could not be loaded. Please try again.'),
      });
  }

  navigate(url: string): void {
    void this.router.navigateByUrl(url);
  }

  openCart(): void {
    this.cartService.openDrawer();
  }

  openAccount(): void {
    if (this.authService.isLoggedIn()) {
      void this.router.navigate(['/profile']);
      return;
    }

    this.authService.openAuthModal();
  }
}
