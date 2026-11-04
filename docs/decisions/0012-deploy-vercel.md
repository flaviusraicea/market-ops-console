# 0012. Deploy on Vercel

Status: accepted, decided on 2026-11-02.

## Context

The app and the streaming route need a zero-configuration host that can be deployed by hand.

## Options

- Netlify.
- Vercel.

## Decision

Vercel, with `main` as production and a second project for Storybook. Git-triggered deploys are off (`git.deploymentEnabled: false` in `vercel.json`, and `github.silent`), so nothing builds or comments on a push and a deploy is started by hand.

## Consequences

The alerts route stores nothing, so it holds no state between serverless instances: saved rules live in the browser's `localStorage` (with an in-memory fallback when storage is unavailable). They survive a reload and stay in step across tabs, but stay in one browser.
