import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, type Data } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-screen-placeholder',
  standalone: true,
  templateUrl: './screen-placeholder.component.html',
  styleUrl: './screen-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScreenPlaceholderComponent {
  readonly title = toSignal(
    inject(ActivatedRoute).data.pipe(
      map((data: Data) => {
        const title = data['screenTitle'];
        return typeof title === 'string' ? title : 'Coming soon';
      }),
    ),
    { initialValue: 'Loading page' },
  );
}
