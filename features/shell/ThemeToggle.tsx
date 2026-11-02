"use client";

import { useTheme } from "@/lib/theme/useTheme";
import { ICON_STROKE, Moon, Sun } from "@/ui/icons";
import { Button } from "@/ui/primitives/button";

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const toDark = resolved === "light";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={toDark ? "Switch to dark theme" : "Switch to light theme"}
      onClick={() => setTheme(toDark ? "dark" : "light")}
    >
      {toDark ? (
        <Moon aria-hidden className="size-[18px]" strokeWidth={ICON_STROKE} />
      ) : (
        <Sun aria-hidden className="size-[18px]" strokeWidth={ICON_STROKE} />
      )}
    </Button>
  );
}
