#!/usr/bin/env bash
# taste — install the /taste skill for Claude Code, Codex CLI, and Gemini CLI.
# Symlinks this one repo clone into each detected tool's skills directory, so a
# single `git pull` updates them all. Does NOT edit MCP config files — it only
# prints the Playwright MCP setup for each tool (one-time, safe to copy-paste).
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
GEMINI_HOME="${GEMINI_HOME:-$HOME/.gemini}"

DRY=0; UNINSTALL=0; ONLY=""
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --uninstall) UNINSTALL=1 ;;
    --claude|--codex|--gemini) ONLY="$ONLY ${a#--}" ;;
    -h|--help)
      echo "taste installer — links the /taste skill into Claude / Codex / Gemini."
      echo "Usage: ./install.sh [--claude|--codex|--gemini] [--uninstall] [--dry-run]"
      exit 0 ;;
    *) echo "unknown arg: $a" >&2; exit 2 ;;
  esac
done

run(){ echo "+ $*"; [ "$DRY" = 1 ] || "$@"; }
want(){ [ -z "$ONLY" ] || case " $ONLY " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }
present(){ command -v "$1" >/dev/null 2>&1 || [ -d "$2" ]; }

link(){ # $1=skills_parent
  local dest="$1/taste"
  if [ "$UNINSTALL" = 1 ]; then
    if [ -L "$dest" ] && [ "$(readlink "$dest")" = "$REPO" ]; then run rm "$dest"; echo "removed $dest"
    elif [ -e "$dest" ]; then echo "skip (not ours): $dest"; fi
    return
  fi
  if [ -L "$dest" ] && [ "$(readlink "$dest")" = "$REPO" ]; then echo "ok (already linked): $dest"; return; fi
  if [ -e "$dest" ]; then echo "refuse: $dest already exists — remove it first (e.g. a prior 'git clone' install)"; return; fi
  run mkdir -p "$1"; run ln -s "$REPO" "$dest"; echo "linked $dest -> $REPO"
}

any=0
if want claude && present claude "$CLAUDE_HOME"; then
  any=1; echo "== Claude Code =="; link "$CLAUDE_HOME/skills"
  [ "$UNINSTALL" = 1 ] || echo '   Playwright MCP: claude mcp add playwright -s user -- npx -y @playwright/mcp@latest --isolated'
fi
if want codex && present codex "$CODEX_HOME"; then
  any=1; echo "== Codex CLI =="; link "$CODEX_HOME/skills"
  [ "$UNINSTALL" = 1 ] || printf '   Playwright MCP — add to ~/.codex/config.toml:\n       [mcp_servers.playwright]\n       command = "npx"\n       args = ["-y", "@playwright/mcp@latest", "--isolated"]\n'
fi
if want gemini && present gemini "$GEMINI_HOME"; then
  any=1; echo "== Gemini CLI =="; link "$GEMINI_HOME/skills"
  [ "$UNINSTALL" = 1 ] || printf '   Playwright MCP — add to ~/.gemini/settings.json:\n       { "mcpServers": { "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest", "--isolated"] } } }\n'
fi

[ "$any" = 1 ] || echo "No supported CLI found (claude/codex/gemini). Pass --claude/--codex/--gemini to force a target."
echo ""
if [ "$UNINSTALL" = 1 ]; then
  echo "Uninstalled. (Playwright MCP left untouched.)"
else
  echo "Done. Set up Playwright MCP above if you haven't, restart the tool, then run: /taste <url>"
fi
