import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Phone, MessageCircle } from 'lucide-react';
import { audioEngine } from './audio';

const fallbackActionsNL = [
  "Beweeg alleen je rechter wijsvinger.",
  "Haal één keer diep adem.",
  "Kijk naar links.",
  "Voel de grond onder je voeten.",
  "Beweeg je pink.",
  "Knipper twee keer langzaam met je ogen."
];

const fallbackActionsEN = [
  "Only move your right index finger.",
  "Take one deep breath.",
  "Look to your left.",
  "Feel the ground under your feet.",
  "Move your pinky finger.",
  "Blink twice slowly."
];

export default function App() {
  const [language, setLanguage] = useState<"nl" | "en">("en");
  const [instruction, setInstruction] = useState<string>("");
  const [nextInstruction, setNextInstruction] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const [isHelpActive, setIsHelpActive] = useState<boolean>(false);
  const [progressCycle, setProgressCycle] = useState<number>(0);
  const helpStartTimeRef = useRef<number>(0);
  const wakeLock = useRef<any>(null);
  const lastActionTime = useRef<number>(Date.now());

  const toggleAudio = useCallback(() => {
    if (isAudioEnabled) {
      audioEngine.stop();
    } else {
      audioEngine.play();
    }
    setIsAudioEnabled(!isAudioEnabled);
  }, [isAudioEnabled]);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLock.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      // Silently ignore errors
    }
  }, []);

  const fetchNextInstruction = useCallback(async (timeSinceLastAction?: number, actionCount?: number, forceLang?: string) => {
    try {
      const currentLang = forceLang || language;
      const hour = new Date().getHours();
      let timeOfDay = "dag";
      if (hour >= 6 && hour < 12) timeOfDay = "ochtend";
      else if (hour >= 12 && hour < 18) timeOfDay = "middag";
      else if (hour >= 18 && hour < 23) timeOfDay = "avond";
      else timeOfDay = "nacht";

      const response = await fetch('/api/generate-instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSinceLastAction, actionCount, timeOfDay, language: currentLang })
      });
      if (response.ok) {
        const data = await response.json();
        setNextInstruction(data.instruction);
      }
    } catch (err) {
      // Silently ignore to allow fallback usage
    }
  }, [language]);

  // Pre-fetch the first instruction on mount
  useEffect(() => {
    fetchNextInstruction(undefined, 0);
  }, [fetchNextInstruction]);

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock.current !== null) {
        wakeLock.current.release().catch(() => {});
        wakeLock.current = null;
      }
    };
  }, [requestWakeLock]);

  const getMicroAction = useCallback(() => {
    const now = Date.now();
    const timeSinceLast = now - lastActionTime.current;
    lastActionTime.current = now;

    // Start or sustain the 30-second progressive calming element
    if (!isHelpActive || now - helpStartTimeRef.current >= 30000) {
      setIsHelpActive(true);
      helpStartTimeRef.current = now;
      setProgressCycle(prev => prev + 1);
    }

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    let newHistoryCount = history.length;
    if (instruction) {
      newHistoryCount++;
      setHistory(prev => {
        // Prevent duplicate consecutive entries if needed, but not strictly necessary
        return [instruction, ...prev].slice(0, 3);
      });
    }

    if (nextInstruction) {
      setInstruction(nextInstruction);
      setNextInstruction(""); // Clear used instruction
      fetchNextInstruction(timeSinceLast, newHistoryCount); // Pre-fetch the next one
    } else {
      // Instant fallback if API is slow
      const actions = language === "en" ? fallbackActionsEN : fallbackActionsNL;
      const randomIndex = Math.floor(Math.random() * actions.length);
      setInstruction(actions[randomIndex]);
      fetchNextInstruction(timeSinceLast, newHistoryCount); // Still try to pre-fetch for the next click
    }
  }, [instruction, nextInstruction, fetchNextInstruction, history.length, language, isHelpActive]);

  const handleReset = useCallback(() => {
    setInstruction("");
    setHistory([]);
    setIsHelpActive(false);
    helpStartTimeRef.current = 0;
    lastActionTime.current = Date.now();
    if (isAudioEnabled) {
      audioEngine.stop();
      setIsAudioEnabled(false);
    }
  }, [isAudioEnabled]);

  return (
    <div className="min-h-screen bg-[#292018] flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Language Toggle */}
      <button
        onClick={() => {
          const newLang = language === "nl" ? "en" : "nl";
          setLanguage(newLang);
          setInstruction("");
          setNextInstruction("");
          setHistory([]);
          setIsHelpActive(false);
          helpStartTimeRef.current = 0;
          fetchNextInstruction(undefined, 0, newLang);
        }}
        className="absolute top-6 left-6 p-3 z-50 text-[#b8a696] hover:text-[#f0e6db] transition-colors font-medium text-lg uppercase cursor-pointer"
        aria-label="Verander taal / Change language"
      >
        {language}
      </button>

      {/* Emergency Contact */}
      <a
        href="tel:112"
        className="absolute bottom-6 right-6 p-4 z-50 bg-red-900/30 text-red-200 hover:bg-red-900/50 hover:text-white transition-all rounded-full shadow-lg border border-red-900/50 flex items-center justify-center"
        aria-label={language === "en" ? "Emergency Contact" : "Noodcontact"}
        title={language === "en" ? "Emergency Contact (112)" : "Noodcontact (112)"}
      >
        <Phone size={24} />
      </a>

      {/* Chat Support */}
      <a
        href={language === "en" ? "https://findahelpline.com/" : "https://www.zelfmoord1813.be/chatten"}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-6 left-6 p-4 z-50 bg-blue-900/30 text-blue-200 hover:bg-blue-900/50 hover:text-white transition-all rounded-full shadow-lg border border-blue-900/50 flex items-center justify-center"
        aria-label={language === "en" ? "Find A Helpline" : "Zelfmoordlijn Chat"}
        title={language === "en" ? "Find A Helpline" : "Zelfmoordlijn Chat"}
      >
        <MessageCircle size={24} />
      </a>

      {/* Audio Toggle */}
      <button
        onClick={toggleAudio}
        className="absolute top-6 right-6 p-3 z-50 text-[#b8a696] hover:text-[#f0e6db] transition-colors cursor-pointer"
        aria-label={isAudioEnabled ? "Zet geluid uit" : "Zet geluid aan"}
      >
        {isAudioEnabled ? <Volume2 size={28} /> : <VolumeX size={28} />}
      </button>

      {/* Subtle breathing background circle */}
      <motion.div
        className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        <motion.div
          className="w-[85vw] h-[85vw] max-w-[550px] max-h-[550px] rounded-full bg-[#c27c44]/30 blur-2xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      <div className="w-full max-w-md flex flex-col items-center gap-10 relative z-10">
        <div className="relative w-full flex items-center justify-center">
          {/* Subtle warm amber aura that blooms over 30s behind the Help me button */}
          <AnimatePresence>
            {isHelpActive && (
              <motion.div
                key={`aura-${progressCycle}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 0.7, scale: 1.07 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.8 } }}
                transition={{ duration: 30, ease: "easeInOut" }}
                className="absolute -inset-2 rounded-3xl bg-[#c27c44]/25 blur-xl pointer-events-none -z-10"
              />
            )}
          </AnimatePresence>

          <motion.button 
            key={`help-btn-${progressCycle}`}
            onClick={getMicroAction}
            initial={false}
            animate={
              isHelpActive
                ? {
                    scale: 1.045,
                    backgroundColor: "#523c28",
                    borderColor: "rgba(194, 124, 68, 0.65)",
                    boxShadow: "0 14px 38px rgba(194, 124, 68, 0.22), 0 4px 14px rgba(0, 0, 0, 0.4)",
                  }
                : {
                    scale: 1,
                    backgroundColor: "#3f3226",
                    borderColor: "#4d3e30",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
                  }
            }
            transition={{
              duration: isHelpActive ? 30 : 0.8,
              ease: "easeInOut",
            }}
            whileTap={{ scale: 0.98 }}
            className="relative w-full py-10 text-[#f0e6db] text-3xl font-medium rounded-2xl shadow-lg border transition-colors flex flex-col items-center justify-center overflow-hidden cursor-pointer"
            aria-label={language === "en" ? "Help me" : "Help me"}
          >
            {/* Subtle inner warm ambient gradient */}
            <AnimatePresence>
              {isHelpActive && (
                <motion.div
                  key={`inner-${progressCycle}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.8 } }}
                  transition={{ duration: 30, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-to-b from-[#c27c44]/15 to-transparent pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* Button label */}
            <span className="relative z-10 select-none tracking-wide">
              {language === "en" ? "Help me" : "Help me"}
            </span>

            {/* Non-intrusive 30-second progressive grounding line along button bottom */}
            {isHelpActive && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#292018]/50 overflow-hidden pointer-events-none">
                <motion.div
                  key={`prog-bar-${progressCycle}`}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 30, ease: "linear" }}
                  className="h-full bg-[#c27c44]/75 rounded-full"
                />
              </div>
            )}
          </motion.button>
        </div>

        <div className="min-h-[110px] flex items-center justify-center text-center px-2">
          <AnimatePresence mode="wait">
            {instruction ? (
              <motion.p
                key={instruction}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="text-[#f0e6db] text-2xl font-sans leading-relaxed"
              >
                {instruction}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {instruction && (
          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={getMicroAction}
              className="w-full py-4 bg-[#3f3226]/80 hover:bg-[#4d3e30] active:bg-[#5c4a3b] text-[#f0e6db] text-lg font-medium rounded-2xl shadow transition-colors border border-[#4d3e30]/80 cursor-pointer"
            >
              {language === "en" ? "One more" : "Nog eentje"}
            </button>
            <button 
              onClick={handleReset}
              className="w-full py-3.5 text-[#b8a696] hover:text-[#f0e6db] active:text-white text-base font-medium transition-colors cursor-pointer"
            >
              {language === "en" ? "I feel better" : "Ik voel me beter"}
            </button>
          </div>
        )}
      </div>

      {/* Log section */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1.5 z-10 pointer-events-none">
        <AnimatePresence>
          {history.length >= 3 && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.5, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[#c27c44] text-xs text-center max-w-xs mb-1 font-medium"
            >
              {language === "en" ? "You are safe, take a moment to thank yourself." : "Je bent veilig, neem een moment om jezelf te bedanken."}
            </motion.p>
          )}
          {history.map((item, index) => (
            <motion.p
              key={`${item}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: Math.max(0.1, 0.4 - index * 0.15), y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[#b8a696] text-xs text-center max-w-xs"
            >
              ✓ {item}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
