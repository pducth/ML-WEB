import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import type { Address } from '../../../../core/models';
import { AddressService, formatAddress, type AddressInput } from '../../../../core/services/address.service';
import { AuthService, PASSWORD_RULE } from '../../../../core/services/auth.service';
import { HairRoutineEngineService } from '../../../../core/services/hair-routine-engine.service';
import { OrderService } from '../../../../core/services/order.service';
import { ProductService } from '../../../../core/services/product.service';
import { QuizService } from '../../../../core/services/quiz.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StoreModalComponent } from '../../../../shared/ui/store-modal.component';

const STEP_TITLES: Record<string, string> = { cleanse: 'Cleanse', condition: 'Condition', treat: 'Treat & Nourish', style_protect: 'Style & Protect' };

/** C13 — My profile, Hair Profile and address book. */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, StoreModalComponent],
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

  readonly user = this.auth.currentUser;
  readonly myAddresses = this.addresses.mine;
  private readonly orders = inject(OrderService);
  readonly orderCount = computed(() => this.orders.myOrders().length);
  readonly hairProfile = this.quiz.myProfile;
  readonly formatAddress = formatAddress;
  readonly stepTitles = STEP_TITLES;
  readonly passwordRule = PASSWORD_RULE;
  readonly labelTitle = (label: string | null) => (label ? this.engine.labelTitle(label) : '—');
  readonly initials = computed(() => (this.user()?.fullName ?? '?').split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase());

  readonly info = signal({ fullName: this.user()?.fullName ?? '', email: this.user()?.email ?? '', phone: this.user()?.phone ?? '' });
  readonly passwords = signal({ current: '', next: '', confirm: '' });
  readonly addressModal = signal<{ id?: string; draft: AddressInput } | null>(null);
  readonly addressError = signal('');

  readonly routineItems = computed(() =>
    (this.hairProfile()?.routine ?? []).map((item) => ({ ...item, product: item.productId ? this.products.getById(item.productId) : undefined })),
  );

  saveInfo(): void {
    try {
      this.auth.updateProfile(this.info());
      this.toast.show('Account details saved successfully!');
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  changePassword(): void {
    const p = this.passwords();
    try {
      this.auth.changePassword(p.current, p.next, p.confirm);
      this.passwords.set({ current: '', next: '', confirm: '' });
      this.toast.show('Your password has been changed.');
    } catch (error) {
      this.toast.error(errorMessage(error));
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

  removeAddress(address: Address): void {
    if (!confirm(`Delete the "${address.label}" address?`)) return;
    this.addresses.remove(address.id);
    this.toast.show('Address deleted.', 'info');
  }

  setDefault(address: Address): void {
    this.addresses.setDefault(address.id);
    this.toast.show(`${address.label} is now your default address.`);
  }

  retakeQuiz(): void {
    this.quiz.start();
    void this.router.navigateByUrl('/quiz');
  }

  signOut(): void {
    this.auth.logout();
    this.toast.show('You have been signed out.', 'info');
    void this.router.navigateByUrl('/');
  }
}
