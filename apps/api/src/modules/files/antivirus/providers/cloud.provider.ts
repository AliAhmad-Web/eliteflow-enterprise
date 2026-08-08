import type {
  AntivirusProvider,
  AntivirusScanInput,
  AntivirusScanResult,
} from "../antivirus.types.js";

export class CloudAvUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudAvUnavailableError";
  }
}

export class CloudAvTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudAvTimeoutError";
  }
}

interface CloudScanResponse {
  clean?: boolean;
  infected?: boolean;
  threatName?: string;
  threat?: string;
  status?: string;
}

/**
 * Generic HTTP cloud AV adapter.
 * POSTs raw file bytes to VIRUS_SCAN_CLOUD_URL.
 * Expected JSON: { clean: boolean, threatName?: string }
 */
export class CloudAntivirusProvider implements AntivirusProvider {
  readonly id = "cloud" as const;

  constructor(
    private readonly url: string,
    private readonly apiKey: string | null,
    private readonly timeoutMs: number,
  ) {}

  async scan(input: AntivirusScanInput): Promise<AntivirusScanResult> {
    const scannedAt = new Date().toISOString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/octet-stream",
        "X-Filename": encodeURIComponent(input.originalName),
        "X-Content-Type": input.mimeType,
      };
      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.url, {
        method: "POST",
        headers,
        body: new Uint8Array(input.buffer),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new CloudAvUnavailableError(
          `Cloud AV HTTP ${response.status}`,
        );
      }

      const payload = (await response.json()) as CloudScanResponse;
      const infected =
        payload.infected === true ||
        payload.clean === false ||
        payload.status?.toLowerCase() === "infected";

      if (infected) {
        return {
          clean: false,
          engine: this.id,
          scannedAt,
          status: "infected",
          threatName:
            payload.threatName?.trim() ||
            payload.threat?.trim() ||
            "unknown",
        };
      }

      return {
        clean: true,
        engine: this.id,
        scannedAt,
        status: "clean",
      };
    } catch (error) {
      if (error instanceof CloudAvUnavailableError) throw error;
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.message.includes("aborted"))
      ) {
        throw new CloudAvTimeoutError(
          `Cloud AV scan timed out after ${this.timeoutMs}ms`,
        );
      }
      throw new CloudAvUnavailableError(
        error instanceof Error ? error.message : "Cloud AV unavailable",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
