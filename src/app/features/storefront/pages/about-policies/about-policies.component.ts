import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SettingsService } from '../../../../core/services/settings.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

type PolicyTab = 'about' | 'shipping' | 'returns' | 'privacy';

/** C16 — About us & store policies (4 tabs, deep-linkable with ?tab=). */
@Component({
  selector: 'app-about-policies',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, RouterLink, UsdPipe],
  templateUrl: './about-policies.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPoliciesComponent {
  private readonly router = inject(Router);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });
  readonly settings = inject(SettingsService).settings;

  readonly tabs: Array<{ id: PolicyTab; label: string }> = [
    { id: 'about', label: 'About Us' },
    { id: 'shipping', label: 'Sales & Shipping' },
    { id: 'returns', label: 'Returns & Refunds' },
    { id: 'privacy', label: 'Privacy Policy' },
  ];
  readonly tab = computed<PolicyTab>(() => {
    const tab = this.params().get('tab') as PolicyTab | null;
    return tab && this.tabs.some((t) => t.id === tab) ? tab : 'about';
  });

  readonly slides: Array<{ title: string; text: string; image: string; dark?: boolean; flip?: boolean; pos?: string }> = [
    { title: '100% authentic', text: 'Every unit is sourced through authorised distribution channels, stored in controlled conditions and shipped sealed.', image: '/assets/folmare/about/slide-1.jpg' },
    { title: 'Guidance you can trust', text: 'Our Hair Quiz turns salon know-how into a personal 4-step routine, so you buy what your hair truly needs.', image: '/assets/folmare/about/slide-2.jpg', flip: true },
    { title: 'Reviews that are real', text: 'Only customers with delivered orders can review — every review on FOLMARÉ is a verified purchase.', image: '/assets/folmare/about/slide-3.jpg', dark: true, pos: 'object-[center_100%]' },
  ];
  private readonly heroes: Record<Exclude<PolicyTab, 'about'>, { eyebrow: string; title: string; text: string; image: string }> = {
    shipping: { eyebrow: 'Sales & shipping', title: 'Delivered with care', text: 'Clear prices, flat-rate shipping and flexible payment — from our shelf to your door.', image: '/assets/folmare/about/ship-hero.jpg' },
    returns: { eyebrow: 'Returns & refunds', title: 'Easy, fair returns', text: 'If something is not right, we make it simple to send back and get refunded.', image: '/assets/folmare/about/ret-hero.jpg' },
    privacy: { eyebrow: 'Privacy policy', title: 'Your data, handled gently', text: 'We collect only what we need, keep quiz statistics anonymous and protect every account.', image: '/assets/folmare/about/priv-hero.jpg' },
  };
  readonly hero = computed(() => this.heroes[this.tab() === 'about' ? 'shipping' : (this.tab() as Exclude<PolicyTab, 'about'>)]);
  readonly slide = signal(0);
  go(i: number): void { this.slide.set(i); }
  next(): void { this.slide.update((i) => Math.min(i + 1, this.slides.length - 1)); }
  prev(): void { this.slide.update((i) => Math.max(i - 1, 0)); }

  select(tab: PolicyTab): void {
    void this.router.navigate([], { queryParams: { tab }, replaceUrl: true });
  }
}
