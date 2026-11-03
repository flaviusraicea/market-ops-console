"use client";

import dynamic from "next/dynamic";
import { useState, type KeyboardEvent } from "react";

import { useRole } from "@/lib/role";
import { PERSONAS, ROLE_LABEL, type Role } from "@/lib/roles";

const AVATAR_CLASS =
  "flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[length:var(--text-label)] leading-none font-semibold text-accent after:content-[attr(data-initials)]";

/**
 * The trigger as plain markup: the same attributes Radix gives its trigger, so the swap is invisible. Menu code
 * (Radix menu, roving focus) is not needed to paint the header, so it loads on the first click, key press or
 * hover instead of with the page.
 */
function StaticTrigger({ role, onActivate }: { role: Role; onActivate: () => void }) {
  const user = PERSONAS[role];
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded="false"
      data-state="closed"
      data-slot="dropdown-menu-trigger"
      aria-label={`Signed in as ${user.name}, ${ROLE_LABEL[role]}. Account menu`}
      data-initials={user.initials}
      className={AVATAR_CLASS}
      onPointerEnter={preload}
      onFocus={preload}
      onClick={onActivate}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          onActivate();
        }
      }}
    />
  );
}

const load = () => import("./AvatarMenu").then((m) => m.AvatarMenu);
const preload = () => void load();

// While the chunk arrives the trigger stays on screen, so a click never makes the avatar blink out.
function Pending() {
  const { role } = useRole();
  return <StaticTrigger role={role} onActivate={() => {}} />;
}

const AvatarMenu = dynamic(load, { ssr: false, loading: Pending });

/** The header's menu, wired to the signed-in role. */
export function ConnectedAvatarMenu() {
  const { role, switchRole, signOut } = useRole();
  const [active, setActive] = useState(false);
  if (!active) return <StaticTrigger role={role} onActivate={() => setActive(true)} />;
  return <AvatarMenu role={role} onSwitch={switchRole} onSignOut={signOut} defaultOpen />;
}
