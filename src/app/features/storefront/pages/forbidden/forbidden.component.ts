import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** 403 — shown when a signed-in customer opens an /admin/* page (RBAC matrix). */
@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="app-screen animate-fadeIn">
      <div class="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <p class="fm-eyebrow">Error 403</p>
        <h1 class="text-3xl text-[#0F3D32]">Access denied</h1>
        <p class="text-sm text-[#5E6F68]">You don't have permission to view this page.</p>
        <div class="flex justify-center gap-3 pt-2">
          <a routerLink="/" class="btn-primary">Back to Store</a>
        </div>
      </div>
    </section>
  `,
})
export class ForbiddenComponent {}
