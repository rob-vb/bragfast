# Standardize on shadcn/Radix Components

## Goal

Replace raw HTML form elements in dashboard and auth pages with shadcn/Radix components for visual consistency. The editor already uses shadcn — this brings the rest of the app in line.

## Scope

### Keep as-is
- **PixelButton** — all dashboard/auth submit buttons
- **Editor components** — already shadcn, no changes
- **Auth page layout** — NES card wrappers, header bars
- **Color pickers** (`<input type="color">`) — no shadcn equivalent
- **File inputs** — hidden, invisible to user

### New component to install
- shadcn **Switch** (not yet in `src/components/ui/`)

### Replacements

#### github-repo-card.tsx
| Element | Current | Target |
|---|---|---|
| "Enabled" toggle | raw checkbox + `accent-color` | shadcn **Switch** |
| "Skip pre-releases" | raw checkbox + `accent-color` | shadcn **Switch** |
| "Auto-approve" | raw checkbox + `accent-color` | shadcn **Switch** |
| Format checkboxes (landscape/square/portrait) | raw checkboxes + `accent-color` | shadcn **Checkbox** + **Label** |
| Brand select | raw `<select>` | shadcn **Select** |
| Template select | raw `<select>` | shadcn **Select** |
| Tag filter input | raw `<input>` | shadcn **Input** |
| Webhook URL input | raw `<input>` | shadcn **Input** |
| Max slides input | raw `<input type="number">` | shadcn **Input** |
| All labels | raw `<label>` | shadcn **Label** |

#### brand-form.tsx
| Element | Current | Target |
|---|---|---|
| Name input | raw `<input>` | shadcn **Input** |
| Logo URL input | raw `<input>` | shadcn **Input** |
| Website input | raw `<input>` | shadcn **Input** |
| Font select | raw `<select>` with `<optgroup>` | shadcn **Select** with **SelectGroup** + **SelectLabel** |
| Color hex inputs | raw `<input>` | shadcn **Input** |
| All labels | raw `<label>` | shadcn **Label** |

#### key-manager.tsx
| Element | Current | Target |
|---|---|---|
| Key name input | raw `<input>` | shadcn **Input** |

#### signup/page.tsx
| Element | Current | Target |
|---|---|---|
| Name, email, password, confirm inputs | raw `<input>` | shadcn **Input** |
| Terms checkbox | raw checkbox with CSS pseudo-element | shadcn **Checkbox** |

#### login/page.tsx
| Element | Current | Target |
|---|---|---|
| Email, password inputs | raw `<input>` | shadcn **Input** |

#### forgot-password/page.tsx
| Element | Current | Target |
|---|---|---|
| Email input | raw `<input>` | shadcn **Input** |

## Styling approach

Use shadcn defaults as-is (rounded corners, subtle borders, ring focus states). No custom overrides to match the sharp-corner NES aesthetic. Clean form controls inside retro frames is an intentional design choice.

## Component semantics

- **Switch** for on/off toggles: Enabled, Skip pre-releases, Auto-approve
- **Checkbox** for multi-select sets: format selection (landscape/square/portrait)
- **Checkbox** for confirmations: terms agreement on signup

## What this does NOT include

- No changes to PixelButton, PixelCard, PixelTable, CopyButton
- No changes to editor sidebar components
- No new patterns or abstractions
- No data flow changes — same state management, same handlers
