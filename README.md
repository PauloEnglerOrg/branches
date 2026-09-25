# Branches

A mind-map style to-do app. Tasks live on a free canvas, grouped into colour-coded subjects that branch out like a mind map.

## Features

- Subjects (coloured blocks) with tasks branching off them, nested as deep as you like
- Drag cards anywhere, moving a whole branch or a single card
- Each card can hold a checklist, a due date and time, and links
- Four text sizes per card (S, M, L, XL)
- Due view that lists overdue, today and upcoming tasks
- Keyboard flow: `Enter` adds a task below, `Tab` adds a branch, `Shift+Tab` goes back up
- Works on desktop and mobile (pan, pinch zoom)
- Data is saved in the browser (localStorage); Backup copies and restores the whole board as text

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy

Enable GitHub Pages on the `main` branch (root folder) and the app will be live at
`https://<your-username>.github.io/branches/`.
