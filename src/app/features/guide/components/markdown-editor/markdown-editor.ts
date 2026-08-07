import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../../../../core/i18n/language.service';

@Component({
  selector: 'app-markdown-editor',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './markdown-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditor),
      multi: true,
    },
  ],
})
export class MarkdownEditor implements ControlValueAccessor {
  protected readonly language = inject(LanguageService);

  private readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  protected readonly value = signal('');
  protected readonly previewing = signal(false);
  protected readonly disabled = signal(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(text: string): void {
    this.value.set(text);
    this.onChange(text);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected togglePreview(): void {
    this.previewing.update((previewing) => !previewing);
  }

  protected renderedHtml(): string {
    return renderMarkdown(this.value());
  }

  protected applyBold(): void {
    this.wrapSelection('**', '**', 'bold text');
  }

  protected applyItalic(): void {
    this.wrapSelection('*', '*', 'italic text');
  }

  protected applyHeading(): void {
    this.prefixLines('## ');
  }

  protected applyBulletedList(): void {
    this.prefixLines('- ');
  }

  protected applyNumberedList(): void {
    this.prefixLines('1. ');
  }

  protected applyLink(): void {
    const el = this.textareaRef()?.nativeElement;
    if (!el) {
      return;
    }
    const selected = this.value().slice(el.selectionStart, el.selectionEnd) || 'link text';
    this.replaceSelection(
      `[${selected}](https://)`,
      el.selectionStart + 1,
      el.selectionStart + 1 + selected.length,
    );
  }

  private wrapSelection(prefix: string, suffix: string, placeholder: string): void {
    const el = this.textareaRef()?.nativeElement;
    if (!el) {
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = this.value();
    const selected = current.slice(start, end) || placeholder;
    const next = current.slice(0, start) + prefix + selected + suffix + current.slice(end);
    this.setValueAndSelection(next, start + prefix.length, start + prefix.length + selected.length);
  }

  private replaceSelection(text: string, selectStart: number, selectEnd: number): void {
    const el = this.textareaRef()?.nativeElement;
    if (!el) {
      return;
    }
    const current = this.value();
    const next = current.slice(0, el.selectionStart) + text + current.slice(el.selectionEnd);
    this.setValueAndSelection(next, selectStart, selectEnd);
  }

  private prefixLines(prefix: string): void {
    const el = this.textareaRef()?.nativeElement;
    if (!el) {
      return;
    }
    const current = this.value();
    const lineStart = current.lastIndexOf('\n', el.selectionStart - 1) + 1;
    let lineEnd = current.indexOf('\n', el.selectionEnd);
    if (lineEnd === -1) {
      lineEnd = current.length;
    }
    const block = current.slice(lineStart, lineEnd);
    const prefixed = block
      .split('\n')
      .map((line) => (line ? prefix + line : line))
      .join('\n');
    const next = current.slice(0, lineStart) + prefixed + current.slice(lineEnd);
    const delta = prefixed.length - block.length;
    this.setValueAndSelection(next, el.selectionStart + prefix.length, el.selectionEnd + delta);
  }

  private setValueAndSelection(next: string, selectStart: number, selectEnd: number): void {
    this.value.set(next);
    this.onChange(next);
    queueMicrotask(() => {
      const el = this.textareaRef()?.nativeElement;
      if (!el) {
        return;
      }
      el.focus();
      el.setSelectionRange(selectStart, selectEnd);
    });
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function applyInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

export function renderMarkdown(markdown: string): string {
  const lines = escapeHtml(markdown).split('\n');
  const htmlParts: string[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let paragraphBuffer: string[] = [];

  const flushList = () => {
    if (!listBuffer) {
      return;
    }
    const { type, items } = listBuffer;
    htmlParts.push(`<${type}>${items.map((item) => `<li>${item}</li>`).join('')}</${type}>`);
    listBuffer = null;
  };

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      htmlParts.push(`<p>${paragraphBuffer.join(' ')}</p>`);
      paragraphBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      flushParagraph();
      continue;
    }

    const headingMatch = line.match(/^(#{1,2})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      flushParagraph();
      const level = headingMatch[1].length;
      htmlParts.push(`<h${level}>${applyInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const bulletMatch = line.match(/^-\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push(applyInlineMarkdown(bulletMatch[1]));
      continue;
    }

    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      flushParagraph();
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push(applyInlineMarkdown(numberedMatch[1]));
      continue;
    }

    flushList();
    paragraphBuffer.push(applyInlineMarkdown(line));
  }

  flushList();
  flushParagraph();

  return htmlParts.join('');
}
