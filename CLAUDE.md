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
  `{ id, parent (null for a subject), x, y, title, size (1-4), color (subjects only), done, due ("YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"), items: [{id, text, done}], links: [{url, label}], side (optional 't'|'r'|'b'|'l': which side of the parent the connector leaves from), collapsed (optional true: hides all descendants) }`
- Selection: `sel` is the single selected card (side panel); `msel` is a Set for Shift+click multi-select (multi panel, group drag, bulk delete)
- Rendering: `render()` rebuilds all cards into `#nodes`; `drawEdges()` draws bezier connectors in an SVG layer; `applyView()` handles pan and zoom via a CSS transform on `#world`
- Branch colour is inherited from the root subject (`colorOf`)
- Side panel (`renderPanel`) edits the selected card; the due list is `renderDue`
- Sync: Firebase (project `branches-f3238`), Google sign-in + Firestore, SDK loaded by dynamic `import()` from gstatic.
  One doc per card at `users/{uid}/nodes/{id}`; `save()` also calls `queuePush()`, which diffs against `synced` and batch-writes changes.
  `onRemote` applies incoming changes (an unsent local edit wins). The first sign-in on a device uploads if the cloud is empty,
  otherwise loads the cloud board and keeps the old local one under `branches.presync`. Pan/zoom (`S.view`) stays per device.
  Firestore rules only allow `request.auth.uid == uid`.

## Conventions
- Keep it dependency-free unless a feature clearly needs a library (Firebase is the one exception, for sync)
- Light and dark themes use CSS custom properties on `:root`
- Must keep working on mobile (pointer events, pinch zoom, bottom-sheet panel under 720px)

## Possible next steps
- Split into `index.html`, `styles.css` and `app.js`
- Real reminders when the page is closed (PWA + service worker + push)
- Make it installable as a PWA (manifest + icons)
- Multiple boards
- Search
