import { PERSONAS, ROLE_EFFECT, ROLE_LABEL, type Role } from "@/lib/roles";

/**
 * What the account button looks like and says. Kept free of Radix so the plain button shown before the menu code
 * loads and the real trigger share one source.
 */
export function avatarTriggerProps(role: Role) {
  const user = PERSONAS[role];
  return {
    "aria-label": `Signed in as ${user.name}, ${ROLE_LABEL[role]} role, ${ROLE_EFFECT[role]}. Account menu`,
    // The initials are drawn from an attribute, not text: the accessible name is the full sentence, and text that
    // is not part of it would fail WCAG 2.5.3 (Label in Name).
    "data-initials": user.initials,
    className:
      "flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[length:var(--text-label)] leading-none font-semibold text-accent after:content-[attr(data-initials)]",
  } as const;
}
