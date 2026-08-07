import { TestBed } from '@angular/core/testing';
import { MarkdownEditor } from './markdown-editor';

describe('MarkdownEditor', () => {
  function createFixture() {
    const fixture = TestBed.createComponent(MarkdownEditor);
    fixture.detectChanges();
    return fixture;
  }

  function textarea(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector(
      '[data-testid="markdown-textarea"]',
    ) as HTMLTextAreaElement;
  }

  function setText(
    fixture: ReturnType<typeof createFixture>,
    text: string,
    selectionStart = text.length,
    selectionEnd = text.length,
  ) {
    const el = textarea(fixture);
    el.value = text;
    el.dispatchEvent(new Event('input'));
    el.setSelectionRange(selectionStart, selectionEnd);
    fixture.detectChanges();
  }

  function clickButton(fixture: ReturnType<typeof createFixture>, testId: string) {
    const button = fixture.nativeElement.querySelector(
      `[data-testid="${testId}"]`,
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }

  function clickPreviewToggle(fixture: ReturnType<typeof createFixture>) {
    const button = fixture.nativeElement.querySelector(
      '[data-testid="preview-toggle"]',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }

  describe('ControlValueAccessor', () => {
    it('writes the initial value into the textarea', () => {
      const fixture = createFixture();
      fixture.componentInstance.writeValue('Hello world');
      fixture.detectChanges();

      expect(textarea(fixture).value).toBe('Hello world');
    });

    it('notifies onChange when the user types', () => {
      const fixture = createFixture();
      const onChange = vi.fn();
      fixture.componentInstance.registerOnChange(onChange);

      setText(fixture, 'New content');

      expect(onChange).toHaveBeenCalledWith('New content');
    });

    it('notifies onTouched on blur', () => {
      const fixture = createFixture();
      const onTouched = vi.fn();
      fixture.componentInstance.registerOnTouched(onTouched);

      textarea(fixture).dispatchEvent(new Event('blur'));

      expect(onTouched).toHaveBeenCalled();
    });
  });

  describe('toolbar formatting', () => {
    it('wraps the selection in bold syntax', () => {
      const fixture = createFixture();
      setText(fixture, 'hello world', 0, 5);

      clickButton(fixture, 'bold-button');

      expect(textarea(fixture).value).toBe('**hello** world');
    });

    it('inserts placeholder bold text when nothing is selected', () => {
      const fixture = createFixture();
      setText(fixture, '', 0, 0);

      clickButton(fixture, 'bold-button');

      expect(textarea(fixture).value).toBe('**bold text**');
    });

    it('wraps the selection in italic syntax', () => {
      const fixture = createFixture();
      setText(fixture, 'hello world', 6, 11);

      clickButton(fixture, 'italic-button');

      expect(textarea(fixture).value).toBe('hello *world*');
    });

    it('prefixes the current line with a heading marker', () => {
      const fixture = createFixture();
      setText(fixture, 'Section title', 0, 0);

      clickButton(fixture, 'heading-button');

      expect(textarea(fixture).value).toBe('## Section title');
    });

    it('prefixes each selected line with a bullet', () => {
      const fixture = createFixture();
      setText(fixture, 'one\ntwo', 0, 7);

      clickButton(fixture, 'bulleted-list-button');

      expect(textarea(fixture).value).toBe('- one\n- two');
    });

    it('prefixes each selected line with a number', () => {
      const fixture = createFixture();
      setText(fixture, 'one\ntwo', 0, 7);

      clickButton(fixture, 'numbered-list-button');

      expect(textarea(fixture).value).toBe('1. one\n1. two');
    });

    it('wraps the selection as a link', () => {
      const fixture = createFixture();
      setText(fixture, 'docs', 0, 4);

      clickButton(fixture, 'link-button');

      expect(textarea(fixture).value).toBe('[docs](https://)');
    });

    it('disables the formatting toolbar while previewing', () => {
      const fixture = createFixture();

      clickPreviewToggle(fixture);

      const bold = fixture.nativeElement.querySelector(
        '[data-testid="bold-button"]',
      ) as HTMLButtonElement;
      expect(bold.disabled).toBe(true);
    });
  });

  describe('character limit', () => {
    function counter(fixture: ReturnType<typeof createFixture>) {
      return fixture.nativeElement.querySelector(
        '[data-testid="markdown-char-counter"]',
      ) as HTMLElement | null;
    }

    it('renders no maxlength attribute and no counter when maxLength is unset', () => {
      const fixture = createFixture();

      expect(textarea(fixture).hasAttribute('maxlength')).toBe(false);
      expect(counter(fixture)).toBeNull();
    });

    it('sets the maxlength attribute and shows the remaining count when maxLength is set', () => {
      const fixture = createFixture();
      fixture.componentRef.setInput('maxLength', 2000);
      fixture.detectChanges();

      expect(textarea(fixture).maxLength).toBe(2000);
      expect(counter(fixture)?.textContent).toContain('2000');
    });

    it('updates the remaining count as the user types', () => {
      const fixture = createFixture();
      fixture.componentRef.setInput('maxLength', 2000);
      fixture.detectChanges();

      setText(fixture, 'Hello');

      expect(counter(fixture)?.textContent).toContain('1995');
    });
  });

  describe('preview', () => {
    it('renders formatted markdown as HTML', () => {
      const fixture = createFixture();
      setText(
        fixture,
        '## Title\n\n**bold** and *italic* and [link](https://example.com)\n\n- one\n- two',
      );

      clickPreviewToggle(fixture);

      const preview = fixture.nativeElement.querySelector(
        '[data-testid="markdown-preview"]',
      ) as HTMLElement;
      expect(preview.querySelector('h2')?.textContent).toBe('Title');
      expect(preview.querySelector('strong')?.textContent).toBe('bold');
      expect(preview.querySelector('em')?.textContent).toBe('italic');
      expect(preview.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
      expect(preview.querySelectorAll('ul li')).toHaveLength(2);
    });

    it('escapes raw HTML instead of rendering it', () => {
      const fixture = createFixture();
      setText(fixture, 'Look <script>alert(1)</script> out');

      clickPreviewToggle(fixture);

      const preview = fixture.nativeElement.querySelector(
        '[data-testid="markdown-preview"]',
      ) as HTMLElement;
      expect(preview.querySelector('script')).toBeNull();
      expect(preview.textContent).toContain('<script>alert(1)</script>');
    });

    it('reflects the preview state via aria-pressed', () => {
      const fixture = createFixture();
      const toggle = () =>
        fixture.nativeElement.querySelector('[data-testid="preview-toggle"]') as HTMLButtonElement;

      expect(toggle().getAttribute('aria-pressed')).toBe('false');

      toggle().click();
      fixture.detectChanges();

      expect(toggle().getAttribute('aria-pressed')).toBe('true');
    });
  });
});
