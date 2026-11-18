import { Component, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoParentForm } from './no-parent-form';

/** Stands in for PrimeNG's SelectButton: a component that draws an `[ngModel]` of its own. */
@Component({
  selector: 'app-model-inside',
  imports: [FormsModule],
  template: `
    <input name="inside" [ngModel]="'a'" />
  `,
})
class ModelInside {}

@Component({
  selector: 'app-plain-form',
  imports: [
    ReactiveFormsModule,
    ModelInside,
  ],
  template: `
    <form [formGroup]="group"><app-model-inside /></form>
  `,
})
class PlainForm {
  protected readonly group: FormGroup = new FormGroup({ name: new FormControl('') });
}

@Component({
  selector: 'app-guarded-form',
  imports: [
    ReactiveFormsModule,
    ModelInside,
    NoParentForm,
  ],
  template: `
    <form [formGroup]="group"><app-model-inside appNoParentForm /></form>
  `,
})
class GuardedForm {
  protected readonly group: FormGroup = new FormGroup({ name: new FormControl('') });
}

describe('NoParentForm', (): void => {
  let warnings: string[];

  function warningsFor(component: Type<unknown>): string[] {
    TestBed.createComponent(component).detectChanges();
    return warnings.filter((warning: string): boolean => warning.includes('NG01354'));
  }

  beforeEach((): void => {
    warnings = [];
    vi.spyOn(console, 'warn').mockImplementation((message: unknown): void => {
      warnings.push(String(message));
    });
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  it('is needed: an ngModel inside a component in a form group makes Angular warn that it cannot join the form', (): void => {
    expect(warningsFor(PlainForm)).toHaveLength(1);
  });

  it('stops that warning for what is inside the element it is on', (): void => {
    expect(warningsFor(GuardedForm)).toHaveLength(0);
  });
});
