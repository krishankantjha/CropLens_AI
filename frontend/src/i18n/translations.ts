// Field Notes Intelligence reminder: localization belongs in one source of truth, with graceful English fallback for incomplete languages.
export type SupportedLanguage = "English" | "हिन्दी" | "मराठी" | "ಕನ್ನಡ" | "తెలుగు" | "தமிழ்" | "ગુજરાતી" | "বাংলা" | "ਪੰਜਾਬੀ";

type TranslationSet = {
  goodMorning: string;
  todayMessage: string;
  continue: string;
  back: string;
  createAdvisory: string;
  stepOf: (step: number) => string;
  guestDemo: string;
};

const english: TranslationSet = {
  goodMorning: "Good morning",
  todayMessage: "Here's what you should know today.",
  continue: "Continue",
  back: "Back",
  createAdvisory: "Create My Advisory",
  stepOf: (step) => `Step ${step} of 5`,
  guestDemo: "Guest Session",
};

const hindi: TranslationSet = {
  goodMorning: "सुप्रभात",
  todayMessage: "आज आपको यह जानना चाहिए।",
  continue: "आगे बढ़ें",
  back: "वापस",
  createAdvisory: "मेरी सलाह बनाएं",
  stepOf: (step) => `चरण ${step} / 5`,
  guestDemo: "अतिथि सत्र",
};

const translations: Partial<Record<SupportedLanguage, TranslationSet>> = {
  English: english,
  "हिन्दी": hindi,
};

export function getTranslation(language: string): TranslationSet {
  return translations[language as SupportedLanguage] ?? english;
}
