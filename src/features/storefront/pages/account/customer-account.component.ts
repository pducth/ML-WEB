import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AddressService } from '../../../../core/services/address.service';
import { AuthService } from '../../../../core/services/auth.service';
import { HairProfileService } from '../../../../core/services/hair-profile.service';
import type { Address } from '../../../../core/models/address.model';
import type { HairProfile } from '../../../../core/models/hair-profile.model';
import { ToastService } from '../../../../core/services/toast.service';

type AccountPage = 'login' | 'forgot' | 'profile';

@Component({
  selector: 'app-customer-account',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './customer-account.component.html',
  styleUrl: './customer-account.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerAccountComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly addressesApi = inject(AddressService);
  private readonly hairProfileApi = inject(HairProfileService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly page = signal<AccountPage>('login');
  readonly activeTab = signal<'login' | 'register'>('login');
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly forgotNotice = signal(false);
  forgotEmail = '';
  readonly addresses = signal<Address[]>([]);
  readonly hairProfile = signal<HairProfile | null>(null);
  readonly addAddressOpen = signal(false);
  readonly form = signal({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  readonly addressForm = signal({
    recipientName: '',
    phone: '',
    street: '',
    district: '',
    city: '',
    postalCode: '',
    country: 'US',
  });

  readonly authService = this.auth;

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.page.set((data['customerPage'] as AccountPage | undefined) ?? 'login');
      this.errorMessage.set('');
      this.forgotNotice.set(false);
      if (this.page() === 'profile') this.loadProfile();
    });
  }

  updateForm<K extends keyof ReturnType<typeof this.form>>(key: K, value: ReturnType<typeof this.form>[K]): void {
    this.form.update((current) => ({ ...current, [key]: value }));
  }

  selectTab(tab: 'login' | 'register'): void {
    this.activeTab.set(tab);
    this.errorMessage.set('');
  }

  submitAuth(): void {
    const form = this.form();
    this.submitting.set(true);
    this.errorMessage.set('');
    if (this.activeTab() === 'register' && form.password !== form.confirmPassword) {
      this.submitting.set(false);
      this.errorMessage.set('Your passwords do not match.');
      return;
    }
    const request = this.activeTab() === 'login'
      ? this.auth.login({ email: form.email, password: form.password })
      : this.auth.register({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }).pipe(map((user) => ({ user })));
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ user }) => {
        this.submitting.set(false);
        const destination = this.auth.returnUrl() ?? (user.role === 'Admin' ? '/admin/dashboard' : '/profile');
        this.auth.returnUrl.set(null);
        void this.router.navigateByUrl(destination);
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set(this.activeTab() === 'login' ? 'Invalid email or password.' : 'Account creation failed. Check whether this email is already registered.');
      },
    });
  }

  requestPasswordReset(): void {
    this.errorMessage.set('');
    this.forgotNotice.set(false);
    this.errorMessage.set('Email OTP delivery is not configured in the current backend, so a reset code cannot be sent yet.');
  }

  private loadProfile(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.loading.set(true);
    this.addressesApi.getForUser(user.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (addresses) => {
        this.addresses.set(addresses);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Saved addresses could not be loaded.');
        this.loading.set(false);
      },
    });
    this.hairProfileApi.getForUser(user.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (profiles) => this.hairProfile.set(profiles[0] ?? null),
      error: () => this.toast.show('Hair profile could not be loaded.', 'error'),
    });
  }

  saveProfile(fullName: string, phone: string): void {
    const user = this.auth.currentUser();
    if (!user || !fullName.trim()) {
      this.errorMessage.set('Name is required.');
      return;
    }
    this.auth.updateProfile(user.id, { fullName: fullName.trim(), phone: phone.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.toast.show('Profile updated.', 'success'),
        error: () => this.errorMessage.set('Profile could not be updated.'),
      });
  }

  toggleAddressForm(): void {
    this.addAddressOpen.update((open) => !open);
    this.errorMessage.set('');
  }

  updateAddress<K extends keyof ReturnType<typeof this.addressForm>>(
    key: K,
    value: ReturnType<typeof this.addressForm>[K],
  ): void {
    this.addressForm.update((current) => ({ ...current, [key]: value }));
  }

  saveAddress(): void {
    const user = this.auth.currentUser();
    const address = this.addressForm();
    if (!user || !address.recipientName.trim() || !address.street.trim() || !address.city.trim()) {
      this.errorMessage.set('Recipient, street, and city are required.');
      return;
    }
    this.addressesApi.create({
      ...address,
      userId: user.id,
      isDefault: this.addresses().length === 0,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.addresses.update((items) => [...items, saved]);
        this.addAddressOpen.set(false);
        this.addressForm.set({ recipientName: '', phone: '', street: '', district: '', city: '', postalCode: '', country: 'US' });
        this.toast.show('Address saved.', 'success');
      },
      error: () => this.errorMessage.set('Address could not be saved.'),
    });
  }

  deleteAddress(address: Address): void {
    if (!window.confirm('Delete this saved address?')) return;
    this.addressesApi.delete(address.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.addresses.update((items) => items.filter((item) => item.id !== address.id));
        this.toast.show('Address deleted.', 'success');
      },
      error: () => this.toast.show('Address could not be deleted.', 'error'),
    });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/']);
  }
}
