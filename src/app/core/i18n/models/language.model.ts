export type UiLanguage = 'es' | 'en';

export interface Translations {
  nav: {
    appTitle: string;
    sectionsLink: string;
    resourcesLink: string;
  };
  languageTags: {
    untranslatedAria: (languageName: string) => string;
    needsUpdateAria: (languageName: string) => string;
    removeConfirmTitle: string;
    removeConfirmMessage: (languageName: string) => string;
    removeConfirmConfirmButton: string;
    removeConfirmCancelButton: string;
  };
  guide: {
    sectionsList: {
      heading: string;
      newSectionButton: string;
      emptyState: string;
      editButton: string;
      publishAction: string;
      pauseAction: string;
      questionTypeYesNo: string;
      questionTypeSingle: string;
      questionTypeMultiple: string;
      yesLabel: string;
      noLabel: string;
      allOfTheAbove: string;
      noneOfTheAbove: string;
      reorderAriaLabel: (title: string) => string;
    };
    sectionForm: {
      editHeading: string;
      newHeading: string;
      titleLabel: string;
      slugLabel: string;
      slugPatternError: string;
      duplicateSlugError: string;
      descriptionLabel: string;
      imageUrlLabel: string;
      saveButton: string;
      publishButton: string;
      cancelButton: string;
      workingLanguageLabel: (languageName: string) => string;
      suggestionLoadingText: string;
      suggestionFailedNotice: string;
      suggestionFailedDismiss: string;
      previewButton: string;
      acceptTranslationButton: string;
      previewLoadingText: string;
    };
    markdownEditor: {
      toolbarAriaLabel: string;
      boldLabel: string;
      italicLabel: string;
      headingLabel: string;
      bulletedListLabel: string;
      numberedListLabel: string;
      linkLabel: string;
      previewButton: string;
      editButton: string;
    };
    questionEditor: {
      questionLabel: string;
      questionTypeLabel: string;
      selectTypePlaceholder: string;
      typeYesNo: string;
      typeSingle: string;
      typeMultiple: string;
      correctAnswerLegend: string;
      yesOption: string;
      noOption: string;
      answerLabel: (index: number) => string;
      imageUrlLabel: string;
      imageRequiredError: string;
      invalidUrlError: string;
      removeAnswerAria: string;
      addAnswerButton: string;
      includeAllOfTheAbove: string;
      allOfTheAboveCorrect: string;
      includeNoneOfTheAbove: string;
      noneOfTheAboveCorrect: string;
      correctAnswerAria: string;
      questionErrorText: string;
    };
  };
  resources: {
    resourcesList: {
      heading: string;
      addNutritionButton: string;
      addRecipeButton: string;
      addMultimediaButton: string;
      addAppButton: string;
      filterAllLabel: string;
      filterNutritionLabel: string;
      filterRecipesLabel: string;
      filterMultimediaLabel: string;
      filterAppsLabel: string;
      categoryHeadingNutrition: string;
      categoryHeadingRecipes: string;
      categoryHeadingMultimedia: string;
      categoryHeadingApps: string;
      emptyCategoryState: string;
      editButton: string;
      publishAction: string;
      pauseAction: string;
      reorderAriaLabel: (title: string) => string;
    };
    resourceForm: {
      editHeading: string;
      newHeading: string;
      titleLabel: string;
      slugLabel: string;
      slugPatternError: string;
      duplicateSlugError: string;
      shortDescriptionLabel: string;
      saveButton: string;
      publishButton: string;
      cancelButton: string;
      workingLanguageLabel: (languageName: string) => string;
      suggestionLoadingText: string;
      suggestionFailedNotice: string;
      suggestionFailedDismiss: string;
      previewButton: string;
      acceptTranslationButton: string;
      previewLoadingText: string;
    };
    categoryFields: {
      nutrition: {
        explanatoryTextLabel: string;
        sourceLinksLabel: string;
        pdfUrlsLabel: string;
      };
      recipes: {
        preparationMinutesLabel: string;
        photoUrlsLabel: string;
        ingredientsLabel: string;
        stepsLabel: string;
      };
      multimedia: {
        mediaTypeLabel: string;
        mediaTypeDocumentary: string;
        mediaTypeBook: string;
        mediaTypePodcast: string;
        externalUrlLabel: string;
        posterUrlLabel: string;
      };
      apps: {
        appStoreUrlLabel: string;
        playStoreUrlLabel: string;
        iconUrlLabel: string;
      };
    };
    stringListEditor: {
      addRowButton: (itemLabel: string) => string;
      removeRowAria: string;
      invalidUrlError: string;
    };
  };
}
