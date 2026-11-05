// Built-in micro-instructions and the rules for choosing the next one.
// Each instruction is one small physical step in at most two short
// sentences, without questions.

import type { Language } from './i18n';

/** How demanding the next step may be. */
export type Intensity = 'tiny' | 'gentle' | 'active';

/** Clicks faster than this suggest panic: keep the step extremely small. */
export const FAST_PACE_MS = 4_000;
/** Waiting longer than this suggests a freeze: keep the step minimal. */
export const SLOW_PACE_MS = 20_000;
/** After this many steps the user has momentum and may do a bit more. */
export const MOMENTUM_THRESHOLD = 5;

export const instructions: Record<Language, Record<Intensity, readonly string[]>> = {
  nl: {
    tiny: [
      'Beweeg alleen je rechter wijsvinger.',
      'Haal één keer diep adem.',
      'Knipper twee keer langzaam met je ogen.',
      'Beweeg je pink.',
      'Voel de grond onder je voeten.',
      'Adem langzaam uit door je mond.',
      'Druk je tenen zachtjes tegen de grond.',
      'Laat je schouders een beetje zakken.',
    ],
    gentle: [
      'Kijk naar links.',
      'Druk je handpalmen even tegen elkaar.',
      'Draai je hoofd langzaam naar rechts.',
      'Zoek met je ogen iets blauws in de ruimte.',
      'Wrijf je handen zachtjes over elkaar.',
      'Leg je handen op je bovenbenen. Voel hoe warm ze zijn.',
      'Maak een vuist en laat langzaam los.',
      'Adem in terwijl je tot vier telt.',
    ],
    active: [
      'Rek je armen langzaam boven je hoofd.',
      'Kijk rustig de ruimte rond.',
      'Rol je schouders twee keer naar achteren.',
      'Sta langzaam op als dat lukt. Voel je voeten op de grond.',
      'Neem een slok water als je die bij de hand hebt.',
      'Spreid je vingers zo wijd als je kunt.',
      'Zet een paar rustige stappen.',
      'Kijk naar het verste punt dat je kunt zien.',
    ],
  },
  en: {
    tiny: [
      'Only move your right index finger.',
      'Take one deep breath.',
      'Blink twice slowly.',
      'Move your pinky finger.',
      'Feel the ground under your feet.',
      'Breathe out slowly through your mouth.',
      'Gently press your toes into the floor.',
      'Let your shoulders drop a little.',
    ],
    gentle: [
      'Look to your left.',
      'Press your palms together for a moment.',
      'Slowly turn your head to the right.',
      'Find something blue in the room with your eyes.',
      'Gently rub your hands together.',
      'Rest your hands on your thighs. Notice their warmth.',
      'Make a fist, then slowly let go.',
      'Breathe in while you count to four.',
    ],
    active: [
      'Slowly stretch your arms above your head.',
      'Calmly look around the room.',
      'Roll your shoulders back twice.',
      'Stand up slowly if you can. Feel your feet on the floor.',
      'Take a sip of water if you have some nearby.',
      'Spread your fingers as wide as you can.',
      'Take a few calm steps.',
      'Look at the farthest point you can see.',
    ],
  },
};

/**
 * Picks how demanding the next step may be.
 * @param timeSinceLastAction milliseconds since the previous click
 * @param stepsTaken number of steps already shown in this session
 */
export function chooseIntensity(timeSinceLastAction: number, stepsTaken: number): Intensity {
  if (stepsTaken === 0) return 'tiny';
  if (timeSinceLastAction < FAST_PACE_MS || timeSinceLastAction > SLOW_PACE_MS) return 'tiny';
  return stepsTaken > MOMENTUM_THRESHOLD ? 'active' : 'gentle';
}

/** A random instruction of the given intensity that was not shown recently. */
export function pickInstruction(
  language: Language,
  intensity: Intensity,
  recent: readonly string[] = [],
  random: () => number = Math.random,
): string {
  const pool = instructions[language][intensity];
  const fresh = pool.filter((item) => !recent.includes(item));
  const options = fresh.length > 0 ? fresh : pool.filter((item) => item !== recent[0]);
  return options[Math.floor(random() * options.length)];
}
