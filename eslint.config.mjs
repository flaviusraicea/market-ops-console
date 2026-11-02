import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import storybook from "eslint-plugin-storybook";

// Layer boundaries (docs/architecture.md section 2), enforced with no-restricted-imports.
// Each layer gets an allow-list: any import that is not allowed matches the negative-lookahead regex.
const LAYERS = ["domain", "lib", "ui", "features", "app", "data"];

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
          regex: String.raw`^(?:\.\./){3,}`,
          message: "Relative imports may not leave their layer.",
        },
      ],
    },
  ];
}

const uiPackages = [
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
    files: ["domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": boundaryRule({
        layer: "domain",
        aliases: ["domain"],
        packages: ["zod"],
      }),
    },
  },
  {
    files: ["lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": boundaryRule({
        layer: "lib",
        aliases: ["domain", "lib", "data"],
        packages: ["react", "nuqs", "next", "web-vitals"],
      }),
    },
  },
  {
    files: ["ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": boundaryRule({
        layer: "ui",
        aliases: ["lib", "ui"],
        packages: uiPackages,
      }),
    },
  },
  {
    files: ["features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": boundaryRule({
        layer: "features",
        aliases: ["domain", "lib", "ui", "features"],
        packages: ["react", "react-dom", "next", "@tanstack/react-query"],
      }),
    },
  },
];

const storyExtras = ["storybook", "@storybook", "@tanstack/react-query", "nuqs/adapters/testing"];

// Stories follow the rules of the folder they sit in, plus the story tooling and the dataset.
const storyConfigs = [
  ["ui", ["lib", "ui", "data"], uiPackages],
  ["features", ["domain", "lib", "ui", "features", "data"], ["react", "react-dom", "next"]],
].map(([layer, aliases, packages]) => ({
  files: [`${layer}/**/*.stories.{ts,tsx}`],
  rules: {
    "no-restricted-imports": boundaryRule({
      layer: `${layer} stories`,
      aliases,
      packages: [...packages, ...storyExtras],
    }),
  },
}));

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
