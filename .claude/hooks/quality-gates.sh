#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Claude Code Stop Hook — Quality Gates
# Runs lint + typecheck when Claude finishes a task.
# Exit 0 = allow stop, Exit 2 = block (errors fed to Claude).
# ─────────────────────────────────────────────────────────

# Read hook input from stdin
INPUT=$(cat)

# Prevent infinite loop — if this hook already triggered a retry, let it stop
ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null)
if [ "$ACTIVE" = "true" ]; then
  exit 0
fi

# Ensure Homebrew binaries (pnpm, node) are on PATH
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"

cd "$CLAUDE_PROJECT_DIR" || exit 0

ERRORS=""

# 1. Lint (turbo lint → next lint + package stubs)
LINT_OUT=$(pnpm lint 2>&1) || ERRORS="${ERRORS}
--- LINT ERRORS ---
${LINT_OUT}"

# 2. Typecheck (turbo typecheck → tsc --noEmit across all packages)
TC_OUT=$(pnpm typecheck 2>&1) || ERRORS="${ERRORS}
--- TYPECHECK ERRORS ---
${TC_OUT}"

if [ -n "$ERRORS" ]; then
  echo "Quality gates failed. Please fix before finishing:${ERRORS}" >&2
  exit 2
fi

exit 0
