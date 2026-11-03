"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";

import { Check, ICON_STROKE } from "@/components/icons";
import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type AlertRule } from "@/domain";
import { AlertRuleSchema } from "@/domain/alerts";
import { useDataset } from "@/lib/context/dataset";
import { formatThreshold, scopeFromValue } from "./labels";
import { DEFAULT_THRESHOLDS, type SaveFailure, type SaveStatus } from "./useAlertSave";

type Values = { growth: string; attainment: string; scope: string };

const METRICS = ["growth", "attainment"] as const;
const FRESH_MS = 60_000;

const toNumber = (raw: string) => {
  const text = raw.trim().replace("−", "-");
  return text === "" ? Number.NaN : Number(text);
};

/**
 * Validates each threshold with the shared AlertRuleSchema, so the form, the route and the cache agree on
 * the ranges. A value that is not a number is checked as an out-of-range one to get the same message.
 */
const resolver: Resolver<Values> = (values) => {
  const errors: FieldErrors<Values> = {};
  for (const metric of METRICS) {
    const n = toNumber(values[metric]);
    const result = AlertRuleSchema.safeParse({
      metric,
      comparator: "below",
      threshold: Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER,
      scope: "portfolio",
    });
    const issue = result.success ? undefined : result.error.issues[0];
    if (issue) errors[metric] = { type: "validate", message: issue.message };
  }
  return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
};

export type AlertFormProps = {
  /** Called with a growth rule and an attainment rule for the chosen scope. */
  saveRule: (rules: AlertRule[], opts: { fail: boolean }) => void;
  status?: SaveStatus;
  savedAt?: number | null;
  failure?: SaveFailure | null;
  onRetry?: (opts: { fail: boolean }) => void;
  onDismiss?: () => void;
  /** Offered instead of Try again when the save was refused for the role. */
  onSwitchToAnalyst?: (() => void) | undefined;
  /** Executives see the form but cannot change it: fields disabled, Save hidden. */
  readOnly?: boolean;
};

function SaveStatusText({ status, savedAt }: { status: SaveStatus; savedAt: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (savedAt === null) return;
    const t = setTimeout(() => setNow(Date.now()), Math.max(0, FRESH_MS - (Date.now() - savedAt)));
    return () => clearTimeout(t);
  }, [savedAt]);

  const fresh = savedAt !== null && now - savedAt < FRESH_MS;
  return (
    <p
      aria-live="polite"
      className="flex min-h-[var(--control-h)] items-center gap-1 text-[length:var(--text-label)] leading-[var(--text-label-lh)]"
    >
      {status === "saving" ? (
        <span className="text-ink-muted">Saving…</span>
      ) : status === "saved" ? (
        <span className="fade-in flex items-center gap-1 text-ok-text">
          <Check aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
          {fresh ? "Saved · just now" : "Saved"}
        </span>
      ) : null}
    </p>
  );
}

function ThresholdField({
  form,
  name,
  label,
  help,
  disabled,
}: {
  form: ReturnType<typeof useForm<Values>>;
  name: "growth" | "attainment";
  label: string;
  help: string;
  disabled: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="content-start gap-1">
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            <FormControl>
              <Input
                {...field}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="pr-8"
                disabled={disabled}
                aria-disabled={disabled || undefined}
              />
            </FormControl>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-ink-muted"
            >
              %
            </span>
          </div>
          <FormDescription>{help}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function AlertForm({
  saveRule,
  status = "idle",
  savedAt = null,
  failure = null,
  onRetry,
  onDismiss,
  onSwitchToAnalyst,
  readOnly = false,
}: AlertFormProps) {
  const ds = useDataset();
  const [simulateFail, setSimulateFail] = useState(false);
  const form = useForm<Values>({
    resolver,
    mode: "onChange",
    defaultValues: {
      growth: String(DEFAULT_THRESHOLDS.growth),
      attainment: String(DEFAULT_THRESHOLDS.attainment),
      scope: "portfolio",
    },
  });
  const { reset, getValues } = form;
  const saving = status === "saving";

  const noticeRef = useRef<HTMLDivElement>(null);

  // A failed save puts the inputs back to the last saved values, then moves focus to the notice so the next Tab lands
  // on its recovery action instead of the top of the page (WCAG 2.4.3, 3.3.1).
  useEffect(() => {
    if (!failure) return;
    reset({
      ...getValues(),
      growth: String(failure.restored.growth),
      attainment: String(failure.restored.attainment),
    });
    noticeRef.current?.focus();
  }, [failure, reset, getValues]);

  function onSubmit(values: Values) {
    const scope = scopeFromValue(values.scope);
    saveRule(
      METRICS.map((metric) => ({
        metric,
        comparator: "below" as const,
        threshold: toNumber(values[metric]),
        scope,
      })),
      { fail: simulateFail },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <ThresholdField
            form={form}
            name="growth"
            label="Growth below"
            help="Alert when year-on-year growth falls below this value"
            disabled={readOnly}
          />
          <ThresholdField
            form={form}
            name="attainment"
            label="Attainment below"
            help="Alert when forecast attainment falls below this value"
            disabled={readOnly}
          />
          <FormField
            control={form.control}
            name="scope"
            render={({ field }) => (
              <FormItem className="content-start gap-1">
                <FormLabel>Scope</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={readOnly}>
                  <FormControl>
                    <SelectTrigger className="w-full" aria-disabled={readOnly || undefined}>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="portfolio">All markets</SelectItem>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Regions</SelectLabel>
                      {ds.regions.map((r) => (
                        <SelectItem key={r.id} value={`region:${r.id}`}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {ds.regions.map((r) => (
                      <SelectGroup key={r.id}>
                        <SelectSeparator />
                        <SelectLabel>{r.name}</SelectLabel>
                        {ds.markets
                          .filter((m) => m.regionId === r.id)
                          .map((m) => (
                            <SelectItem key={m.id} value={`market:${m.id}`}>
                              {m.name}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        <label className="flex w-fit items-center gap-2 text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2">
          <input
            type="checkbox"
            checked={simulateFail}
            onChange={(e) => setSimulateFail(e.target.checked)}
            disabled={readOnly}
            aria-disabled={readOnly || undefined}
            className="size-4 accent-[var(--accent)]"
          />
          Simulate failure
        </label>

        {readOnly ? null : (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!form.formState.isValid || saving}>
              Save thresholds
            </Button>
            <SaveStatusText status={status} savedAt={savedAt} />
          </div>
        )}

        {failure ? (
          <Notice
            noticeRef={noticeRef}
            title={failure.readOnly ? "Rules are read-only for Executives." : "Couldn't save"}
            actions={
              <>
                {failure.readOnly ? (
                  <Button type="button" variant="secondary" onClick={() => onSwitchToAnalyst?.()}>
                    Switch to Analyst
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => onRetry?.({ fail: simulateFail })}
                  >
                    Try again
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={() => onDismiss?.()}>
                  Dismiss
                </Button>
              </>
            }
          >
            {failure.readOnly
              ? "Nothing was saved."
              : `Your thresholds were restored to the last saved values (growth below ${formatThreshold(failure.restored.growth)}, attainment below ${formatThreshold(failure.restored.attainment)}).`}
          </Notice>
        ) : null}
      </form>
    </Form>
  );
}
