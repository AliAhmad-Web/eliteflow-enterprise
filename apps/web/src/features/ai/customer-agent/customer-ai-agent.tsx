"use client";

import { useState } from "react";

import { CustomerAiDrawer } from "./customer-ai-drawer";
import { CustomerAiFab } from "./customer-ai-fab";
import { useCustomerAiChatVisible } from "./use-customer-ai-access";

export function CustomerAiAgentHost() {
  const visible = useCustomerAiChatVisible();
  const [open, setOpen] = useState(false);

  if (!visible) return null;

  return (
    <>
      <CustomerAiFab open={open} onClick={() => setOpen((current) => !current)} />
      <CustomerAiDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
