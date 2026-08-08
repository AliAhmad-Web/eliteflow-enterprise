import { connect, type Socket } from "node:net";

import type {
  AntivirusProvider,
  AntivirusScanInput,
  AntivirusScanResult,
} from "../antivirus.types.js";

export class ClamAvUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClamAvUnavailableError";
  }
}

export class ClamAvTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClamAvTimeoutError";
  }
}

/**
 * ClamAV clamd INSTREAM client (TCP).
 * Does not require a native addon — talks the clamd protocol directly.
 */
export class ClamAvAntivirusProvider implements AntivirusProvider {
  readonly id = "clamav" as const;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly timeoutMs: number,
  ) {}

  async scan(input: AntivirusScanInput): Promise<AntivirusScanResult> {
    const scannedAt = new Date().toISOString();
    const response = await this.instream(input.buffer);
    const normalized = response.trim();

    if (/OK$/i.test(normalized) || /:\s*OK/i.test(normalized)) {
      return {
        clean: true,
        engine: this.id,
        scannedAt,
        status: "clean",
      };
    }

    const found = normalized.match(/:\s*(.+?)\s*FOUND/i);
    if (found) {
      return {
        clean: false,
        engine: this.id,
        scannedAt,
        status: "infected",
        threatName: found[1]?.trim() || "unknown",
        detail: normalized,
      };
    }

    if (/ERROR/i.test(normalized)) {
      throw new ClamAvUnavailableError(`ClamAV error: ${normalized}`);
    }

    throw new ClamAvUnavailableError(
      `Unexpected ClamAV response: ${normalized || "(empty)"}`,
    );
  }

  private instream(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      let socket: Socket | null = null;
      let settled = false;
      const chunks: Buffer[] = [];

      const finish = (error?: Error, value?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket?.destroy();
        if (error) reject(error);
        else resolve(value ?? "");
      };

      const timer = setTimeout(() => {
        finish(
          new ClamAvTimeoutError(
            `ClamAV scan timed out after ${this.timeoutMs}ms`,
          ),
        );
      }, this.timeoutMs);

      try {
        socket = connect({ host: this.host, port: this.port });
      } catch (error) {
        finish(
          new ClamAvUnavailableError(
            error instanceof Error ? error.message : "ClamAV connect failed",
          ),
        );
        return;
      }

      socket.setTimeout(this.timeoutMs);

      socket.on("connect", () => {
        try {
          // zINSTREAM null-terminated command
          socket!.write(Buffer.from("zINSTREAM\0"));

          const chunkSize = 64 * 1024;
          for (let offset = 0; offset < buffer.length; offset += chunkSize) {
            const slice = buffer.subarray(
              offset,
              Math.min(offset + chunkSize, buffer.length),
            );
            const header = Buffer.alloc(4);
            header.writeUInt32BE(slice.length, 0);
            socket!.write(header);
            socket!.write(slice);
          }

          // Zero-length chunk terminates the stream
          const end = Buffer.alloc(4);
          end.writeUInt32BE(0, 0);
          socket!.write(end);
        } catch (error) {
          finish(
            new ClamAvUnavailableError(
              error instanceof Error ? error.message : "ClamAV write failed",
            ),
          );
        }
      });

      socket.on("data", (data) => {
        chunks.push(Buffer.from(data));
      });

      socket.on("end", () => {
        finish(undefined, Buffer.concat(chunks).toString("utf8"));
      });

      socket.on("timeout", () => {
        finish(
          new ClamAvTimeoutError(
            `ClamAV socket timed out after ${this.timeoutMs}ms`,
          ),
        );
      });

      socket.on("error", (error) => {
        finish(
          new ClamAvUnavailableError(
            `ClamAV unavailable: ${error.message}`,
          ),
        );
      });
    });
  }
}
