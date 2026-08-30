---
name: Hemaksh Chaturvedi — Portfolio
description: A data-sublime field where a career reads as live data, not decoration.
colors:
  bg: "#050505"
  fg: "#f5f5f2"
  fg-dim: "rgba(245, 245, 242, 0.55)"
  fg-faint: "rgba(245, 245, 242, 0.24)"
  accent: "#2bf0b0"
  line: "rgba(245, 245, 242, 0.16)"
typography:
  display:
    fontFamily: "Space Mono, ui-monospace, SF Mono, Cascadia Code, Roboto Mono, Menlo, Consolas, monospace"
    fontSize: "clamp(2rem, 5vw, 3.4rem)"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Space Mono, ui-monospace, SF Mono, Cascadia Code, Roboto Mono, Menlo, Consolas, monospace"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Space Mono, ui-monospace, SF Mono, Cascadia Code, Roboto Mono, Menlo, Consolas, monospace"
    fontSize: "0.8rem"
    fontWeight: 400
    letterSpacing: "0.1em"
rounded:
  none: "0px"
spacing:
  gutter: "clamp(20px, 5vw, 72px)"
components:
  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.6em"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "#05070a"
---

# Design System: Hemaksh Chaturvedi — Portfolio

## Overview

**Creative North Star: "Datamatics" — a career read as live data, not decoration.**

The site is a pure black-and-white data field in the lineage of Ryoji Ikeda's data-art work: dense monospace columns, hairline sine curves, no grey, no gradient, one reserved signal accent. A career becomes a field of data — each employer, project, and degree a column or row that snaps into focus as a scan line advances through it. The visitor doesn't watch a character walk a path; they watch data itself move, which is a more honest translation of "a career in motion" for a production/reliability engineer than a literal illustrated figure would have been.

The system was chosen over two other rolled directions (a literal network-topology walk, and a wuxia painted-poster world) because it reads unambiguously as computer science, stays serious enough for a recruiter audience, and gives the timeline/skills content — which is genuinely dense — a native home instead of fighting the visual system for space.

**Key Characteristics:**
- Pure monochrome ground (near-black / near-white) with exactly one saturated accent, reserved for "active" state only
- Everything set in one monospace face, at data density — this is not a "technical" costume, it's the whole typographic system
- Focus is the primary interaction: content dims to a faint bar pattern until the scan line (tied to scroll) crosses it, then sharpens to full contrast
- No shadows, no rounded corners, no icon tiles, no gradients — flat data, not chrome

## Colors

Two-value monochrome with one reserved signal accent. Color is never decorative here — its only job is to mark "this is the active record."

### Primary
- **Signal Mint** (`#2bf0b0`): the one saturated accent. Used exclusively for the active experience-row year badge, active nav/hover states, the sine curve in the hero field, and the scan line itself. Never used for body text or large fills — its rarity is what makes "active" legible.

### Neutral
- **Field Black** (`#050505`): page background throughout. Inverts to `#f5f5f2` when the visitor triggers the INVERT toggle (the world's own "full-frame negative" motion vocabulary, repurposed as the site's light/dark switch).
- **Signal White** (`#f5f5f2`): primary text, headings, active-state body copy.
- **Dim White** (`rgba(245,245,242,0.55)`): secondary/inactive text — de-emphasized rows, captions, nav labels. Contrast-checked against the black ground (~8:1) so "dim" never means "hidden."
- **Faint White** (`rgba(245,245,242,0.24)`): the lowest tier — bracket punctuation, hairline dividers, placeholder marks. Decorative only, never load-bearing text.

### Named Rules
**The One Accent Rule.** Signal Mint appears only on the element that is currently "in focus" (active timeline row, active nav link, hover state, the sine curve). If two things are mint at once outside a hover moment, something is wrong.

## Typography

**Display Font:** Space Mono (with ui-monospace, SF Mono, Roboto Mono fallback)
**Body Font:** Space Mono (same stack — one face for the whole system)
**Label/Mono Font:** same face; labels differ only by size, tracking, and bracket punctuation, never by family

**Character:** A single humanist monospace carries the entire page, from the hero headline to body paragraphs to the skills table — deliberately flat hierarchy by weight and size rather than by switching faces, because the world's premise is that everything on this page is data of one kind.

### Hierarchy
Seven steps total, each held in a `--dm-fs-*` custom property — no literal `font-size` value appears anywhere else in the stylesheet. Two more properties (`--dm-fs-icon`, `--dm-fs-icon-lg`) size icon glyphs only and sit outside the text ramp.

- **Display** (`--dm-fs-display`, 700, `clamp(2rem, 5vw, 3.4rem)`, 1.15): hero name/role readout and the closing "Get In Touch" line — the two full-stop moments of the page share one size.
- **Headline** (`--dm-fs-headline`, 600, `clamp(1.6rem, 3vw, 2.2rem)`): section titles (Experience, Projects, Skills, Contact), prefixed with a two-digit field index (`01`, `02`...) — the numbering is diegetic here, not decoration: it mirrors the world's own "data column index" grammar.
- **Title** (`--dm-fs-title`, 600, `1rem`): row-level headings (job title, project name, degree, the nav wordmark).
- **Body** (`--dm-fs-body`, 400, `0.9rem`, 1.7): the hero description, location line, and contact description.
- **Body-sm** (`--dm-fs-body-sm`, 400, `0.85rem`, 1.55–1.6): dense repeated copy — timeline row paragraphs, project card paragraphs, the skills table. Measure narrows intentionally in the two-column timeline layout rather than running full 65–75ch.
- **Label** (`--dm-fs-label`, 400, `0.8rem`, tracked +0.08–0.1em): nav items, buttons, year badges, sub-links.
- **Micro** (`--dm-fs-micro`, 400, `0.75rem`): tags, footer copyright, the invert toggle, skills table row keys.

### Named Rules
**The Bracket Rule.** Any short label token (`[ GH ]`, `[ INVERT ]`, `[ LANGUAGES ]`, `[ DOWNLOAD RESUME ]`) is bracketed in-place via CSS `::before`/`::after`, never written into the copy itself, so the same content stays clean if the world ever changes.

**The Seven-Step Rule.** Every `font-size` in the stylesheet resolves to one of the seven `--dm-fs-*` tokens (or an icon token). A new literal value means the wrong step was reached for, not a reason to add an eighth.

## Layout

Single-column content max-width 1280px, with a responsive gutter (`clamp(20px, 5vw, 72px)`) rather than a fixed container padding. The experience/education timeline runs two columns side-by-side on desktop and stacks to one on mobile (≤768px), where each row also drops from a horizontal flex layout to a vertical stack so the year badge sits above its content instead of cramped beside it. The projects grid is a hairline-divided data table (1px `--dm-line` gutters, no card gaps) at three columns down to one on mobile.

Section rhythm: every section (`.dm-section`) opens with a 1px top hairline and generous vertical padding (`clamp(64px, 10vw, 120px)`), so sections read as bounded records in the same field rather than free-floating blocks.

## Elevation & Depth

Flat by design — the field has no shadows, no elevation tiers, and no z-axis chrome. Depth is conveyed entirely by opacity/saturation state (active vs. dimmed) and by the fixed scan-line element that sits above content (`z-index: 900`) as the one persistent overlay. This is stated as an invariant: adding a drop shadow or lifted card anywhere would contradict the world.

## Shapes

Zero border-radius everywhere — buttons, cards, badges, the invert toggle are all hard rectangles. Borders are 1px hairlines in `--dm-line`; the only exception is the 1px hairline grid inside the projects table, which is structural (it separates data cells) rather than a card border. Circular geometry is reserved for exactly one place: the year badges' rounded corners are intentionally absent too (they're bordered rectangles, not pills) to keep the world consistent.

## Components

### Buttons
- **Shape:** hard rectangle, no radius, 1px solid border in `--dm-fg`.
- **Primary:** transparent background, bracketed label (`[ DOWNLOAD RESUME ]`), fills solid Signal Mint with black text on hover — the only place the accent takes a large fill, and only on interaction.
- **No secondary/ghost variant exists yet** — the system currently has one button treatment; introduce a second only if a real second action appears.

### Data Rows (signature component)
Used for both Experience and Education. A `.timeline-wrapper` is a horizontal row (year badge + info) that sits at 40% opacity/desaturated by default and snaps to full contrast + Signal Mint year badge when it crosses the scan line (via `.is-active`, toggled by IntersectionObserver). This dimming is gated behind a `.js` class on `<html>` set only after script load, so the page renders at full contrast and full legibility with JavaScript disabled — the focus effect is a progressive enhancement, never a requirement for reading the content.

### Cards / Data Cells (Projects)
- **Corner Style:** none (0 radius).
- **Background:** `--dm-bg`, separated by 1px `--dm-line` hairlines rather than gaps or shadows.
- **Shadow Strategy:** none — see Elevation & Depth.
- **State:** same dim/focus pattern as Data Rows, same `.js`-gated fallback.
- **Internal Padding:** `1.8rem`.

### Skills Table
A dense two-column `<table>`: bracketed category key (`[ LANGUAGES ]`) at fixed width, value cell in full-contrast body text. Always full contrast — this section is reference material, not a focus/scroll narrative, so it never dims.

### Navigation
Sticky top bar, translucent black with backdrop blur, 1px bottom hairline. Links are bracketed labels at Dim White, brightening to full white on hover/focus, never underlined. The INVERT toggle is a bordered rectangle button, right-aligned, replacing a conventional light/dark switch with the world's own "full-frame negative" motion.

### Hero Field (signature component)
A full-bleed `<canvas>` behind the hero content: seeded pseudo-random barcode columns plus one animated sine curve in Signal Mint. Freezes to a single static frame under `prefers-reduced-motion: reduce` — no strobing ships to a visitor who asked for less motion.

## Do's and Don'ts

### Do:
- **Do** keep the accent (`#2bf0b0`) reserved for active/interactive state only — never use it for a body-text link color or a large background fill outside a hover moment.
- **Do** gate any new dim/focus interaction behind the `.js` root class so content stays legible without JavaScript.
- **Do** keep every label bracketed (`[ LIKE THIS ]`) via CSS pseudo-elements, not hardcoded into copy.
- **Do** hold the whole type system to one monospace face; a second face would break the "this is all data" premise.

### Don't:
- **Don't** add rounded corners, drop shadows, or gradients anywhere — the flat/hairline language is load-bearing to this world, not a placeholder waiting for polish.
- **Don't** add a second accent color. If a new state needs distinguishing, use opacity/weight/the existing accent, not a new hue.
- **Don't** use emoji or unicode glyphs as UI icons; the existing icon set (unicons line icons) is the system's icon library.
- **Don't** reintroduce a colored left-border/accent stripe on rows or cards as an "active" indicator — it was tried and cut as a generic SaaS tell; the year-badge color change and opacity shift already carry that signal.
