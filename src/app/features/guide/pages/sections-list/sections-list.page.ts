import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { Question, QuestionType, Section, SectionStatus } from '../../models/section.model';
import { SectionService } from '../../services/section.service';
import { SectionFormDrawer } from '../../components/section-form-drawer/section-form-drawer';

@Component({
  selector: 'app-sections-list',
  imports: [
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    MatButtonModule,
    MatIconModule,
    MatDrawerContainer,
    MatDrawer,
    MatDrawerContent,
    SectionFormDrawer,
  ],
  templateUrl: './sections-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionsListPage {
  private readonly sectionService = inject(SectionService);

  protected readonly sections = this.sectionService.sections;
  protected readonly isDrawerOpen = signal(false);
  protected readonly editingSection = signal<Section | undefined>(undefined);

  protected openCreate(): void {
    this.editingSection.set(undefined);
    this.isDrawerOpen.set(true);
  }

  protected openEdit(section: Section): void {
    this.editingSection.set(section);
    this.isDrawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  protected statusActionLabel(status: SectionStatus): string {
    return status === 'published' ? 'Pause' : 'Publish';
  }

  protected onStatusAction(section: Section): void {
    if (section.status === 'published') {
      this.sectionService.pause(section.slug);
    } else {
      this.sectionService.publish(section.slug);
    }
  }

  protected statusBadgeClass(status: SectionStatus): string {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  onDrop(event: CdkDragDrop<Section[]>): void {
    const slugs = event.container.data.map((section) => section.slug);
    moveItemInArray(slugs, event.previousIndex, event.currentIndex);
    this.sectionService.reorder(slugs);
  }

  questionTypeLabel(type: QuestionType): string {
    switch (type) {
      case 'yes-no':
        return 'Yes/No question';
      case 'single':
        return 'Single choice';
      case 'multiple':
        return 'Multiple choice';
    }
  }

  correctAnswerLabels(question: Question): string[] {
    if (question.type === 'yes-no') {
      return [question.yesNoCorrectAnswer === 'no' ? 'No' : 'Yes'];
    }

    const labels = (question.answers ?? [])
      .filter((answer) => answer.isCorrect)
      .map((answer) => answer.text);
    if (question.allOfTheAboveCorrect) {
      labels.push('All of the above');
    }
    if (question.noneOfTheAboveCorrect) {
      labels.push('None of the above');
    }
    return labels;
  }
}
