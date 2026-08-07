import { TestBed } from '@angular/core/testing';
import { QuestionEditor } from './question-editor';
import { Question } from '../../models/section.model';
import { QUESTION_DETAIL_MAX_LENGTH } from '../../utils/field-limits';

describe('QuestionEditor', () => {
  function createFixture() {
    const fixture = TestBed.createComponent(QuestionEditor);
    fixture.detectChanges();
    return fixture;
  }

  function typeSelect(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector(
      '[data-testid="question-type-select"]',
    ) as HTMLSelectElement | null;
  }

  function answerRows(fixture: ReturnType<typeof createFixture>) {
    return Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid^="answer-row-"]'),
    ) as HTMLElement[];
  }

  function removeButton(fixture: ReturnType<typeof createFixture>, index: number) {
    return fixture.nativeElement.querySelector(
      `[data-testid="answer-remove-${index}"]`,
    ) as HTMLButtonElement;
  }

  function correctControl(fixture: ReturnType<typeof createFixture>, index: number) {
    return fixture.nativeElement.querySelector(
      `[data-testid="answer-correct-${index}"]`,
    ) as HTMLInputElement;
  }

  function setTypeAndText(
    fixture: ReturnType<typeof createFixture>,
    text: string,
    type: 'yes-no' | 'single' | 'multiple',
  ) {
    const component = fixture.componentInstance;
    component.form.controls.text.setValue(text);
    fixture.detectChanges();
    component.form.controls.type.setValue(type);
    fixture.detectChanges();
  }

  describe('question text and type', () => {
    it('hides the type select until question text is entered', () => {
      const fixture = createFixture();
      expect(typeSelect(fixture)).toBeNull();

      fixture.componentInstance.form.controls.text.setValue('Is this correct?');
      fixture.detectChanges();

      expect(typeSelect(fixture)).not.toBeNull();
    });

    it('is valid with empty text regardless of other fields', () => {
      const fixture = createFixture();
      expect(fixture.componentInstance.validate()).toBeNull();
    });

    it('requires a type once text is entered', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      component.form.controls.text.setValue('Is this correct?');
      fixture.detectChanges();

      expect(component.validate()).toEqual({ question: true });

      component.form.controls.type.setValue('yes-no');
      component.form.controls.yesNoCorrectAnswer.setValue('yes');
      fixture.detectChanges();

      expect(component.validate()).toBeNull();
    });

    it('clears type, answers, and yes/no selection when text is emptied', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Is this correct?', 'yes-no');
      component.form.controls.yesNoCorrectAnswer.setValue('yes');
      fixture.detectChanges();

      component.form.controls.text.setValue('');
      fixture.detectChanges();

      expect(component.form.controls.type.value).toBe('');
      expect(component.form.controls.yesNoCorrectAnswer.value).toBeNull();
      expect(component.validate()).toBeNull();
    });
  });

  describe('detail field', () => {
    function detailTextarea(fixture: ReturnType<typeof createFixture>) {
      return fixture.nativeElement.querySelector(
        '[data-testid="markdown-textarea"]',
      ) as HTMLTextAreaElement | null;
    }

    it('renders a rich-text (markdown) editor, hidden until question text is entered', () => {
      const fixture = createFixture();
      expect(detailTextarea(fixture)).toBeNull();

      fixture.componentInstance.form.controls.text.setValue('Is this correct?');
      fixture.detectChanges();

      expect(detailTextarea(fixture)).not.toBeNull();
    });

    it('is capped at QUESTION_DETAIL_MAX_LENGTH via the maxlength attribute', () => {
      const fixture = createFixture();
      fixture.componentInstance.form.controls.text.setValue('Is this correct?');
      fixture.detectChanges();

      expect(detailTextarea(fixture)?.maxLength).toBe(QUESTION_DETAIL_MAX_LENGTH);
    });

    it('is included in the built question independent of whether a type/answers are filled in', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      const onChange = vi.fn();
      component.registerOnChange(onChange);

      component.form.controls.text.setValue('Is this correct?');
      component.form.controls.detail.setValue('Extra context here');
      fixture.detectChanges();

      expect(onChange).toHaveBeenLastCalledWith({
        text: 'Is this correct?',
        type: '',
        detail: 'Extra context here',
      });

      component.form.controls.type.setValue('yes-no');
      component.form.controls.yesNoCorrectAnswer.setValue('yes');
      fixture.detectChanges();

      expect(onChange).toHaveBeenLastCalledWith({
        text: 'Is this correct?',
        type: 'yes-no',
        detail: 'Extra context here',
        yesNoCorrectAnswer: 'yes',
      });
    });

    it('is omitted from the built question when blank or whitespace-only', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      const onChange = vi.fn();
      component.registerOnChange(onChange);

      setTypeAndText(fixture, 'Is this correct?', 'yes-no');
      component.form.controls.detail.setValue('   ');
      component.form.controls.yesNoCorrectAnswer.setValue('yes');
      fixture.detectChanges();

      expect(onChange).toHaveBeenLastCalledWith({
        text: 'Is this correct?',
        type: 'yes-no',
        yesNoCorrectAnswer: 'yes',
      });
    });

    it('writeValue populates detail, and writing undefined resets it', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.writeValue({ text: 'Q', type: 'yes-no', yesNoCorrectAnswer: 'yes', detail: 'Some detail' });
      fixture.detectChanges();
      expect(component.form.controls.detail.value).toBe('Some detail');

      component.writeValue(undefined);
      fixture.detectChanges();
      expect(component.form.controls.detail.value).toBe('');
    });
  });

  describe('yes/no question', () => {
    it('requires a yes/no selection to be valid', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Is this correct?', 'yes-no');

      expect(component.validate()).toEqual({ question: true });

      component.form.controls.yesNoCorrectAnswer.setValue('no');
      fixture.detectChanges();

      expect(component.validate()).toBeNull();
    });
  });

  describe('single choice', () => {
    it('enforces a minimum of 2 answers and required text per answer', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Pick one', 'single');

      expect(component.validate()).toEqual({ question: true });

      component.addAnswer();
      component.addAnswer();
      fixture.detectChanges();
      expect(component.validate()).toEqual({ question: true });

      component.answers.at(0).controls.text.setValue('Answer A');
      component.answers.at(1).controls.text.setValue('Answer B');
      fixture.detectChanges();
      expect(component.validate()).toEqual({ question: true });

      component.selectSingleCorrect(0);
      fixture.detectChanges();
      expect(component.validate()).toBeNull();
    });

    it('disables the Remove button once at the minimum answer count', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Pick one', 'single');
      component.addAnswer();
      component.addAnswer();
      fixture.detectChanges();

      expect(removeButton(fixture, 0).disabled).toBe(true);

      component.addAnswer();
      fixture.detectChanges();
      expect(removeButton(fixture, 0).disabled).toBe(false);
    });

    it('selectSingleCorrect clears every other correct flag, including the specials', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Pick one', 'single');
      component.addAnswer();
      component.addAnswer();
      component.form.controls.includeAllOfTheAbove.setValue(true);
      component.form.controls.includeNoneOfTheAbove.setValue(true);
      fixture.detectChanges();

      component.selectSingleCorrect(0);
      fixture.detectChanges();
      expect(component.answers.at(0).controls.isCorrect.value).toBe(true);

      component.selectSingleCorrect('all');
      fixture.detectChanges();
      expect(component.answers.at(0).controls.isCorrect.value).toBe(false);
      expect(component.form.controls.allOfTheAboveCorrect.value).toBe(true);
      expect(component.form.controls.noneOfTheAboveCorrect.value).toBe(false);

      component.selectSingleCorrect('none');
      fixture.detectChanges();
      expect(component.form.controls.allOfTheAboveCorrect.value).toBe(false);
      expect(component.form.controls.noneOfTheAboveCorrect.value).toBe(true);
    });

    it('keeps only one correct answer when switching from multiple choice to single', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Pick all that apply', 'multiple');
      component.addAnswer();
      component.addAnswer();
      component.addAnswer();
      component.answers.at(0).controls.text.setValue('Answer A');
      component.answers.at(1).controls.text.setValue('Answer B');
      component.answers.at(2).controls.text.setValue('Answer C');
      component.answers.at(0).controls.isCorrect.setValue(true);
      component.answers.at(1).controls.isCorrect.setValue(true);
      fixture.detectChanges();

      component.form.controls.type.setValue('single');
      fixture.detectChanges();

      const correctFlags = component.answers.controls.map((row) => row.controls.isCorrect.value);
      expect(correctFlags.filter(Boolean)).toHaveLength(1);
      expect(correctFlags[0]).toBe(true);
      expect(correctFlags[1]).toBe(false);
    });
  });

  describe('multiple choice', () => {
    function addAnswers(component: QuestionEditor, count: number) {
      for (let i = 0; i < count; i++) {
        component.addAnswer();
        const index = component.answers.length - 1;
        component.answers.at(index).controls.text.setValue(`Answer ${index}`);
      }
    }

    it('enforces a minimum of 3 answers', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Pick all that apply', 'multiple');
      addAnswers(component, 2);
      fixture.detectChanges();
      expect(component.validate()).toEqual({ question: true });

      addAnswers(component, 1);
      component.answers.at(0).controls.isCorrect.setValue(true);
      fixture.detectChanges();
      expect(component.validate()).toBeNull();
    });

    it('requires at least one correct answer', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Pick all that apply', 'multiple');
      addAnswers(component, 3);
      fixture.detectChanges();

      expect(component.validate()).toEqual({ question: true });

      component.answers.at(1).controls.isCorrect.setValue(true);
      fixture.detectChanges();
      expect(component.validate()).toBeNull();
    });

    it('checking "All of the above" disables and clears normal answer checkboxes and the other special', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Pick all that apply', 'multiple');
      addAnswers(component, 3);
      component.form.controls.includeAllOfTheAbove.setValue(true);
      component.form.controls.includeNoneOfTheAbove.setValue(true);
      component.answers.at(0).controls.isCorrect.setValue(true);
      component.form.controls.noneOfTheAboveCorrect.setValue(true);
      fixture.detectChanges();

      component.form.controls.allOfTheAboveCorrect.setValue(true);
      fixture.detectChanges();

      expect(component.form.controls.noneOfTheAboveCorrect.value).toBe(false);
      component.answers.controls.forEach((row) => {
        expect(row.controls.isCorrect.value).toBe(false);
        expect(row.controls.isCorrect.disabled).toBe(true);
      });
      expect(correctControl(fixture, 0).disabled).toBe(true);

      component.form.controls.allOfTheAboveCorrect.setValue(false);
      fixture.detectChanges();

      component.answers.controls.forEach((row) => {
        expect(row.controls.isCorrect.disabled).toBe(false);
      });
    });

    it('only one of the two special options can be marked correct at a time', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Pick all that apply', 'multiple');
      addAnswers(component, 3);
      component.form.controls.includeAllOfTheAbove.setValue(true);
      component.form.controls.includeNoneOfTheAbove.setValue(true);
      fixture.detectChanges();

      component.form.controls.allOfTheAboveCorrect.setValue(true);
      fixture.detectChanges();
      expect(component.form.controls.noneOfTheAboveCorrect.value).toBe(false);

      component.form.controls.noneOfTheAboveCorrect.setValue(true);
      fixture.detectChanges();
      expect(component.form.controls.allOfTheAboveCorrect.value).toBe(false);
    });

    it('unchecking "Include" for a special clears its correct flag and re-enables the answers', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Pick all that apply', 'multiple');
      addAnswers(component, 3);
      component.form.controls.includeAllOfTheAbove.setValue(true);
      component.form.controls.allOfTheAboveCorrect.setValue(true);
      fixture.detectChanges();

      component.form.controls.includeAllOfTheAbove.setValue(false);
      fixture.detectChanges();

      expect(component.form.controls.allOfTheAboveCorrect.value).toBe(false);
      component.answers.controls.forEach((row) => {
        expect(row.controls.isCorrect.disabled).toBe(false);
      });
    });

    it('disables normal-answer checkboxes when switching into multiple while a special is already correct', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Pick one', 'single');
      component.addAnswer();
      component.addAnswer();
      component.form.controls.includeAllOfTheAbove.setValue(true);
      fixture.detectChanges();
      component.selectSingleCorrect('all');
      fixture.detectChanges();

      component.form.controls.type.setValue('multiple');
      fixture.detectChanges();

      component.answers.controls.forEach((row) => {
        expect(row.controls.isCorrect.disabled).toBe(true);
      });
    });
  });

  describe('answer images', () => {
    it('requires every normal answer to have an image once one of them does', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Pick one', 'single');
      component.addAnswer();
      component.addAnswer();
      component.answers.at(0).controls.text.setValue('Answer A');
      component.answers.at(1).controls.text.setValue('Answer B');
      component.selectSingleCorrect(0);
      fixture.detectChanges();
      expect(component.validate()).toBeNull();

      component.answers.at(0).controls.imageUrl.setValue('https://example.com/a.png');
      fixture.detectChanges();

      expect(component.answers.at(1).controls.imageUrl.hasError('imageRequired')).toBe(true);
      expect(component.validate()).toEqual({ question: true });

      component.answers.at(1).controls.imageUrl.setValue('https://example.com/b.png');
      fixture.detectChanges();

      expect(component.answers.at(1).controls.imageUrl.hasError('imageRequired')).toBe(false);
      expect(component.validate()).toBeNull();
    });

    it('lifts the image requirement once no answer has an image', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Pick one', 'single');
      component.addAnswer();
      component.addAnswer();
      component.answers.at(0).controls.text.setValue('Answer A');
      component.answers.at(1).controls.text.setValue('Answer B');
      component.answers.at(0).controls.imageUrl.setValue('https://example.com/a.png');
      fixture.detectChanges();
      expect(component.answers.at(1).controls.imageUrl.hasError('imageRequired')).toBe(true);

      component.answers.at(0).controls.imageUrl.setValue('');
      fixture.detectChanges();

      expect(component.answers.at(1).controls.imageUrl.hasError('imageRequired')).toBe(false);
    });
  });

  describe('ControlValueAccessor', () => {
    it('emits undefined when text is empty', () => {
      const fixture = createFixture();
      const onChange = vi.fn();
      fixture.componentInstance.registerOnChange(onChange);

      fixture.componentInstance.form.controls.text.setValue('');
      fixture.detectChanges();

      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('emits the assembled question for a yes/no question', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      const onChange = vi.fn();
      component.registerOnChange(onChange);

      setTypeAndText(fixture, 'Is this correct?', 'yes-no');
      component.form.controls.yesNoCorrectAnswer.setValue('yes');
      fixture.detectChanges();

      expect(onChange).toHaveBeenCalledWith({
        text: 'Is this correct?',
        type: 'yes-no',
        yesNoCorrectAnswer: 'yes',
      });
    });

    it('writeValue rebuilds the answers list from an existing question', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      const question: Question = {
        text: 'Pick all that apply',
        type: 'multiple',
        answers: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
          { text: 'C', isCorrect: true, imageUrl: 'https://example.com/c.png' },
        ],
        includeNoneOfTheAbove: true,
        noneOfTheAboveCorrect: false,
      };

      component.writeValue(question);
      fixture.detectChanges();

      expect(component.form.controls.text.value).toBe('Pick all that apply');
      expect(component.form.controls.type.value).toBe('multiple');
      expect(component.answers.length).toBe(3);
      expect(component.answers.at(2).controls.imageUrl.value).toBe('https://example.com/c.png');
      expect(component.form.controls.includeNoneOfTheAbove.value).toBe(true);
      expect(answerRows(fixture)).toHaveLength(3);
    });

    it('writeValue normalizes legacy single-choice data that has more than one correct answer, and reports the fix via onChange', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      const onChange = vi.fn();
      component.registerOnChange(onChange);
      const question: Question = {
        text: 'Pick one',
        type: 'single',
        answers: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: true },
          { text: 'C', isCorrect: false },
        ],
      };

      component.writeValue(question);
      fixture.detectChanges();
      await Promise.resolve();

      const correctFlags = component.answers.controls.map((row) => row.controls.isCorrect.value);
      expect(correctFlags).toEqual([true, false, false]);
      expect(onChange).toHaveBeenCalledWith({
        text: 'Pick one',
        type: 'single',
        answers: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
          { text: 'C', isCorrect: false },
        ],
        includeAllOfTheAbove: false,
        allOfTheAboveCorrect: false,
        includeNoneOfTheAbove: false,
        noneOfTheAboveCorrect: false,
      });
    });

    it('writeValue with undefined resets the form to empty', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      setTypeAndText(fixture, 'Is this correct?', 'yes-no');

      component.writeValue(undefined);
      fixture.detectChanges();

      expect(component.form.controls.text.value).toBe('');
      expect(component.form.controls.type.value).toBe('');
    });
  });

  describe('Validator', () => {
    it('notifies the registered validator-change callback when validity changes', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      const onValidatorChange = vi.fn();
      component.registerOnValidatorChange(onValidatorChange);

      component.form.controls.text.setValue('Is this correct?');
      fixture.detectChanges();

      expect(onValidatorChange).toHaveBeenCalled();
    });
  });
});
