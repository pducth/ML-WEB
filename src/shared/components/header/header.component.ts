import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly cartItemCount = input(0);
  readonly accountLabel = input('Sign In');
  readonly isAdmin = input(false);
  readonly navigateTo = output<string>();
  readonly startQuiz = output<void>();
  readonly cartClick = output<void>();
  readonly accountClick = output<void>();
  readonly searchQuery = signal('');

  submitSearch(): void {
    const query = this.searchQuery().trim();
    this.navigateTo.emit(query ? `/shop?q=${encodeURIComponent(query)}` : '/shop');
  }

  filterCategory(category: string): void {
    this.navigateTo.emit(`/shop?category=${encodeURIComponent(category)}`);
  }

  updateSearch(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.searchQuery.set(event.target.value);
    }
  }
}
