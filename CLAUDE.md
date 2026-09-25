# Branches — project notes for Claude Code

## What this is
A personal to-do app that works like a mind map: an infinite canvas of boxes that branch into other boxes. Every box is the same kind of thing (no subject/task split); any box can be free-floating or linked under another.
The owner found Trello too list-bound, Milanote not branch-like enough, and MindMeister too rigid.
Core needs: nested groups, free placement, different text sizes, and per-task checklists, due dates and links.

## Current architecture
- Single file: `index.html` (HTML + CSS + vanilla JS, no dependencies, no build step)
- Font: Bricolage Grotesque from Google Fonts, with system fallbacks
- State: `S = { nodes: {id: Node}, view: {x, y, k} }`, saved to localStorage under key `branches.v1`
- Node shape:
  `{ id, parent (null = free-floating), x, y, title, size (1-4), color (optional hex; a coloured box is filled, text colour from `onColor`), done, due ("YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"), items: [{id, text, done}], links: [{url, label}], side (optional 't'|'r'|'b'|'l': which side of the parent the connector leaves from), collapsed (optional true: hides all descendants), w/h (optional custom box width / min-height set with the corner handle), repeat (optional {every, unit day|week|month|year, days, dom, anchor, from}: ticking rolls `due` on via `nextDue()`), task (optional true: shows a tick-box; `isTask()` also treats untagged done boxes as tasks) }`
- Snapping: while dragging, `snapX` aligns edges/centres and matches gaps between neighbouring cards (y axis via `flip`); pink guides drawn in `#guides`; Alt/Option disables
- Canvas: mouse drag on empty space draws a selection box (`g.type==='marquee'`, Shift adds); touch, middle button or Space+drag pans; wheel/trackpad pans
- Undo/redo/History: `hist` = board snapshots since page load, `hi` = current; `save()` queues `checkpoint()` (500ms merge), `describe()` labels steps; remote sync changes become their own step
- Views (`view`, `setView`): Branches = canvas; Tasks = `#listview` via `renderTasks` (isTask boxes grouped by due date); Calendar = `#calview` via `renderCal` (`calMode` day/week/month/year, `calDate`). `render()` refreshes the active non-canvas view; the side panel works in every view
- Selection: `sel` is the single selected card (side panel); `msel` is a Set for Shift+click multi-select (multi panel, group drag, bulk delete)
- Rendering: `render()` rebuilds all cards into `#nodes`; `drawEdges()` draws bezier connectors in an SVG layer; `applyView()` handles pan and zoom via a CSS transform on `#world`
- Each box has its own optional colour (`colorOf`); presets in `COLORS` plus a native colour picker. Connectors use `--edge` (white in dark mode, dark grey in light mode)
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
