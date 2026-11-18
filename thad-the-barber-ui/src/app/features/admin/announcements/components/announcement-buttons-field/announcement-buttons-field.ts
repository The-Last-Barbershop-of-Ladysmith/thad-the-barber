import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  signal,
  WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AdminAnnouncementButtonDto } from '../../dtos/admin-announcement.dto';
import { AnnouncementButtonVariant } from '../../models/announcement-button-variant.model';
import { MAX_BUTTONS, isBadButton } from '../../utils/announcement-form.utils';
import { removeAt } from '../../utils/announcement-list.utils';

/** The buttons under an announcement: add up to four, edit each one, and remove one only after a second click. */
@Component({
  selector: 'app-announcement-buttons-field',
  imports: [
    ButtonModule,
    InputTextModule,
    MessageModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-buttons-field.html',
  styleUrl: './announcement-buttons-field.scss',
})
export class AnnouncementButtonsField {
  readonly buttons: InputSignal<AdminAnnouncementButtonDto[]> = input.required<AdminAnnouncementButtonDto[]>();
  /** Whether the owner has tried to save, which is when a half-filled button is called out. */
  readonly isSubmitted: InputSignal<boolean> = input.required<boolean>();
  readonly buttonsChange: OutputEmitterRef<AdminAnnouncementButtonDto[]> = output<AdminAnnouncementButtonDto[]>();

  protected readonly maxButtons: number = MAX_BUTTONS;
  protected readonly variants: AnnouncementButtonVariant[] = Object.values(AnnouncementButtonVariant);
  /** The button whose removal is waiting for a second click. */
  protected readonly confirmingIndex: WritableSignal<number | null> = signal<number | null>(null);

  protected isBad(button: AdminAnnouncementButtonDto): boolean {
    return isBadButton(button);
  }

  protected onInput(
    position: number,
    field: 'label' | 'url',
    event: Event,
  ): void {
    this.change(position, { [field]: (event.target as HTMLInputElement).value });
  }

  protected change(position: number, change: Partial<AdminAnnouncementButtonDto>): void {
    this.buttonsChange.emit(this.buttons().map(
      (button: AdminAnnouncementButtonDto, place: number): AdminAnnouncementButtonDto =>
        place === position ? { ...button, ...change } : button,
    ));
  }

  protected add(): void {
    if (this.buttons().length < MAX_BUTTONS) {
      this.buttonsChange.emit([
        ...this.buttons(),
        {
          label: '',
          url: '',
          variant: AnnouncementButtonVariant.Primary,
        },
      ]);
    }
  }

  protected remove(position: number): void {
    this.confirmingIndex.set(null);
    this.buttonsChange.emit(removeAt(this.buttons(), position));
  }
}
