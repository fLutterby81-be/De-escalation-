// Pure helpers for the /api/generate-instruction endpoint.
// Kept free of Express and SDK code so they can be unit tested.

export type Language = "nl" | "en";
export type TimeOfDay = "ochtend" | "middag" | "avond" | "nacht";

export interface InstructionRequest {
  language: Language;
  timeOfDay?: TimeOfDay;
  timeSinceLastAction?: number;
  actionCount: number;
  recent: string[];
}

const TIMES_OF_DAY: readonly TimeOfDay[] = ["ochtend", "middag", "avond", "nacht"];
const MAX_RECENT = 3;
const MAX_RECENT_LENGTH = 160;
const MAX_INSTRUCTION_LENGTH = 200;

export const FAST_PACE_MS = 4_000;
export const SLOW_PACE_MS = 20_000;
export const MOMENTUM_THRESHOLD = 5;

export const SYSTEM_INSTRUCTION = `Je bent een de-escalatie assistent ontworpen om gebruikers te helpen die acute fysieke en emotionele overprikkeling ervaren, of die vastzitten in een 'freeze' respons.

Jouw absolute regels:
1. Gebruik nooit meer dan twee korte zinnen.
2. Stel geen open vragen (zoals "Hoe voel je je?" of "Waarom?").
3. Toon empathie niet via lange teksten of analyses, maar door direct een veilige oplossing te bieden.
4. Geef altijd precies één fysieke micro-stap als opdracht (bijv. "Kijk naar links", "Beweeg je pink", "Haal één keer diep adem").
5. Als de gebruiker snel opnieuw om hulp vraagt, maak de stap dan nog kleiner en fysiek minder eisend.
6. Antwoord alleen met de instructie zelf: geen aanhalingstekens, opsommingstekens, opmaak of uitleg.`;

/**
 * Turns an untrusted JSON body into a safe, bounded request.
 * Free text never reaches the prompt except the capped list of recent
 * instructions, which the client echoes back to avoid repetition.
 */
export function parseInstructionRequest(body: unknown): InstructionRequest {
  const input = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const language: Language = input.language === "nl" ? "nl" : "en";

  const timeOfDay = TIMES_OF_DAY.find((t) => t === input.timeOfDay);

  const rawTime = input.timeSinceLastAction;
  const timeSinceLastAction =
    typeof rawTime === "number" && Number.isFinite(rawTime) && rawTime >= 0 ? rawTime : undefined;

  const rawCount = input.actionCount;
  const actionCount =
    typeof rawCount === "number" && Number.isFinite(rawCount)
      ? Math.min(Math.max(Math.floor(rawCount), 0), 1_000)
      : 0;

  const recent = Array.isArray(input.recent)
    ? input.recent
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.replace(/\s+/g, " ").trim().slice(0, MAX_RECENT_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_RECENT)
    : [];

  return { language, timeOfDay, timeSinceLastAction, actionCount, recent };
}

export function buildPrompt(req: InstructionRequest): string {
  const lines = ["De gebruiker heeft op de 'Help me' of 'Nog eentje' knop gedrukt."];

  if (req.timeSinceLastAction !== undefined) {
    if (req.timeSinceLastAction < FAST_PACE_MS) {
      lines.push(
        "De gebruiker klikt erg snel (minder dan 4 seconden). Ze zijn mogelijk in paniek of gehaast. Geef extreem kleine, geruststellende instructies om te aarden.",
      );
    } else if (req.timeSinceLastAction > SLOW_PACE_MS) {
      lines.push(
        "De gebruiker wacht lang tussen acties (meer dan 20 seconden). Ze zitten mogelijk vast in een diepe 'freeze'. Geef een uiterst minimale, niet-bedreigende fysieke instructie.",
      );
    } else {
      lines.push("De gebruiker volgt een gemiddeld tempo. Blijf gestage, veilige instructies geven.");
    }
  }

  lines.push(
    req.actionCount > MOMENTUM_THRESHOLD
      ? "De gebruiker heeft al meerdere stappen gedaan en bouwt momentum op. Je mag iets meer actieve instructies geven (zoals strekken of om zich heen kijken)."
      : "De gebruiker is pas net begonnen. Houd de instructies uiterst klein en lokaal.",
  );

  if (req.timeOfDay) {
    lines.push(
      `Het is nu de ${req.timeOfDay}. Pas de toon of instructie subtiel hierop aan als dat passend is (bijv. rustig in de avond, iets opwekkender in de ochtend).`,
    );
  }

  if (req.recent.length > 0) {
    lines.push(`Herhaal deze recente instructies niet letterlijk: ${req.recent.map((r) => `"${r}"`).join(", ")}.`);
  }

  lines.push(
    req.language === "en"
      ? "Geef de instructie uitsluitend in het Engels."
      : "Geef de instructie uitsluitend in het Nederlands.",
  );
  lines.push("Geef een micro-instructie.");

  return lines.join("\n");
}

/**
 * Normalises model output into a single short line, or returns null when
 * nothing usable is left so the caller can fall back.
 */
export function cleanInstruction(text: string | undefined | null): string | null {
  if (!text) return null;

  let cleaned = text
    .replace(/[*_`#>]/g, "")
    .replace(/^\s*[-•]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, "")
    .trim();

  if (!cleaned) return null;

  // Keep at most two sentences, matching rule 1 of the system instruction.
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 2) {
    cleaned = sentences.slice(0, 2).join("").trim();
  }

  if (cleaned.length > MAX_INSTRUCTION_LENGTH) {
    const cut = cleaned.slice(0, MAX_INSTRUCTION_LENGTH);
    const lastSpace = cut.lastIndexOf(" ");
    cleaned = `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length).trim()}.`;
  }

  return cleaned;
}
