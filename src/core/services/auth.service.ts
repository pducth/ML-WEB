import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../environment/environment';
import type { User } from '../models/user.model';

interface MockUser extends User {
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = `${environment.apiUrl}/users`;

  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly role = computed(() => this.currentUser()?.role ?? 'Guest');
  readonly authModalOpen = signal(false);
  readonly authTab = signal<'login' | 'register'>('login');
  readonly returnUrl = signal<string | null>(null);

  login(credentials: { email: string; password: string }) {
    return this.http
      .get<MockUser[]>(this.usersUrl, {
        params: new HttpParams().set('email', credentials.email.trim()),
      })
      .pipe(
        switchMap((users) => {
          const user = users.find((candidate) => candidate.password === credentials.password);
          if (!user) {
            return throwError(() => new Error('Email or password is incorrect.'));
          }

          const { password: _password, ...authenticatedUser } = user;
          return of(authenticatedUser);
        }),
        tap((user) => this.currentUser.set(user)),
        map((user) => ({ user })),
      );
  }

  register(input: { fullName: string; email: string; phone: string; password: string }) {
    const now = new Date().toISOString();
    const newUser: MockUser = {
      id: `user-${Date.now()}`,
      email: input.email.trim(),
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      role: 'Customer',
      password: input.password,
      createdAt: now,
      updatedAt: now,
    };

    return this.http.post<MockUser>(this.usersUrl, newUser).pipe(
      map(({ password: _password, ...user }) => user),
      tap((user) => this.currentUser.set(user)),
    );
  }

  logout() {
    this.currentUser.set(null);
    this.closeAuthModal();
    return of(undefined);
  }

  setCurrentUser(user: User | null): void {
    this.currentUser.set(user);
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
}
