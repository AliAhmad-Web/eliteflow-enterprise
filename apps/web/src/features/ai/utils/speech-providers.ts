/**
 * Voice provider config (client). Env-only — never hardcode secrets.
 * NEXT_PUBLIC_VOICE_PROVIDER: browser | web_speech | none
 * NEXT_PUBLIC_VOICE_LANG: BCP-47 language (default en-US)
 * NEXT_PUBLIC_VOICE_API_KEY: reserved for future cloud STT (not required for browser)
 */

export type VoiceProviderId = "browser" | "web_speech" | "none";

export type VoiceDialogueLanguage = "ur" | "en";

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function getVoiceProviderId(): VoiceProviderId {
  const raw = trimEnv(process.env.NEXT_PUBLIC_VOICE_PROVIDER).toLowerCase();
  switch (raw) {
    case "":
    case "browser":
    case "web_speech":
    case "webspeech":
      return "browser";
    case "none":
    case "off":
    case "disabled":
      return "none";
    default:
      return "browser";
  }
}

export function getVoiceLang(): string {
  return trimEnv(process.env.NEXT_PUBLIC_VOICE_LANG) || "en-US";
}

export function isBrowserSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    SpeechRecognition?: new () => EliteFlowSpeechRecognition;
    webkitSpeechRecognition?: new () => EliteFlowSpeechRecognition;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function isBrowserSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isVoiceSttReady(): boolean {
  const provider = getVoiceProviderId();
  if (provider === "none") return false;
  return isBrowserSpeechRecognitionSupported();
}

export function isVoiceTtsReady(): boolean {
  const provider = getVoiceProviderId();
  if (provider === "none") return false;
  return isBrowserSpeechSynthesisSupported();
}

type EliteFlowSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

function createRecognition(): EliteFlowSpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => EliteFlowSpeechRecognition;
    webkitSpeechRecognition?: new () => EliteFlowSpeechRecognition;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

/** Roman-Urdu / Hindi command markers (Latin script). */
const ROMAN_URDU_MARKERS =
  /\b(ko|bhej|bhejo|bhejdo|kar|karo|kardo|krdo|hai|hain|ki|ka|ke|se|mein|main|mujhe|hum|apka|apki|apke|shukriya|meharbani|kal|aaj|baje|tamam|sab|wali|wale|do|dijiye|please\s+bhej)\b/i;

/**
 * Detect Urdu vs English for spoken acknowledgements only.
 * Supports Arabic/Urdu script and common roman-Urdu command phrases.
 * Does NOT control generated email/document language (always English).
 */
export function detectVoiceDialogueLanguage(
  text: string,
): VoiceDialogueLanguage {
  const sample = text.trim();
  if (!sample) return "en";
  const urduChars = (sample.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latinChars = (sample.match(/[A-Za-z]/g) ?? []).length;
  if (urduChars > 0) {
    if (latinChars === 0) return "ur";
    return urduChars >= latinChars * 0.35 ? "ur" : "en";
  }
  if (ROMAN_URDU_MARKERS.test(sample)) return "ur";
  return "en";
}

export function voiceLangToBcp47(lang: VoiceDialogueLanguage): string {
  switch (lang) {
    case "ur":
      return "ur-PK";
    case "en":
      return "en-US";
    default: {
      const _exhaustive: never = lang;
      return _exhaustive;
    }
  }
}

const URDU_ACKNOWLEDGEMENTS = [
  "ٹھیک ہے، شکریہ۔ میں آپ کی درخواست پر کام شروع کرتا ہوں۔",
  "جی، میں نے آپ کی بات سمجھ لی ہے۔",
] as const;

const ENGLISH_ACKNOWLEDGEMENTS = [
  "Thank you. I understand your request.",
  "Got it. I'm working on it.",
] as const;

function pickOne<T extends string>(items: readonly T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? items[0]!;
}

/** Short spoken acknowledgement only — never used as email/document body. */
export function buildVoiceAcknowledgement(
  lang: VoiceDialogueLanguage,
): string {
  return lang === "ur"
    ? pickOne(URDU_ACKNOWLEDGEMENTS)
    : pickOne(ENGLISH_ACKNOWLEDGEMENTS);
}

/**
 * Optional UI status after a task (display only). Prefer not speaking this —
 * voice turns use a single acknowledgement.
 */
export function buildVoiceCompletionMessage(
  lang: VoiceDialogueLanguage,
  options?: { hint?: "email" | "generic" },
): string {
  if (options?.hint === "email") {
    return lang === "ur"
      ? "ای میل تیار ہے۔ براہ کرم Confirm & Send پر کلک کریں۔"
      : "Your email is ready.";
  }
  return lang === "ur"
    ? "آپ کا کام مکمل ہو گیا ہے۔"
    : "The task has been completed.";
}

export type SpeechListenHandlers = {
  /** Live transcript while user is speaking (interim + finals). Do not process actions here. */
  onTranscript?: (text: string) => void;
  /** Fired once after silence (~1.5–2s) with the complete utterance. */
  onUtteranceComplete?: (text: string) => void;
  /** Listening ended with no audible speech after the wait window. */
  onNoSpeech?: () => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
};

export type SpeechListenOptions = {
  /** Silence after last speech activity before completing (ms). Default 1800. */
  silenceMs?: number;
  /** How long to wait for the user to start speaking (ms). Default 60000. */
  maxWaitForSpeechMs?: number;
  /** STT BCP-47 language. Default from NEXT_PUBLIC_VOICE_LANG. */
  lang?: string;
};

const DEFAULT_SILENCE_MS = 1800;
const DEFAULT_MAX_WAIT_FOR_SPEECH_MS = 60_000;

/**
 * Start browser STT with silence detection.
 * Does not speak. Stays silent and listening until the user finishes
 * (silence after speech) or the max wait elapses with no speech.
 * Restarts the engine when Chrome ends the session early.
 */
export function startBrowserSpeechRecognition(
  handlers: SpeechListenHandlers,
  options?: SpeechListenOptions,
): { stop: () => void; finish: () => void } | null {
  if (!isVoiceSttReady()) return null;
  if (!createRecognition()) return null;

  const silenceMs = options?.silenceMs ?? DEFAULT_SILENCE_MS;
  const maxWaitForSpeechMs =
    options?.maxWaitForSpeechMs ?? DEFAULT_MAX_WAIT_FOR_SPEECH_MS;
  const lang = options?.lang || getVoiceLang();

  let recognition: EliteFlowSpeechRecognition | null = null;
  let finalBuffer = "";
  let interimBuffer = "";
  let heardSpeech = false;
  let completed = false;
  let stopped = false;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  const clearSilenceTimer = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  const clearMaxWaitTimer = () => {
    if (maxWaitTimer) {
      clearTimeout(maxWaitTimer);
      maxWaitTimer = null;
    }
  };

  const clearRestartTimer = () => {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  const combinedTranscript = () =>
    [finalBuffer, interimBuffer].filter(Boolean).join(" ").trim();

  const detachRecognition = () => {
    if (!recognition) return;
    const rec = recognition;
    recognition = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.abort();
    } catch {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    }
  };

  const completeUtterance = () => {
    if (completed) return;
    completed = true;
    stopped = true;
    clearSilenceTimer();
    clearMaxWaitTimer();
    clearRestartTimer();
    const text = combinedTranscript();
    detachRecognition();
    if (!text) {
      handlers.onNoSpeech?.();
    } else {
      handlers.onUtteranceComplete?.(text);
    }
    handlers.onEnd?.();
  };

  const scheduleSilenceComplete = () => {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      completeUtterance();
    }, silenceMs);
  };

  const scheduleRestart = () => {
    clearRestartTimer();
    if (completed || stopped) return;
    // Brief delay avoids InvalidStateError when restarting immediately after onend.
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (completed || stopped) return;
      beginRecognition();
    }, 120);
  };

  const beginRecognition = () => {
    if (completed || stopped) return;
    detachRecognition();
    const rec = createRecognition();
    if (!rec) {
      if (!heardSpeech) {
        completeUtterance();
      }
      return;
    }

    recognition = rec;
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        const piece = result[0]?.transcript ?? "";
        if (!piece.trim()) continue;
        heardSpeech = true;
        clearMaxWaitTimer();
        if (result.isFinal) {
          finalBuffer = `${finalBuffer} ${piece}`.replace(/\s+/g, " ").trim();
          interimBuffer = "";
        } else {
          interim += piece;
        }
      }
      if (interim) {
        interimBuffer = interim.trim();
      }
      const live = combinedTranscript();
      if (live) {
        handlers.onTranscript?.(live);
        scheduleSilenceComplete();
      }
    };

    rec.onerror = (event) => {
      const code = event.error;
      if (code === "aborted") return;
      // Chrome often emits no-speech before the user starts — keep listening.
      if (code === "no-speech") return;
      if (code === "network") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        completed = true;
        stopped = true;
        clearSilenceTimer();
        clearMaxWaitTimer();
        clearRestartTimer();
        detachRecognition();
        handlers.onError?.(
          "Microphone permission denied. Allow microphone access in the browser.",
        );
        handlers.onEnd?.();
        return;
      }
      // Soft-fail other codes if we can keep going; hard-fail only with no transcript.
      if (!heardSpeech && !combinedTranscript()) {
        completed = true;
        stopped = true;
        clearSilenceTimer();
        clearMaxWaitTimer();
        clearRestartTimer();
        detachRecognition();
        handlers.onError?.(`Speech recognition error: ${code}`);
        handlers.onEnd?.();
      }
    };

    rec.onend = () => {
      if (completed || stopped) return;
      // Engine stopped early — restart until silence completes or max wait.
      scheduleRestart();
    };

    try {
      rec.start();
    } catch (error) {
      // InvalidStateError if already started; otherwise report once.
      if (!heardSpeech) {
        handlers.onError?.(
          error instanceof Error
            ? error.message
            : "Could not start speech recognition",
        );
        completed = true;
        stopped = true;
        clearSilenceTimer();
        clearMaxWaitTimer();
        clearRestartTimer();
        handlers.onEnd?.();
      }
    }
  };

  maxWaitTimer = setTimeout(() => {
    if (!heardSpeech && !completed) {
      completeUtterance();
    }
  }, maxWaitForSpeechMs);

  beginRecognition();

  return {
    stop: () => {
      stopped = true;
      completed = true;
      clearSilenceTimer();
      clearMaxWaitTimer();
      clearRestartTimer();
      detachRecognition();
      handlers.onEnd?.();
    },
    finish: () => {
      completeUtterance();
    },
  };
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function stopBrowserSpeechSynthesis(): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

/** Speak text via browser TTS. Returns promise that resolves when done or cancelled. */
export function speakBrowserText(
  text: string,
  options?: {
    lang?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (msg: string) => void;
  },
): Promise<void> {
  if (!isVoiceTtsReady() || !text.trim()) {
    return Promise.resolve();
  }

  stopBrowserSpeechSynthesis();

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = options?.lang || getVoiceLang();
    currentUtterance = utterance;

    utterance.onstart = () => {
      options?.onStart?.();
    };
    utterance.onend = () => {
      if (currentUtterance === utterance) currentUtterance = null;
      options?.onEnd?.();
      resolve();
    };
    utterance.onerror = (event) => {
      if (currentUtterance === utterance) currentUtterance = null;
      if (event.error !== "canceled" && event.error !== "interrupted") {
        options?.onError?.(`Speech synthesis error: ${event.error}`);
      }
      options?.onEnd?.();
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
}
