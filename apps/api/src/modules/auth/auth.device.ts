import { UAParser } from "ua-parser-js";

export interface DeviceInfo {
  deviceName: string;
  browser: string;
  os: string;
  deviceType: string;
  userAgent: string;
}

export function parseDeviceInfo(userAgent: string): DeviceInfo {
  const ua = userAgent?.trim() || "unknown";

  if (ua === "unknown" || !ua) {
    return {
      deviceName: "Unknown Device",
      browser: "Unknown Browser",
      os: "Unknown OS",
      deviceType: "unknown",
      userAgent: ua || "unknown",
    };
  }

  const parser = new UAParser(ua);
  const result = parser.getResult();

  const browserName = result.browser.name ?? "Browser";
  const browserMajor = result.browser.major ?? result.browser.version?.split(".")[0];
  const browser = browserMajor ? `${browserName} ${browserMajor}` : browserName;

  const osName = result.os.name ?? "Unknown OS";
  const osVersion = result.os.version ?? "";
  const os = osVersion ? `${osName} ${osVersion}` : osName;

  const deviceType = resolveDeviceType(result.device.type);
  const deviceModel = result.device.model;
  const deviceVendor = result.device.vendor;

  const friendlyDevice =
    deviceModel || deviceVendor
      ? [deviceVendor, deviceModel].filter(Boolean).join(" ")
      : null;

  const deviceName =
    friendlyDevice ?? `${browserName} on ${result.os.name ?? "Unknown OS"}`;

  return {
    deviceName: deviceName.slice(0, 200),
    browser: browser.slice(0, 100),
    os: os.slice(0, 100),
    deviceType,
    userAgent: ua.slice(0, 1024),
  };
}

function resolveDeviceType(type?: string): string {
  switch (type) {
    case "mobile":
      return "mobile";
    case "tablet":
      return "tablet";
    case "smarttv":
      return "smarttv";
    case "wearable":
      return "wearable";
    case "console":
      return "console";
    default:
      return "desktop";
  }
}

/** Backward-compatible friendly name used at session creation. */
export function parseDeviceName(userAgent: string): string {
  return parseDeviceInfo(userAgent).deviceName;
}
