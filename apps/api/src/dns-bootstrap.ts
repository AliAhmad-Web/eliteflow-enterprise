import dns from "node:dns";
import { promisify } from "node:util";

/**
 * Prefer public resolvers — some local routers fail to resolve public hosts
 * (ENOTFOUND for *.supabase.co, api.resend.com, etc.).
 *
 * `dns.setServers()` only affects `dns.resolve*`. Node `fetch` / undici use
 * `dns.lookup()` (OS getaddrinfo), so we also wrap lookup to resolve via
 * those public servers first.
 *
 * This module must be imported before any network clients load.
 */
dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const originalLookup = dns.lookup.bind(dns);

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number,
) => void;

function patchedLookup(
  hostname: string,
  options: dns.LookupOneOptions | dns.LookupAllOptions | dns.LookupOptions | number | LookupCallback,
  callback?: LookupCallback,
): void {
  let opts: dns.LookupOptions = {};
  let cb: LookupCallback | undefined;

  if (typeof options === "function") {
    cb = options;
  } else if (typeof options === "number") {
    opts = { family: options };
    cb = callback;
  } else {
    opts = options ?? {};
    cb = callback;
  }

  if (!cb) {
    return;
  }

  const family = opts.family;
  const all = Boolean(opts.all);

  void (async () => {
    try {
      if (family === 6) {
        const addresses = await resolve6(hostname);
        if (addresses.length === 0) {
          throw Object.assign(new Error(`queryAaaa ENODATA ${hostname}`), {
            code: "ENODATA",
          });
        }

        if (all) {
          cb(
            null,
            addresses.map((address) => ({ address, family: 6 as const })),
          );
          return;
        }

        cb(null, addresses[0]!, 6);
        return;
      }

      const addresses = await resolve4(hostname);
      if (addresses.length === 0) {
        throw Object.assign(new Error(`queryA ENODATA ${hostname}`), {
          code: "ENODATA",
        });
      }

      if (all) {
        cb(
          null,
          addresses.map((address) => ({ address, family: 4 as const })),
        );
        return;
      }

      cb(null, addresses[0]!, 4);
    } catch {
      originalLookup(hostname, opts as dns.LookupOptions, cb as never);
    }
  })();
}

dns.lookup = patchedLookup as typeof dns.lookup;
