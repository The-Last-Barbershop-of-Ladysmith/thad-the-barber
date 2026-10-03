import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { Announcement } from '../../models/home.models';
import { SmsSignup } from '../sms-signup/sms-signup';

/** Full-height announcement slider (PrimeNG composable carousel; swipe, arrows and dots are built in). */
@Component({
  selector: 'app-announcements',
  imports: [
    RouterLink,
    ButtonModule,
    CardModule,
    CarouselModule,
    SmsSignup,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcements.html',
  styleUrl: './announcements.scss',
})
export class Announcements {
  readonly announcements: InputSignal<Announcement[]> = input.required<Announcement[]>();
}
