---
status: partial
phase: 08-admin-trim
source: [08-VERIFICATION.md]
started: 2026-05-23T09:35:00Z
updated: 2026-05-23T09:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. New-user trial initialization
expected: Sign up as a new user and open /admin. Profile created with plan='trial' and trialEnd ~14 days out; billing status shows "On the House — N days left in your trial".
result: [pending]

### 2. Login → device approval redirect chain
expected: From a terminal run `brag login`; open the printed /device?code=XXXX URL while signed out. Browser redirects to /login?next=%2Fdevice%3Fcode%3DXXXX; after login it lands on /device with the code displayed and Approve/Deny buttons visible.
result: [pending]

### 3. Stripe subscribe ($29/mo plate)
expected: Subscribe via /admin/account/upgrade with a Stripe test card. Checkout opens; on success plan flips to 'plate'; account page shows "$29/mo · Subscribed"; ManageBillingButton appears.
result: [pending]

### 4. Brand logo → Workspace logo slot
expected: Set up a brand with a logo upload in /admin/brands; open the Workspace. The uploaded logo appears pre-filled in the logo slot when that brand is selected.
result: [pending]

### 5. Read-only gallery
expected: Navigate to /admin/history. Gallery shows thumbnails with status badges (completed/scheduled/pending/failed) and Download buttons only; no text editors, copy fields, "New Release" or "Edit" buttons.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
