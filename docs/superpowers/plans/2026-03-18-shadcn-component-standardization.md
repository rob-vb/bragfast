# shadcn Component Standardization — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw HTML form elements in admin and auth pages with shadcn/Radix components.

**Architecture:** Swap raw `<input>`, `<select>`, `<checkbox>` with existing shadcn Input, Select, Checkbox, Label. Install Switch and Textarea. Use sentinel values for Radix Select empty-value gotcha. Keep PixelButton and auth submit buttons untouched.

**Tech Stack:** shadcn/ui, Radix UI, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-18-shadcn-component-standardization-design.md`

---

## Chunk 1: Install new components + migrate admin pages

### Task 1: Install shadcn Switch and Textarea

**Files:**
- Create: `src/components/ui/switch.tsx`
- Create: `src/components/ui/textarea.tsx`

- [ ] **Step 1: Install Switch**

Run: `npx shadcn@latest add switch`
Expected: creates `src/components/ui/switch.tsx`

- [ ] **Step 2: Install Textarea**

Run: `npx shadcn@latest add textarea`
Expected: creates `src/components/ui/textarea.tsx`

- [ ] **Step 3: Verify both exist**

Run: `ls src/components/ui/switch.tsx src/components/ui/textarea.tsx`

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/switch.tsx src/components/ui/textarea.tsx
git commit -m "feat: install shadcn Switch and Textarea components"
```

---

### Task 2: Migrate github-repo-card.tsx

**Files:**
- Modify: `src/components/admin/github-repo-card.tsx`

**Key gotcha:** Brand select has `value=""` for "None" option. Radix Select doesn't support empty string values. Use `"__none__"` as sentinel, map back to `""` in state.

- [ ] **Step 1: Add imports**

Replace the existing imports at top of file. Add:

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

- [ ] **Step 2: Remove the `inputClass` constant**

Delete the `inputClass` variable (line 81-82). No longer needed.

- [ ] **Step 3: Replace "Enabled" toggle with Switch**

Replace (lines 97-105):
```tsx
<label className="flex items-center gap-2 cursor-pointer">
  <span className="text-xs text-brand/60">Enabled</span>
  <input
    type="checkbox"
    checked={enabled}
    onChange={(e) => setEnabled(e.target.checked)}
    className="accent-[var(--color-gold)]"
  />
</label>
```

With:
```tsx
<div className="flex items-center gap-2">
  <Label htmlFor={`enabled-${repo.full_name}`} className="text-xs text-brand/60">Enabled</Label>
  <Switch
    id={`enabled-${repo.full_name}`}
    checked={enabled}
    onCheckedChange={setEnabled}
  />
</div>
```

- [ ] **Step 4: Replace Brand select with shadcn Select**

Replace (lines 114-122):
```tsx
<div>
  <label className="block text-xs text-brand/60 mb-1">Brand</label>
  <select className={inputClass} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
    <option value="">None (fallback colors)</option>
    {brands.map((b) => (
      <option key={b.externalId} value={b.externalId}>{b.name}</option>
    ))}
  </select>
</div>
```

With:
```tsx
<div className="space-y-1">
  <Label className="text-xs text-brand/60">Brand</Label>
  <Select value={brandId || "__none__"} onValueChange={(v) => setBrandId(v === "__none__" ? "" : v)}>
    <SelectTrigger className="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="__none__">None (fallback colors)</SelectItem>
      {brands.map((b) => (
        <SelectItem key={b.externalId} value={b.externalId}>{b.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 5: Replace Template select with shadcn Select**

Replace (lines 124-131):
```tsx
<div>
  <label className="block text-xs text-brand/60 mb-1">Template</label>
  <select className={inputClass} value={template} onChange={(e) => setTemplate(e.target.value)}>
    {templates.map((t) => (
      <option key={t.externalId} value={t.externalId}>{t.name}</option>
    ))}
  </select>
</div>
```

With:
```tsx
<div className="space-y-1">
  <Label className="text-xs text-brand/60">Template</Label>
  <Select value={template} onValueChange={setTemplate}>
    <SelectTrigger className="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {templates.map((t) => (
        <SelectItem key={t.externalId} value={t.externalId}>{t.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 6: Replace format checkboxes with shadcn Checkbox**

Replace (lines 133-148):
```tsx
<div>
  <label className="block text-xs text-brand/60 mb-1">Formats</label>
  <div className="flex gap-3">
    {FORMAT_OPTIONS.map((f) => (
      <label key={f} className="flex items-center gap-1 text-xs text-brand cursor-pointer">
        <input
          type="checkbox"
          checked={formats.includes(f)}
          onChange={() => toggleFormat(f)}
          className="accent-[var(--color-gold)]"
        />
        {f}
      </label>
    ))}
  </div>
</div>
```

With:
```tsx
<div className="space-y-1">
  <Label className="text-xs text-brand/60">Formats</Label>
  <div className="flex gap-3">
    {FORMAT_OPTIONS.map((f) => (
      <div key={f} className="flex items-center gap-1.5">
        <Checkbox
          id={`format-${f}-${repo.full_name}`}
          checked={formats.includes(f)}
          onCheckedChange={() => toggleFormat(f)}
        />
        <Label htmlFor={`format-${f}-${repo.full_name}`} className="text-xs text-brand cursor-pointer">{f}</Label>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 7: Replace Tag filter input**

Replace (lines 150-158):
```tsx
<div>
  <label className="block text-xs text-brand/60 mb-1">Tag filter</label>
  <input
    className={inputClass}
    placeholder="v*"
    value={tagFilter}
    onChange={(e) => setTagFilter(e.target.value)}
  />
</div>
```

With:
```tsx
<div className="space-y-1">
  <Label className="text-xs text-brand/60">Tag filter</Label>
  <Input
    placeholder="v*"
    value={tagFilter}
    onChange={(e) => setTagFilter(e.target.value)}
  />
</div>
```

- [ ] **Step 8: Replace "Skip pre-releases" with Switch**

Replace (lines 160-168):
```tsx
<label className="flex items-center gap-2 text-xs text-brand cursor-pointer">
  <input
    type="checkbox"
    checked={skipPrereleases}
    onChange={(e) => setSkipPrereleases(e.target.checked)}
    className="accent-[var(--color-gold)]"
  />
  Skip pre-releases
</label>
```

With:
```tsx
<div className="flex items-center gap-2">
  <Switch
    id={`skip-prereleases-${repo.full_name}`}
    checked={skipPrereleases}
    onCheckedChange={setSkipPrereleases}
  />
  <Label htmlFor={`skip-prereleases-${repo.full_name}`} className="text-xs text-brand cursor-pointer">Skip pre-releases</Label>
</div>
```

- [ ] **Step 9: Replace Webhook URL input**

Replace (lines 170-178):
```tsx
<div>
  <label className="block text-xs text-brand/60 mb-1">Webhook URL (optional)</label>
  <input
    className={inputClass}
    placeholder="https://your-app.com/webhooks/bragfast"
    value={webhookUrl}
    onChange={(e) => setWebhookUrl(e.target.value)}
  />
</div>
```

With:
```tsx
<div className="space-y-1">
  <Label className="text-xs text-brand/60">Webhook URL (optional)</Label>
  <Input
    placeholder="https://your-app.com/webhooks/bragfast"
    value={webhookUrl}
    onChange={(e) => setWebhookUrl(e.target.value)}
  />
</div>
```

- [ ] **Step 10: Replace "Auto-approve" with Switch**

Replace (lines 181-189):
```tsx
<label className="flex items-center gap-2 text-xs text-brand cursor-pointer">
  <input
    type="checkbox"
    checked={autoApprove}
    onChange={(e) => setAutoApprove(e.target.checked)}
    className="accent-[var(--color-gold)]"
  />
  Auto-approve (skip manual review)
</label>
```

With:
```tsx
<div className="flex items-center gap-2">
  <Switch
    id={`auto-approve-${repo.full_name}`}
    checked={autoApprove}
    onCheckedChange={setAutoApprove}
  />
  <Label htmlFor={`auto-approve-${repo.full_name}`} className="text-xs text-brand cursor-pointer">Auto-approve (skip manual review)</Label>
</div>
```

- [ ] **Step 11: Replace Max slides input**

Replace (lines 192-203):
```tsx
<div>
  <label className="block text-xs text-brand/60 mb-1">Max slides per release</label>
  <input
    type="number"
    min={1}
    max={5}
    className={inputClass}
    value={maxSlides}
    onChange={(e) => setMaxSlides(Math.max(1, Math.min(5, Number(e.target.value))))}
    style={{ maxWidth: 80 }}
  />
</div>
```

With:
```tsx
<div className="space-y-1">
  <Label className="text-xs text-brand/60">Max slides per release</Label>
  <Input
    type="number"
    min={1}
    max={5}
    className="max-w-20"
    value={maxSlides}
    onChange={(e) => setMaxSlides(Math.max(1, Math.min(5, Number(e.target.value))))}
  />
</div>
```

- [ ] **Step 12: Verify the dev server runs without errors**

Run: `npx next build --no-lint 2>&1 | tail -20` (or check dev server)
Expected: no compilation errors

- [ ] **Step 13: Commit**

```bash
git add src/components/admin/github-repo-card.tsx
git commit -m "feat: migrate github-repo-card to shadcn components"
```

---

### Task 3: Migrate brand-form.tsx

**Files:**
- Modify: `src/components/admin/brand-form.tsx`

**Key gotcha:** Font select uses `<optgroup>` — map to SelectGroup + SelectLabel. Default font `value=""` needs sentinel `"__default__"`.

- [ ] **Step 1: Add imports**

Add at top of file:
```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel as SelectGroupLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

Note: import `SelectLabel as SelectGroupLabel` to avoid collision with the `Label` component.

- [ ] **Step 2: Remove the `inputClass` constant**

Delete the `inputClass` variable (line 118-119).

- [ ] **Step 3: Replace Name input**

Replace:
```tsx
<div>
  <label className="mb-1 block text-xs font-bold text-brand">Name *</label>
  <input
    className={inputClass}
    value={form.name}
    onChange={(e) => update("name", e.target.value)}
    required
    placeholder="My Product"
  />
</div>
```

With:
```tsx
<div className="space-y-1">
  <Label className="text-xs font-bold text-brand">Name *</Label>
  <Input
    value={form.name}
    onChange={(e) => update("name", e.target.value)}
    required
    placeholder="My Product"
  />
</div>
```

- [ ] **Step 4: Replace Logo URL input**

Replace (line 214-219):
```tsx
<input
  className={inputClass}
  value={form.logo_url ?? ""}
  onChange={(e) => update("logo_url", e.target.value)}
  placeholder="https://... or upload above"
/>
```

With:
```tsx
<Input
  value={form.logo_url ?? ""}
  onChange={(e) => update("logo_url", e.target.value)}
  placeholder="https://... or upload above"
/>
```

- [ ] **Step 5: Replace Website input**

Replace:
```tsx
<div>
  <label className="mb-1 block text-xs font-bold text-brand">Website</label>
  <input
    className={inputClass}
    value={form.website ?? ""}
    onChange={(e) => update("website", e.target.value)}
    placeholder="https://..."
  />
</div>
```

With:
```tsx
<div className="space-y-1">
  <Label className="text-xs font-bold text-brand">Website</Label>
  <Input
    value={form.website ?? ""}
    onChange={(e) => update("website", e.target.value)}
    placeholder="https://..."
  />
</div>
```

- [ ] **Step 6: Replace Font select**

Replace:
```tsx
<div>
  <label className="mb-1 block text-xs font-bold text-brand">Font</label>
  <select
    className={inputClass}
    value={form.font_family ?? ""}
    onChange={(e) => update("font_family", e.target.value)}
  >
    <option value="">Plus Jakarta Sans</option>
    {Object.entries(FONT_CATALOG).map(([category, fonts]) => (
      <optgroup key={category} label={category}>
        {fonts.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </optgroup>
    ))}
  </select>
</div>
```

With:
```tsx
<div className="space-y-1">
  <Label className="text-xs font-bold text-brand">Font</Label>
  <Select
    value={form.font_family || "__default__"}
    onValueChange={(v) => update("font_family", v === "__default__" ? "" : v)}
  >
    <SelectTrigger className="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="__default__">Plus Jakarta Sans</SelectItem>
      {Object.entries(FONT_CATALOG).map(([category, fonts]) => (
        <SelectGroup key={category}>
          <SelectGroupLabel>{category}</SelectGroupLabel>
          {fonts.map((font) => (
            <SelectItem key={font} value={font}>{font}</SelectItem>
          ))}
        </SelectGroup>
      ))}
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 7: Replace color hex inputs and labels**

Replace:
```tsx
{(["background", "text", "primary"] as const).map((key) => (
  <div key={key}>
    <label className="mb-1 block text-xs font-bold text-brand capitalize">
      {key}
    </label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={form.colors[key]}
        onChange={(e) => updateColor(key, e.target.value)}
        className="h-8 w-8 cursor-pointer border-2 border-brand"
      />
      <input
        className={`${inputClass} font-mono text-xs`}
        value={form.colors[key]}
        onChange={(e) => updateColor(key, e.target.value)}
      />
    </div>
  </div>
))}
```

With:
```tsx
{(["background", "text", "primary"] as const).map((key) => (
  <div key={key}>
    <Label className="text-xs font-bold text-brand capitalize">
      {key}
    </Label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={form.colors[key]}
        onChange={(e) => updateColor(key, e.target.value)}
        className="h-8 w-8 cursor-pointer border-2 border-brand"
      />
      <Input
        className="font-mono text-xs"
        value={form.colors[key]}
        onChange={(e) => updateColor(key, e.target.value)}
      />
    </div>
  </div>
))}
```

Note: `<input type="color">` stays raw — no shadcn equivalent.

- [ ] **Step 8: Replace Logo label**

Replace:
```tsx
<label className="mb-1 block text-xs font-bold text-brand">Logo</label>
```

With:
```tsx
<Label className="text-xs font-bold text-brand">Logo</Label>
```

- [ ] **Step 9: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -20`

- [ ] **Step 10: Commit**

```bash
git add src/components/admin/brand-form.tsx
git commit -m "feat: migrate brand-form to shadcn components"
```

---

### Task 4: Migrate key-manager.tsx and delete-account-dialog.tsx

**Files:**
- Modify: `src/components/admin/key-manager.tsx`
- Modify: `src/components/admin/delete-account-dialog.tsx`

- [ ] **Step 1: Migrate key-manager input**

Add import:
```tsx
import { Input } from "@/components/ui/input";
```

Remove the `inputClass` constant.

Replace:
```tsx
<input
  className={inputClass}
  placeholder="Key name (optional)"
  value={name}
  onChange={(e) => setName(e.target.value)}
  style={{ maxWidth: 240 }}
/>
```

With:
```tsx
<Input
  className="max-w-60"
  placeholder="Key name (optional)"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
```

- [ ] **Step 2: Migrate delete-account-dialog input + label**

Add imports:
```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
```

Replace:
```tsx
<label className="text-xs text-brand/60">
  Type <strong className="text-brand">{userEmail}</strong> to
  confirm
</label>
<input
  type="text"
  value={confirmation}
  onChange={(e) => setConfirmation(e.target.value)}
  className="w-full border-2 border-brand bg-white px-3 py-2 text-sm text-brand placeholder:text-brand/40 focus:outline-none focus:ring-2 focus:ring-red-500"
  placeholder={userEmail}
  autoComplete="off"
/>
```

With:
```tsx
<Label className="text-xs text-brand/60">
  Type <strong className="text-brand">{userEmail}</strong> to
  confirm
</Label>
<Input
  value={confirmation}
  onChange={(e) => setConfirmation(e.target.value)}
  placeholder={userEmail}
  autoComplete="off"
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/key-manager.tsx src/components/admin/delete-account-dialog.tsx
git commit -m "feat: migrate key-manager and delete-account-dialog to shadcn components"
```

---

### Task 5: Migrate pending-reviews.tsx

**Files:**
- Modify: `src/components/admin/pending-reviews.tsx`

- [ ] **Step 1: Add import**

```tsx
import { Textarea } from "@/components/ui/textarea";
```

- [ ] **Step 2: Replace textarea**

Replace:
```tsx
<textarea
  className="w-full border-2 border-brand bg-white px-3 py-2 text-xs font-mono text-brand min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]"
  value={editedContent}
  onChange={(e) => setEditedContent(e.target.value)}
/>
```

With:
```tsx
<Textarea
  className="text-xs font-mono min-h-[120px]"
  value={editedContent}
  onChange={(e) => setEditedContent(e.target.value)}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/pending-reviews.tsx
git commit -m "feat: migrate pending-reviews textarea to shadcn Textarea"
```

---

## Chunk 2: Migrate auth pages

### Task 6: Migrate signup page

**Files:**
- Modify: `src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
```

- [ ] **Step 2: Replace all text inputs**

Replace each raw input (name, email, password, confirm-password) pattern:
```tsx
<input
  id="name"
  type="text"
  placeholder="Jane Smith"
  value={name}
  onChange={(e) => setName(e.target.value)}
  required
  autoComplete="name"
  className="w-full border-2 border-brand bg-white px-3 py-2 text-sm text-brand placeholder:text-brand/40 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
/>
```

With:
```tsx
<Input
  id="name"
  type="text"
  placeholder="Jane Smith"
  value={name}
  onChange={(e) => setName(e.target.value)}
  required
  autoComplete="name"
/>
```

Repeat for email, password, and confirm-password inputs (same pattern — remove `className`, keep all other props).

- [ ] **Step 3: Replace terms checkbox**

Replace:
```tsx
<div className="flex items-start gap-3">
  <input
    id="terms"
    type="checkbox"
    checked={agreed}
    onChange={(e) => setAgreed(e.target.checked)}
    className="mt-0.5 h-4 w-4 border-2 border-brand appearance-none checked:bg-gold checked:border-brand cursor-pointer relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-brand checked:after:text-xs checked:after:font-bold"
  />
  <label htmlFor="terms" className="text-sm leading-snug text-brand/70">
    I agree to the{" "}
    <Link href="/terms" className="text-brand underline underline-offset-4">Terms of Service</Link>
    {" "}and{" "}
    <Link href="/privacy" className="text-brand underline underline-offset-4">Privacy Policy</Link>
  </label>
</div>
```

With:
```tsx
<div className="flex items-start gap-3">
  <Checkbox
    id="terms"
    checked={agreed}
    onCheckedChange={(checked) => setAgreed(checked === true)}
    className="mt-0.5"
  />
  <label htmlFor="terms" className="text-sm leading-snug text-brand/70">
    I agree to the{" "}
    <Link href="/terms" className="text-brand underline underline-offset-4">Terms of Service</Link>
    {" "}and{" "}
    <Link href="/privacy" className="text-brand underline underline-offset-4">Privacy Policy</Link>
  </label>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/signup/page.tsx
git commit -m "feat: migrate signup page to shadcn Input and Checkbox"
```

---

### Task 7: Migrate login and forgot-password pages

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/forgot-password/page.tsx`

- [ ] **Step 1: Migrate login page inputs**

Add import:
```tsx
import { Input } from "@/components/ui/input";
```

Replace both raw inputs (email, password) — remove `className`, keep all other props:
```tsx
<Input
  id="email"
  type="email"
  placeholder="you@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  autoComplete="email"
/>
```

Same for password input.

- [ ] **Step 2: Migrate forgot-password page input**

Add import:
```tsx
import { Input } from "@/components/ui/input";
```

Replace the email input — same pattern as above.

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -20`
Expected: no compilation errors

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/login/page.tsx src/app/(auth)/forgot-password/page.tsx
git commit -m "feat: migrate login and forgot-password pages to shadcn Input"
```

---

### Task 8: Visual verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Check each page visually**

Verify in browser:
- `/login` — inputs render with shadcn styling
- `/signup` — inputs + checkbox render correctly, terms checkbox toggles
- `/forgot-password` — input renders
- `/admin` — repo card: switches toggle, selects open with dropdown, checkboxes work, inputs render
- `/admin/brands/new` — all inputs render, font select shows grouped options
- `/admin/keys` — input renders

- [ ] **Step 3: Check functionality**

- Brand select "None" option works (sentinel value maps correctly)
- Font select default option works
- Format checkboxes toggle correctly
- Switch toggles save correctly
- All forms submit without errors
