export type Language = "nl" | "en";
export type TimeOfDay = "ochtend" | "middag" | "avond" | "nacht";

const STORAGE_KEY = "de-escalation:language";

export const translations = {
  nl: {
    help: "Help me",
    oneMore: "Nog eentje",
    feelBetter: "Ik voel me beter",
    safe: "Je bent veilig, neem een moment om jezelf te bedanken.",
    changeLanguage: "Change language to English",
    soundOn: "Zet geluid aan",
    soundOff: "Zet geluid uit",
    emergency: "Noodcontact (112)",
    chat: "Chat met de Zelfmoordlijn 1813",
    chatUrl: "https://www.zelfmoord1813.be/ik-heb-hulp-nodig/chat-met-de-zelfmoordlijn",
    fallbacks: [
      "Beweeg alleen je rechter wijsvinger.",
      "Haal één keer diep adem.",
      "Kijk naar links.",
      "Voel de grond onder je voeten.",
      "Beweeg je pink.",
      "Knipper twee keer langzaam met je ogen.",
    ],
  },
  en: {
    help: "Help me",
    oneMore: "One more",
    feelBetter: "I feel better",
    safe: "You are safe, take a moment to thank yourself.",
    changeLanguage: "Verander taal naar Nederlands",
    soundOn: "Turn sound on",
    soundOff: "Turn sound off",
    emergency: "Emergency contact (112)",
    chat: "Find a helpline",
    chatUrl: "https://findahelpline.com/",
    fallbacks: [
      "Only move your right index finger.",
      "Take one deep breath.",
      "Look to your left.",
      "Feel the ground under your feet.",
      "Move your pinky finger.",
      "Blink twice slowly.",
    ],
  },
} as const;

/** Saved choice first, then the browser language, then English. */
export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "nl" || saved === "en") return saved;
  } catch {
    // Storage can be blocked (private mode); fall through to detection.
  }
  return navigator.language?.toLowerCase().startsWith("nl") ? "nl" : "en";
}

export function saveLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not critical: the choice simply is not remembered.
  }
}

export function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return "ochtend";
  if (hour >= 12 && hour < 18) return "middag";
  if (hour >= 18 && hour < 23) return "avond";
  return "nacht";
}

/** A random fallback that differs from the instruction currently on screen. */
export function pickFallback(language: Language, current?: string): string {
  const options = translations[language].fallbacks.filter((item) => item !== current);
  return options[Math.floor(Math.random() * options.length)];
}
