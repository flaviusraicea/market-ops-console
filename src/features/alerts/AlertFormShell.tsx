"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_THRESHOLDS } from "./rules";

/**
 * The alert form's own markup, every control disabled, shown only until the form's chunk (react-hook-form and zod)
 * attaches. Same elements, classes and sizes as AlertForm with its defaults, so swapping one for the other moves
 * nothing; tests/unit/alertsBodyShell.test.tsx compares the two.
 */

function ShellField({
  name,
  label,
  help,
  value,
}: {
  name: string;
  label: string;
  help: string;
  value: string;
}) {
  const id = useId();
  return (
    <div data-slot="form-item" className="grid content-start gap-1">
      <Label
        data-slot="form-label"
        data-error={false}
        className="data-[error=true]:text-bad-text"
        htmlFor={`${id}-form-item`}
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          data-slot="form-control"
          id={`${id}-form-item`}
          name={name}
          aria-describedby={`${id}-form-item-description`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="pr-8"
          value={value}
          readOnly
          disabled
          aria-disabled
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-ink-muted"
        >
          %
        </span>
      </div>
      <p
        data-slot="form-description"
        id={`${id}-form-item-description`}
        className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted"
      >
        {help}
      </p>
    </div>
  );
}

export function AlertFormShell({
  readOnly = false,
  busy = true,
}: {
  readOnly?: boolean;
  /** The form's code is on its way; false once loading it has failed. */
  busy?: boolean;
}) {
  const scopeId = useId();
  return (
    <form noValidate aria-busy={busy} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <ShellField
          name="growth"
          label="Growth below"
          help="Alert when year-on-year growth falls below this value"
          value={String(DEFAULT_THRESHOLDS.growth)}
        />
        <ShellField
          name="attainment"
          label="Attainment below"
          help="Alert when forecast attainment falls below this value"
          value={String(DEFAULT_THRESHOLDS.attainment)}
        />
        <div data-slot="form-item" className="grid content-start gap-1">
          <Label
            data-slot="form-label"
            data-error={false}
            className="data-[error=true]:text-bad-text"
            htmlFor={`${scopeId}-form-item`}
          >
            Scope
          </Label>
          <Select value="portfolio" disabled>
            <SelectTrigger
              data-slot="form-control"
              id={`${scopeId}-form-item`}
              className="w-full"
              aria-disabled
            >
              <SelectValue>All markets</SelectValue>
            </SelectTrigger>
          </Select>
        </div>
      </div>

      <label className="flex w-fit items-center gap-2 text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2">
        <input
          type="checkbox"
          checked={false}
          readOnly
          disabled
          aria-disabled
          className="size-4 accent-[var(--accent)]"
        />
        Simulate failure
      </label>

      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled>
            Save thresholds
          </Button>
          <p className="flex min-h-[var(--control-h)] items-center gap-1 text-[length:var(--text-label)] leading-[var(--text-label-lh)]" />
        </div>
      )}
    </form>
  );
}
