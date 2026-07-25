import type { Metadata } from "next";
import { Suspense } from "react";

import { ChatThreadSkeleton } from "@/features/communication/components/communication-skeletons";
import { MessagesPageContent } from "@/features/communication/components/messages-page-content";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="-mx-3 -mt-4 h-[calc(100dvh-4.25rem)] overflow-hidden rounded-none border border-border/50 bg-card sm:-mx-4 sm:-mt-6 sm:rounded-xl lg:-mx-8 lg:-mt-8">
          <ChatThreadSkeleton />
        </div>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}
