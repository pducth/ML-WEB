import { Injectable, computed, inject } from '@angular/core';
import { DomainError, MockDbService, newId } from '../data/mock-db.service';
import type { Address } from '../models';
import { AuthService, PHONE_PATTERN, normalizePhone } from './auth.service';

export type AddressInput = Omit<Address, 'id' | 'userId'>;

export function formatAddress(address: Pick<Address, 'street' | 'ward' | 'district' | 'city'>): string {
  return [address.street, address.ward, address.district, address.city].filter((part) => part && part.trim()).join(', ');
}

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly store = inject(MockDbService);
  private readonly auth = inject(AuthService);

  readonly mine = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return [];
    return this.store
      .db()
      .addresses.filter((a) => a.userId === user.id)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  });

  forUser(userId: string): Address[] {
    return this.store.db().addresses.filter((a) => a.userId === userId);
  }

  save(input: AddressInput, id?: string): Address {
    const user = this.auth.currentUser();
    if (!user) throw new DomainError('Please sign in to manage addresses.');
    if (!input.recipientName.trim()) throw new DomainError('Recipient name is required.');
    if (!PHONE_PATTERN.test(normalizePhone(input.phone))) throw new DomainError('Please enter a valid phone number.');
    if (!input.street.trim() || !input.city.trim()) throw new DomainError('Street address and city are required.');
    return this.store.mutate((db) => {
      const own = db.addresses.filter((a) => a.userId === user.id);
      const makeDefault = input.isDefault || own.length === 0 || (id !== undefined && own.length === 1);
      if (makeDefault) own.forEach((a) => (a.isDefault = false));
      if (id) {
        const address = own.find((a) => a.id === id);
        if (!address) throw new DomainError('Address not found.');
        Object.assign(address, { ...input, isDefault: makeDefault || address.isDefault });
        return address;
      }
      const address: Address = { ...input, id: newId('addr'), userId: user.id, isDefault: makeDefault };
      db.addresses.push(address);
      return address;
    });
  }

  setDefault(id: string): void {
    const user = this.auth.currentUser();
    this.store.mutate((db) => {
      db.addresses.filter((a) => a.userId === user?.id).forEach((a) => (a.isDefault = a.id === id));
    });
  }

  remove(id: string): void {
    const user = this.auth.currentUser();
    this.store.mutate((db) => {
      const removed = db.addresses.find((a) => a.id === id && a.userId === user?.id);
      db.addresses = db.addresses.filter((a) => a !== removed);
      const rest = db.addresses.filter((a) => a.userId === user?.id);
      if (removed?.isDefault && rest.length) rest[0].isDefault = true;
    });
  }
}
