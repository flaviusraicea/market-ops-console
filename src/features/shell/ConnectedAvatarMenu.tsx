"use client";

import { useState, type ComponentType, type KeyboardEvent, type MouseEvent } from "react";

import { reportError } from "@/lib/events";
import { useRole } from "@/lib/role";
import type { AvatarMenuProps } from "./AvatarMenu";
import { avatarTriggerProps } from "./avatarTrigger";

type Menu = ComponentType<AvatarMenuProps>;

let loading: Promise<Menu> | null = null;

/** Fetches the menu code once. A failed fetch is forgotten, so the next click tries again. */
function load(): Promise<Menu> {
  loading ??= import("./AvatarMenu").then(
    (m) => m.AvatarMenu,
    (error: unknown) => {
      loading = null;
      throw error;
    },
  );
  return loading;
}
const preload = () => void load().catch(() => {});

/**
 * The header's menu, wired to the signed-in role. Menu code (Radix menu, roving focus) is not needed to paint the
 * header, so the account button is plain markup carrying the same attributes as Radix's trigger, and the menu
 * loads on hover, focus or the first activation. The avatar never blinks out while the code arrives. If it does
 * not arrive, the button says so and the next activation tries again.
 */
export function ConnectedAvatarMenu() {
  const { role, switchRole, signOut } = useRole();
  const [Menu, setMenu] = useState<Menu | null>(null);
  const [openedBy, setOpenedBy] = useState<"keyboard" | "pointer">("pointer");
  const [failed, setFailed] = useState(false);

  function activate(by: "keyboard" | "pointer") {
    setOpenedBy(by);
    setFailed(false);
    load().then(
      (m) => setMenu(() => m),
      (error: unknown) => {
        setFailed(true);
        reportError(error, { source: "fetch", route: "account-menu chunk" });
      },
    );
  }

  if (Menu)
    return (
      <Menu
        role={role}
        onSwitch={switchRole}
        onSignOut={signOut}
        defaultOpen
        openedBy={openedBy}
      />
    );

  return (
    <>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded="false"
        data-state="closed"
        data-slot="dropdown-menu-trigger"
        {...avatarTriggerProps(role)}
        {...(failed ? { "aria-describedby": "account-menu-error" } : {})}
        onPointerEnter={preload}
        onFocus={preload}
        // Enter and Space arrive as a click with no pointer (detail 0).
        onClick={(e: MouseEvent) => activate(e.detail === 0 ? "keyboard" : "pointer")}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            activate("keyboard");
          }
        }}
      />
      {failed ? (
        <span id="account-menu-error" role="alert" className="sr-only">
          The account menu could not load. Activate the button to try again.
        </span>
      ) : null}
    </>
  );
}
