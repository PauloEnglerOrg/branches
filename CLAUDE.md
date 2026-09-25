# Branches — project notes for Claude Code

## What this is
A personal to-do app that works like a mind map: an infinite canvas where subjects branch into tasks.
The owner found Trello too list-bound, Milanote not branch-like enough, and MindMeister too rigid.
Core needs: nested groups, free placement, different text sizes, and per-task checklists, due dates and links.

## Current architecture
- Single file: `index.html` (HTML + CSS + vanilla JS, no dependencies, no build step)
- Font: Bricolage Grotesque from Google Fonts, with system fallbacks
- State: `S = { nodes: {id: Node}, view: {x, y, k} }`, saved to localStorage under key `branches.v1`
- Node shape:
  `{ id, parent (null for a subject), x, y, title, size (1-4), color (subjects only), done, due ("YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"), items: [{id, text, done}], links: [{url, label}] }`
- Rendering: `render()` rebuilds all cards into `#nodes`; `drawEdges()` draws bezier connectors in an SVG layer; `applyView()` handles pan and zoom via a CSS transform on `#world`
- Branch colour is inherited from the root subject (`colorOf`)
- Side panel (`renderPanel`) edits the selected card; the due list is `renderDue`

## Conventions
- Keep it dependency-free unless a feature clearly needs a library
- Light and dark themes use CSS custom properties on `:root`
- Must keep working on mobile (pointer events, pinch zoom, bottom-sheet panel under 720px)

## Possible next steps
- Split into `index.html`, `styles.css` and `app.js`
- Sync across devices (e.g. Supabase or Firebase) so phone and laptop share one board
- Real reminders when the page is closed (PWA + service worker + push)
- Make it installable as a PWA (manifest + icons)
- Multiple boards
- Search
