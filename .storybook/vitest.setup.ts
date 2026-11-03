import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { setProjectAnnotations } from "@storybook/nextjs-vite";

import * as previewAnnotations from "./preview";

setProjectAnnotations([a11yAddonAnnotations, previewAnnotations]);

// Enter animations start at opacity 0, which `toBeVisible` reads as hidden. Stories assert structure and state;
// the motion itself is checked in the e2e suite (reduced-motion and trace specs), so tests run without it.
const still = document.createElement("style");
still.textContent =
  "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}";
document.head.append(still);
