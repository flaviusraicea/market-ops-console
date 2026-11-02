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

The alert store is in memory per server instance, so on serverless hosting saved rules can vanish between requests; the demo flow works within a session.
