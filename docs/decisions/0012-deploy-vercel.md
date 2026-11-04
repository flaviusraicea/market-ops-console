# 0012. Deploy on Vercel

Status: accepted, decided on 2026-11-02.

## Context

The app and the streaming route need a zero-configuration host with preview deployments.

## Options

- Netlify.
- Vercel.

## Decision

Vercel, with a preview per pull request and `main` as production. A second project builds Storybook.

## Consequences

The alerts route stores nothing, so it holds no state between serverless instances: saved rules live in the browser's `localStorage` (with an in-memory fallback when storage is unavailable). They survive a reload and stay in step across tabs, but stay in one browser.
