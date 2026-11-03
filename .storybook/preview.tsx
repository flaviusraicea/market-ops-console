import type { Preview } from "@storybook/nextjs-vite";

import "../src/app/globals.css";
import { preloadAnswerCard } from "../src/features/assistant/AnswerCardLazy";
import { withProviders } from "./decorators";

// next/font variables do not exist in Storybook, so the fallback stacks from
// docs/design-system.md section 1 are set on :root here.
if (typeof document !== "undefined") {
  const root = document.documentElement;
  root.style.setProperty("--font-display", 'Georgia, "Times New Roman", serif');
  root.style.setProperty("--font-ui", 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif');
}

function setAttr(name: string, value: string | null) {
  const root = document.documentElement;
  if (value === null) root.removeAttribute(name);
  else root.setAttribute(name, value);
}

const withGlobalsToRoot: NonNullable<Preview["decorators"]>[number] = (Story, context) => {
  const { theme, density, reducedMotion } = context.globals as {
    theme: string;
    density: string;
    reducedMotion: string;
  };
  // Apply synchronously for the first render as well, so the a11y run sees the right tokens.
  if (typeof document !== "undefined") {
    setAttr("data-theme", theme === "dark" ? "dark" : null);
    setAttr("data-density", density === "analyst" ? "analyst" : null);
    setAttr("data-reduced-motion", reducedMotion === "on" ? "true" : null);
  }
  return <Story />;
};

const preview: Preview = {
  // The answer card loads on first use in the app; stories that render answers expect it at once.
  loaders: [() => preloadAnswerCard()],
  decorators: [withGlobalsToRoot, withProviders],
  parameters: {
    a11y: { test: "error" },
    backgrounds: { disabled: true },
    layout: "fullscreen",
  },
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: "Density",
      toolbar: {
        title: "Density",
        icon: "grow",
        items: [
          { value: "overview", title: "Overview" },
          { value: "analyst", title: "Analyst" },
        ],
        dynamicTitle: true,
      },
    },
    reducedMotion: {
      description: "Reduced motion",
      toolbar: {
        title: "Motion",
        icon: "play",
        items: [
          { value: "off", title: "Motion on" },
          { value: "on", title: "Reduced motion" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: import.meta.env["SB_THEME"] ?? "light",
    density: "overview",
    reducedMotion: "off",
  },
};

export default preview;
