# 0007. Map geometry from world-atlas, filtered at build time

Status: accepted, decided on 2026-11-02.

## Context

The map must work offline with no key and stay small.

## Options

- A hosted map service.
- A tile map.
- world-atlas 110m TopoJSON filtered by a build script.

## Decision

world-atlas `countries-110m`, reduced by `scripts/build-geo.ts` to the 13 market countries plus a land backdrop, projected with `geoNaturalEarth1`.

## Consequences

Tens of kilobytes, no network dependency, nothing to break in a reviewer's browser.
