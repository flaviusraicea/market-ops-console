import type { ReactNode } from "react";

/** A subtitle in which the scope warning ("not filtered by Calyx") is set in warning text, the rest unchanged. */
export function ScopeSubtitle({
  text,
  warn,
}: {
  text: string;
  warn?: string | undefined;
}): ReactNode {
  const at = warn ? text.indexOf(warn) : -1;
  if (!warn || at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="text-warn-text">{warn}</span>
      {text.slice(at + warn.length)}
    </>
  );
}
