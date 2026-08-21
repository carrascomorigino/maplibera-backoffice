import { Translations } from '../../../core/i18n/models/language.model';
import { ResourceCategory } from '../models/resource.model';

/** Pure lookup from a resource category to its localized heading label — shared between the
 * resources list page (section headings) and the form drawer (dynamic title). */
export function categoryLabel(
  labels: Translations['resources']['resourcesList'],
  category: ResourceCategory,
): string {
  switch (category) {
    case 'nutrition':
      return labels.categoryHeadingNutrition;
    case 'recipes':
      return labels.categoryHeadingRecipes;
    case 'multimedia':
      return labels.categoryHeadingMultimedia;
    case 'apps':
      return labels.categoryHeadingApps;
  }
}
