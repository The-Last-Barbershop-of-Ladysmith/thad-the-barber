import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {}
