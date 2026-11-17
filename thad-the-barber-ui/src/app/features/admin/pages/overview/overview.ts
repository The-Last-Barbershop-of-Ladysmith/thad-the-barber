import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The first admin page: where announcements and the gallery will be managed. For now it says what is coming. */
@Component({
  selector: 'app-admin-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class Overview {}
