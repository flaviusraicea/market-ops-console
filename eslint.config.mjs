import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import storybook from "eslint-plugin-storybook";

// Layer boundaries (docs/architecture.md section 2), enforced with no-restricted-imports.
// Each layer gets an allow-list: any import that is not allowed matches the negative-lookahead regex.
const LAYERS = ["domain", "lib", "components", "features", "app", "data"];

function boundaryRule({ layer, aliases, packages }) {
  const aliasAlt = aliases.join("|");
  const pkgAlt = packages.join("|");
  const allowed = [
    String.raw`\.{1,2}/`,
    String.raw`\.$`,
    `(?:${pkgAlt})(?:/|$)`,
    `@/(?:${aliasAlt})(?:/|$)`,
  ].join("|");
  const message = `${layer}/ may import only: ${[...aliases.map((a) => `@/${a}`), ...packages].join(", ")}.`;
  return [
    "error",
    {
      patterns: [
        { regex: `^(?!${allowed}).+`, message },
        {
          // Relative imports must not climb into another layer; use the @/ alias so the rule above applies.
          regex: String.raw`^(?:\.\./)+(?:${LAYERS.join("|")})(?:/|$)`,
          message: "Import across layers with the @/ alias so the boundary rule can check it.",
        },
        {
          regex: String.raw`^(?:\.\./){4,}`,
          message: "Relative imports may not leave their layer.",
        },
      ],
    },
  ];
}

const componentPackages = [
  "react",
  "react-dom",
  "lucide-react",
  "radix-ui",
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
  "react-hook-form",
  "@visx",
  "d3-[a-z-]+",
  "topojson-client",
  "geojson",
  "@types/geojson",
];

const layerConfigs = [
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": boundaryRule({
        layer: "domain",
        aliases: ["domain"],
        packages: ["zod"],
      }),
    },
  },
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": boundaryRule({
        layer: "lib",
        aliases: ["domain", "lib", "data"],
        packages: ["react", "nuqs", "next", "web-vitals"],
      }),
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": boundaryRule({
        layer: "components",
        aliases: ["lib", "components"],
        packages: componentPackages,
      }),
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": boundaryRule({
        layer: "features",
        aliases: ["domain", "lib", "components", "features"],
        packages: ["react", "react-dom", "next", "@tanstack/react-query", "react-hook-form"],
      }),
    },
  },
];

const storyExtras = ["storybook", "@storybook", "@tanstack/react-query", "nuqs/adapters/testing"];

// Stories follow the rules of the folder they sit in, plus the story tooling and the dataset.
const storyConfigs = [
  ["components", ["lib", "components", "data"], componentPackages],
  ["features", ["domain", "lib", "components", "features", "data"], ["react", "react-dom", "next"]],
].map(([layer, aliases, packages]) => ({
  files: [`src/${layer}/**/*.stories.{ts,tsx}`],
  rules: {
    "no-restricted-imports": boundaryRule({
      layer: `${layer} stories`,
      aliases,
      packages: [...packages, ...storyExtras],
    }),
  },
}));

// Formatting lives in src/lib/format.ts; safe rendering means no raw HTML injection (docs/README.md, Testing).
const FORMAT_MESSAGE = "Format numbers, money, percentages and dates through src/lib/format.ts.";
const NO_HTML = {
  selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
  message: "Only app/layout.tsx may inject HTML (theme script).",
};
const NO_TO_FIXED = {
  selector: "CallExpression[callee.property.name='toFixed']",
  message: FORMAT_MESSAGE,
};
const NO_INTL_OR_LOCALE = [
  "CallExpression[callee.property.name='toLocaleString']",
  "CallExpression[callee.property.name='toLocaleDateString']",
  "MemberExpression[object.name='Intl']",
].map((selector) => ({ selector, message: FORMAT_MESSAGE }));

/** Files allowed to inject HTML. Keep this to one file; tests/unit/boundaries.test.ts pins it. */
const HTML_INJECTION_ALLOWED = ["src/app/layout.tsx"];
const FORMAT_HOME = "src/lib/format.ts";
/** SVG path coordinates only: rounding geometry, never text a user reads. */
const SVG_ROUNDING_ALLOWED = [
  "src/components/charts/Sparkline.tsx",
  "src/components/charts/RadarChart.tsx",
];

export const htmlInjectionAllowed = HTML_INJECTION_ALLOWED;

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...storybook.configs["flat/recommended"],
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  ...layerConfigs,
  ...storyConfigs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [FORMAT_HOME, ...HTML_INJECTION_ALLOWED, ...SVG_ROUNDING_ALLOWED],
    rules: { "no-restricted-syntax": ["error", NO_HTML, NO_TO_FIXED, ...NO_INTL_OR_LOCALE] },
  },
  {
    files: HTML_INJECTION_ALLOWED,
    rules: { "no-restricted-syntax": ["error", NO_TO_FIXED, ...NO_INTL_OR_LOCALE] },
  },
  {
    files: [FORMAT_HOME],
    rules: { "no-restricted-syntax": ["error", NO_HTML] },
  },
  {
    files: SVG_ROUNDING_ALLOWED,
    rules: { "no-restricted-syntax": ["error", NO_HTML, ...NO_INTL_OR_LOCALE] },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "storybook-static/**",
    "playwright-report/**",
    "test-results/**",
    "tests/fixtures/**",
    "!.storybook",
  ]),
]);

export default eslintConfig;
