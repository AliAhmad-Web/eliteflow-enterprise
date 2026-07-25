/**
 * Optional adapter for backend device registration.
 * Architecture stays the same: obtain Expo token → persist → register when API exists.
 *
 * When backend ships `POST /notifications/devices` (or equivalent),
 * set `pushDeviceRegistration.register = async (token) => apiRequest(...)`.
 * Mobile call sites already invoke `registerStoredTokenWithBackend()`.
 */
export type DeviceRegistrationPayload = {
  token: string;
  platform: "ios" | "android" | "web" | "unknown";
  appVersion?: string;
};

type RegisterFn = (payload: DeviceRegistrationPayload) => Promise<void>;

let registerImpl: RegisterFn | null = null;

export const pushDeviceRegistration = {
  /** Inject backend registration without changing push architecture. */
  setRegister(fn: RegisterFn | null) {
    registerImpl = fn;
  },

  isReady() {
    return typeof registerImpl === "function";
  },

  async register(payload: DeviceRegistrationPayload) {
    if (!registerImpl) {
      // Backend device registration not available yet — no-op.
      return { registered: false as const };
    }
    await registerImpl(payload);
    return { registered: true as const };
  },
};
