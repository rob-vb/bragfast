I ship side projects constantly but never make social content to go with them. Every time I'd tell myself "I'll make a quick graphic in Canva" and then just... nah. And video? Forget it. That's a whole afternoon in CapCut for a 15-second clip.

I just shipped video generation this week, so figured it's time to share.

## What it is

[brag.fast](https://brag.fast) takes your release details and generates branded images AND videos. Three formats (landscape, square, portrait), one API call.

The video part is the real cooker. Same branded slides, but animated with transitions. Each slide gets 5 seconds (configurable), rendered at 30fps. Drop `"video": true` into the same API call and you get a ready-to-post MP4 back. No timeline editor. No After Effects. One API call.

[EMBED A VIDEO/GIF OF A GENERATED OUTPUT HERE]

## How it works

- **API route.** POST your release data to `/api/v1/cook` with `"video": true`. Get branded images and video back.
- **GitHub App.** Install it, push a release, AI reads your changelog, images and video show up in your admin. Auto-approve or review first.
- **AI skill.** Skill with MCP integration. Describe your release in conversation and add some images, get images and video back.

There's a visual template editor in the admin too. Drag objects around, pick fonts, set colors, configure per-format layouts. For video you can set entrance animations per object.

Set up your brand and template once, every release gets the same look. No Canva. No video editing. No "I'll do it later."

Stack: Next.js, Satori + Sharp for images, Remotion + AWS Lambda for video, Convex for the backend, Claude for AI changelog parsing.

It's live and free to try. 10 free credits, no card required. Images cost 1 credit per slide per format, video costs 5.

What would you want different? Curious what other builders here would actually use this for.
