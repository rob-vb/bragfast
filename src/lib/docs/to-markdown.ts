import type { ApiSection, ApiParam, ApiEndpoint, StatusCode } from "./types"

function paramsToRows(params: ApiParam[], depth = 0): string[] {
  const rows: string[] = []
  let lastGroup: string | undefined

  for (const p of params) {
    if (p.group && p.group !== lastGroup) {
      rows.push(`| **${p.group} fields** | | | |`)
      lastGroup = p.group
    }

    const indent = depth > 0 ? "\u00A0\u00A0".repeat(depth) + "↳ " : ""
    const req = p.required ? "Yes" : "No"
    const desc = p.description.replace(/\n/g, " ")
    rows.push(`| ${indent}\`${p.name}\` | \`${p.type}\` | ${req} | ${desc} |`)

    if (p.children) {
      rows.push(...paramsToRows(p.children, depth + 1))
    }
  }

  return rows
}

function paramsToMarkdown(params: ApiParam[]): string {
  const header = `| Parameter | Type | Required | Description |\n| --- | --- | --- | --- |`
  const rows = paramsToRows(params)
  return `${header}\n${rows.join("\n")}`
}

function statusCodesToMarkdown(codes: StatusCode[]): string {
  const header = `| Code | Status | Description |\n| --- | --- | --- |`
  const rows = codes.map(
    (sc) => `| ${sc.code} | ${sc.label} | ${sc.description} |`
  )
  return `${header}\n${rows.join("\n")}`
}

function endpointToMarkdown(ep: ApiEndpoint): string {
  const parts: string[] = []

  parts.push(`### ${ep.method} \`${ep.path}\``)
  parts.push("")
  parts.push(`**${ep.title}**`)
  parts.push("")
  parts.push(ep.description)

  if (ep.params?.length) {
    parts.push("")
    parts.push("**Parameters**")
    parts.push("")
    parts.push(paramsToMarkdown(ep.params))
  }

  if (ep.requestExample) {
    parts.push("")
    parts.push("**Request examples**")
    parts.push("")
    parts.push("```bash")
    parts.push(ep.requestExample.curl)
    parts.push("```")
    parts.push("")
    parts.push("```javascript")
    parts.push(ep.requestExample.javascript)
    parts.push("```")
    parts.push("")
    parts.push("```python")
    parts.push(ep.requestExample.python)
    parts.push("```")
  }

  parts.push("")
  parts.push(`**Response \`${ep.responseStatus}\`**`)
  parts.push("")
  parts.push("```json")
  parts.push(ep.responseExample)
  parts.push("```")

  return parts.join("\n")
}

function sectionToMarkdown(section: ApiSection): string {
  const parts: string[] = []

  parts.push(`## ${section.title}`)
  parts.push("")
  parts.push(section.description)

  if (section.statusCodes?.length) {
    parts.push("")
    parts.push(statusCodesToMarkdown(section.statusCodes))
  }

  if (section.sampleObject) {
    parts.push("")
    parts.push(`**The ${section.title.toLowerCase()} object**`)
    parts.push("")
    parts.push("```json")
    parts.push(section.sampleObject)
    parts.push("```")
  }

  for (const ep of section.endpoints) {
    parts.push("")
    parts.push(endpointToMarkdown(ep))
  }

  return parts.join("\n")
}

export function apiReferenceToMarkdown(sections: ApiSection[]): string {
  const parts: string[] = []

  parts.push("# brag.fast API Reference")
  parts.push("")
  parts.push("**Base URL:** `https://brag.fast/api/v1`")
  parts.push("")
  parts.push("**Authentication:** `Authorization: Bearer bf_...`")
  parts.push("")
  parts.push("---")

  for (const section of sections) {
    parts.push("")
    parts.push(sectionToMarkdown(section))
    parts.push("")
    parts.push("---")
  }

  return parts.join("\n")
}
