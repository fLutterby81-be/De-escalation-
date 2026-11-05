import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { Volume2, VolumeX, Phone, MessageCircle, Moon, Sun } from 'lucide-react';
import { audioEngine } from './audio';
import { type Language, getInitialLanguage, saveLanguage, translations } from './i18n';
import { chooseIntensity, pickInstruction } from './instructions';
import { useTheme } from './theme';

/** Length of one progressive calming cycle on the Help me button. */
const HELP_CYCLE_MS = 30_000;
const HISTORY_SIZE = 3;

/** Keyboard focus ring shared by all controls. */
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow-deep';

interface Step {
  id: number;
  text: string;
}

export default function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [instruction, setInstruction] = useState<Step | null>(null);
  const [history, setHistory] = useState<Step[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isHelpActive, setIsHelpActive] = useState(false);
  const [progressCycle, setProgressCycle] = useState(0);

  const t = translations[language];
  const { theme, toggleTheme } = useTheme();

  const stepCount = useRef(0);
  const stepId = useRef(0);
  const helpStartTime = useRef(0);
  const lastActionTime = useRef(Date.now());
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  // Keep the document language in sync and remember the choice.
  useEffect(() => {
    document.documentElement.lang = language;
    saveLanguage(language);
  }, [language]);

  // Keep the screen awake while the app is open.
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          wakeLock.current = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Not supported or denied: not critical.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void requestWakeLock();
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, []);

  const toggleAudio = useCallback(() => {
    if (isAudioEnabled) {
      audioEngine.stop();
    } else {
      audioEngine.play();
    }
    setIsAudioEnabled(!isAudioEnabled);
  }, [isAudioEnabled]);

  const resetSession = useCallback(() => {
    setInstruction(null);
    setHistory([]);
    setIsHelpActive(false);
    helpStartTime.current = 0;
    stepCount.current = 0;
    lastActionTime.current = Date.now();
  }, []);

  const showNextStep = useCallback(() => {
    const now = Date.now();
    const timeSinceLast = now - lastActionTime.current;
    lastActionTime.current = now;

    // Start or renew the 30-second progressive calming cycle.
    if (!isHelpActive || now - helpStartTime.current >= HELP_CYCLE_MS) {
      setIsHelpActive(true);
      helpStartTime.current = now;
      setProgressCycle((cycle) => cycle + 1);
    }

    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Match the step to the user's pace and progress, without repeating
    // what was shown recently.
    const recent = [instruction?.text, ...history.map((step) => step.text)].filter(
      (text): text is string => Boolean(text),
    );
    const text = pickInstruction(language, chooseIntensity(timeSinceLast, stepCount.current), recent);

    if (instruction) {
      setHistory((prev) => [instruction, ...prev].slice(0, HISTORY_SIZE));
    }
    stepId.current += 1;
    setInstruction({ id: stepId.current, text });
    stepCount.current += 1;
  }, [instruction, history, isHelpActive, language]);

  const handleFeelBetter = useCallback(() => {
    resetSession();
    if (isAudioEnabled) {
      audioEngine.stop();
      setIsAudioEnabled(false);
    }
  }, [resetSession, isAudioEnabled]);

  const toggleLanguage = useCallback(() => {
    resetSession();
    setLanguage((current) => (current === 'nl' ? 'en' : 'nl'));
  }, [resetSession]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-gradient-to-b from-canvas to-canvas-deep text-ink flex flex-col select-none relative overflow-hidden">
        {/* Soft breathing glow in the background */}
        <motion.div
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          aria-hidden="true"
        >
          <motion.div
            className="w-[110vw] h-[110vw] max-w-[680px] max-h-[680px] rounded-full bg-[radial-gradient(circle,var(--color-glow)_0%,transparent_65%)]"
            animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.75, 0.45] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        <header className="relative z-20 flex items-center justify-between px-6 pt-6 short:pt-3">
          <button
            onClick={toggleLanguage}
            className={`p-3 text-ink-soft hover:text-ink transition-colors font-semibold text-base tracking-wider uppercase cursor-pointer rounded-full ${focusRing}`}
            aria-label={t.changeLanguage}
          >
            {language}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className={`p-3 text-ink-soft hover:text-ink transition-colors cursor-pointer rounded-full ${focusRing}`}
              aria-label={theme === 'dark' ? t.themeToLight : t.themeToDark}
              title={theme === 'dark' ? t.themeToLight : t.themeToDark}
            >
              {theme === 'dark' ? <Sun size={24} strokeWidth={1.75} /> : <Moon size={24} strokeWidth={1.75} />}
            </button>

            <button
              onClick={toggleAudio}
              className={`p-3 text-ink-soft hover:text-ink transition-colors cursor-pointer rounded-full ${focusRing}`}
              aria-label={isAudioEnabled ? t.soundOff : t.soundOn}
              aria-pressed={isAudioEnabled}
            >
              {isAudioEnabled ? <Volume2 size={26} strokeWidth={1.75} /> : <VolumeX size={26} strokeWidth={1.75} />}
            </button>
          </div>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md flex flex-col items-center gap-10 short:gap-5">
            <div className="relative w-full flex items-center justify-center">
              {/* Peach aura that blooms over 30s behind the Help me button */}
              <AnimatePresence>
                {isHelpActive && (
                  <motion.div
                    key={`aura-${progressCycle}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 0.8, scale: 1.06 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.8 } }}
                    transition={{ duration: HELP_CYCLE_MS / 1000, ease: 'easeInOut' }}
                    className="absolute -inset-3 rounded-[2.5rem] bg-glow/45 blur-2xl pointer-events-none -z-10"
                  />
                )}
              </AnimatePresence>

              <motion.button
                onClick={showNextStep}
                initial={false}
                animate={{ scale: isHelpActive ? 1.03 : 1 }}
                transition={{ duration: isHelpActive ? HELP_CYCLE_MS / 1000 : 0.8, ease: 'easeInOut' }}
                whileTap={{ scale: 0.98 }}
                className={`relative w-full py-10 short:py-7 bg-surface text-ink text-3xl font-semibold tracking-wide rounded-[2rem] ring-1 ring-inset ring-line shadow-(--shadow-button) flex flex-col items-center justify-center overflow-hidden cursor-pointer ${focusRing}`}
              >
                {/*
                 * Blush layer that fades in over the 30s cycle. Its colours are
                 * theme tokens, so a theme switch applies instantly mid-bloom.
                 */}
                <motion.div
                  initial={false}
                  animate={{ opacity: isHelpActive ? 1 : 0 }}
                  transition={{ duration: isHelpActive ? HELP_CYCLE_MS / 1000 : 0.8, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-[inherit] bg-blush ring-1 ring-inset ring-glow-deep/60 pointer-events-none"
                />

                {/* Inner warm gradient */}
                <AnimatePresence>
                  {isHelpActive && (
                    <motion.div
                      key={`inner-${progressCycle}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.8 } }}
                      transition={{ duration: HELP_CYCLE_MS / 1000, ease: 'easeInOut' }}
                      className="absolute inset-0 bg-gradient-to-b from-glow/25 to-transparent pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                <span className="relative z-10">{t.help}</span>

                {/* Thin 30-second grounding line floating near the bottom edge */}
                {isHelpActive && (
                  <div className="absolute bottom-3 left-10 right-10 h-1 rounded-full bg-line/80 overflow-hidden pointer-events-none">
                    <motion.div
                      key={`prog-bar-${progressCycle}`}
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: HELP_CYCLE_MS / 1000, ease: 'linear' }}
                      className="h-full bg-glow-deep rounded-full"
                    />
                  </div>
                )}
              </motion.button>
            </div>

            <div
              className="min-h-[110px] short:min-h-[80px] flex items-center justify-center text-center px-2"
              aria-live="polite"
              aria-atomic="true"
            >
              <AnimatePresence mode="wait">
                {instruction && (
                  <motion.p
                    key={instruction.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.3 } }}
                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                    className="text-ink text-2xl leading-relaxed"
                  >
                    {instruction.text}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {instruction && (
              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={showNextStep}
                  className={`w-full py-4 bg-surface/80 hover:bg-surface active:bg-blush text-ink text-lg font-semibold rounded-full border border-line shadow-(--shadow-soft) transition-colors cursor-pointer ${focusRing}`}
                >
                  {t.oneMore}
                </button>
                <button
                  onClick={handleFeelBetter}
                  className={`w-full py-3.5 text-ink-soft hover:text-ink text-base font-medium transition-colors cursor-pointer rounded-full ${focusRing}`}
                >
                  {t.feelBetter}
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Log of completed steps; side padding keeps it clear of the contact buttons */}
        <footer className="relative z-10 px-24 pb-6 pt-4">
          <div className="min-h-[120px] flex flex-col items-center justify-end gap-1.5 pointer-events-none">
            <AnimatePresence initial={false}>
              {history.length >= HISTORY_SIZE && (
                <motion.p
                  key="safe"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-clay text-xs text-center max-w-xs mb-1 font-semibold"
                >
                  {t.safe}
                </motion.p>
              )}
              {history.map((step, index) => (
                <motion.p
                  key={step.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: Math.max(0.3, 0.75 - index * 0.2), y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-ink-soft text-xs text-center max-w-xs w-full truncate"
                >
                  ✓ {step.text}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </footer>

        {/* Contact buttons stay fixed in view, even when the page scrolls */}
        <a
          href={t.chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`fixed bottom-6 left-6 z-50 p-4 bg-calm hover:bg-calm-line text-calm-ink border border-calm-line rounded-full shadow-(--shadow-calm) transition-colors flex items-center justify-center ${focusRing}`}
          aria-label={t.chat}
          title={t.chat}
        >
          <MessageCircle size={24} strokeWidth={1.75} />
        </a>

        <a
          href="tel:112"
          className={`fixed bottom-6 right-6 z-50 p-4 bg-alert hover:bg-alert-line text-alert-ink border border-alert-line rounded-full shadow-(--shadow-alert) transition-colors flex items-center justify-center ${focusRing}`}
          aria-label={t.emergency}
          title={t.emergency}
        >
          <Phone size={24} strokeWidth={1.75} />
        </a>
      </div>
    </MotionConfig>
  );
}
