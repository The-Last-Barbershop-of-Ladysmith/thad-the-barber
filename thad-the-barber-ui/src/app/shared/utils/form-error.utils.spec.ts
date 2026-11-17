import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { toIsErrorShown } from './form-error.utils';

describe(
  'toIsErrorShown',
  (): void => {
    function watch(control: FormControl<string>): () => boolean {
      return TestBed.runInInjectionContext((): () => boolean => toIsErrorShown(signal(control)));
    }

    it(
      'stays quiet while an invalid field has not been visited',
      (): void => {
        const isErrorShown: () => boolean = watch(new FormControl<string>('', {
          nonNullable: true,
          validators: Validators.required,
        }));
        TestBed.tick();

        expect(isErrorShown()).toBe(false);
      },
    );

    it(
      'turns on when an invalid field is left, and off when it is fixed',
      (): void => {
        const control: FormControl<string> = new FormControl<string>('', {
          nonNullable: true,
          validators: Validators.required,
        });
        const isErrorShown: () => boolean = watch(control);
        TestBed.tick();

        control.markAsTouched();
        expect(isErrorShown()).toBe(true);

        control.setValue('made-up');
        expect(isErrorShown()).toBe(false);
      },
    );

    it(
      'stays off when a visited field is valid',
      (): void => {
        const control: FormControl<string> = new FormControl<string>('made-up', { nonNullable: true });
        const isErrorShown: () => boolean = watch(control);
        TestBed.tick();

        control.markAsTouched();

        expect(isErrorShown()).toBe(false);
      },
    );
  },
);
