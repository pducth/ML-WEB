import { KeepPlayingDirective } from '../../../../shared/ui/keep-playing.directive';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SettingsService } from '../../../../core/services/settings.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

type PolicyTab = 'about' | 'shipping' | 'returns' | 'privacy';

/** C16: About us & store policies (4 tabs, deep-linkable with ?tab=). */
@Component({
  selector: 'app-about-policies',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, RouterLink, UsdPipe, KeepPlayingDirective],
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

  /** The four houses and the part of the ritual each one stands for. */
  readonly origins: Array<{ name: string; brand: string; role: string; text: string; logo: string; logoClass: string; bigClass: string; video?: string; start?: number; poster: string }> = [
    { name: 'Moroccanoil', brand: 'moroccanoil', role: 'The Glow', text: 'Argan oil care for hair that feels smooth, shiny and pampered.', logo: '/assets/brand/moroccanoil-wordmark.png', logoClass: 'h-[11px]', bigClass: 'h-[21px]', video: '/assets/folmare/video/moroccanoil.mp4', poster: '/assets/folmare/video/moroccanoil-poster.jpg' },
    { name: 'AROMATICA', brand: 'aromatica', role: 'The Ritual', text: 'Aromatherapy for the scalp, turning daily care into a calm moment.', logo: '/assets/brand/aromatica-logo.svg', logoClass: 'h-5', bigClass: 'h-8', video: '/assets/folmare/video/aromatica.mp4', poster: '/assets/folmare/video/aromatica-poster.jpg' },
    { name: 'Rahua', brand: 'rahua', role: 'The Roots', text: 'Amazon botanicals and traditional knowledge, sourced with respect.', logo: '/assets/brand/rahua-wordmark.png', logoClass: 'h-7', bigClass: 'h-12', video: '/assets/folmare/video/rahua.mp4', poster: '/assets/folmare/video/rahua-poster.jpg' },
    { name: 'Davines', brand: 'davines', role: 'The Wisdom', text: 'Italian science and sustainable beauty, refined through research.', logo: '/assets/brand/davines-logo.svg', logoClass: 'h-7', bigClass: 'h-12', video: '/assets/folmare/video/davines.mp4', poster: '/assets/folmare/video/davines-poster.jpg' },
  ];
  readonly origin = signal(0);
  readonly currentOrigin = computed(() => this.origins[this.origin()]);

  /** A film starts at its chosen second and returns there when it ends. */
  seek(event: Event, start = 0): void {
    const video = event.target as HTMLVideoElement;
    if (Math.abs(video.currentTime - start) > 0.5) video.currentTime = start;
  }

  readonly slides: Array<{ title: string; text: string; image: string; dark?: boolean; flip?: boolean; pos?: string }> = [
    { title: '100% authentic', text: 'Every unit is sourced through authorised distribution channels, stored in controlled conditions and shipped sealed.', image: '/assets/folmare/about/slide-a.jpg' },
    { title: 'Guidance you can trust', text: 'Our Hair Quiz turns salon know-how into a personal 4-step routine, so you buy what your hair truly needs.', image: '/assets/folmare/about/slide-b.jpg' },
    { title: 'Reviews that are real', text: 'Only customers with delivered orders can review, so every review on FOLMARÉ is a verified purchase.', image: '/assets/folmare/about/slide-c.jpg', dark: true },
  ];
  private readonly heroes: Record<Exclude<PolicyTab, 'about'>, { eyebrow: string; title: string; text: string; image: string }> = {
    shipping: { eyebrow: 'Sales & shipping', title: 'Delivered with care', text: 'Clear prices, flat-rate shipping and flexible payment, from our shelf to your door.', image: '/assets/folmare/about/ship-hero-4.jpg' },
    returns: { eyebrow: 'Returns & refunds', title: 'Easy, fair returns', text: 'If something is not right, we make it simple to send back and get refunded.', image: '/assets/folmare/about/ret-hero-10.jpg' },
    privacy: { eyebrow: 'Privacy policy', title: 'Your data, handled gently', text: 'We collect only what we need, keep quiz statistics anonymous and protect every account.', image: '/assets/folmare/about/priv-account.jpg' },
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
