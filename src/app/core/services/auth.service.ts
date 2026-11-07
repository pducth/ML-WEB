import { Injectable, computed, inject, signal } from '@angular/core';
import { readJson, writeJson } from '../data/browser-storage';
import { DomainError, MockDbService, newId, nowIso } from '../data/mock-db.service';
import type { PublicUser, User } from '../models';
import { ClockService } from './clock.service';

interface CustomerSession {
  userId: string;
  expiresAt: number;
}

const SESSION_KEY = 'haircare-insight:session';
const SESSION_HOURS = 24;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;
const OTP_VALID_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_SECONDS = 60;

export const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
export const PHONE_PATTERN = /^(0|\+84)\d{9}$/;
export const PASSWORD_RULE = 'At least 8 characters with an uppercase letter, a lowercase letter and a number.';

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s.-]/g, '');
}

export function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

function toPublic(user: User): PublicUser {
  const { password: _p, failedAttempts: _f, lockedUntil: _l, ...rest } = user;
  return rest;
}

/** Customer authentication (C10–C13), BR-ACC rules. Admin sign-in lives in AdminAuthService. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly store = inject(MockDbService);
  private readonly clock = inject(ClockService);
  private readonly session = signal<CustomerSession | null>(
    readJson<CustomerSession | null>('local', SESSION_KEY, null) ?? readJson<CustomerSession | null>('session', SESSION_KEY, null),
  );

  /** Locked accounts and expired sessions are treated as signed out (sessions revoked, BR-ACC-09). */
  readonly currentUser = computed<PublicUser | null>(() => {
    const session = this.session();
    if (!session || session.expiresAt < this.clock.now()) return null;
    const user = this.store.db().users.find((candidate) => candidate.id === session.userId);
    return user && user.status === 'Active' ? toPublic(user) : null;
  });
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  login(identifier: string, password: string, remember: boolean): PublicUser {
    const id = identifier.trim().toLowerCase();
    const phone = normalizePhone(identifier);
    const now = Date.now();
    const found = this.store.db().users.find((candidate) => candidate.email.toLowerCase() === id || normalizePhone(candidate.phone) === phone);
    if (!found) throw new DomainError('Email or password is incorrect.');
    if (found.status === 'Locked') {
      throw new DomainError('This account has been locked by the store. Please contact customer support.');
    }
    if (found.lockedUntil && Date.parse(found.lockedUntil) > now) {
      const minutes = Math.ceil((Date.parse(found.lockedUntil) - now) / 60000);
      throw new DomainError(`Too many failed attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
    }
    // The failed-attempt counter is committed first, then the error is raised (BR-ACC-08).
    const user = this.store.mutate((db) => {
      const target = db.users.find((candidate) => candidate.id === found.id)!;
      if (target.password !== password) {
        target.failedAttempts += 1;
        if (target.failedAttempts >= MAX_FAILED_ATTEMPTS) {
          target.failedAttempts = 0;
          target.lockedUntil = new Date(now + LOCKOUT_MINUTES * 60000).toISOString();
        }
        return null;
      }
      target.failedAttempts = 0;
      target.lockedUntil = null;
      return toPublic(target);
    });
    if (!user) {
      const after = this.store.db().users.find((candidate) => candidate.id === found.id)!;
      if (after.lockedUntil && Date.parse(after.lockedUntil) > now) {
        throw new DomainError(`Too many failed attempts. Sign-in is locked for ${LOCKOUT_MINUTES} minutes.`);
      }
      const left = MAX_FAILED_ATTEMPTS - after.failedAttempts;
      throw new DomainError(`Email or password is incorrect. ${left} attempt${left > 1 ? 's' : ''} left before a temporary lock.`);
    }
    this.startSession(user.id, remember);
    return user;
  }

  register(input: { fullName: string; email: string; phone: string; password: string; confirmPassword: string; acceptTerms: boolean }): PublicUser {
    const email = input.email.trim().toLowerCase();
    const phone = normalizePhone(input.phone);
    if (input.fullName.trim().length < 2) throw new DomainError('Please enter your full name.');
    if (!EMAIL_PATTERN.test(email)) throw new DomainError('Please enter a valid email address.');
    if (!PHONE_PATTERN.test(phone)) throw new DomainError('Please enter a valid phone number (e.g. 0901234567).');
    if (!isStrongPassword(input.password)) throw new DomainError(`Password must have ${PASSWORD_RULE.toLowerCase()}`);
    if (input.password !== input.confirmPassword) throw new DomainError('Passwords do not match.');
    if (!input.acceptTerms) throw new DomainError('Please accept the Terms & Policies to continue.');
    return this.store.mutate((db) => {
      if (db.users.some((u) => u.email.toLowerCase() === email)) throw new DomainError('This email is already linked to an account.');
      if (db.users.some((u) => normalizePhone(u.phone) === phone)) throw new DomainError('This phone number is already linked to an account.');
      const now = nowIso();
      const user: User = {
        id: newId('user'),
        fullName: input.fullName.trim(),
        email,
        phone,
        password: input.password,
        role: 'Customer',
        status: 'Active',
        lockReason: null,
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
      };
      db.users.push(user);
      this.startSession(user.id, true);
      return toPublic(user);
    });
  }

  logout(): void {
    this.session.set(null);
    writeJson('local', SESSION_KEY, null);
    writeJson('session', SESSION_KEY, null);
  }

  /** Dev tools only: sign in as an existing customer without a password. */
  impersonate(userId: string): void {
    this.startSession(userId, true);
  }

  updateProfile(changes: { fullName: string; email: string; phone: string }): void {
    const user = this.requireUser();
    const email = changes.email.trim().toLowerCase();
    const phone = normalizePhone(changes.phone);
    if (changes.fullName.trim().length < 2) throw new DomainError('Please enter your full name.');
    if (!EMAIL_PATTERN.test(email)) throw new DomainError('Please enter a valid email address.');
    if (!PHONE_PATTERN.test(phone)) throw new DomainError('Please enter a valid phone number.');
    this.store.mutate((db) => {
      if (db.users.some((u) => u.id !== user.id && u.email.toLowerCase() === email)) throw new DomainError('This email is already linked to another account.');
      if (db.users.some((u) => u.id !== user.id && normalizePhone(u.phone) === phone)) throw new DomainError('This phone number is already linked to another account.');
      const target = db.users.find((u) => u.id === user.id)!;
      Object.assign(target, { fullName: changes.fullName.trim(), email, phone, updatedAt: nowIso() });
    });
  }

  /** Runs every check a password change needs without changing anything, so the UI can confirm only a valid request. */
  checkPasswordChange(current: string, next: string, confirm: string): void {
    const user = this.requireUser();
    if (!current) throw new DomainError('Please enter your current password.');
    if (this.store.db().users.find((u) => u.id === user.id)?.password !== current) throw new DomainError('Current password is incorrect.');
    if (!isStrongPassword(next)) throw new DomainError(`New password must have ${PASSWORD_RULE.toLowerCase()}`);
    if (next !== confirm) throw new DomainError('New passwords do not match.');
  }

  changePassword(current: string, next: string, confirm: string): void {
    const user = this.requireUser();
    this.checkPasswordChange(current, next, confirm);
    this.store.mutate((db) => {
      const target = db.users.find((u) => u.id === user.id)!;
      if (target.password !== current) throw new DomainError('Current password is incorrect.');
      target.password = next;
      target.updatedAt = nowIso();
    });
  }

  /**
   * C12 step 1. Returns the sandbox code so the demo can be accepted without SMTP (proposal C12).
   * Unknown emails get the same neutral response to avoid account enumeration.
   */
  requestOtp(emailInput: string): { sandboxCode: string | null; resendAt: number } {
    const email = emailInput.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) throw new DomainError('Please enter a valid email address.');
    const now = Date.now();
    return this.store.mutate((db) => {
      const last = [...db.otpRequests].reverse().find((otp) => otp.email === email);
      if (last && now - Date.parse(last.sentAt) < OTP_RESEND_SECONDS * 1000) {
        const wait = Math.ceil((OTP_RESEND_SECONDS * 1000 - (now - Date.parse(last.sentAt))) / 1000);
        throw new DomainError(`Please wait ${wait}s before requesting another code.`);
      }
      const exists = db.users.some((u) => u.email.toLowerCase() === email);
      const code = String(Math.floor(100000 + Math.random() * 900000));
      db.otpRequests.forEach((otp) => {
        if (otp.email === email) otp.used = true;
      });
      db.otpRequests.push({
        id: newId('otp'),
        email,
        code,
        expiresAt: new Date(now + OTP_VALID_MINUTES * 60000).toISOString(),
        sentAt: new Date(now).toISOString(),
        attempts: 0,
        used: !exists,
      });
      return { sandboxCode: exists ? code : null, resendAt: now + OTP_RESEND_SECONDS * 1000 };
    });
  }

  resetPassword(emailInput: string, code: string, password: string, confirm: string): void {
    const email = emailInput.trim().toLowerCase();
    if (!/^\d{6}$/.test(code)) throw new DomainError('The verification code has 6 digits.');
    if (!isStrongPassword(password)) throw new DomainError(`New password must have ${PASSWORD_RULE.toLowerCase()}`);
    if (password !== confirm) throw new DomainError('Passwords do not match.');
    const now = Date.now();
    let failure: string | null = null;
    this.store.mutate((db) => {
      const otp = [...db.otpRequests].reverse().find((candidate) => candidate.email === email && !candidate.used);
      if (!otp) throw new DomainError('This code is invalid or has already been used. Please request a new one.');
      if (Date.parse(otp.expiresAt) < now) {
        otp.used = true;
        failure = 'This code has expired. Please request a new one.';
        return;
      }
      if (otp.code !== code) {
        otp.attempts += 1;
        if (otp.attempts >= OTP_MAX_ATTEMPTS) {
          otp.used = true;
          failure = 'Too many incorrect codes. Please request a new one.';
        } else {
          failure = `Incorrect code. ${OTP_MAX_ATTEMPTS - otp.attempts} attempts left.`;
        }
        return;
      }
      otp.used = true;
      const user = db.users.find((u) => u.email.toLowerCase() === email)!;
      user.password = password;
      user.failedAttempts = 0;
      user.lockedUntil = null;
      user.updatedAt = nowIso();
    });
    // Attempt counters must persist even when the reset fails, so the error is raised after commit.
    if (failure) throw new DomainError(failure);
  }

  private startSession(userId: string, remember: boolean): void {
    const session: CustomerSession = { userId, expiresAt: Date.now() + SESSION_HOURS * 3600_000 };
    this.session.set(session);
    writeJson(remember ? 'local' : 'session', SESSION_KEY, session);
    writeJson(remember ? 'session' : 'local', SESSION_KEY, null);
  }

  private requireUser(): PublicUser {
    const user = this.currentUser();
    if (!user) throw new DomainError('Please sign in to continue.');
    return user;
  }
}
