import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AppFieldsForm, AppFieldsValue } from './app-fields-form';

@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, AppFieldsForm],
  template: `<app-app-fields-form [formControl]="control" />`,
})
class HostComponent {
  control = new FormControl<AppFieldsValue>(
    { appStoreUrl: '', playStoreUrl: '', iconUrl: undefined },
    { nonNullable: true },
  );
}

describe('AppFieldsForm', () => {
  function createFixture() {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideNoopAnimations()],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('is valid with all fields empty (both store URLs optional)', () => {
    const fixture = createFixture();

    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('is invalid when appStoreUrl is filled but not a valid URL', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      appStoreUrl: 'not-a-url',
      playStoreUrl: '',
      iconUrl: undefined,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.control.valid).toBe(false);
  });

  it('is valid with a well-formed appStoreUrl', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      appStoreUrl: 'https://apps.apple.com/app/id123',
      playStoreUrl: '',
      iconUrl: undefined,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('round-trips an icon image value via writeValue', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      appStoreUrl: '',
      playStoreUrl: '',
      iconUrl: { kind: 'url', url: 'https://example.com/icon.png' },
    });
    fixture.detectChanges();

    const urlField = fixture.nativeElement.querySelector(
      '[data-testid="image-input-url-field"]',
    ) as HTMLInputElement;
    expect(urlField.value).toBe('https://example.com/icon.png');
  });
});
