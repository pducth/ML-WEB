import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly router = inject(Router);

  readonly cartItemCount = input(0);
  readonly accountLabel = input('Sign In');
  readonly isAdmin = input(false);
  readonly navigateTo = output<string>();
  readonly startQuiz = output<void>();
  readonly cartClick = output<void>();
  readonly accountClick = output<void>();
  readonly searchQuery = signal('');
  readonly currentUrl = signal(this.router.url);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }

  isActive(section: 'home' | 'shop' | 'quiz'): boolean {
    const url = this.currentUrl().split('?')[0];
    if (section === 'home') {
      return url === '/';
    }
    if (section === 'shop') {
      return url === '/shop';
    }
    return url === '/quiz' || url === '/quiz/results';
  }

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
