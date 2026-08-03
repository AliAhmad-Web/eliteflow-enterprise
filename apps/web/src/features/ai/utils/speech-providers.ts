/**
 * Voice provider config (client). Env-only — never hardcode secrets.
 * NEXT_PUBLIC_VOICE_PROVIDER: browser | web_speech | none
 * NEXT_PUBLIC_VOICE_LANG: BCP-47 language (default en-US)
 * NEXT_PUBLIC_VOICE_API_KEY: reserved for future cloud STT (not required for browser)
 */

export type VoiceProviderId = "browser" | "web_speech" | "none";

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

export type SpeechListenHandlers = {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
};

/** Start browser STT. Returns stop function. */
export function startBrowserSpeechRecognition(
  handlers: SpeechListenHandlers,
): { stop: () => void } | null {
  if (!isVoiceSttReady()) return null;
  const recognition = createRecognition();
  if (!recognition) return null;

  recognition.lang = getVoiceLang();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalBuffer = "";

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result) continue;
      const piece = result[0]?.transcript ?? "";
      if (result.isFinal) {
        finalBuffer = `${finalBuffer}${piece}`.trim();
        handlers.onFinal?.(finalBuffer);
      } else {
        interim += piece;
      }
    }
    if (interim) {
      handlers.onInterim?.(
        finalBuffer ? `${finalBuffer} ${interim}`.trim() : interim.trim(),
      );
    }
  };

  recognition.onerror = (event) => {
    const code = event.error;
    if (code === "aborted" || code === "no-speech") {
      handlers.onEnd?.();
      return;
    }
    if (code === "not-allowed" || code === "service-not-allowed") {
      handlers.onError?.(
        "Microphone permission denied. Allow microphone access in the browser.",
      );
    } else {
      handlers.onError?.(`Speech recognition error: ${code}`);
    }
    handlers.onEnd?.();
  };

  recognition.onend = () => {
    handlers.onEnd?.();
  };

  try {
    recognition.start();
  } catch (error) {
    handlers.onError?.(
      error instanceof Error ? error.message : "Could not start speech recognition",
    );
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          // ignore
        }
      }
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
  options?: { onStart?: () => void; onEnd?: () => void; onError?: (msg: string) => void },
): Promise<void> {
  if (!isVoiceTtsReady() || !text.trim()) {
    return Promise.resolve();
  }

  stopBrowserSpeechSynthesis();

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = getVoiceLang();
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
