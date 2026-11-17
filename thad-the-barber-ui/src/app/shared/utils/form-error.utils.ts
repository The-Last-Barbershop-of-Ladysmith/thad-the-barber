import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { Observable, map, startWith, switchMap } from 'rxjs';

/**
 * True while the control has been visited and is invalid, so a field says what is wrong once the customer has left it,
 * not while they are still typing. Call it in an injection context (a field initializer).
 */
export function toIsErrorShown(control: Signal<AbstractControl>): Signal<boolean> {
  const isErrorShown: Observable<boolean> = toObservable(control).pipe(
    switchMap((watchedControl: AbstractControl): Observable<boolean> => watchedControl.events.pipe(
      startWith(undefined),
      map((): boolean => watchedControl.touched && watchedControl.invalid),
    )),
  );
  return toSignal(isErrorShown, { initialValue: false });
}
