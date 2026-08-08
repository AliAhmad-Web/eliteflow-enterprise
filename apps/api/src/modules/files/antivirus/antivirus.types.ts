export type AntivirusProviderId = "noop" | "clamav" | "cloud";

export type AntivirusScanStatus =
  | "clean"
  | "infected"
  | "unavailable"
  | "timeout"
  | "skipped";

export interface AntivirusScanInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface AntivirusScanResult {
  clean: boolean;
  engine: AntivirusProviderId;
  scannedAt: string;
  status: AntivirusScanStatus;
  threatName?: string;
  detail?: string;
}

/** @deprecated Prefer AntivirusProviderId — kept for existing call sites. */
export type VirusScanEngine = AntivirusProviderId;

/** @deprecated Prefer AntivirusScanResult */
export type VirusScanResult = AntivirusScanResult;

export interface AntivirusProvider {
  readonly id: AntivirusProviderId;
  scan(input: AntivirusScanInput): Promise<AntivirusScanResult>;
}

export interface AntivirusRuntimeConfig {
  enabled: boolean;
  provider: AntivirusProviderId;
  timeoutMs: number;
  failClosed: boolean;
  clamavHost: string;
  clamavPort: number;
  cloudUrl: string | null;
  cloudApiKey: string | null;
}
