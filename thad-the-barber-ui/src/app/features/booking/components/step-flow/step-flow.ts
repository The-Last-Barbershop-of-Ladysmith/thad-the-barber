import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  OutputEmitterRef,
  Signal,
  TemplateRef,
  computed,
  contentChild,
  inject,
  input,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { map } from 'rxjs';
import { BookingStep } from '../../models/booking-step.model';
import { StepView } from '../../models/step-view.model';

interface StepContentContext {
  $implicit: BookingStep;
}

/**
 * The booking steps' layout: phones show the steps as cards that collapse to a summary line once done, with a sticky
 * bar holding the picks and Review booking; from `lg`, a step rail sits beside one step with Back and Continue
 * (#207–#209). The page projects each step's content as an `<ng-template let-step>` and decides which step opens.
 */
@Component({
  selector: 'app-step-flow',
  imports: [
    NgTemplateOutlet,
    ButtonModule,
    CardModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './step-flow.html',
  styleUrl: './step-flow.scss',
})
export class StepFlow {
  readonly stepViews: InputSignal<StepView[]> = input.required<StepView[]>();
  readonly openStep: InputSignal<BookingStep> = input.required<BookingStep>();
  readonly canReview: InputSignal<boolean> = input.required<boolean>();
  readonly isSubmitting: InputSignal<boolean> = input.required<boolean>();
  /** The sticky bar's picks on phones. */
  readonly pickedDayLabel: InputSignal<string> = input.required<string>();
  readonly pickedTimeLabel: InputSignal<string | null> = input.required<string | null>();

  /** A step's header, rail item or Review booking was clicked. */
  readonly stepOpen: OutputEmitterRef<BookingStep> = output();
  /** Back (-1) or Continue (1). */
  readonly stepMove: OutputEmitterRef<number> = output();

  protected readonly stepContent: Signal<TemplateRef<StepContentContext>> =
    contentChild.required<TemplateRef<StepContentContext>>(TemplateRef);

  protected readonly openStepView: Signal<StepView | undefined> = computed((): StepView | undefined =>
    this.stepViews().find((stepView: StepView): boolean => stepView.isOpen));

  protected readonly isDesktop: Signal<boolean> = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 64rem)')
      .pipe(map((breakpointState: BreakpointState): boolean => breakpointState.matches)),
    { initialValue: false },
  );

  protected readonly bookingStep: typeof BookingStep = BookingStep;
}
