# Commons brand and design system

Commons is a hub for people rebuilding familiar tools in the open. The brand is a workshop: linen paper, walnut ink, hard edges, labels set in a typewriter face. Everything is open: the code is MIT, the fonts are SIL Open Font License, and the mark and wordmark are CC BY 4.0.

## Name

**Commons**, written as `commons` in the wordmark and "Commons" in prose. The commons is the oldest word for a resource that a community keeps together, which is what an open-source rebuild hub is. The name has many neighbours (Creative Commons, Wikimedia Commons, local co-ops), so pair it with a distinct domain and never present it as affiliated with any of them.

Tagline: *Software made by people, for people, in public.*

## Mark

A lattice of plots with one claimed square. The grid is the shared ground; the clay square is the project you take on.

| Asset | Path | Use |
| --- | --- | --- |
| Mark, light | `assets/logo-mark.svg` | App icons, avatars, print |
| Mark, dark | `assets/logo-mark-dark.svg` | Dark backgrounds |
| Wordmark | `assets/logo-wordmark.svg` | Headers, documents |
| Favicon | `public/favicon.svg` | Browser tab |
| Social image | `public/og.png` | Link previews, 1200×630 |
| React component | `src/components/Mark.jsx` | In-app; follows the current theme through tokens |

Rules: keep the stroke weight proportional (2.5 units on a 44-unit grid), keep the claimed square at the lower right, never add a gradient or a drop shadow, and clear space equal to one plot cell on every side.

## Colour

Tokens live in `src/tokens.css`. Light values below; dark values are in the same file and switch with `prefers-color-scheme` or `<html data-theme="dark">`.

| Token | Light | Role |
| --- | --- | --- |
| `--paper` | `#ece5d4` | Page background |
| `--paper-2` | `#f7f2e7` | Raised surfaces: cards, panels, modals |
| `--paper-tint` | `#e3dbc8` | Inset areas and quiet highlights |
| `--paper-3` | `#d9ceb6` | Avatars, sunken fills |
| `--ink` | `#2f2620` | Text, borders, offset shadows |
| `--ink-2` | `#5a4e45` | Secondary text |
| `--ink-3` | `#74665b` | Tertiary text and placeholders |
| `--line-soft` | `#c7bba3` | Quiet dividers |
| `--clay` | `#b5552f` | Primary actions, active markers, links |
| `--moss` | `#5b6b3a` | Confirmation, "looking for help" status |
| `--ochre` | `#c9a24a` | Featured and highlight |
| `--slate`, `--plum` | `#5f7584`, `#7f5e74` | Category markers only |
| `--danger` | `#9b3a2a` | Destructive actions and errors |

Text contrast on `--paper`: ink 12.5:1, ink-2 7.0:1, ink-3 4.8:1. Clay on paper is 4.6:1, so clay carries colour on buttons and markers but body text stays ink. Dark mode uses lifted versions of the same hues; `--on-clay` and `--on-ink` flip with the theme so solid buttons keep contrast.

## Type

| Role | Face | Weights shipped |
| --- | --- | --- |
| Reading and headings | Atkinson Hyperlegible Next (`--font-sans`) | 400, 400 italic, 500, 700 |
| Labels, navigation, buttons, tags, metadata, wordmark | IBM Plex Mono (`--font-mono`) | 400, 500 |

Headings are the sans at weight 700 with tracking of −0.02 em to −0.03 em. Labels are mono at 10 to 12 px with `--tracking-label` when uppercase. Nothing in the interface is smaller than 10 px. Both faces are bundled through `@fontsource` and served from the application; no font request leaves the site.

## Shape

| Token | Value |
| --- | --- |
| `--radius-sm` | 2 px, the default for buttons, inputs, cards and chips |
| `--radius` / `--radius-lg` | 4 px / 6 px, for larger soft containers only |
| `--line` | 2 px, structural borders on cards, panels, header and footer rules |
| `--line-thin` | 1 px, quiet dividers inside a card |
| `--shadow-offset` | `4px 4px 0 var(--ink)`, hero and hover states |
| `--shadow-offset-sm` | `3px 3px 0 var(--ink)`, cards, panels, primary buttons |

Shadows are solid offsets, never blurred. Cards lift on hover by moving two pixels up and left and growing the offset. Primary buttons press by moving down and right. Avatars and status markers are square.

## Illustration

Project art inherits `--art-filter`, a light sepia and desaturation so the stock project scenes sit on linen. The hero illustration draws the lattice from the mark with five claimed plots and a dashed clay route through them. New illustration should use token colours, 2 px strokes and no gradients.

## Voice

Plain, specific, warm. Say what the thing does. Prefer "share a project" to "get started", "builders" to "users", "the commons" to "the platform". Avoid superlatives and growth language.

## Licensing

| Part | License |
| --- | --- |
| Source code | MIT, see `LICENSE` |
| Mark, wordmark, social image | CC BY 4.0, attribution "Commons contributors" |
| Atkinson Hyperlegible Next | SIL OFL 1.1, Braille Institute of America |
| IBM Plex Mono | SIL OFL 1.1, IBM |
| Lucide icons | ISC |
