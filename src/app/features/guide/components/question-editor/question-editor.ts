import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, inject } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormArray,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Question, QuestionAnswer, QuestionType } from '../../models/section.model';
import { URL_PATTERN } from '../../../../shared/utils/patterns';
import {
  ANSWER_TEXT_MAX_LENGTH,
  QUESTION_DETAIL_MAX_LENGTH,
  QUESTION_TEXT_MAX_LENGTH,
} from '../../utils/field-limits';
import { MarkdownEditor } from '../../../../shared/components/markdown-editor/markdown-editor';
import { LanguageService } from '../../../../core/i18n/language.service';

type AnswerGroup = FormGroup<{
  text: FormControl<string>;
  isCorrect: FormControl<boolean>;
  imageUrl: FormControl<string>;
}>;

export type SingleCorrectKey = number | 'all' | 'none';

const MIN_ANSWERS = { single: 2, multiple: 3 } as const;

const imageRequiredWhenSiblingHasImage: ValidatorFn = (control: AbstractControl) => {
  const parentArray = control.parent?.parent as FormArray<AnswerGroup> | null | undefined;
  if (!parentArray) {
    return null;
  }
  const anyHasImage = parentArray.controls.some((row) =>
    Boolean(row.controls.imageUrl.value.trim()),
  );
  const value = (control.value as string).trim();
  return anyHasImage && !value ? { imageRequired: true } : null;
};

function questionGroupValidator(group: AbstractControl): ValidationErrors | null {
  const text = (group.get('text')?.value as string).trim();
  if (!text) {
    return null;
  }
  const type = group.get('type')?.value as QuestionType | '';
  if (!type) {
    return { question: true };
  }
  if (type === 'yes-no') {
    return group.get('yesNoCorrectAnswer')?.value ? null : { question: true };
  }
  const answers = group.get('answers') as FormArray<AnswerGroup>;
  if (answers.length < MIN_ANSWERS[type]) {
    return { question: true };
  }
  const anyCorrect =
    answers.controls.some((row) => row.controls.isCorrect.value) ||
    Boolean(group.get('allOfTheAboveCorrect')?.value) ||
    Boolean(group.get('noneOfTheAboveCorrect')?.value);
  return anyCorrect ? null : { question: true };
}

@Component({
  selector: 'app-question-editor',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MarkdownEditor,
  ],
  templateUrl: './question-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => QuestionEditor), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => QuestionEditor), multi: true },
  ],
})
export class QuestionEditor implements ControlValueAccessor, Validator {
  protected readonly language = inject(LanguageService);
  protected readonly questionTextMaxLength = QUESTION_TEXT_MAX_LENGTH;
  protected readonly questionDetailMaxLength = QUESTION_DETAIL_MAX_LENGTH;
  protected readonly answerTextMaxLength = ANSWER_TEXT_MAX_LENGTH;

  readonly form = new FormGroup(
    {
      text: new FormControl('', { nonNullable: true }),
      detail: new FormControl('', {
        nonNullable: true,
        validators: Validators.maxLength(QUESTION_DETAIL_MAX_LENGTH),
      }),
      type: new FormControl<QuestionType | ''>('', { nonNullable: true }),
      yesNoCorrectAnswer: new FormControl<'yes' | 'no' | null>(null),
      answers: new FormArray<AnswerGroup>([]),
      includeAllOfTheAbove: new FormControl(false, { nonNullable: true }),
      allOfTheAboveCorrect: new FormControl(false, { nonNullable: true }),
      includeNoneOfTheAbove: new FormControl(false, { nonNullable: true }),
      noneOfTheAboveCorrect: new FormControl(false, { nonNullable: true }),
    },
    { validators: questionGroupValidator },
  );

  private readonly cdr = inject(ChangeDetectorRef);

  get answers(): FormArray<AnswerGroup> {
    return this.form.controls.answers;
  }

  private onChange: (value: Question | undefined) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.form.valueChanges.subscribe(() => this.onChange(this.buildQuestion()));
    this.form.statusChanges.subscribe(() => this.onValidatorChange());

    this.form.controls.text.valueChanges.subscribe((value) => {
      if (!value.trim()) {
        this.form.patchValue(
          {
            detail: '',
            type: '',
            yesNoCorrectAnswer: null,
            includeAllOfTheAbove: false,
            allOfTheAboveCorrect: false,
            includeNoneOfTheAbove: false,
            noneOfTheAboveCorrect: false,
          },
          { emitEvent: false },
        );
        this.answers.clear({ emitEvent: false });
      }
    });

    this.answers.valueChanges.subscribe(() => {
      this.answers.controls.forEach((row) =>
        row.controls.imageUrl.updateValueAndValidity({ emitEvent: false }),
      );
    });

    this.form.controls.type.valueChanges.subscribe((type) => {
      if (type === 'single') {
        this.enforceSingleCorrect();
      }
      this.setAnswersCorrectDisabled(
        Boolean(
          this.form.controls.allOfTheAboveCorrect.value ||
            this.form.controls.noneOfTheAboveCorrect.value,
        ),
      );
      this.cdr.markForCheck();
    });

    this.form.controls.allOfTheAboveCorrect.valueChanges.subscribe((checked) => {
      if (checked) {
        this.form.controls.noneOfTheAboveCorrect.setValue(false, { emitEvent: false });
        this.setAnswersCorrectDisabled(true);
      } else if (!this.form.controls.noneOfTheAboveCorrect.value) {
        this.setAnswersCorrectDisabled(false);
      }
    });
    this.form.controls.noneOfTheAboveCorrect.valueChanges.subscribe((checked) => {
      if (checked) {
        this.form.controls.allOfTheAboveCorrect.setValue(false, { emitEvent: false });
        this.setAnswersCorrectDisabled(true);
      } else if (!this.form.controls.allOfTheAboveCorrect.value) {
        this.setAnswersCorrectDisabled(false);
      }
    });
    this.form.controls.includeAllOfTheAbove.valueChanges.subscribe((included) => {
      if (!included) {
        this.form.controls.allOfTheAboveCorrect.setValue(false);
      }
    });
    this.form.controls.includeNoneOfTheAbove.valueChanges.subscribe((included) => {
      if (!included) {
        this.form.controls.noneOfTheAboveCorrect.setValue(false);
      }
    });
  }

  writeValue(question: Question | undefined): void {
    this.answers.clear({ emitEvent: false });
    this.form.reset(
      {
        text: question?.text ?? '',
        detail: question?.detail ?? '',
        type: question?.type ?? '',
        yesNoCorrectAnswer: question?.yesNoCorrectAnswer ?? null,
        answers: [],
        includeAllOfTheAbove: question?.includeAllOfTheAbove ?? false,
        allOfTheAboveCorrect: question?.allOfTheAboveCorrect ?? false,
        includeNoneOfTheAbove: question?.includeNoneOfTheAbove ?? false,
        noneOfTheAboveCorrect: question?.noneOfTheAboveCorrect ?? false,
      },
      { emitEvent: false },
    );

    (question?.answers ?? []).forEach((answer) => {
      this.answers.push(this.buildAnswerGroup(answer), { emitEvent: false });
    });

    const wasCorrected = question?.type === 'single' && this.enforceSingleCorrect();
    this.setAnswersCorrectDisabled(
      Boolean(this.form.controls.allOfTheAboveCorrect.value || this.form.controls.noneOfTheAboveCorrect.value),
    );
    if (wasCorrected) {
      // Deferred: writeValue runs reentrantly inside the outer control's own
      // setValue/reset call, so an onChange fired synchronously here would be
      // clobbered once that outer call finishes. Queue it for right after.
      const corrected = this.buildQuestion();
      queueMicrotask(() => this.onChange(corrected));
    }
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: Question | undefined) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  validate(_control?: AbstractControl): ValidationErrors | null {
    return this.form.valid ? null : { question: true };
  }

  onBlur(): void {
    this.onTouched();
  }

  addAnswer(): void {
    this.answers.push(this.buildAnswerGroup());
    this.cdr.markForCheck();
  }

  removeAnswer(index: number): void {
    if (!this.canRemoveAnswer()) {
      return;
    }
    this.answers.removeAt(index);
    this.cdr.markForCheck();
  }

  canRemoveAnswer(): boolean {
    return this.answers.length > this.minAnswers();
  }

  minAnswers(): number {
    const type = this.form.controls.type.value;
    return type === 'single' || type === 'multiple' ? MIN_ANSWERS[type] : 0;
  }

  selectSingleCorrect(key: SingleCorrectKey): void {
    this.answers.controls.forEach((row, index) => {
      row.controls.isCorrect.setValue(index === key, { emitEvent: false });
    });
    this.form.controls.allOfTheAboveCorrect.setValue(key === 'all', { emitEvent: false });
    this.form.controls.noneOfTheAboveCorrect.setValue(key === 'none', { emitEvent: false });
    this.form.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  private enforceSingleCorrect(): boolean {
    let picked = false;
    let changed = false;
    this.answers.controls.forEach((row) => {
      if (!row.controls.isCorrect.value) {
        return;
      }
      if (picked) {
        row.controls.isCorrect.setValue(false, { emitEvent: false });
        changed = true;
      } else {
        picked = true;
      }
    });
    if (this.form.controls.allOfTheAboveCorrect.value) {
      if (picked) {
        this.form.controls.allOfTheAboveCorrect.setValue(false, { emitEvent: false });
        changed = true;
      } else {
        picked = true;
      }
    }
    if (this.form.controls.noneOfTheAboveCorrect.value) {
      if (picked) {
        this.form.controls.noneOfTheAboveCorrect.setValue(false, { emitEvent: false });
        changed = true;
      }
    }
    return changed;
  }

  private setAnswersCorrectDisabled(disabled: boolean): void {
    this.answers.controls.forEach((row) => {
      if (disabled) {
        row.controls.isCorrect.setValue(false, { emitEvent: false });
        row.controls.isCorrect.disable({ emitEvent: false });
      } else {
        row.controls.isCorrect.enable({ emitEvent: false });
      }
    });
    this.cdr.markForCheck();
  }

  private buildAnswerGroup(answer?: QuestionAnswer): AnswerGroup {
    return new FormGroup({
      text: new FormControl(answer?.text ?? '', {
        nonNullable: true,
        validators: Validators.required,
      }),
      isCorrect: new FormControl(answer?.isCorrect ?? false, { nonNullable: true }),
      imageUrl: new FormControl(answer?.imageUrl ?? '', {
        nonNullable: true,
        validators: [Validators.pattern(URL_PATTERN), imageRequiredWhenSiblingHasImage],
      }),
    });
  }

  private buildQuestion(): Question | undefined {
    const raw = this.form.getRawValue();
    const text = raw.text.trim();
    if (!text) {
      return undefined;
    }

    const detail = raw.detail.trim();
    const type = raw.type as QuestionType | '';
    if (!type) {
      return { text, type: '' as QuestionType, ...(detail ? { detail } : {}) };
    }

    if (type === 'yes-no') {
      return {
        text,
        type,
        ...(detail ? { detail } : {}),
        ...(raw.yesNoCorrectAnswer ? { yesNoCorrectAnswer: raw.yesNoCorrectAnswer } : {}),
      };
    }

    const answers: QuestionAnswer[] = raw.answers.map((answer) => ({
      text: answer.text,
      isCorrect: answer.isCorrect,
      ...(answer.imageUrl ? { imageUrl: answer.imageUrl } : {}),
    }));

    return {
      text,
      type,
      ...(detail ? { detail } : {}),
      answers,
      includeAllOfTheAbove: raw.includeAllOfTheAbove,
      allOfTheAboveCorrect: raw.allOfTheAboveCorrect,
      includeNoneOfTheAbove: raw.includeNoneOfTheAbove,
      noneOfTheAboveCorrect: raw.noneOfTheAboveCorrect,
    };
  }
}
