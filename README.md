# Stilldraft

Stilldraft is a static, offline-first writing studio for novels and long-form drafts. It is designed for GitHub Pages, requires no backend, and saves your work locally in the browser.

## What is included

- `index.html` — main writing app
- `published.html` — optional public reader page
- `styles.css` — shared UI and reader styling
- `app.js` — dashboard, editor, autosave, export, and local storage logic
- `published.js` — standalone reader page logic
- `sw.js` — service worker for offline shell caching
- `manifest.webmanifest` — installable app metadata
- `published-project.json` — sample public manuscript file
- `assets/` — icons

## Deploy to GitHub Pages in 4 steps

1. Create a new GitHub repository and upload every file in this folder to the repository root.
2. In the repository settings, open **Pages** and set the source to **Deploy from a branch**.
3. Choose the **main** branch and the **root** folder, then save.
4. Open the GitHub Pages URL once while online so the service worker can cache the app for offline use.

## Customize it after upload

1. Open `index.html` in your browser from the GitHub Pages URL.
2. Click **New project** to add your book title, author name, genre, and summary.
3. Write in the editor. Your changes autosave to the browser storage for that site.
4. Use **Backup JSON** regularly so you have a portable copy of all projects.

## Daily usage guide

### Add a project

- From the dashboard, click **New project**.
- Fill in the title and optional details.
- A starter chapter is created automatically.

### Write chapters

- Select a project, then use **Open editor**.
- Add chapters with the `+` button.
- Switch between **Write**, **Split**, and **Preview** modes.
- Use **Focus mode** for a more distraction-free workspace.

### Save work

- Stilldraft autosaves after you type.
- The status pill in the header shows when your work has been saved locally.
- Use **Backup JSON** from the sidebar to keep an external copy.

### Export

- **Export TXT** downloads the manuscript as plain text.
- **Export MD** downloads the manuscript as Markdown.
- **Export PDF** downloads a clean text PDF.
- **Print** opens the browser print flow for a typeset reader-style layout.

## Optional published page

Stilldraft also includes `published.html`, a static page meant for readers.

### Easiest way to publish finished work

1. In the editor, open the finished project.
2. Click **Export publish JSON**.
3. Replace the repo's `published-project.json` file with the exported one.
4. Commit the change to GitHub.
5. Share `published.html` from your GitHub Pages site.

That gives you a simple public reading page with no backend.

## Notes

- Data lives in browser storage, so it is tied to the browser profile and device until you export a backup.
- GitHub Pages is static hosting, so truly shared public content must be committed to the repo, which is why `published.html` reads `published-project.json`.
- The built-in PDF export is text-focused and best for manuscript drafts. For exact visual layout, use **Print** and save as PDF from the browser.
