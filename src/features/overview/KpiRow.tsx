import { KpiTile } from "@/components/KpiTile";
import type { KpiTileVM } from "./viewModel";

export function KpiRow({ tiles }: { tiles: KpiTileVM[] }) {
  return (
    <div className="grid grid-cols-2 gap-[var(--gap)] md:grid-cols-4">
      {tiles.map((tile) => (
        <KpiTile key={tile.label} {...tile} />
      ))}
    </div>
  );
}
