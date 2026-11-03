import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { setProjectAnnotations } from "@storybook/nextjs-vite";

import * as previewAnnotations from "./preview";

setProjectAnnotations([a11yAddonAnnotations, previewAnnotations]);

// Enter animations start at opacity 0, which `toBeVisible` reads as hidden. Stories assert structure and state;
// the animations themselves are checked in the e2e suite (slice11.spec.ts, reduced motion), so tests run without them.
const still = document.createElement("style");
still.textContent = "*,*::before,*::after{animation:none!important}";
document.head.append(still);
