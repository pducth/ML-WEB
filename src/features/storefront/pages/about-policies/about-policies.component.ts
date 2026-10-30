import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

type PolicyTab = 'about' | 'shipping' | 'returns' | 'privacy';

@Component({
  selector: 'app-about-policies',
  standalone: true,
  templateUrl: './about-policies.component.html',
  styleUrl: './about-policies.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPoliciesComponent {
  readonly activeTab = signal<PolicyTab>('about');

  setTab(tab: PolicyTab): void {
    this.activeTab.set(tab);
  }
}
