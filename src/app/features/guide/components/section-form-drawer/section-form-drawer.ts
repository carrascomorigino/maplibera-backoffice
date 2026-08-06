import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Question, Section } from '../../models/section.model';
import { SectionService } from '../../services/section.service';
import { MarkdownEditor } from '../markdown-editor/markdown-editor';
import { QuestionEditor } from '../question-editor/question-editor';
import { slugify } from '../../utils/slugify';
import { URL_PATTERN, SLUG_PATTERN } from '../../utils/patterns';

@Component({
  selector: 'app-section-form-drawer',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MarkdownEditor,
    QuestionEditor,
  ],
  templateUrl: './section-form-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionFormDrawer {
  private readonly sectionService = inject(SectionService);

  readonly section = input<Section | undefined>(undefined);
  readonly closed = output<void>();

  private readonly slugManuallyEdited = signal(false);

  private readonly duplicateSlugValidator: ValidatorFn = (control) => {
    const slug = (control.value as string).trim().toLowerCase();
    if (!slug) {
      return null;
    }
    const currentSlug = this.section()?.slug;
    const isDuplicate = this.sectionService
      .sections()
      .some((section) => section.slug !== currentSlug && section.slug.toLowerCase() === slug);
    return isDuplicate ? { duplicateSlug: true } : null;
  };

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: Validators.required }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(SLUG_PATTERN), this.duplicateSlugValidator],
    }),
    description: new FormControl('', { nonNullable: true, validators: Validators.required }),
    imageUrl: new FormControl('', {
      nonNullable: true,
      validators: Validators.pattern(URL_PATTERN),
    }),
    question: new FormControl<Question | undefined>(undefined),
  });

  constructor() {
    this.form.controls.title.valueChanges.subscribe((title) => {
      if (!this.slugManuallyEdited()) {
        this.form.controls.slug.setValue(slugify(title), { emitEvent: false });
      }
    });
    this.form.controls.slug.valueChanges.subscribe(() => {
      this.slugManuallyEdited.set(true);
    });

    effect(() => {
      const section = this.section();
      this.slugManuallyEdited.set(false);
      this.form.reset(
        {
          title: section?.title ?? '',
          slug: section?.slug ?? '',
          description: section?.description ?? '',
          imageUrl: section?.imageUrl ?? '',
          question: section?.question ?? undefined,
        },
        { emitEvent: false },
      );
    });
  }

  protected save(): void {
    this.persist();
    this.closed.emit();
  }

  protected publish(): void {
    const slug = this.persist();
    this.sectionService.publish(slug);
    this.closed.emit();
  }

  protected cancel(): void {
    this.closed.emit();
  }

  private persist(): string {
    const { title, slug, description, imageUrl, question } = this.form.getRawValue();
    const questionValue = question ?? undefined;
    const existing = this.section();

    if (existing) {
      this.sectionService.update(existing.slug, {
        title,
        slug,
        description,
        imageUrl,
        question: questionValue,
      });
      return slug;
    }

    return this.sectionService.create({ slug, title, description, imageUrl, question: questionValue })
      .slug;
  }
}
