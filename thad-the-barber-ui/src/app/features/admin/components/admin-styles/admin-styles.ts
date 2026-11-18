import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * Brings the admin area's shared classes (`admin-title`, `admin-body`, `form-card`, `form-field`, `segments`) in when
 * the admin area opens. They are not part of the site-wide stylesheet, which every visitor downloads. Put it once in
 * each admin page that starts the area (the sign-in page and the shell).
 */
@Component({
  selector: 'app-admin-styles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: '',
  styleUrl: './admin-styles.scss',
})
export class AdminStyles {}
