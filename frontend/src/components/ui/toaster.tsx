"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "glass-card border border-white/20 text-text-primary",
          title: "font-medium",
          description: "text-text-secondary",
        },
      }}
    />
  );
}
