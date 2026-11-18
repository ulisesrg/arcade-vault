#!/bin/bash
# PostToolUse (Write): pasa el archivo creado por Prettier y ESLint.
f=$(jq -r '.tool_input.file_path // empty')
root="${CLAUDE_PROJECT_DIR:-$PWD}"

[ -n "$f" ] && [ -f "$f" ] || exit 0
case "$f" in "$root"/*) ;; *) exit 0 ;; esac
case "$f" in */node_modules/*|*/.next/*|*/.git/*|*/.env*) exit 0 ;; esac

cd "$root" || exit 0

if ! out=$(npx --no-install prettier --write --ignore-unknown "$f" 2>&1); then
  echo "Prettier falló en $f:" >&2; echo "$out" >&2; exit 2
fi

case "$f" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    if ! out=$(npx --no-install eslint --fix "$f" 2>&1); then
      echo "ESLint encontró errores en $f:" >&2; echo "$out" >&2; exit 2
    fi ;;
esac
exit 0
