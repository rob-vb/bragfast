---
status: pending
phase: 06-local-video-render
source: [06-04-SUMMARY.md]
started: 2026-05-21T19:55:00Z
updated: 2026-05-21T19:55:00Z
---

## Current Test

awaiting human testing

## Tests

### 1. Full Test Suite
expected: `npx vitest run` exits 0, except for any explicitly accepted unrelated failures.
result: pending

### 2. Start CLI Workspace
expected: `brag` or the local CLI starts with credentials and opens the Workspace.
result: pending

### 3. Prepare Video Draft
expected: A Draft is open and a video file is placed into a visual Slot.
result: pending

### 4. Output Toggle
expected: Clicking `Video` persists `DraftConfig.output` and changes the render button to `Render video`.
result: pending

### 5. Chrome Download Gate
expected: On first run, the panel shows `One-time setup`, the Chrome download copy, and a lime progress bar from 0% to 100%; subsequent cached runs skip this gate.
result: pending

### 6. Frame Progress
expected: During render, the panel shows `Rendering video…` and a `NNN / 240 frames` counter; the terminal also shows video frame progress.
result: pending

### 7. Rendered Video Preview
expected: After render, a muted `<video controls>` preview appears and plays the rendered MP4.
result: pending

### 8. Output File
expected: `./brag-output/<draftId>/<format>.mp4` exists and has non-zero size.
result: pending

### 9. Download Video
expected: `Download video` downloads the rendered MP4.
result: pending

### 10. Open Folder
expected: `Open folder` reveals the local output folder.
result: pending

### 11. Image Path Still Available
expected: Clicking `Image` switches back to the existing `Render images` UI and does not remove the image render path.
result: pending

## Summary

total: 11
passed: 0
issues: 0
pending: 11
skipped: 0
blocked: 0

## Gaps
