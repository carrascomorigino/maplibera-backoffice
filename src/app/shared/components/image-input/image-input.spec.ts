import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ImageInput } from './image-input';
import { ImageValue } from '../../models/image-value.model';
import { MAX_IMAGE_SIZE_BYTES } from '../../utils/image-upload';

@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, ImageInput],
  template: `<app-image-input [formControl]="control" label="Image" />`,
})
class HostComponent {
  control = new FormControl<ImageValue | undefined>(undefined);
}

describe('ImageInput', () => {
  function createFixture(initial?: ImageValue) {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    if (initial) {
      fixture.componentInstance.control.setValue(initial);
    }
    fixture.detectChanges();
    return fixture;
  }

  function urlModeButton(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector(
      '[data-testid="image-input-mode-url"]',
    ) as HTMLElement;
  }

  function uploadModeButton(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector(
      '[data-testid="image-input-mode-upload"]',
    ) as HTMLElement;
  }

  function urlField(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector(
      '[data-testid="image-input-url-field"]',
    ) as HTMLInputElement | null;
  }

  function uploadButton(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector(
      '[data-testid="image-input-upload-button"]',
    ) as HTMLButtonElement | null;
  }

  function fileInput(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector(
      '[data-testid="image-input-file"]',
    ) as HTMLInputElement | null;
  }

  function preview(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector(
      '[data-testid="image-preview"]',
    ) as HTMLImageElement | null;
  }

  function typeError(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector('[data-testid="image-input-type-error"]');
  }

  function sizeError(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector('[data-testid="image-input-size-error"]');
  }

  function urlError(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector('[data-testid="image-input-url-error"]');
  }

  function imageInput(fixture: ReturnType<typeof createFixture>): ImageInput {
    return fixture.debugElement.query(By.directive(ImageInput)).componentInstance as ImageInput;
  }

  function clickUploadMode(fixture: ReturnType<typeof createFixture>) {
    (uploadModeButton(fixture).querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  function selectFile(fixture: ReturnType<typeof createFixture>, file: File) {
    const input = fileInput(fixture)!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('defaults to url mode when there is no value', () => {
    const fixture = createFixture();

    expect(urlField(fixture)).not.toBeNull();
    expect(uploadButton(fixture)).toBeNull();
  });

  it('marks the active mode toggle as pressed', () => {
    const fixture = createFixture();

    expect(urlModeButton(fixture).getAttribute('aria-pressed')).toBe('true');
    expect(uploadModeButton(fixture).getAttribute('aria-pressed')).toBe('false');

    clickUploadMode(fixture);

    expect(urlModeButton(fixture).getAttribute('aria-pressed')).toBe('false');
    expect(uploadModeButton(fixture).getAttribute('aria-pressed')).toBe('true');
  });

  it('defaults to url mode for a url value', () => {
    const fixture = createFixture({ kind: 'url', url: 'https://example.com/a.jpg' });

    expect(urlField(fixture)?.value).toBe('https://example.com/a.jpg');
  });

  it('switches to upload mode when writeValue receives an upload value', () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const fixture = createFixture({ kind: 'upload', file });

    expect(uploadButton(fixture)).not.toBeNull();
    expect(urlField(fixture)).toBeNull();
  });

  it('emits a url value as the user types in the url field', () => {
    const fixture = createFixture();

    const input = urlField(fixture)!;
    input.value = 'https://example.com/a.jpg';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toEqual({
      kind: 'url',
      url: 'https://example.com/a.jpg',
    });
  });

  it('emits undefined when the url field is cleared', () => {
    const fixture = createFixture({ kind: 'url', url: 'https://example.com/a.jpg' });

    const input = urlField(fixture)!;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBeUndefined();
  });

  it('does not clear the value when switching modes without acting in the new mode', () => {
    const fixture = createFixture({ kind: 'url', url: 'https://example.com/a.jpg' });

    clickUploadMode(fixture);

    expect(fixture.componentInstance.control.value).toEqual({
      kind: 'url',
      url: 'https://example.com/a.jpg',
    });
  });

  it('emits an upload value when a valid file is selected', () => {
    const fixture = createFixture();
    clickUploadMode(fixture);

    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    selectFile(fixture, file);

    expect(fixture.componentInstance.control.value).toEqual({ kind: 'upload', file });
    expect(typeError(fixture)).toBeNull();
    expect(sizeError(fixture)).toBeNull();
  });

  it('resets the native file input value after handling a selection', () => {
    const fixture = createFixture();
    clickUploadMode(fixture);

    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    selectFile(fixture, file);

    expect(fileInput(fixture)!.value).toBe('');
  });

  it('rejects a file with an unsupported mime type without calling onChange', () => {
    const fixture = createFixture();
    clickUploadMode(fixture);

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    selectFile(fixture, file);

    expect(fixture.componentInstance.control.value).toBeFalsy();
    expect(typeError(fixture)).not.toBeNull();
  });

  it('rejects a file that is too large without calling onChange', () => {
    const fixture = createFixture();
    clickUploadMode(fixture);

    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: MAX_IMAGE_SIZE_BYTES + 1 });
    selectFile(fixture, file);

    expect(fixture.componentInstance.control.value).toBeFalsy();
    expect(sizeError(fixture)).not.toBeNull();
  });

  it('shows a url preview for a valid url value', () => {
    const fixture = createFixture({ kind: 'url', url: 'https://example.com/a.jpg' });

    expect(preview(fixture)?.src).toBe('https://example.com/a.jpg');
  });

  it('does not show a preview for an invalid url value', () => {
    const fixture = createFixture({ kind: 'url', url: 'not-a-url' });

    expect(preview(fixture)).toBeNull();
  });

  it('shows an object url preview for an upload value', () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-url');

    const fixture = createFixture({ kind: 'upload', file });

    expect(createObjectUrlSpy).toHaveBeenCalledWith(file);
    expect(preview(fixture)?.src).toBe('blob:mock-url');

    createObjectUrlSpy.mockRestore();
  });

  it('revokes the previous object url when the file changes', () => {
    const fileA = new File(['a'], 'a.png', { type: 'image/png' });
    const fileB = new File(['b'], 'b.png', { type: 'image/png' });
    vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:a').mockReturnValueOnce('blob:b');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const fixture = createFixture({ kind: 'upload', file: fileA });
    fixture.componentInstance.control.setValue({ kind: 'upload', file: fileB });
    fixture.detectChanges();

    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:a');

    vi.restoreAllMocks();
  });

  it('shows an invalid url error when the url does not match the pattern', () => {
    const fixture = createFixture();

    const input = urlField(fixture)!;
    input.value = 'not-a-url';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(urlError(fixture)).not.toBeNull();
  });

  describe('validate', () => {
    it('is valid when there is no value', () => {
      const fixture = createFixture();

      expect(imageInput(fixture).validate()).toBeNull();
    });

    it('is valid for an upload value regardless of the file', () => {
      const file = new File(['hello'], 'hello.png', { type: 'image/png' });
      const fixture = createFixture({ kind: 'upload', file });

      expect(imageInput(fixture).validate()).toBeNull();
    });

    it('is valid for a url value that matches the url pattern', () => {
      const fixture = createFixture({ kind: 'url', url: 'https://example.com/a.jpg' });

      expect(imageInput(fixture).validate()).toBeNull();
    });

    it('is invalid for a url value that does not match the url pattern', () => {
      const fixture = createFixture({ kind: 'url', url: 'not-a-url' });

      expect(imageInput(fixture).validate()).toEqual({ invalidImage: true });
    });
  });
});
