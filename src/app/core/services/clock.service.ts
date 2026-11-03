import { Injectable, signal } from '@angular/core';

/** One shared ticking clock for countdowns, session expiry and timed jobs. */
@Injectable({ providedIn: 'root' })
export class ClockService {
  readonly now = signal(Date.now());

  constructor() {
    if (typeof window !== 'undefined') {
      setInterval(() => this.now.set(Date.now()), 1000);
    }
  }
}
