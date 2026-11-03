"use client";

import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PERSONAS, ROLES, ROLE_EFFECT, ROLE_LABEL, parseRole, type Role } from "@/lib/roles";
import { avatarTriggerProps } from "./avatarTrigger";

export type AvatarMenuProps = {
  role: Role;
  /** Opens on mount: the lazy wrapper mounts this after the first click. */
  defaultOpen?: boolean;
  /** How it was opened, so a keyboard open can focus the first item. */
  openedBy?: "keyboard" | "pointer";
  onSwitch: (role: Role) => void;
  onSignOut: () => void;
};

/** Who is signed in, the one-click role switch and Sign out. The identity is a mock; see `src/lib/roles.ts`. */
export function AvatarMenu({ role, onSwitch, onSignOut, defaultOpen, openedBy }: AvatarMenuProps) {
  const user = PERSONAS[role];
  // Radix focuses the first item only when it has seen a key press since it mounted, and the key press that
  // opened this menu happened before this code was loaded. Replaying one key event right after mount restores
  // what a keyboard user gets from a menu that was never lazy.
  useEffect(() => {
    if (openedBy === "keyboard")
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
  }, [openedBy]);
  return (
    // Not modal: a header menu should not hide the rest of the page from assistive technology or lock scrolling.
    <DropdownMenu modal={false} {...(defaultOpen ? { defaultOpen } : {})}>
      <DropdownMenuTrigger {...avatarTriggerProps(role)} />
      <DropdownMenuContent>
        <div className="flex flex-col gap-1 px-2 py-1.5">
          <span className="font-semibold text-ink">{user.name}</span>
          <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2">
            {user.email}
          </span>
          <Badge className="mt-1 w-fit">{ROLE_LABEL[role]} role</Badge>
          <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2">
            Opens the {ROLE_LABEL[role]} view · {ROLE_EFFECT[role]}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Role</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={role}
          onValueChange={(next) => {
            const picked = parseRole(next);
            if (picked && picked !== role) onSwitch(picked);
          }}
        >
          {ROLES.map((r) => (
            <DropdownMenuRadioItem key={r} value={r}>
              {r === role ? ROLE_LABEL[r] : `Switch role to ${ROLE_LABEL[r]} (${ROLE_EFFECT[r]})`}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
