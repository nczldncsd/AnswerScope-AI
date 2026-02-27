"use client";

import { Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const THEME_KEY = "answerscope-theme";

type ThemeMode = "light" | "dark";

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
  window.localStorage.setItem(THEME_KEY, mode);
}

export function ThemeController() {
  return (
    <div className="fixed bottom-4 right-4 z-[40]">
      <Button
        type="button"
        variant="ghost"
        className="glass-card !rounded-full !border-white/30 !bg-bg-surface/70 px-3 [&>span]:items-center"
        onClick={() => {
          const current = document.documentElement.getAttribute("data-theme");
          const next: ThemeMode = current === "light" ? "dark" : "light";
          applyTheme(next);
        }}
      >
        <Sun className="size-4" />
        <span>Theme</span>
      </Button>
    </div>
  );
}
