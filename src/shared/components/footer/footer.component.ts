import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private readonly toast = inject(ToastService);
  readonly currentYear = new Date().getFullYear();

  subscribe(): void {
    this.toast.show('Cảm ơn bạn đã đăng ký nhận bản tin VIP!', 'success');
  }
}
