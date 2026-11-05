import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { Volume2, VolumeX, Phone, MessageCircle } from 'lucide-react';
import { audioEngine } from './audio';
import { type Language, getInitialLanguage, saveLanguage, translations } from './i18n';
import { chooseIntensity, pickInstruction } from './instructions';

/** Length of one progressive calming cycle on the Help me button. */
const HELP_CYCLE_MS = 30_000;
const HISTORY_SIZE = 3;

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
      <div className="min-h-dvh bg-[#292018] flex flex-col select-none relative overflow-hidden">
        {/* Subtle breathing background circle */}
        <motion.div
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          aria-hidden="true"
        >
          <motion.div
            className="w-[85vw] h-[85vw] max-w-[550px] max-h-[550px] rounded-full bg-[#c27c44]/30 blur-2xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        <header className="relative z-20 flex items-center justify-between px-6 pt-6 short:pt-3">
          <button
            onClick={toggleLanguage}
            className="p-3 text-[#b8a696] hover:text-[#f0e6db] transition-colors font-medium text-lg uppercase cursor-pointer"
            aria-label={t.changeLanguage}
          >
            {language}
          </button>

          <button
            onClick={toggleAudio}
            className="p-3 text-[#b8a696] hover:text-[#f0e6db] transition-colors cursor-pointer"
            aria-label={isAudioEnabled ? t.soundOff : t.soundOn}
            aria-pressed={isAudioEnabled}
          >
            {isAudioEnabled ? <Volume2 size={28} /> : <VolumeX size={28} />}
          </button>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md flex flex-col items-center gap-10 short:gap-5">
            <div className="relative w-full flex items-center justify-center">
              {/* Warm amber aura that blooms over 30s behind the Help me button */}
              <AnimatePresence>
                {isHelpActive && (
                  <motion.div
                    key={`aura-${progressCycle}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 0.7, scale: 1.07 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.8 } }}
                    transition={{ duration: HELP_CYCLE_MS / 1000, ease: 'easeInOut' }}
                    className="absolute -inset-2 rounded-3xl bg-[#c27c44]/25 blur-xl pointer-events-none -z-10"
                  />
                )}
              </AnimatePresence>

              <motion.button
                onClick={showNextStep}
                initial={false}
                animate={
                  isHelpActive
                    ? {
                        scale: 1.045,
                        backgroundColor: '#523c28',
                        borderColor: 'rgba(194, 124, 68, 0.65)',
                        boxShadow: '0 14px 38px rgba(194, 124, 68, 0.22), 0 4px 14px rgba(0, 0, 0, 0.4)',
                      }
                    : {
                        scale: 1,
                        backgroundColor: '#3f3226',
                        borderColor: '#4d3e30',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                      }
                }
                transition={{ duration: isHelpActive ? HELP_CYCLE_MS / 1000 : 0.8, ease: 'easeInOut' }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full py-10 short:py-7 text-[#f0e6db] text-3xl font-medium rounded-2xl border flex flex-col items-center justify-center overflow-hidden cursor-pointer"
              >
                {/* Inner warm ambient gradient */}
                <AnimatePresence>
                  {isHelpActive && (
                    <motion.div
                      key={`inner-${progressCycle}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.8 } }}
                      transition={{ duration: HELP_CYCLE_MS / 1000, ease: 'easeInOut' }}
                      className="absolute inset-0 bg-gradient-to-b from-[#c27c44]/15 to-transparent pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                <span className="relative z-10 tracking-wide">{t.help}</span>

                {/* Non-intrusive 30-second grounding line along the button bottom */}
                {isHelpActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#292018]/50 overflow-hidden pointer-events-none">
                    <motion.div
                      key={`prog-bar-${progressCycle}`}
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: HELP_CYCLE_MS / 1000, ease: 'linear' }}
                      className="h-full bg-[#c27c44]/75 rounded-full"
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
                    className="text-[#f0e6db] text-2xl leading-relaxed"
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
                  className="w-full py-4 bg-[#3f3226]/80 hover:bg-[#4d3e30] active:bg-[#5c4a3b] text-[#f0e6db] text-lg font-medium rounded-2xl shadow transition-colors border border-[#4d3e30]/80 cursor-pointer"
                >
                  {t.oneMore}
                </button>
                <button
                  onClick={handleFeelBetter}
                  className="w-full py-3.5 text-[#b8a696] hover:text-[#f0e6db] active:text-white text-base font-medium transition-colors cursor-pointer"
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
                  animate={{ opacity: 0.5, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[#c27c44] text-xs text-center max-w-xs mb-1 font-medium"
                >
                  {t.safe}
                </motion.p>
              )}
              {history.map((step, index) => (
                <motion.p
                  key={step.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: Math.max(0.1, 0.4 - index * 0.15), y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[#b8a696] text-xs text-center max-w-xs w-full truncate"
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
          className="fixed bottom-6 left-6 z-50 p-4 bg-blue-900/30 text-blue-200 hover:bg-blue-900/50 hover:text-white transition-all rounded-full shadow-lg border border-blue-900/50 flex items-center justify-center"
          aria-label={t.chat}
          title={t.chat}
        >
          <MessageCircle size={24} />
        </a>

        <a
          href="tel:112"
          className="fixed bottom-6 right-6 z-50 p-4 bg-red-900/30 text-red-200 hover:bg-red-900/50 hover:text-white transition-all rounded-full shadow-lg border border-red-900/50 flex items-center justify-center"
          aria-label={t.emergency}
          title={t.emergency}
        >
          <Phone size={24} />
        </a>
      </div>
    </MotionConfig>
  );
}
