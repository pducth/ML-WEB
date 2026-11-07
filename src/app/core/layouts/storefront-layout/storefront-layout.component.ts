import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatbotComponent } from '../../../shared/components/chatbot/chatbot.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../../shared/components/header/header.component';

@Component({
  selector: 'app-storefront-layout',
  standalone: true,
  imports: [ChatbotComponent, HeaderComponent, FooterComponent, RouterOutlet],
  templateUrl: './storefront-layout.component.html',
  styleUrl: './storefront-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontLayoutComponent {}
