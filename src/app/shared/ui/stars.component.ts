import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-stars',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="flex text-[#FF7F64]" [attr.aria-label]="rating() + ' out of 5 stars'">{{ full() }}<span class="text-[#DCE5E0]">{{ empty() }}</span></span>`,
})
export class StarsComponent {
  readonly rating = input(0);
  readonly full = computed(() => '★'.repeat(Math.round(this.rating())));
  readonly empty = computed(() => '★'.repeat(5 - Math.round(this.rating())));
}
