export type Language = "nl" | "en";

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
    themeToDark: "Schakel naar donker thema",
    themeToLight: "Schakel naar licht thema",
    emergency: "Noodcontact (112)",
    chat: "Chat met de Zelfmoordlijn 1813",
    chatUrl: "https://www.zelfmoord1813.be/ik-heb-hulp-nodig/chat-met-de-zelfmoordlijn",
  },
  en: {
    help: "Help me",
    oneMore: "One more",
    feelBetter: "I feel better",
    safe: "You are safe, take a moment to thank yourself.",
    changeLanguage: "Verander taal naar Nederlands",
    soundOn: "Turn sound on",
    soundOff: "Turn sound off",
    themeToDark: "Switch to dark theme",
    themeToLight: "Switch to light theme",
    emergency: "Emergency contact (112)",
    chat: "Find a helpline",
    chatUrl: "https://findahelpline.com/",
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
