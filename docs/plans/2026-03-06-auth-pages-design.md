# Auth Pages Design

## Overview
Login, sign up, and forgot password pages for brag.fast. Split-screen layout with branded panel.

## Brand Colors
- `#F8AF3C` — amber (primary accent, branded panel bg, buttons)
- `#4A3326` — dark brown (text, logo on branded panel)
- `#FFFFFF` — white
- `#F9F6ED` — cream (form panel background)

## Layout
- **Desktop**: 50/50 split-screen. Left = branded panel, right = form.
- **Mobile**: Branded panel hidden or collapsed to small logo header. Form full-width.

## Left Panel (Brand)
- Solid `#F8AF3C` background
- brag.fast icon logo (SVG) centered
- No other elements

## Right Panel (Form)
- `#F9F6ED` cream background
- `#4A3326` dark brown text
- shadcn/ui inputs, buttons, checkbox
- Primary button: `#F8AF3C` bg with `#4A3326` text
- Secondary/link text: muted brown

## Pages

### `/login`
- Heading: "Welcome back"
- Fields: email, password
- Primary button: "Sign in"
- Links: "Forgot password?" -> /forgot-password, "Create an account" -> /signup

### `/signup`
- Heading: "Create your account"
- Fields: name, email, password, confirm password
- Checkbox: "I agree to the Terms of Service and Privacy Policy" (with links)
- Primary button: "Create account"
- Link: "Already have an account?" -> /login

### `/forgot-password`
- Heading: "Reset your password"
- Fields: email
- Primary button: "Send reset link"
- Success state: confirmation message
- Link: "Back to login" -> /login

## File Structure
```
src/app/(auth)/
  layout.tsx          -- split-screen shell (branded panel + form area)
  login/page.tsx
  signup/page.tsx
  forgot-password/page.tsx
src/components/ui/    -- shadcn components (button, input, label, checkbox)
public/
  logo-icon.svg       -- brag.fast icon logo for branded panel
```

## Route Group
`(auth)` route group shares split-screen layout without affecting URL paths.

## Auth Backend
- better-auth with email/password (already configured)
- No OAuth providers
- API route at `/api/auth/[...all]/route.ts` (exists)
- Rate limiting on sign-ups (exists)

## Typography
- Geist Sans (already loaded in root layout)

## Aesthetic
- Warm, premium feel from amber + brown on cream
- Minimal branded panel — just logo on amber
- Clean form side, generous whitespace
- shadcn components for consistency
