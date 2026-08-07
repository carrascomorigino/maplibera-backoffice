import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

describe('ConfirmDialog', () => {
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  function createFixture(data: ConfirmDialogData) {
    dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    const fixture = TestBed.createComponent(ConfirmDialog);
    fixture.detectChanges();
    return fixture;
  }

  const data: ConfirmDialogData = {
    title: 'Remove translation',
    message: 'Remove the English translation?',
    confirmLabel: 'Remove',
    cancelLabel: 'Cancel',
  };

  it('renders the title and message', () => {
    const fixture = createFixture(data);
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain(data.title);
    expect(nativeElement.textContent).toContain(data.message);
  });

  it('closes with true when the confirm button is clicked', () => {
    const fixture = createFixture(data);
    const nativeElement = fixture.nativeElement as HTMLElement;

    (nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]') as HTMLButtonElement).click();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('closes with false when the cancel button is clicked', () => {
    const fixture = createFixture(data);
    const nativeElement = fixture.nativeElement as HTMLElement;

    (nativeElement.querySelector('[data-testid="confirm-dialog-cancel"]') as HTMLButtonElement).click();

    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
