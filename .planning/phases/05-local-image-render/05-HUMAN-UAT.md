---
status: partial
phase: 05-local-image-render
source: [05-VERIFICATION.md]
started: 2026-05-21T12:32:00Z
updated: 2026-05-21T12:32:00Z
---

## Current Test

awaiting human testing

## Tests

### 1. Build
expected: `npm run build` exits 0 locally.
result: pending

### 2. Start CLI Workspace
expected: The CLI starts with local credentials and opens the Workspace.
result: pending

### 3. Prepare Draft
expected: A selected template with at least one filled text slot is visible in the editor.
result: pending

### 4. Render Progress
expected: Clicking `Render images` flushes save, then shows three per-format progress rows.
result: pending

### 5. Terminal Progress
expected: CLI terminal logs per-format render progress.
result: pending

### 6. Rendered Preview
expected: Completed active format replaces the canvas with an actual rendered JPEG.
result: pending

### 7. Copy Caption
expected: `Copy caption` writes the caption to the clipboard and flashes `Copied!`.
result: pending

### 8. Download
expected: `Download landscape` downloads a `.jpg` file.
result: pending

### 9. Open Folder
expected: `Open folder` opens the OS file manager to the output folder.
result: pending

### 10. Output Files
expected: `./brag-output/<draftId>/` contains `landscape.jpg`, `square.jpg`, and `portrait.jpg`.
result: pending

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
