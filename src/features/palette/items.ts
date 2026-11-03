import { defaultFilter } from "@/components/ui/command";
import {
  STATUS_LABEL,
  entityName,
  marketsIn,
  type Dataset,
  type Mode,
  type RegionId,
} from "@/domain";
import { SUGGESTIONS } from "@/features/assistant/Suggestions";

export type PaletteAction =
  | { kind: "market"; marketId: string }
  | { kind: "region"; regionId: RegionId }
  | { kind: "product"; productId: string }
  | { kind: "mode"; mode: Mode }
  | { kind: "ask"; text: string }
  | { kind: "theme" }
  | { kind: "motion" };

export type PaletteIcon = "market" | "region" | "product" | "view" | "ask" | "theme" | "motion";

export type PaletteItem = {
  id: string;
  label: string;
  /** Right-aligned text. */
  meta?: string;
  /** `accent` colours the meta text (market status). */
  tone?: "accent";
  icon: PaletteIcon;
  /** Extra words the fuzzy filter also matches on. */
  keywords?: string[];
  action: PaletteAction;
};

export type PaletteGroup = { id: string; heading: string; items: PaletteItem[] };

type BuildState = {
  mode: Mode;
  hasMarket: boolean;
  reducedMotion: boolean;
};

const MODE_LABEL: Record<Mode, string> = {
  executive: "Switch to Executive overview",
  analyst: "Switch to Analyst deep-dive",
};

/** The palette's full catalogue, in display order. Pure: the component filters and renders it. */
export function buildGroups(ds: Dataset, state: BuildState): PaletteGroup[] {
  const regionName = (regionId: RegionId) => entityName(ds, { kind: "region", regionId });

  const groups: PaletteGroup[] = [
    {
      id: "markets",
      heading: "Markets",
      items: ds.markets.map((m) => ({
        id: `market:${m.id}`,
        label: `Go to ${m.name}`,
        meta: `${regionName(m.regionId)} · ${STATUS_LABEL[m.kpis.status].toLowerCase()}`,
        tone: "accent" as const,
        icon: "market" as const,
        keywords: [m.iso2, m.iso3],
        action: { kind: "market" as const, marketId: m.id },
      })),
    },
    {
      id: "regions",
      heading: "Regions",
      items: ds.regions.map((r) => {
        const n = marketsIn(ds, { kind: "region", regionId: r.id }).length;
        return {
          id: `region:${r.id}`,
          label: `Go to ${r.name}`,
          meta: `${n} ${n === 1 ? "market" : "markets"}`,
          icon: "region" as const,
          action: { kind: "region" as const, regionId: r.id },
        };
      }),
    },
  ];

  if (state.hasMarket) {
    groups.push({
      id: "products",
      heading: "Products",
      items: ds.products.map((p) => ({
        id: `product:${p.id}`,
        label: `Select ${p.name}`,
        icon: "product" as const,
        action: { kind: "product" as const, productId: p.id },
      })),
    });
  }

  const otherMode: Mode = state.mode === "analyst" ? "executive" : "analyst";
  groups.push(
    {
      id: "views",
      heading: "Views",
      items: [
        {
          id: `mode:${otherMode}`,
          label: MODE_LABEL[otherMode],
          icon: "view",
          action: { kind: "mode", mode: otherMode },
        },
      ],
    },
    {
      id: "ask",
      heading: "Ask",
      items: SUGGESTIONS.map((text) => ({
        id: `ask:${text}`,
        label: `Ask: ${text}`,
        meta: "↵ asks",
        icon: "ask" as const,
        action: { kind: "ask" as const, text },
      })),
    },
    {
      id: "theme",
      heading: "Theme",
      items: [
        {
          id: "theme:toggle",
          label: "Toggle theme",
          icon: "theme",
          keywords: ["dark", "light"],
          action: { kind: "theme" },
        },
        {
          id: "theme:motion",
          label: state.reducedMotion ? "Turn reduce motion off" : "Turn reduce motion on",
          icon: "motion",
          keywords: ["animation"],
          action: { kind: "motion" },
        },
      ],
    },
  );
  return groups;
}

/**
 * Applies the query with cmdk's own fuzzy scorer, keeps the group order, and drops empty groups.
 * A query that matches nothing offers `Ask: "{query}"`, so there is always a way forward.
 */
export function filterGroups(groups: PaletteGroup[], query: string): PaletteGroup[] {
  const q = query.trim();
  if (!q) return groups;
  const kept = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => defaultFilter(item.label, q, item.keywords ?? []) > 0),
    }))
    .filter((g) => g.items.length > 0);

  if (kept.length > 0) return kept;
  return [
    {
      id: "ask",
      heading: "Ask",
      items: [
        {
          id: "ask:query",
          label: `Ask: "${q}"`,
          meta: "↵ asks",
          icon: "ask",
          action: { kind: "ask", text: q },
        },
      ],
    },
  ];
}
