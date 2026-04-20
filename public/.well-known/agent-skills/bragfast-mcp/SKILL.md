---
name: bragfast-mcp
type: mcp
version: 1.0.0
description: Generate branded social media images and videos for product releases via the brag.fast MCP server.
transport: http
url: https://mcp.brag.fast/mcp
authentication:
  type: bearer
  description: Obtain an API key at https://brag.fast/keys
---

# brag.fast MCP Skill

Generate branded release images and videos for any product launch in seconds.

## Setup

Add the brag.fast MCP server to your AI agent:

```bash
claude mcp add bragfast --transport http https://mcp.brag.fast/mcp
```

Then authenticate with your API key from [brag.fast/keys](https://brag.fast/keys).

## Tools

| Tool | Description |
| --- | --- |
| `bragfast_start_cook` | Interactive wizard to configure a release image or video |
| `bragfast_generate_release_images` | Render branded images in landscape, square, and/or portrait |
| `bragfast_generate_release_video` | Render a branded animated video from release slides |
| `bragfast_get_render_status` | Poll the status of an in-progress render |
| `bragfast_list_templates` | List available design templates |
| `bragfast_get_template` | Get details for a specific template |
| `bragfast_list_brands` | List saved brand configurations |
| `bragfast_check_account` | Check account credits and limits |
| `bragfast_get_upload_url` | Get a pre-signed URL for uploading images |
| `bragfast_upload_image` | Upload an image asset for use in renders |

## Usage

Invoke `bragfast_start_cook` with `{}` to begin the guided wizard, then follow the prompts to configure your release. The wizard walks through output type, template, brand, visuals, title/description, and formats.
