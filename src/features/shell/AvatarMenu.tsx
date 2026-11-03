"use client";

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
import { PERSONAS, ROLES, ROLE_LABEL, parseRole, type Role } from "@/lib/roles";
import { useRole } from "@/lib/role";

export type AvatarMenuProps = {
  role: Role;
  onSwitch: (role: Role) => void;
  onSignOut: () => void;
};

/** Who is signed in, the one-click role switch and Sign out. The identity is a mock; see `src/lib/roles.ts`. */
export function AvatarMenu({ role, onSwitch, onSignOut }: AvatarMenuProps) {
  const user = PERSONAS[role];
  return (
    // Not modal: a header menu should not hide the rest of the page from assistive technology or lock scrolling.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`Signed in as ${user.name}, ${ROLE_LABEL[role]}. Account menu`}
        // The initials are drawn from an attribute, not text: the accessible name is the full sentence, and
        // text that is not part of it would fail WCAG 2.5.3 (Label in Name).
        data-initials={user.initials}
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[length:var(--text-label)] leading-none font-semibold text-accent after:content-[attr(data-initials)]"
      />
      <DropdownMenuContent>
        <div className="flex flex-col gap-1 px-2 py-1.5">
          <span className="font-semibold text-ink">{user.name}</span>
          <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2">
            {user.email}
          </span>
          <Badge className="mt-1">{ROLE_LABEL[role]}</Badge>
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
              {r === role ? ROLE_LABEL[r] : `Switch to ${ROLE_LABEL[r]}`}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The header's menu, wired to the signed-in role. */
export function ConnectedAvatarMenu() {
  const { role, switchRole, signOut } = useRole();
  return <AvatarMenu role={role} onSwitch={switchRole} onSignOut={signOut} />;
}
