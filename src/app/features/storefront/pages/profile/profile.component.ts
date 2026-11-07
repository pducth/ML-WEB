import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import type { Address } from '../../../../core/models';
import { AddressService, formatAddress, type AddressInput } from '../../../../core/services/address.service';
import { AuthService, PASSWORD_RULE } from '../../../../core/services/auth.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { HairRoutineEngineService } from '../../../../core/services/hair-routine-engine.service';
import { OrderService } from '../../../../core/services/order.service';
import { ProductService } from '../../../../core/services/product.service';
import { QuizService } from '../../../../core/services/quiz.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StoreModalComponent } from '../../../../shared/ui/store-modal.component';
import { PasswordToggleDirective } from '../../../../shared/ui/password-toggle.directive';

const STEP_TITLES: Record<string, string> = { cleanse: 'Cleanse', condition: 'Condition', treat: 'Treat & Nourish', style_protect: 'Style & Protect' };

/** C13: My profile, Hair Profile and address book. */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [PasswordToggleDirective, NgClass, DatePipe, FormsModule, RouterLink, StoreModalComponent],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly addresses = inject(AddressService);
  private readonly quiz = inject(QuizService);
  private readonly engine = inject(HairRoutineEngineService);
  private readonly products = inject(ProductService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly user = this.auth.currentUser;
  readonly myAddresses = this.addresses.mine;
  private readonly orders = inject(OrderService);
  readonly orderCount = computed(() => this.orders.myOrders().length);
  readonly hairProfile = this.quiz.myProfile;
  readonly formatAddress = formatAddress;
  readonly stepTitles = STEP_TITLES;
  readonly passwordRule = PASSWORD_RULE;
  readonly labelTitle = (label: string | null) => (label ? this.engine.labelTitle(label) : 'None');
  readonly initials = computed(() => (this.user()?.fullName ?? '?').split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase());

  readonly info = signal({ fullName: this.user()?.fullName ?? '', email: this.user()?.email ?? '', phone: this.user()?.phone ?? '' });
  readonly passwords = signal({ current: '', next: '', confirm: '' });
  readonly addressModal = signal<{ id?: string; draft: AddressInput } | null>(null);
  readonly addressError = signal('');
  readonly passwordModal = signal(false);
  readonly passwordError = signal('');

  readonly routineItems = computed(() =>
    (this.hairProfile()?.routine ?? []).map((item) => ({ ...item, product: item.productId ? this.products.getById(item.productId) : undefined })),
  );

  async saveInfo(): Promise<void> {
    const now = this.info();
    const user = this.user();
    if (user && now.fullName === user.fullName && now.email === user.email && now.phone === user.phone) {
      this.toast.show('There are no changes to save.', 'info');
      return;
    }
    const ok = await this.confirm.ask({ title: 'Save these changes?', message: 'Your name, email and phone number will be updated.', confirmLabel: 'Yes, save', cancelLabel: 'No' });
    if (!ok) return;
    try {
      this.auth.updateProfile(this.info());
      this.toast.show('Account details saved successfully!');
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  openPassword(): void {
    this.passwords.set({ current: '', next: '', confirm: '' });
    this.passwordError.set('');
    this.passwordModal.set(true);
  }

  async changePassword(): Promise<void> {
    const p = this.passwords();
    // Validate first (current password, strength, match) so the shopper is only asked to confirm a request that will work.
    try {
      this.auth.checkPasswordChange(p.current, p.next, p.confirm);
    } catch (error) {
      this.passwordError.set(errorMessage(error));
      return;
    }
    const ok = await this.confirm.ask({ title: 'Change your password?', message: 'Your new password will apply from your next sign-in.', confirmLabel: 'Yes, change it', cancelLabel: 'No' });
    if (!ok) return;
    try {
      this.auth.changePassword(p.current, p.next, p.confirm);
      this.passwords.set({ current: '', next: '', confirm: '' });
      this.passwordModal.set(false);
      this.toast.show('Your password has been changed.');
    } catch (error) {
      this.passwordError.set(errorMessage(error));
    }
  }

  openAddress(address?: Address): void {
    this.addressError.set('');
    const user = this.user();
    this.addressModal.set(
      address
        ? { id: address.id, draft: { label: address.label, recipientName: address.recipientName, phone: address.phone, street: address.street, ward: address.ward, district: address.district, city: address.city, isDefault: address.isDefault } }
        : { draft: { label: 'Home', recipientName: user?.fullName ?? '', phone: user?.phone ?? '', street: '', ward: '', district: '', city: '', isDefault: this.myAddresses().length === 0 } },
    );
  }

  setDraft(field: keyof AddressInput, value: string | boolean): void {
    this.addressModal.update((m) => (m ? { ...m, draft: { ...m.draft, [field]: value } } : m));
  }

  saveAddress(): void {
    const modal = this.addressModal();
    if (!modal) return;
    try {
      this.addresses.save(modal.draft, modal.id);
      this.addressModal.set(null);
      this.toast.show(modal.id ? 'Address updated.' : 'Address added to your address book.');
    } catch (error) {
      this.addressError.set(errorMessage(error));
    }
  }

  async removeAddress(address: Address): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Delete this address?', message: `The "${address.label}" address will be removed from your address book.`, confirmLabel: 'Yes, delete', cancelLabel: 'No, keep it', danger: true });
    if (!ok) return;
    this.addresses.remove(address.id);
    this.toast.show('Address deleted.', 'info');
  }

  setDefault(address: Address): void {
    this.addresses.setDefault(address.id);
    this.toast.show(`${address.label} is now your default address.`);
  }

  async deleteHairProfile(): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Delete your hair profile?', message: 'Your saved routine will be removed. You can take the quiz again any time.', confirmLabel: 'Yes, delete', cancelLabel: 'No, keep it', danger: true });
    if (!ok) return;
    try {
      this.quiz.deleteProfile();
      this.toast.show('Hair profile deleted.', 'info');
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  retakeQuiz(): void {
    this.quiz.start();
    void this.router.navigateByUrl('/quiz');
  }

  async signOut(): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Sign out?', message: 'You will need to sign in again to see your orders and Hair Profile.', confirmLabel: 'Yes, sign out', cancelLabel: 'No, stay', danger: true });
    if (!ok) return;
    this.auth.logout();
    this.toast.show('You have been signed out.', 'info');
    void this.router.navigateByUrl('/');
  }
}
