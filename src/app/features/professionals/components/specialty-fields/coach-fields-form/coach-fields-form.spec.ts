import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { CoachFieldsForm, CoachFieldsValue } from './coach-fields-form';

@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, CoachFieldsForm],
  template: `<app-coach-fields-form [formControl]="control" />`,
})
class HostComponent {
  control = new FormControl<CoachFieldsValue>(
    { certifications: [], coachingAreas: [] },
    { nonNullable: true },
  );
}

describe('CoachFieldsForm', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('starts valid with empty optional list fields', () => {
    const fixture = createFixture();

    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('round-trips an existing value via writeValue', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      certifications: ['NBHWC'],
      coachingAreas: ['weight-loss', 'sports-performance'],
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toEqual({
      certifications: ['NBHWC'],
      coachingAreas: ['weight-loss', 'sports-performance'],
    });
  });
});
