import type {
  AntivirusProvider,
  AntivirusScanInput,
  AntivirusScanResult,
} from "../antivirus.types.js";

/** Development / explicitly disabled path — never reports infection. */
export class NoopAntivirusProvider implements AntivirusProvider {
  readonly id = "noop" as const;

  async scan(_input: AntivirusScanInput): Promise<AntivirusScanResult> {
    return {
      clean: true,
      engine: this.id,
      scannedAt: new Date().toISOString(),
      status: "skipped",
      detail: "Antivirus scanning disabled (noop provider)",
    };
  }
}
