import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChatbotService, type ChatMessage } from '../../../core/services/chatbot.service';
import { UsdPipe } from '../../ui/usd.pipe';

const TIP_KEY = 'folmare.chat.tip';

/** The store assistant: a round button in the corner that opens a chat panel (full screen on phones). */
@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, UsdPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'chat.open() && chat.setOpen(false)' },
  styles: `
    @keyframes chat-in { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: none; } }
    @keyframes chat-msg { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes chat-dot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.35; } 30% { transform: translateY(-4px); opacity: 1; } }
    @keyframes chat-tip { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }
    .chat-panel { animation: chat-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; transform-origin: bottom right; }
    .chat-msg { animation: chat-msg 0.3s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .chat-tip { animation: chat-tip 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .chat-dot { animation: chat-dot 1.1s ease-in-out infinite; }
    .chat-dot:nth-child(2) { animation-delay: 0.15s; }
    .chat-dot:nth-child(3) { animation-delay: 0.3s; }
    .chat-scroll { scrollbar-width: thin; scrollbar-color: #B5C8BD transparent; overscroll-behavior: contain; }
    @media (prefers-reduced-motion: reduce) { .chat-panel, .chat-msg, .chat-tip, .chat-dot { animation: none; } }
  `,
  template: `
    @if (chat.open()) {
      <section role="dialog" aria-label="FOLMARÉ assistant"
        class="chat-panel fixed z-[46] inset-0 sm:inset-auto sm:right-6 sm:bottom-[88px] sm:w-[360px] sm:h-[min(540px,calc(100svh-7rem))] flex flex-col bg-[#F7F8F4] shadow-[0_24px_60px_-20px_rgb(15_61_50/50%)] overflow-hidden sm:rounded-[18px]">

        <!-- Header -->
        <header class="relative shrink-0 flex items-center gap-3 px-4 py-3.5 text-white overflow-hidden bg-gradient-to-br from-[#082A22] via-[#0F3D32] to-[#2F6F5C]">
          <span class="absolute -right-10 -top-12 w-40 h-40 rounded-full bg-[#9CC3B4]/20 blur-2xl pointer-events-none" aria-hidden="true"></span>
          <span class="relative shrink-0 w-9 h-9 rounded-full bg-white flex items-center justify-center">
            <img src="/assets/folmare/logo/png/folmare-monogram-dark.png" alt="" class="w-5 h-auto" />
          </span>
          <div class="relative min-w-0 flex-1">
            <p class="fm-display text-lg leading-none">FOLMARÉ</p>
            <p class="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#CFE3D8]"><span class="w-1.5 h-1.5 rounded-full bg-[#7FE0A8]" aria-hidden="true"></span>Store assistant, replies instantly</p>
          </div>
          <button type="button" (click)="chat.reset()" class="relative w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors" aria-label="Start a new conversation" title="New conversation">
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 12a8 8 0 0 1 14-5.3M20 4v4.5h-4.5M20 12a8 8 0 0 1-14 5.3M4 20v-4.5h4.5" /></svg>
          </button>
          <button type="button" (click)="chat.setOpen(false)" class="relative w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors" aria-label="Close chat">
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>

        <!-- Conversation -->
        <div #scroller class="chat-scroll flex-1 min-h-0 overflow-y-auto px-3.5 py-4 space-y-3.5" role="log" aria-live="polite" aria-label="Conversation">
          @for (m of chat.messages(); track m.id; let last = $last) {
            @if (m.from === 'user') {
              <div class="chat-msg flex justify-end">
                <p class="max-w-[82%] bg-[#0F3D32] text-white text-[13px] leading-relaxed px-3.5 py-2 rounded-[14px_2px_14px_14px] break-words">{{ m.text }}</p>
              </div>
            } @else {
              <div class="chat-msg flex items-start gap-2.5">
                <span class="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-white border border-[#DCE5E0] flex items-center justify-center">
                  <img src="/assets/folmare/logo/png/folmare-monogram-dark.png" alt="" class="w-4 h-auto" />
                </span>
                <div class="min-w-0 flex-1 space-y-2.5">
                  @if (m.text) {
                    <p class="max-w-[92%] bg-white border border-[#DCE5E0] text-[#1D302C] text-[13px] leading-relaxed px-3.5 py-2.5 rounded-[2px_14px_14px_14px] whitespace-pre-line break-words">{{ m.text }}</p>
                  }

                  @if (m.cards?.length) {
                    <ul class="space-y-2 max-w-[92%]">
                      @for (card of m.cards; track card.id) {
                        <li>
                          <a [routerLink]="['/products', card.id]" (click)="afterNavigate()" class="group flex items-center gap-3 p-2.5 bg-white border border-[#DCE5E0] hover:border-[#0F3D32] transition-colors">
                            <img [src]="card.image" [alt]="card.name" class="shrink-0 w-14 h-14 object-cover bg-[#F0F3EF]" loading="lazy" />
                            <span class="min-w-0 flex-1">
                              <span class="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#4F7F72]">{{ card.brand }}</span>
                              <span class="block mt-0.5 text-[13px] font-semibold leading-snug text-[#0F3D32] line-clamp-2">{{ card.name }}</span>
                              <span class="block mt-0.5 text-[12px] text-[#5E6F68]">From {{ card.price | usd }}</span>
                            </span>
                            <svg class="shrink-0 w-4 h-4 text-[#85968E] group-hover:text-[#0F3D32] group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6" /></svg>
                          </a>
                        </li>
                      }
                    </ul>
                  }

                  @if (m.actions?.length) {
                    <div class="flex flex-col gap-2 max-w-[92%]">
                      @for (action of m.actions; track action.label) {
                        @if (action.href) {
                          <a [href]="action.href" target="_blank" rel="noopener noreferrer" [class]="actionClass(action.kind)">
                            <span>{{ action.label }}</span><ng-container [ngTemplateOutlet]="arrow" />
                          </a>
                        } @else {
                          <a [routerLink]="action.link" [queryParams]="action.query" (click)="afterNavigate()" [class]="actionClass(action.kind)">
                            <span>{{ action.label }}</span><ng-container [ngTemplateOutlet]="arrow" />
                          </a>
                        }
                      }
                    </div>
                  }

                  @if (last && m.chips?.length && !chat.typing()) {
                    <div class="flex flex-wrap gap-2 pt-0.5">
                      @for (chip of m.chips; track chip) {
                        <button type="button" (click)="chat.send(chip)" class="px-2.5 py-1.5 text-[12px] font-medium text-[#0F3D32] bg-transparent border border-[#0F3D32]/35 hover:bg-[#0F3D32] hover:text-white hover:border-[#0F3D32] transition-colors">{{ chip }}</button>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          }

          @if (chat.typing()) {
            <div class="chat-msg flex items-start gap-2.5" aria-label="The assistant is typing">
              <span class="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-white border border-[#DCE5E0] flex items-center justify-center">
                <img src="/assets/folmare/logo/png/folmare-monogram-dark.png" alt="" class="w-4 h-auto" />
              </span>
              <p class="bg-white border border-[#DCE5E0] px-4 py-3.5 rounded-[2px_14px_14px_14px] flex gap-1.5" aria-hidden="true">
                <span class="chat-dot w-1.5 h-1.5 rounded-full bg-[#0F3D32]"></span><span class="chat-dot w-1.5 h-1.5 rounded-full bg-[#0F3D32]"></span><span class="chat-dot w-1.5 h-1.5 rounded-full bg-[#0F3D32]"></span>
              </p>
            </div>
          }
        </div>

        <!-- Message box -->
        <form class="shrink-0 flex items-stretch gap-2 p-3 bg-[#F7F8F4]" (submit)="$event.preventDefault(); submit(box)">
          <input #box type="text" maxlength="300" autocomplete="off" aria-label="Type your question" placeholder="Ask about products, shipping, returns..."
            class="flex-1 min-w-0 text-[13.5px] px-3.5 py-2.5 bg-white border border-[#DCE5E0] !outline-none focus:!outline-none focus-visible:!outline-none focus:border-[#19594A] text-[#1D302C] placeholder:text-[#85968E] transition-colors" />
          <button type="submit" [disabled]="chat.typing()" aria-label="Send message"
            class="shrink-0 w-11 flex items-center justify-center bg-[#0F3D32] text-white hover:bg-[#19594A] disabled:opacity-40 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </button>
        </form>
      </section>
    }

    <!-- Hint above the button, once per visit -->
    @if (tip() && !chat.open()) {
      <div class="chat-tip fixed z-[45] right-4 bottom-[84px] sm:right-6 sm:bottom-[92px] max-w-[230px] bg-white border border-[#DCE5E0] shadow-[0_14px_36px_-16px_rgb(15_61_50/45%)] pl-4 pr-8 py-3">
        <button type="button" (click)="chat.setOpen(true); dismissTip()" class="text-left">
          <span class="block fm-display text-[17px] leading-tight text-[#0F3D32]">Need help choosing?</span>
          <span class="block mt-1 text-[12px] text-[#5E6F68]">Ask me about products, orders or shipping.</span>
        </button>
        <button type="button" (click)="dismissTip()" class="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center text-[#85968E] hover:text-[#0F3D32]" aria-label="Dismiss">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
    }

    <!-- The button -->
    <button type="button" (click)="chat.toggle(); dismissTip()" [attr.aria-expanded]="chat.open()" aria-label="Chat with the FOLMARÉ assistant"
      class="fixed z-[45] right-4 bottom-4 sm:right-6 sm:bottom-6 w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-[0_12px_30px_-8px_rgb(0_0_0/55%)] hover:scale-105 active:scale-95 transition-transform duration-200"
      [class.max-sm:hidden]="chat.open()">
      @if (chat.open()) {
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" /></svg>
      } @else {
        <svg class="w-7 h-7" viewBox="0 0 28 28" aria-hidden="true"><path fill="currentColor" d="M14 3C7.9 3 3 7.1 3 12.3c0 2.7 1.3 5.1 3.4 6.8-.2 1.7-.9 3.2-1.9 4.4-.3.3 0 .8.4.7 2.5-.4 4.6-1.4 6.1-2.6.9.2 1.9.3 2.9.3 6.1 0 11-4.1 11-9.6S20.100 3 14 3Z" /><circle cx="9.3" cy="12.4" r="1.5" fill="#000" /><circle cx="14" cy="12.4" r="1.5" fill="#000" /><circle cx="18.7" cy="12.4" r="1.5" fill="#000" /></svg>
      }
    </button>

    <ng-template #arrow>
      <svg class="shrink-0 w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" /></svg>
    </ng-template>
  `,
})
export class ChatbotComponent {
  readonly chat = inject(ChatbotService);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly box = viewChild<ElementRef<HTMLInputElement>>('box');
  readonly tip = signal(false);

  constructor() {
    // Keep the newest message in view.
    effect(() => {
      this.chat.messages();
      this.chat.typing();
      setTimeout(() => {
        const el = this.scroller()?.nativeElement;
        el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
    });
    // Put the cursor in the message box when the chat opens.
    effect(() => {
      if (this.chat.open()) setTimeout(() => this.box()?.nativeElement.focus({ preventScroll: true }), 320);
    });
    // A gentle hint, once per visit, for shoppers who have not opened the chat.
    let seen = false;
    try {
      seen = sessionStorage.getItem(TIP_KEY) === '1';
    } catch {
      /* ignore */
    }
    if (!seen) {
      const timer = setTimeout(() => this.tip.set(!this.chat.open()), 7000);
      inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    }
  }

  submit(box: HTMLInputElement): void {
    const text = box.value.trim();
    if (!text) return;
    this.chat.send(text);
    box.value = '';
  }

  dismissTip(): void {
    this.tip.set(false);
    try {
      sessionStorage.setItem(TIP_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  /** On a phone the chat covers the page, so it closes after a link is followed. */
  afterNavigate(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 640) this.chat.setOpen(false);
  }

  actionClass(kind: ChatMessageAction['kind']): string {
    const base = 'inline-flex items-center justify-between gap-3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors';
    return kind === 'secondary'
      ? `${base} bg-transparent text-[#0F3D32] border border-[#0F3D32]/40 hover:bg-[#0F3D32] hover:text-white`
      : `${base} bg-[#0F3D32] text-white border border-[#0F3D32] hover:bg-[#19594A]`;
  }
}

type ChatMessageAction = NonNullable<ChatMessage['actions']>[number];
