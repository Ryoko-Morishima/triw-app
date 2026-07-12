# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TRIW is a Next.js (App Router) + TypeScript web app whose end goal is a personalized "radio program": Spotify tracks interleaved with AI-generated narration (TTS), auto-playing back-to-back. The project is currently in an earlier phase: tuning song-selection accuracy through structured card+slider input, before narration/playback is built.

## Commands

```bash
npm ci             # install (uses package-lock.json)
npm run dev        # next dev -H 127.0.0.1 -p 3000 (Spotify OAuth redirect URI is pinned to 127.0.0.1:3000)
npm run build      # next build
npm run start      # next start -p 3000
npx tsc --noEmit   # typecheck (no test runner is configured — `npm test` is a stub)
```

There is no lint script configured and no automated test suite. Verification for most changes is: typecheck passes, `npm run dev` boots, and the relevant page/API route is exercised manually (see "Verification expectations" below).

## Required environment

Set in `.env.local` (see that file for the full current list): `OPENAI_API_KEY`, `OPENAI_MODEL` (default gpt-4o-mini), `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`, `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI`, `SPOTIFY_SCOPES`, `TRIW_RUNLOG_DIR`, `ENABLE_RUNLOG`. Spotify auth uses PKCE + cookie storage and is stable — avoid touching `src/lib/spotify.ts` / `src/app/api/auth/` without a clear need.

## Two coexisting generations of code — do not conflate them

The repo contains an old, working flow and a new, actively-developed flow. Mixing them up is the single easiest way to make a wrong change here.

### Current flow ("tune") — this is what's under active development
- UI: `src/app/program/page.tsx` (`/program`)
- API: `src/app/api/program/tune/route.ts` (candidate generation + resolution + eval + queue) and `src/app/api/program/create/route.ts`
- Logic: `src/lib/triw/**`
- Input model: keyword cards (27, `src/lib/triw/input/cards/keywordCards.ts`) + 3 sliders — era/temperature/popularity (`src/lib/triw/input/sliders/sliderControls.ts`)
- Experiment log: `triw-experiments/experiments.ndjson` (append-only NDJSON, one record per run)

### Legacy flow ("mixtape") — reference only, do not modify
- UI: `src/app/mixtape/**`, `src/app/playlist/**`, `src/app/simple-playlist/**`
- Logic: `src/lib/openai.ts`, `src/lib/evaluate.ts`, `src/lib/finalize.ts`, `src/lib/resolve.ts` — a persona-driven A–G pipeline
- DJ persona data: `src/data/djs*.ts` (11 personas)
- Most design docs under `docs/` (design_notes, playlist_flow_design, selection-algorithm-notes, etc.) describe **this** generation, not the current one
- Treat as a working reference implementation to port logic *from*, never edit in place. Notably useful and not yet ported to `tune`: the notation-match verification in `evaluate.ts` and the `artistPolicy` logic in `finalize.ts`. Port by copying into the current flow; the legacy source stays untouched.

### Unimplemented stubs
`src/lib/triw/narration/` and `src/lib/triw/playback/` are empty placeholder directories for the future narration/TTS/playback-control work. A `talkEnabled` flag is wired from UI through the API but has no effect anywhere yet.

## The `tune` pipeline (the core thing being iterated on)

`src/app/api/program/tune/route.ts` runs a lettered pipeline, and this lettering (C/D/E/F) is used throughout the code, logs, and comments — keep it when adding stages:

```
input (cards + sliders + count/duration)
  buildTuneInterpretation   → template-concatenates card promptText + slider stage text (no LLM)
  buildPromptPlan           → buckets cards by category, adds tempo/energy hints via musicAffectMap
  C  runTuneCandidatesC     → gpt-4o-mini (temp 0.6), generates candidates as JSON (target × 3)
  D  resolveCandidatesD     → Spotify search w/ staged fallback; ISRC + MusicBrainz origin-year estimation; fetches audio features
  E  evaluateTuneTracks     → scores tracks (base 70, -70 no URI, -35 era mismatch, -25~30 popularity mismatch); <40 → rejected, rest → reservePool
  F  buildVisibleQueue      → sorts reservePool by score desc, takes top N
  buildEvents               → wraps tracks as {type: "track"} program events (no narration yet)
```

**Known structural gap**: the generation stage (C) only receives vague natural-language phrasing (e.g. "prefer an older era"), while the evaluation stage (E) works off concrete year ranges. Slider-value interpretation is duplicated in two places at different granularities instead of coming from one shared definition — a recurring source of bugs when tuning era/temperature behavior. When touching slider/card semantics, check both `buildTuneInterpretation`/`buildPromptPlan` (generation side) and `evaluateTuneTracks` (evaluation side).

## Directory map (current-flow logic)

```
src/lib/triw/
  input/cards/keywordCards.ts       27 keyword cards (promptText per card)
  input/sliders/sliderControls.ts   era / temperature / popularity slider definitions
  prompt/buildPromptPlan.ts         categorizes cards, applies musicAffectMap
  prompt/musicAffectMap.ts          temperature/mood → tempo/energy hint mapping (cards only, not yet wired to sliders)
  selection/buildTuneInterpretation.ts
  selection/buildSelectionPrompt.ts
  selection/generateTuneCandidates.ts  → stage C
  spotify/resolveCandidates.ts         → stage D
  program/evaluateTuneTracks.ts        → stage E
  program/buildVisibleQueue.ts         → stage F
  program/buildEvents.ts
  program/types.ts                     ProgramInput / ProgramState types
  logs/saveRunLog.ts, logs/providers/  runlog persistence (provider abstraction over local storage)
  narration/, playback/                empty stubs for future work
```

Each subdirectory under `src/lib/triw/` has a one-line `README.md` describing its role — check it first when orienting in an unfamiliar area.

## Experiment logging

Every `tune` run is expected to be recorded to `triw-experiments/experiments.ndjson`. Changes that affect song selection (prompt wording, candidate generation, evaluation scoring, queue building, card/slider definitions) are expected to be validated with before/after runs recorded there, not just eyeballed — check `tasks/` for the current process and schema if you're making this kind of change.

## `tasks/` directory

Task files (`tasks/T*.md`) are per-agent-session work units, each with a status field (`todo` / `in-progress` / `blocked` / `done`) and a running work log. `tasks/README.md` describes the read order and update convention — read the relevant task file before starting related work, and update its status/work-log as you go so a future session (or agent) can pick up where you left off.

## Note on root-level docs

`AGENTS.md`, `PROJECT.md`, and `ROADMAP.md` previously existed at the repo root (visible via `git show HEAD:PROJECT.md` etc.) and defined project governance: role split between human/agent, a "current/legacy generation" map, a known-issues table, a draft (unapproved) quality bar for song selection, and a phased roadmap gated on experiment-log structuring (`tasks/T0*.md`). They are deleted from the working tree as of the current uncommitted state — check with the user before assuming they should stay gone, since they appear to be load-bearing process docs rather than stale cruft.
