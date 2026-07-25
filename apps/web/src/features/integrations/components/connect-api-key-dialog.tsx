"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { apiKeySecretHint } from "../lib/api-key-providers";

export function ConnectApiKeyDialog({
  open,
  slug,
  name,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  slug: string;
  name: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (secret: string) => void;
}) {
  const [secret, setSecret] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {name}</DialogTitle>
          <DialogDescription>{apiKeySecretHint(slug)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="integration-api-secret">API credential</Label>
          <Input
            id="integration-api-secret"
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={
              slug === "supabase"
                ? "Leave empty to verify env stack, or url|service_role_key"
                : "Paste secret — never stored in plaintext"
            }
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={slug !== "supabase" && secret.trim().length < 8}
            onClick={() => onSubmit(secret.trim())}
          >
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
