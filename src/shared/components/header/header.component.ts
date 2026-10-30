import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly cartItemCount = input(0);
  readonly accountLabel = input('Đăng nhập');
  readonly isAdmin = input(false);
  readonly navigateTo = output<string>();
  readonly startQuiz = output<void>();
  readonly cartClick = output<void>();
  readonly accountClick = output<void>();
}
