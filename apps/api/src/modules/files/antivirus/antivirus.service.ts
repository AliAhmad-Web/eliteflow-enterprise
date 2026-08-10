import { FILES_ERROR_CODES, FilesError } from "../files.errors.js";
import { getAntivirusConfig } from "./antivirus.config.js";
import type {
  AntivirusProvider,
  AntivirusProviderId,
  AntivirusRuntimeConfig,
  AntivirusScanInput,
  AntivirusScanResult,
} from "./antivirus.types.js";
import {
  ClamAvAntivirusProvider,
  ClamAvTimeoutError,
  ClamAvUnavailableError,
} from "./providers/clamav.provider.js";
import {
  CloudAntivirusProvider,
  CloudAvTimeoutError,
  CloudAvUnavailableError,
} from "./providers/cloud.provider.js";
import { NoopAntivirusProvider } from "./providers/noop.provider.js";

function createProvider(
  config: AntivirusRuntimeConfig,
  override?: AntivirusProvider,
): AntivirusProvider {
  if (override) return override;

  if (!config.enabled || config.provider === "noop") {
    return new NoopAntivirusProvider();
  }

  switch (config.provider) {
    case "clamav":
      return new ClamAvAntivirusProvider(
        config.clamavHost,
        config.clamavPort,
        config.timeoutMs,
      );
    case "cloud": {
      if (!config.cloudUrl) {
        throw new FilesError(
          "Cloud antivirus is enabled but VIRUS_SCAN_CLOUD_URL is not configured",
          503,
          FILES_ERROR_CODES.VIRUS_UNAVAILABLE,
        );
      }
      return new CloudAntivirusProvider(
        config.cloudUrl,
        config.cloudApiKey,
        config.timeoutMs,
      );
    }
    default: {
      const _exhaustive: never = config.provider;
      return _exhaustive;
    }
  }
}

export class AntivirusService {
  private readonly config: AntivirusRuntimeConfig;
  private readonly provider: AntivirusProvider;

  constructor(options?: {
    config?: AntivirusRuntimeConfig;
    provider?: AntivirusProvider;
  }) {
    this.config = options?.config ?? getAntivirusConfig();
    this.provider = createProvider(this.config, options?.provider);

    if (
      this.config.enabled &&
      this.provider.id === "noop" &&
      !options?.provider
    ) {
      console.warn(
        "[antivirus] Scanning is enabled but provider is noop — uploads are not scanned. Set VIRUS_SCAN_PROVIDER=clamav|cloud for production.",
      );
    }
  }

  get engine(): AntivirusProviderId {
    return this.provider.id;
  }

  /**
   * Scan upload bytes. Fail-closed when scanning is enabled and the engine
   * is unreachable / times out (unless VIRUS_SCAN_FAIL_CLOSED=false).
   */
  async scan(input: AntivirusScanInput): Promise<AntivirusScanResult> {
    if (!this.config.enabled) {
      return {
        clean: true,
        engine: "noop",
        scannedAt: new Date().toISOString(),
        status: "skipped",
        detail:
          "Antivirus scanning disabled — file NOT verified clean (unscanned)",
      };
    }

    try {
      const result = await this.provider.scan(input);
      if (!result.clean || result.status === "infected") {
        throw new FilesError(
          result.threatName
            ? `File failed virus scan (${result.threatName})`
            : "File failed virus scan",
          400,
          FILES_ERROR_CODES.VIRUS_INFECTED,
        );
      }
      return result;
    } catch (error) {
      if (error instanceof FilesError) throw error;

      const timedOut =
        error instanceof ClamAvTimeoutError ||
        error instanceof CloudAvTimeoutError;
      const unavailable =
        timedOut ||
        error instanceof ClamAvUnavailableError ||
        error instanceof CloudAvUnavailableError;

      if (unavailable) {
        const detail =
          error instanceof Error ? error.message : "Antivirus unavailable";

        if (!this.config.failClosed) {
          console.warn(
            `[antivirus] Scanner issue with fail-closed disabled — allowing upload: ${detail}`,
          );
          return {
            clean: true,
            engine: this.provider.id,
            scannedAt: new Date().toISOString(),
            status: timedOut ? "timeout" : "unavailable",
            detail,
          };
        }

        throw new FilesError(
          timedOut
            ? "Antivirus scanner timed out; upload rejected"
            : "Antivirus scanner unavailable; upload rejected",
          503,
          FILES_ERROR_CODES.VIRUS_UNAVAILABLE,
        );
      }

      // Unknown provider errors — fail closed when enabled.
      if (this.config.failClosed) {
        throw new FilesError(
          "Antivirus scanner unavailable; upload rejected",
          503,
          FILES_ERROR_CODES.VIRUS_UNAVAILABLE,
        );
      }

      console.warn(
        `[antivirus] Unexpected scanner error with fail-closed disabled:`,
        error,
      );
      return {
        clean: true,
        engine: this.provider.id,
        scannedAt: new Date().toISOString(),
        status: "unavailable",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

let defaultService: AntivirusService | null = null;

export function getAntivirusService(): AntivirusService {
  if (!defaultService) {
    defaultService = new AntivirusService();
  }
  return defaultService;
}

/** Test helper — replace the process-wide service instance. */
export function setAntivirusServiceForTests(service: AntivirusService | null): void {
  defaultService = service;
}

/**
 * Upload-pipeline entrypoint (replaces the former storage.provider stub).
 * Preserves the previous call shape used by FilesService.
 */
export async function runVirusScanHook(
  input: AntivirusScanInput,
): Promise<AntivirusScanResult> {
  return getAntivirusService().scan(input);
}
