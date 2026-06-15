# /taste — Design DNA Extractor

[![Made for Claude Code](https://img.shields.io/badge/Made%20for-Claude%20Code-blueviolet?style=flat-square&logo=anthropic)](https://docs.anthropic.com/en/docs/claude-code)
[![Works with Gemini CLI](https://img.shields.io/badge/Works%20with-Gemini%20CLI-4285F4?style=flat-square&logo=google)](https://ai.google.dev/gemini-api/docs/gemini-cli)
[![Works with Codex CLI](https://img.shields.io/badge/Works%20with-Codex%20CLI-000000?style=flat-square&logo=openai)](https://developers.openai.com/codex)
[![Playwright MCP](https://img.shields.io/badge/Requires-Playwright%20MCP-1db954?style=flat-square)](https://playwright.dev/docs/api/class-playwright)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Demo](https://img.shields.io/badge/Landing%20Page-→-CF9FFC?style=flat-square)](https://senlindesign.github.io/taste-skill/)

Reverse-engineer any website's design taste. Tokens + trade-offs — not just "what", but "why".

> **Quick start:** Clone into `~/.claude/skills/taste`, install Playwright MCP, run `/taste <url>`. [Full install guide below.](#installation)

---

## Why?

Every design extraction tool gives you tokens. "The background is #08090A. The font is Inter. The radius is 6px." That's not taste — that's a spec sheet. When an AI agent has only tokens, it copies the numbers without understanding the decisions behind them. The output looks vaguely right but generates slop the moment the template runs out.

Taste is the "why" behind the tokens: *why* this specific white instead of a branded accent color, *why* 1px inset border instead of a drop shadow, *why* the breathing room lives inside sections instead of between them. An agent with taste can make the right call on a page it's never seen. An agent with only tokens just applies the stylesheet.

`/taste` runs a 4-step pipeline on any URL and produces a `{domain}.md` and `{domain}.json` that explain both.

---

## What It Produces

Running `/taste https://linear.app` writes two files:

**`linear.md`** — Design Map + Taste DNA:

```markdown
## Design Map

Background: #08090A
Surface (card): rgba(255,255,255,0.05)
Text primary: #F7F8F8
Font: Inter Variable — weight 510 (display), 590 (subhead)
Card radius: 6px
Primary depth signal: rgb(35,37,42) 0px 0px 0px 1px inset
Transition: 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94)

## Taste DNA

Principle: Brand lives in white, not in color — RESTRAINT
Trigger: Deciding on an accent color.
Decision: Don't introduce one. Use white (#F7F8F8) on near-black.
Reason: On #08090A, white carries all the emphasis needed. A branded
        CTA button would make it feel like a template.
Evidence: Every nav link and CTA is white or near-white. The pink
          gradient in the hero is a one-time decorative moment,
          not a system. accentCandidates from DOM are 100% grays.
Trade-off: Can't differentiate feature tiers by color. Hierarchy
           comes from weight and size alone.
```

**`linear.json`** — same data, machine-parseable. Feed it to Cursor rules, Windsurf rules, `CLAUDE.md`, or any design system pipeline.

---

## Usage

```bash
/taste https://linear.app
/taste stripe.com
/taste https://www.are.na
```

The skill asks two setup questions, then runs:

```text
/taste https://linear.app

Claude: Which tool are you building with?
        1 Cursor  2 Windsurf  3 Claude Code  4 Copilot
        5 Bolt    6 Antigravity  7 v0  8 Figma Make  9 Lovable  10 Skip

You: 3

Claude: Analyze just this page, or explore 2–3 linked pages for a fuller picture?
        1 This page only
        2 Explore linked pages (finds Product / Community / Pricing etc.)

You: 2

Claude: [navigates to linear.app, takes viewport + full-page screenshots]
        [extracts nav links → picks 2 additional pages: /features, /changelog]
        [visits each page, captures screenshots + DOM data]
        [merges data — values that appear on 2+ pages marked as system signals]
        [runs Step 1: 20 measurement categories across all 3 pages]
        [runs Step 2: 5-8 system-level patterns with cross-page evidence]
        [runs Step 3: 4 taste principles, each with trade-off]
        [runs Step 4: quality gate, writes final output]
        [runs grep anti-slop audit, validates JSON]
        [exports Design Taste section → CLAUDE.md]

✓ Wrote ./linear.md (89 lines) and ./linear.json (4.2kb)  [3 pages analyzed]
✓ Also wrote ./CLAUDE.md

  Sharpest principle: "Brand lives in white, not in color"
  → Don't introduce a brand accent. Use white on near-black.

  Open linear.md to read the full Design Map + Taste DNA.
```

---

## Export Formats

After analysis, the skill writes an additional file for your build tool:

| Tool | Output |
|------|--------|
| Cursor | `.cursor/rules/{domain}-taste.mdc` |
| Windsurf | `.windsurf/rules/{domain}-taste.md` |
| Claude Code | `CLAUDE.md` (appends Design Taste section) |
| GitHub Copilot | `.github/copilot-instructions.md` (appends) |
| Bolt | `.bolt/prompt` |
| Antigravity | `GEMINI.md` |
| v0 by Vercel | `taste-tokens.css` |
| Figma Make | `taste-figma.css` |
| Lovable | printed to paste in Project Knowledge |

---

## Good For / Not For

| Good For | Not For |
|----------|---------|
| Extracting a site's design system before porting its aesthetic | Scraping page content or data |
| Understanding *why* a site makes the visual choices it does | Summarizing what a page says |
| Generating design guidance for an AI coding agent | Analyzing pages behind login |
| Competitive design research | Sites that block automated access (Cloudflare) |
| "Build me something that feels like Linear" | Illustration, icon, or animation work |

---

## Installation

### Claude Code

**Prerequisites:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (CLI / Desktop / VS Code)

**Option A — Plugin marketplace** (no clone, auto-updates with Claude Code):

```bash
# Run inside Claude Code:
/plugin marketplace add senlindesign/taste-skill
/plugin install taste@taste-skill
```

**Option B — Clone into your skills directory:**

```bash
git clone https://github.com/senlindesign/taste-skill ~/.claude/skills/taste
```

Then, for either option, install Playwright MCP (one-time) and restart Claude Code:

```bash
claude mcp add playwright -s user -- npx -y @playwright/mcp@latest --isolated
```

Run `/taste <url>` in any project.

---

### Gemini CLI

**Prerequisites:** [Gemini CLI](https://ai.google.dev/gemini-api/docs/gemini-cli)

```bash
# 1. Clone into your Gemini skills directory
git clone https://github.com/senlindesign/taste-skill ~/.gemini/skills/taste
```

```bash
# 2. Add Playwright MCP to ~/.gemini/settings.json
```

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--isolated"]
    }
  }
}
```

```bash
# 3. Restart Gemini CLI
```

Run `/taste <url>` in any project. If your version doesn't support slash commands, use natural language: "run taste on linear.app".

---

### Codex CLI

**Prerequisites:** [Codex CLI](https://developers.openai.com/codex)

```bash
# 1. Clone into your Codex skills directory
git clone https://github.com/senlindesign/taste-skill ~/.codex/skills/taste
```

```toml
# 2. Add Playwright MCP to ~/.codex/config.toml
[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest", "--isolated"]
```

```bash
# 3. Restart Codex
```

Run `/taste <url>` in any project (or natural language: "run taste on linear.app").

---

### Why `--isolated`

Every `/taste` run starts with a fresh browser state. Without it, running `/taste https://linear.app` while signed into Linear would analyze the app dashboard instead of the public marketing page — wrong surface, wrong taste.

### First run

Playwright downloads its own Chromium (~100MB, one-time) on the first `browser_navigate`. Subsequent runs start in seconds. To pre-download: `npx playwright install chromium`.

---

## How the Pipeline Works

```text
Phase 0  Parse URL → extract {domain} → ask export target → ask crawl scope
           crawl scope 1: single page (default)
           crawl scope 2: explore 2–3 linked pages from the same site
Phase 1  Playwright:
           viewport screenshot (1440×900)  ← primary visual reference
           full-page screenshot            ← systematic cross-page check
           DOM extractor (extract.js)      ← 8000-element full-page scan
           [if multi] extract nav links → visit 2 more pages → capture each
           [if multi] merge data — cross-page values = system signals
Phase 2  4-step analysis:
           Step 1 (Measure)   20 categories, exact px/hex/ratio
           Step 2 (Pattern)   5-8 system rules, Evidence + Design Goal
           Step 3 (Taste)     4 principles, Trigger/Decision/Reason/Evidence
           Step 4 (Observer)  quality gate → Design Map + Taste DNA
Phase 3  Write {domain}.md + {domain}.json
Phase 4  Anti-Slop audit (grep, not mental scan) + JSON validation
Phase 5  Export to build tool format
Phase 6  Report
```

**Visual primacy rule**: the screenshot is ground truth. DOM supplies exact numbers, but when they conflict, the screenshot wins. A color at <5% visual surface area is decorative — not a brand color.

---

## Directory Structure

```text
taste/
├── SKILL.md                    # Skill entry point + full workflow
└── references/
    ├── extract.js              # Browser-injected DOM extractor (8k-element full-page)
    ├── step1-measure.md        # Step 1 prompt: 20 measurement dimensions
    ├── step2-pattern.md        # Step 2 prompt: system pattern extraction
    ├── step3-taste.md          # Step 3 prompt: taste principle generation
    ├── step4-observer.md       # Step 4 prompt: quality gate + final output schema
    └── export-formats.md       # Spec for all 9 export formats
```

---

## Known Limitations

| Limitation | Workaround |
|------------|------------|
| Pages behind login return the login form, not the target page | Use the public marketing page |
| Cloudflare / bot-detection blocks show a verify page | Try a different page on the same domain |
| Heavy SPAs (Figma, Notion) may still be hydrating after load | The skill waits up to 6s; adds a caveat if still incomplete |
| CSS custom properties (`var(--color)`) resolve to computed values, not variable names | DOM extractor captures computed values; variable names aren't surfaced |

---

## Contributing

Issues and PRs welcome. If you run `/taste` on a site and the output is weak (no real trade-offs, vague principles), open an issue with the URL and paste the output — that's the most useful signal for improving the prompts.

---

MIT © 2025 Sen Lin
