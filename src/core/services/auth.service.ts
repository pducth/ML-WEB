import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../environment/environment';
import type { User } from '../models/user.model';

interface MockUser extends User {
  password: string;
}

const STORAGE_KEY = 'haircare_auth_user';

export const DEMO_USERS: MockUser[] = [
  {
    id: 'user-admin-haircare',
    email: 'admin@haircare.vn',
    fullName: 'Store Administrator',
    phone: '0908 123 456',
    role: 'Admin',
    password: 'admin123',
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-10-30T09:00:00.000Z',
  },
  {
    id: 'user-admin-001',
    email: 'admin@example.com',
    fullName: 'Store Administrator',
    phone: '+1-555-0100',
    role: 'Admin',
    password: 'admin123',
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-10-20T09:00:00.000Z',
  },
  {
    id: 'user-reference-customer',
    email: 'phuongthao.nguyen@gmail.com',
    fullName: 'Nguyễn Phương Thảo',
    phone: '0908 123 456',
    role: 'Customer',
    password: 'customer123',
    createdAt: '2026-10-26T09:00:00.000Z',
    updatedAt: '2026-10-26T09:00:00.000Z',
  },
  {
    id: 'user-customer-001',
    email: 'customer@example.com',
    fullName: 'Alex Morgan',
    phone: '+1-555-0101',
    role: 'Customer',
    password: 'customer123',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-10-20T09:00:00.000Z',
  },
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = `${environment.apiUrl}/users`;

  readonly currentUser = signal<User | null>(this.readStoredUser());
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly role = computed(() => this.currentUser()?.role ?? 'Guest');
  readonly authModalOpen = signal(false);
  readonly authTab = signal<'login' | 'register'>('login');
  readonly returnUrl = signal<string | null>(null);

  login(credentials: { email: string; password: string }) {
    const normEmail = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    return this.http
      .get<MockUser[]>(this.usersUrl, {
        params: new HttpParams().set('email', normEmail),
      })
      .pipe(
        catchError(() => of([])),
        switchMap((users) => {
          let user = users.find(
            (candidate) =>
              candidate.email.toLowerCase() === normEmail && candidate.password === password,
          );

          if (!user) {
            user = DEMO_USERS.find(
              (candidate) =>
                candidate.email.toLowerCase() === normEmail &&
                (candidate.password === password ||
                  (candidate.email === 'phuongthao.nguyen@gmail.com' && password === '********')),
            );
          }

          if (!user) {
            return throwError(() => new Error('Email or password is incorrect.'));
          }

          const { password: _password, ...authenticatedUser } = user;
          return of(authenticatedUser);
        }),
        tap((user) => this.persistUser(user)),
        map((user) => ({ user })),
      );
  }

  register(input: { fullName: string; email: string; phone: string; password?: string }) {
    const now = new Date().toISOString();
    const newUser: MockUser = {
      id: `user-${Date.now()}`,
      email: input.email.trim(),
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      role: 'Customer',
      password: input.password ?? '********',
      createdAt: now,
      updatedAt: now,
    };

    return this.http.post<MockUser>(this.usersUrl, newUser).pipe(
      catchError(() => of(newUser)),
      map(({ password: _password, ...user }) => user),
      tap((user) => this.persistUser(user)),
    );
  }

  logout() {
    this.persistUser(null);
    this.closeAuthModal();
    return of(undefined);
  }

  setCurrentUser(user: User | null): void {
    this.persistUser(user);
  }

  switchRole(role: 'Guest' | 'Customer' | 'Admin'): User | null {
    if (role === 'Guest') {
      this.persistUser(null);
      this.closeAuthModal();
      return null;
    }
    const target = role === 'Admin' ? DEMO_USERS[0] : DEMO_USERS[2];
    const { password: _password, ...user } = target;
    this.persistUser(user);
    this.closeAuthModal();
    return user;
  }

  updateProfile(id: string, changes: Pick<User, 'fullName' | 'phone'>) {
    return this.http
      .patch<User>(`${this.usersUrl}/${encodeURIComponent(id)}`, {
        ...changes,
        updatedAt: new Date().toISOString(),
      })
      .pipe(
        catchError(() => {
          const current = this.currentUser();
          if (current) {
            const updated = { ...current, ...changes, updatedAt: new Date().toISOString() };
            return of(updated);
          }
          return throwError(() => new Error('No user profile found.'));
        }),
        tap((user) => this.persistUser(user)),
      );
  }

  openAuthModal(returnUrl?: string): void {
    if (returnUrl) {
      this.returnUrl.set(returnUrl);
    }
    this.authTab.set('login');
    this.authModalOpen.set(true);
  }

  closeAuthModal(): void {
    this.authModalOpen.set(false);
  }

  setAuthTab(tab: 'login' | 'register'): void {
    this.authTab.set(tab);
  }

  private readStoredUser(): User | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private persistUser(user: User | null): void {
    this.currentUser.set(user);
    try {
      if (typeof window !== 'undefined') {
        if (user) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // localStorage may be unavailable
    }
  }
}
