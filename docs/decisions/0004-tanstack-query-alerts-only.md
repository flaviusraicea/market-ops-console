# 0004. TanStack Query for the alert mutation only

Status: accepted, decided on 2026-11-02.

## Context

Saving alert thresholds needs an optimistic update with rollback on failure, which is the server-versus-client state split the brief asks about.

## Options

- `useOptimistic` plus a reducer.
- TanStack Query for the alert mutation only.
- TanStack Query for all data.

## Decision

TanStack Query for the alert list and save mutation (`onMutate` snapshot, `onError` rollback, `onSettled` invalidate). Facts come from the server and are not fetched on the client.

## Consequences

A dependency used by one feature, justified by a dozen lines of reliable optimistic-update code. No global store.
