# Reddit Launch Posts for brag.fast

## Post 1: r/SideProject

### Title Options (pick one)
1. **I built a tool that turns your GitHub releases into branded images and videos automatically**
2. **I got tired of never announcing my releases, so I built something to do it for me**
3. **Show r/SideProject: brag.fast turns your releases into social images and videos with one API call**

### Post Type
Image post. Attach a real brag.fast output image (landscape format looks best in Reddit's feed). Add the story as the first comment.

### Media to Include
Best option: attach a short screen recording or GIF showing a generated video (the animated slide transitions are the real showstopper). If not possible, attach a landscape image output. The visual IS the hook. Make it look good. A video clip will massively outperform a static image on Reddit.

### First Comment (post this immediately after submitting)

> I ship side projects constantly but never make social content to go with them. Every time I'd tell myself "I'll make a quick graphic in Canva" and then just... not. And video? Forget it. That's a whole afternoon in CapCut for a 15-second clip.
>
> So I built brag.fast. It takes your release details and generates branded images AND videos. Three formats (landscape, square, portrait), all from one API call.
>
> The video part is the real cooker. Same branded slides, but animated with transitions. Each slide gets 5 seconds (configurable), rendered at 30fps. Drop `"video": true` into the same API call you'd use for images and you get a ready-to-post video back. No timeline editor. No After Effects. One API call.
>
> How it works:
> - **API route.** POST your release data to `/api/v1/cook` with `"video": true`. Get branded images and video back.
> - **GitHub App.** Install it, push a release, AI reads your changelog, images and video show up in your dashboard. Auto-approve or review first.
> - **AI skill.** Skill with MCP integration. Describe your release in conversation and add some images, get images and video back.
>
> There's also a visual template editor in the dashboard. Drag objects around, pick fonts, set colors, upload your logo, tweak per-format layouts (landscape, square, portrait all have independent canvases). You can even set per-object entrance animations for video. It's a proper design tool, just scoped to release announcements so it stays fast.
>
> Set up your brand and template once, every release gets the same look. No Canva. No video editing. No "I'll do it later."
>
> Stack: Next.js, Satori + Sharp for images, Remotion + AWS Lambda for video, Convex for the backend, Claude for AI changelog parsing.
>
> It's live and free to try. 10 free credits, no card required. Images cost 1 credit per slide per format, video costs 5.
>
> Would love feedback from other builders here. What would make this more useful for your projects?

---

## Post 2: r/indiehackers

### Title Options (pick one)
1. **I built an API that turns release notes into branded images and videos. Here's how and why.**
2. **I never announced my releases. So I built a tool that generates images and videos from them automatically.**
3. **Stop building in silence. I made a tool to auto-generate social images and videos from your releases.**

### Post Type
Text post (self post). Narrative style.

### Post Body

> **The problem I kept ignoring**
>
> I ship features all the time. New endpoints, bug fixes, UI overhauls. And then... nothing. No tweet. No LinkedIn post. No announcement. The release just sits there.
>
> I told myself the work speaks for itself. It doesn't. Nobody sees your features unless you show them.
>
> I'd open Canva, stare at a blank canvas, remember I don't want to spend my time doing this, and close the tab. Every single time.
>
> **What I built**
>
> brag.fast takes your release details and generates branded images and videos. Three formats (landscape, square, portrait), one API call.
>
> But the video is the real cooker. Same branded slides, but animated with transitions between each one. 30fps, configurable duration per slide. You add `"video": true` to the same API call and get an MP4 back. Ready to post. One extra field in your request, that's it.
>
> Push a GitHub release, get a branded video you can drop straight into LinkedIn or Twitter. No editing involved.
>
> There are three ways to use it:
>
> 1. **REST API.** POST to `/api/v1/cook` with your release data. Get back branded images in all three sizes, or video if you want that. One API call.
>
> 2. **GitHub App.** Install it on your repo. Publish a release, AI reads your changelog, images and video show up in your dashboard. Auto-approve or review first.
>
> 3. **AI skill.** Skill with MCP integration. Describe your release in conversation and add some images, get images and video back.
>
> There's a visual template editor too. You get a canvas per format, drag to position objects, pick fonts from a big Google Fonts list, set colors, upload static images, configure device frames (browser or mobile chrome around screenshots). For video, you can set entrance animations per object (fade, slide up, bounce) and a Ken Burns zoom on images.
>
> Design your template once, then every release uses it without you touching anything.
>
> **Why this specific problem**
>
> I'm an indie hacker. I know how to build things. I do not know how to announce them. And I kept noticing the same pattern in other builders: incredible products, zero social presence for their releases.
>
> The gap isn't talent or ambition. It's friction. Making a good-looking social image for every release is annoying enough that nobody does it. Making a video? That's a whole different level of "I'll do it next time."
>
> brag.fast removes that friction entirely. Ship a release, images appear. Show what you've been cooking.
>
> **Where it's at today**
>
> It's live. Free tier gives you 10 credits, no card required. Images cost 1 credit per slide per format, video costs 5. Paid plans start at $29/mo.
>
> Built with Next.js, Convex, Satori + Sharp for image rendering, Remotion for video generation, and Claude for AI changelog parsing.
>
> **What's next**
>
> Custom format, and more integrations beyond GitHub.
>
> If you ship software and skip the announcements, give it a look. Curious what you'd want different.

### Suggested Follow-Up Comment
Post this as a reply to your own post about 30 min after posting, or in response to the first engagement:

> Quick note on the dogfooding angle: I'm using brag.fast to generate the announcement images for brag.fast itself. If the images in this post look decent, that's the product doing its thing.

### Another Follow-Up for Technical Questions

> For anyone curious about the rendering: images use Satori (from Vercel) to convert React components to SVG, then Sharp to rasterize to JPEG. No headless browser, no Puppeteer. Fast and lightweight.
>
> Video uses Remotion running on AWS Lambda. Same React components that render the images get composed into an animated sequence with transitions between slides. 30fps, rendered serverside. You get a real MP4 back, not a slideshow GIF. The AI parsing uses Claude Haiku to read markdown release notes and extract structured slide content.

---

## General Reddit Tips for Launch Day

1. **Post Tuesday-Thursday, 8-10am ET** for best visibility
2. **Stagger the posts.** Don't post to both subs at the same time. Do r/SideProject first (it's more visual-friendly), then r/indiehackers 24-48 hours later
3. **Respond to every comment** within the first 2 hours. Reddit's algorithm weights early engagement heavily
4. **Don't be defensive.** If someone says "I'd just use Canva," respond with something like "Totally fair. This is for the people who keep meaning to open Canva and never do."
5. **Upvote and engage** with other posts in the sub before and after posting. Don't be a drive-by poster
6. **If someone asks about pricing**, be transparent: "10 free credits, no card. 1 credit per image slide per format, 5 per video slide. Paid starts at $29/mo for 800 credits. Most indie hackers won't need paid unless they ship weekly."
7. **Have your site ready.** Make sure the landing page loads fast, the CTA is clear, and signup works before posting
