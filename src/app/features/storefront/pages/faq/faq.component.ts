import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { buildFaqGroups, type FaqGroup } from '../../../../core/data/faq-data';
import { SettingsService } from '../../../../core/services/settings.service';


/** FAQs, grouped by what a shopper is trying to do. Figures come from the store settings so they never go stale. */
@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [NgClass, RouterLink],
  template: `
    <section class="app-screen animate-fadeIn">
      <!-- Hero banner, same format as the About and policy pages -->
      <div class="relative flex items-center min-h-[320px] md:min-h-[440px] overflow-hidden bg-[#E9DFD2]">
        <img src="/assets/folmare/about/faq-hero-2.jpg" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-r from-[#F7F8F4]/85 via-[#F7F8F4]/35 to-transparent"></div>
        <div class="relative w-full max-w-7xl mx-auto px-6 sm:px-10 py-14">
          <div class="max-w-3xl space-y-4">
            <span class="fm-eyebrow">FAQs</span>
            <h1 class="text-3xl sm:text-5xl text-[#0F3D32] sm:whitespace-nowrap">Frequently asked questions</h1>
            <p class="max-w-xl text-sm sm:text-base text-[#0F3D32]/85">Orders, shipping, returns, the Hair Quiz and your account. Find what you need, or write to us.</p>
          </div>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div class="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-14 lg:items-start">
          <!-- Topics -->
          <nav class="mb-8 lg:mb-0 lg:sticky lg:top-40" aria-label="FAQ topics">
            <div class="relative mb-5">
              <label for="faq-search" class="sr-only">Search the FAQs</label>
              <svg class="w-4 h-4 text-[#85968E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input id="faq-search" type="search" [value]="search()" (input)="onSearch($any($event.target).value)" placeholder="Search questions"
                class="w-full bg-white border border-[#DCE5E0] text-sm text-[#0F3D32] py-3 pl-10 pr-3 outline-none placeholder:text-[#85968E] focus:border-[#19594A]" />
            </div>
            <ul class="flex lg:flex-col gap-x-6 lg:gap-x-0 overflow-x-auto lg:overflow-visible border-b lg:border-b-0 border-[#DCE5E0] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              @for (group of groups(); track group.title; let g = $index) {
                <li class="shrink-0">
                  <button type="button" (click)="selectTopic(g)" [attr.aria-current]="!searching() && topic() === g ? 'true' : null"
                    class="relative w-full text-left py-3 lg:py-3.5 lg:pl-4 lg:border-l-2 text-sm whitespace-nowrap transition-colors"
                    [ngClass]="!searching() && topic() === g ? 'font-bold text-[#0F3D32] lg:border-[#0F3D32] lg:bg-[#EEF3EF]' : 'text-[#5E6F68] lg:border-[#DCE5E0] hover:text-[#0F3D32]'">
                    {{ group.title }}
                    @if (!searching() && topic() === g) { <span class="lg:hidden absolute left-0 right-0 bottom-0 h-[2px] bg-[#0F3D32]"></span> }
                  </button>
                </li>
              }
            </ul>
          </nav>

          <!-- Questions -->
          <div>
            @for (group of visible(); track group.title) {
              <div class="mb-12 last:mb-0">
                <h2 class="fm-display text-2xl sm:text-3xl text-[#0F3D32] leading-none pt-1">{{ group.title }}</h2>
                <div class="mt-5 border-t border-[#DCE5E0]">
                  @for (item of group.items; track item.q) {
                    @let key = item.q;
                    <div class="border-b border-[#DCE5E0]">
                      <button type="button" (click)="toggle(key)" [attr.aria-expanded]="open() === key" [attr.aria-controls]="'faq-' + $index"
                        class="w-full flex items-center justify-between gap-6 py-5 text-left group/q">
                        <span class="text-base font-semibold leading-snug transition-colors" [ngClass]="open() === key ? 'text-[#0F3D32]' : 'text-[#1D302C] group-hover/q:text-[#4F7F72]'">{{ item.q }}</span>
                        <span class="relative w-5 h-5 shrink-0 text-[#0F3D32]" aria-hidden="true">
                          <span class="absolute left-0 right-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-current"></span>
                          <span class="absolute top-0 bottom-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-current transition-transform duration-300" [class.scale-y-0]="open() === key"></span>
                        </span>
                      </button>
                      @if (open() === key) {
                        <p [id]="'faq-' + $index" class="pb-6 pr-12 text-[15px] text-[#2C3E37] leading-relaxed animate-fadeIn">{{ item.a }}</p>
                      }
                    </div>
                  }
                </div>
              </div>
            } @empty {
              <div class="py-16 text-center border border-[#DCE5E0] bg-white">
                <span class="fm-eyebrow">No matches</span>
                <p class="fm-display text-2xl text-[#0F3D32] mt-2">We could not find that</p>
                <button type="button" (click)="onSearch('')" class="btn-secondary text-sm px-6 py-2.5 mt-5">Clear search</button>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Contact -->
      <div class="bg-[#0F3D32] text-center px-6 py-12 space-y-4">
        <h2 class="text-2xl sm:text-3xl text-white">Still have a question? We are happy to help.</h2>
        <a [href]="'https://mail.google.com/mail/?view=cm&fs=1&to=' + settings().supportEmail" target="_blank" rel="noopener noreferrer"
          class="inline-flex items-center justify-center px-7 py-3.5 border border-white text-white text-[0.8125rem] font-semibold uppercase tracking-[0.12em] hover:bg-white hover:text-[#0F3D32] transition-colors">{{ settings().supportEmail }}</a>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqComponent {
  readonly settings = inject(SettingsService).settings;
  readonly search = signal('');
  readonly topic = signal(0);
  /** The question whose answer is showing. */
  readonly open = signal<string | null>(null);
  readonly searching = computed(() => this.search().trim().length > 0);

  /** One topic when browsing, every matching question across topics when searching. */
  readonly visible = computed<FaqGroup[]>(() => {
    const groups = this.groups();
    const term = this.search().trim().toLowerCase();
    if (!term) return [groups[this.topic()]];
    return groups
      .map((group) => ({ title: group.title, items: group.items.filter((item) => (item.q + ' ' + item.a).toLowerCase().includes(term)) }))
      .filter((group) => group.items.length);
  });

  readonly groups = computed<FaqGroup[]>(() => buildFaqGroups(this.settings()));

  toggle(key: string): void {
    this.open.update((current) => (current === key ? null : key));
  }

  selectTopic(index: number): void {
    this.search.set('');
    this.topic.set(index);
    this.open.set(null);
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.open.set(null);
  }
}
