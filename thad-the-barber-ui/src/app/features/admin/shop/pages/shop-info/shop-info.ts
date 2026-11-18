import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AppState } from '../../../../../store/app.state';
import { AdminShopInfoDto } from '../../dtos/admin-shop-info.dto';
import { AdminShopError } from '../../models/admin-shop-error.model';
import * as AdminShopActions from '../../state/admin-shop.actions';
import { adminShopFeature } from '../../state/admin-shop.feature';
import { toShopMessage } from '../../utils/admin-shop-error.utils';

/** The most the notice can hold; the API refuses more. */
export const MAX_NOTICE_LENGTH: number = 1000;

/** Edits the notice on the booking page, and whether it shows at all. Blank text means Square's description shows. */
@Component({
  selector: 'app-admin-shop-info',
  imports: [ButtonModule, MessageModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shop-info.html',
  styleUrl: './shop-info.scss',
})
export class ShopInfo implements OnInit {
  protected readonly maxLength: number = MAX_NOTICE_LENGTH;
  protected readonly notice: WritableSignal<string> = signal<string>('');
  protected readonly isNoticeShown: WritableSignal<boolean> = signal<boolean>(true);

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly info: Signal<AdminShopInfoDto | null> = this.store.selectSignal(adminShopFeature.selectInfo);
  private readonly error: Signal<AdminShopError | null> = this.store.selectSignal(adminShopFeature.selectError);
  private isFormReady: boolean = false;

  protected readonly isLoading: Signal<boolean> = this.store.selectSignal(adminShopFeature.selectIsLoading);
  protected readonly isLoaded: Signal<boolean> = this.store.selectSignal(adminShopFeature.selectIsLoaded);
  protected readonly isSaving: Signal<boolean> = this.store.selectSignal(adminShopFeature.selectIsSaving);
  private readonly isSaved: Signal<boolean> = this.store.selectSignal(adminShopFeature.selectIsSaved);

  protected readonly problem: Signal<string | null> = computed((): string | null => {
    const error: AdminShopError | null = this.error();
    return error === null ? null : toShopMessage(error);
  });

  /** What shows on the booking page when no text is saved. */
  protected readonly squareNotice: Signal<string> = computed((): string => this.info()?.squareNotice?.trim() ?? '');

  /** The form differs from what was last saved or loaded. */
  private readonly isDirty: Signal<boolean> = computed((): boolean => {
    const info: AdminShopInfoDto | null = this.info();
    return info === null
      || this.notice().trim() !== (info.notice ?? '')
      || this.isNoticeShown() !== info.isNoticeShown;
  });

  protected readonly isConfirmed: Signal<boolean> = computed((): boolean => this.isSaved() && !this.isDirty());

  constructor() {
    effect((): void => {
      const info: AdminShopInfoDto | null = this.info();
      if (info !== null && this.isLoaded() && !this.isFormReady) {
        this.isFormReady = true;
        this.notice.set(info.notice ?? '');
        this.isNoticeShown.set(info.isNoticeShown);
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(AdminShopActions.AdminShopRequest());
  }

  protected onNotice(event: Event): void {
    this.notice.set((event.target as HTMLTextAreaElement).value);
  }

  protected onToggle(event: Event): void {
    this.isNoticeShown.set((event.target as HTMLInputElement).checked);
  }

  /** Clears the text, so Square's description shows again. */
  protected useSquareText(): void {
    this.notice.set('');
  }

  protected save(): void {
    const text: string = this.notice().trim();
    this.store.dispatch(AdminShopActions.AdminShopSave({
      request: {
        notice: text === '' ? null : text,
        isNoticeShown: this.isNoticeShown(),
      },
    }));
  }
}
