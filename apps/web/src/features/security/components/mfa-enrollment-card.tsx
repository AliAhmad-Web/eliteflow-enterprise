"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/features/auth/services/auth.service";
import { getApiErrorMessage } from "@/services/api/api-error";

type SetupPayload = {
  secret: string;
  qrCodeDataUrl: string;
  recoveryCodes: string[];
};

export function MfaEnrollmentCard() {
  const [status, setStatus] = useState<{
    enabled: boolean;
    enrollmentRequired: boolean;
    canEnroll: boolean;
    recoveryCodesRemaining?: number;
  } | null>(null);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshStatus = async () => {
    const next = await authService.mfaStatus();
    setStatus(next);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const next = await authService.mfaStatus();
        if (!cancelled) {
          setStatus(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Unable to load MFA status."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSetup = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (status && !status.canEnroll) {
        setError("MFA is not available for this account.");
        return;
      }
      const result = await authService.mfaSetup();
      setSetup({
        secret: result.secret,
        qrCodeDataUrl: result.qrCodeDataUrl,
        recoveryCodes: result.recoveryCodes,
      });
      setCode("");
      setMessage(
        "Scan the QR code, store your recovery codes securely, then enter an authenticator code to enable MFA.",
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to start MFA setup."));
    } finally {
      setLoading(false);
    }
  };

  const onEnable = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const result = await authService.mfaEnable(code.trim());
      setSetup(null);
      setCode("");
      setMessage(result.message);
      await refreshStatus();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to enable MFA."));
    } finally {
      setLoading(false);
    }
  };

  const onDisable = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const result = await authService.mfaDisable(disableCode.trim());
      setDisableCode("");
      setMessage(result.message);
      await refreshStatus();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to disable MFA."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          Authenticator MFA (TOTP)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {status?.enrollmentRequired ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-800 dark:text-amber-200">
            MFA enrollment is required for your admin role. You can continue
            signing in until policy enforcement is enabled.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-medium">
              {status?.enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Recovery codes left</p>
            <p className="font-medium">
              {status?.enabled
                ? (status.recoveryCodesRemaining ?? "—")
                : "—"}
            </p>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

        {setup ? (
          <div className="space-y-3 border-t border-border pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setup.qrCodeDataUrl}
              alt="MFA QR code"
              className="mx-auto h-44 w-44 rounded-md border border-border bg-white p-2"
            />
            <p className="break-all text-xs text-muted-foreground">
              Manual key: {setup.secret}
            </p>
            <div>
              <p className="mb-1 font-medium">Recovery codes (shown once)</p>
              <ul className="grid grid-cols-2 gap-1 font-mono text-xs">
                {setup.recoveryCodes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mfa-enable-code">Authenticator code</Label>
              <Input
                id="mfa-enable-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
            </div>
            <Button
              type="button"
              disabled={loading || code.length !== 6}
              onClick={() => void onEnable()}
            >
              Enable MFA
            </Button>
          </div>
        ) : null}

        {!status?.enabled && status?.canEnroll && !setup ? (
          <Button type="button" disabled={loading} onClick={() => void onSetup()}>
            Set up authenticator
          </Button>
        ) : null}

        {status?.enabled ? (
          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="mfa-disable-code">Code to disable MFA</Label>
            <Input
              id="mfa-disable-code"
              value={disableCode}
              onChange={(event) =>
                setDisableCode(
                  event.target.value.replace(/[^A-Za-z0-9-]/g, "").slice(0, 32),
                )
              }
              placeholder="Authenticator or recovery code"
            />
            <Button
              type="button"
              variant="destructive"
              disabled={loading || disableCode.trim().length < 6}
              onClick={() => void onDisable()}
            >
              Disable MFA
            </Button>
          </div>
        ) : null}

        {status && !status.canEnroll ? (
          <p className="text-muted-foreground">
            MFA enrollment is not available for client accounts.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
