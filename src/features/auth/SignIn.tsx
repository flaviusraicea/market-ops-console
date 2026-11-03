"use client";

import { Eyebrow } from "@/components/Eyebrow";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/features/shell/ThemeToggle";
import { useRole } from "@/lib/role";
import { PERSONAS, ROLES, ROLE_LABEL, type Role } from "@/lib/roles";

/** The mock SSO screen: pick a persona. Nothing is checked and nothing is stored beyond one cookie. */
export function SignIn({ onPick }: { onPick: (role: Role) => void }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="mx-auto flex w-full max-w-[var(--page-max)] items-center justify-between px-[var(--gutter)] py-3">
        <span className="font-display text-lg leading-6 font-semibold">Market Ops</span>
        <ThemeToggle />
      </header>
      <main
        id="main"
        className="flex flex-1 items-start justify-center px-[var(--gutter)] pt-[12vh] pb-12"
      >
        <section
          aria-labelledby="sign-in-heading"
          className="flex w-full max-w-md flex-col gap-5 rounded-card border border-border bg-surface p-6 shadow-popover"
        >
          <h1
            id="sign-in-heading"
            className="font-display text-[length:var(--text-title)] leading-[var(--text-title-lh)] font-semibold"
          >
            Sign in to Market Ops
          </h1>
          <div className="flex flex-col gap-2">
            <Button type="button" disabled className="h-10 w-full">
              Continue with SSO
            </Button>
            <p className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2">
              SSO is mocked for this assignment. Pick a persona:
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {ROLES.map((role) => {
              const persona = PERSONAS[role];
              return (
                <li key={role}>
                  <button
                    type="button"
                    onClick={() => onPick(role)}
                    className="flex w-full flex-col items-start gap-1 rounded-card border border-border bg-surface px-4 py-3 text-left transition-colors duration-[var(--dur-fast)] hover:border-accent hover:bg-accent-soft"
                  >
                    <Eyebrow className="text-accent">{ROLE_LABEL[role]}</Eyebrow>
                    <span className="font-semibold">{persona.name}</span>
                    <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2">
                      {persona.summary}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}

export function ConnectedSignIn() {
  const { signIn } = useRole();
  return <SignIn onPick={signIn} />;
}
