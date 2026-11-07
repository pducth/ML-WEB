import { Injectable, computed, inject, signal } from '@angular/core';
import { readJson, writeJson } from '../data/browser-storage';
import { DomainError, MockDbService } from '../data/mock-db.service';
import { ClockService } from './clock.service';

interface AdminSession {
  adminId: string;
  expiresAt: number;
}

const ADMIN_SESSION_KEY = 'haircare-insight:admin-session';

/** A01: the admin portal uses its own account store and session, separate from customers. */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly store = inject(MockDbService);
  private readonly clock = inject(ClockService);
  private readonly session = signal<AdminSession | null>(readJson<AdminSession | null>('session', ADMIN_SESSION_KEY, null));

  readonly currentAdmin = computed(() => {
    const session = this.session();
    if (!session || session.expiresAt < this.clock.now()) return null;
    const admin = this.store.db().admins.find((candidate) => candidate.id === session.adminId);
    return admin ? { id: admin.id, fullName: admin.fullName, email: admin.email } : null;
  });
  readonly isLoggedIn = computed(() => this.currentAdmin() !== null);

  login(email: string, password: string): void {
    const admin = this.store
      .db()
      .admins.find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase() && candidate.password === password);
    // One generic message for unknown email, wrong password or wrong role.
    if (!admin) throw new DomainError('Invalid credentials');
    const session = { adminId: admin.id, expiresAt: Date.now() + 8 * 3600_000 };
    this.session.set(session);
    writeJson('session', ADMIN_SESSION_KEY, session);
  }

  logout(): void {
    this.session.set(null);
    writeJson('session', ADMIN_SESSION_KEY, null);
  }
}
