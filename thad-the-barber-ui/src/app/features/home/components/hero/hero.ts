import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SHOP_INFO } from '../../../../core/config/shop-info';

@Component({
  selector: 'app-hero',
  imports: [
    RouterLink,
    ButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  protected readonly tagline: string = SHOP_INFO.tagline;
}
