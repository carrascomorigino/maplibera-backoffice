import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MultimediaFieldsForm, MultimediaFieldsValue } from './multimedia-fields-form';

@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, MultimediaFieldsForm],
  template: `<app-multimedia-fields-form [formControl]="control" />`,
})
class HostComponent {
  control = new FormControl<MultimediaFieldsValue>(
    { mediaType: 'documentary', externalUrl: '' },
    { nonNullable: true },
  );
}

describe('MultimediaFieldsForm', () => {
  function createFixture() {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideNoopAnimations()],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('is invalid when the external URL is missing', () => {
    const fixture = createFixture();

    expect(fixture.componentInstance.control.valid).toBe(false);
  });

  it('becomes valid with a media type and a valid external URL', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      mediaType: 'podcast',
      externalUrl: 'https://open.spotify.com/show/123',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('is invalid when the external URL is not a valid URL', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      mediaType: 'book',
      externalUrl: 'not-a-url',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.control.valid).toBe(false);
  });
});
