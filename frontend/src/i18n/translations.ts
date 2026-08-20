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

const marathi: TranslationSet = {
  goodMorning: "सुप्रभात",
  todayMessage: "आज तुम्ही हे जाणून घेतले पाहिजे.",
  continue: "पुढे जा",
  back: "मागे",
  createAdvisory: "माझा सल्ला तयार करा",
  stepOf: (step) => `पायरी ${step} पैकी ५`,
  guestDemo: "पाहुणा सत्र",
};

const kannada: TranslationSet = {
  goodMorning: "शुभೋದಯ",
  todayMessage: "ಇಂದು ನೀವು ತಿಳಿದುಕೊಳ್ಳಬೇಕಾದದ್ದು.",
  continue: "ಮುಂದುವರಿಸಿ",
  back: "ಹಿಂದೆ",
  createAdvisory: "ನನ್ನ ಸಲಹೆಯನ್ನು ರಚಿಸಿ",
  stepOf: (step) => `ಹಂತ ${step} ರ 5`,
  guestDemo: "ಅತಿಥಿ ಅಧಿವೇಶನ",
};

const telugu: TranslationSet = {
  goodMorning: "శుభోదయం",
  todayMessage: "ఈరోజు మీరు తెలుసుకోవలసినది.",
  continue: "కొనసాగించు",
  back: "వెనుకకు",
  createAdvisory: "నా సలహాను సృష్టించండి",
  stepOf: (step) => `దశ ${step} 5 లో`,
  guestDemo: "అతిథి సెషన్",
};

const tamil: TranslationSet = {
  goodMorning: "காலை வணக்கம்",
  todayMessage: "இன்று நீங்கள் தெரிந்து கொள்ள வேண்டியது.",
  continue: "தொடரவும்",
  back: "பின்னால்",
  createAdvisory: "எனது ஆலோசனையை உருவாக்கவும்",
  stepOf: (step) => `படி ${step} இன் 5`,
  guestDemo: "விருந்தினர் அமர்வு",
};

const gujarati: TranslationSet = {
  goodMorning: "સુપ્રભાત",
  todayMessage: "આજે તમારે આ જાણવું જોઈએ.",
  continue: "ચાલુ રાખો",
  back: "પાછળ",
  createAdvisory: "મારી સલાહ બનાવો",
  stepOf: (step) => `પગલું ${step} 5 માંથી`,
  guestDemo: "મહેમાન સત્ર",
};

const bengali: TranslationSet = {
  goodMorning: "সুপ্রভাত",
  todayMessage: "আজ আপনার যা জানা উচিত।",
  continue: "চালিয়ে যান",
  back: "পেছনে",
  createAdvisory: "আমার পরামর্শ তৈরি করুন",
  stepOf: (step) => `ধাপ ${step} এর 5`,
  guestDemo: "অতিথি সেশন",
};

const punjabi: TranslationSet = {
  goodMorning: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ / ਸੁप्रभात",
  todayMessage: "ਅੱਜ ਤੁਹਾਨੂੰ ਇਹ ਜਾਣਨਾ ਚਾਹੀਦਾ ਹੈ।",
  continue: "ਜਾਰੀ ਰੱਖੋ",
  back: "ਪਿੱਛੇ",
  createAdvisory: "मेरी सਲਾਹ ਬਣਾਓ",
  stepOf: (step) => `ਕਦਮ ${step} 5 ਵਿੱਚੋਂ`,
  guestDemo: "ਮਹਿਮਾਨ ਸੈਸ਼ਨ",
};

const translations: Partial<Record<SupportedLanguage, TranslationSet>> = {
  English: english,
  "हिन्दी": hindi,
  "मराठी": marathi,
  "ಕನ್ನಡ": kannada,
  "తెలుగు": telugu,
  "தமிழ்": tamil,
  "ગુજરાતી": gujarati,
  "বাংলা": bengali,
  "ਪੰਜਾਬੀ": punjabi,
};

export function getTranslation(language: string): TranslationSet {
  return translations[language as SupportedLanguage] ?? english;
}
