import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Section } from '../../models/section.model';
import { SectionService } from '../../services/section.service';

const URL_PATTERN = /^https?:\/\/.+/i;

@Component({
  selector: 'app-section-form-drawer',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './section-form-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionFormDrawer {
  private readonly sectionService = inject(SectionService);

  readonly section = input<Section | undefined>(undefined);
  readonly closed = output<void>();

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: Validators.required }),
    description: new FormControl('', { nonNullable: true, validators: Validators.required }),
    imageUrl: new FormControl('', {
      nonNullable: true,
      validators: Validators.pattern(URL_PATTERN),
    }),
  });

  constructor() {
    effect(() => {
      const section = this.section();
      this.form.reset({
        title: section?.title ?? '',
        description: section?.description ?? '',
        imageUrl: section?.imageUrl ?? '',
      });
    });
  }

  protected save(): void {
    this.persist();
    this.closed.emit();
  }

  protected publish(): void {
    const id = this.persist();
    this.sectionService.publish(id);
    this.closed.emit();
  }

  protected cancel(): void {
    this.closed.emit();
  }

  private persist(): string {
    const { title, description, imageUrl } = this.form.getRawValue();
    const existing = this.section();

    if (existing) {
      this.sectionService.update(existing.id, { title, description, imageUrl });
      return existing.id;
    }

    return this.sectionService.create({ title, description, imageUrl }).id;
  }
}
