#!/usr/bin/env bash
set -euo pipefail

# One-command release: verify the tree is clean and in sync with origin, bump
# the version (minor by default; --patch / --major opt in), commit, tag, and
# push. Pushing the v* tag triggers the GitHub release workflow.
#
# Robustness: every git operation is retried up to 3 times with a 1s wait to
# ride out transient network failures. If any step still fails, the script
# restores the pre-release local state: it stashes uncommitted changes and
# removes the release commit and tag it created, so the repo is never left
# half-released.

# ── Flag handling ──────────────────────────────────────────────────────────
MAJOR=0
PATCH=0
for arg in "$@"; do
  case "$arg" in
    --major) MAJOR=1 ;;
    --patch) PATCH=1 ;;
    --help)
      echo "usage: bun release [--major|--patch]"
      echo "  (no flag) bump the minor version (default)"
      echo "  --patch   bump the patch version"
      echo "  --major   bump the major version"
      exit 0
      ;;
    *)
      echo "error: unknown argument: $arg" >&2
      echo "usage: bun release [--major|--patch]" >&2
      exit 1
      ;;
  esac
done
if [ "$MAJOR" -eq 1 ] && [ "$PATCH" -eq 1 ]; then
  echo "error: --major and --patch are mutually exclusive" >&2
  exit 1
fi

# ── Helpers ────────────────────────────────────────────────────────────────

# Run a command with up to 3 attempts, waiting 1s between retries. Used for
# every git operation so transient failures (network, lock contention) don't
# abort the release mid-flight.
retry() {
  local attempt=0
  until "$@"; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 3 ]; then
      echo "error: command failed after 3 attempts: $*" >&2
      return 1
    fi
    echo "warning: retrying in 1s (attempt $((attempt + 1))/3): $*" >&2
    sleep 1
  done
}

PRE_RELEASE_HEAD="$(git rev-parse HEAD)"
NEW=""

# Roll back a failed release: stash uncommitted changes, remove the release
# commit and the release tag, restoring the pre-release local state.
rollback() {
  echo "error: release failed — restoring pre-release state" >&2

  # Stash anything uncommitted (e.g. version bumps written before the commit).
  if [ -n "$(git status --porcelain)" ]; then
    echo "stashing uncommitted changes" >&2
    git stash push -m "release-aborted" >/dev/null 2>&1 || true
  fi

  # Drop the release commit if one was created.
  if [ "$(git rev-parse HEAD)" != "$PRE_RELEASE_HEAD" ]; then
    echo "removing release commit" >&2
    git reset --hard "$PRE_RELEASE_HEAD" >/dev/null 2>&1 || true
  fi

  # Drop the release tag if one was created.
  if [ -n "$NEW" ] && git tag -l "v$NEW" >/dev/null 2>&1; then
    echo "removing release tag v$NEW" >&2
    git tag -d "v$NEW" >/dev/null 2>&1 || true
  fi

  echo "release aborted; local state restored to $PRE_RELEASE_HEAD" >&2
  if [ "$(git rev-parse HEAD 2>/dev/null)" != "$(git rev-parse origin/main 2>/dev/null || echo x)" ]; then
    echo "note: the release commit may have reached origin before the failure; if so, clean it up there too" >&2
  fi
}

trap rollback ERR

# ── Preflight ──────────────────────────────────────────────────────────────
if [ -n "$(git status --porcelain)" ]; then
  echo "error: uncommitted changes present; commit or stash before releasing" >&2
  exit 1
fi

retry git fetch origin
LOCAL="$(git rev-parse HEAD)"
UPSTREAM="$(git rev-parse @{u} 2>/dev/null || true)"
if [ -z "$UPSTREAM" ]; then
  echo "error: no upstream branch configured for the current branch" >&2
  exit 1
fi
if [ "$LOCAL" != "$UPSTREAM" ]; then
  echo "error: local is out of sync with origin; push/pull first" >&2
  exit 1
fi

# ── Read + bump the version ────────────────────────────────────────────────
# tauri.conf.json is the source of truth: the release tag must match the app
# version the GitHub workflow substitutes into tagName (v__VERSION__).
CURRENT="$(python3 -c 'import json; print(json.load(open("src-tauri/tauri.conf.json"))["version"])')"

IFS='.' read -r MAJ MIN PATCH_N <<<"$CURRENT"
MAJ="${MAJ:-0}"; MIN="${MIN:-0}"; PATCH_N="${PATCH_N:-0}"

if [ "$MAJOR" -eq 1 ]; then
  MAJ=$((MAJ + 1)); MIN=0; PATCH_N=0
elif [ "$PATCH" -eq 1 ]; then
  PATCH_N=$((PATCH_N + 1))
else
  MIN=$((MIN + 1)); PATCH_N=0
fi
NEW="$MAJ.$MIN.$PATCH_N"

echo "release: $CURRENT -> $NEW"

# ── Write the version everywhere ───────────────────────────────────────────
python3 - "$NEW" <<'EOF'
import json, sys
new = sys.argv[1]
for path in ("src-tauri/tauri.conf.json", "package.json"):
    d = json.load(open(path))
    d["version"] = new
    json.dump(d, open(path, "w"), indent=2)
    open(path, "a").write("\n")
EOF
# Cargo.toml: version = "x.y.z" under [package]
sed -i.bak -E "s/^version = \".*\"/version = \"$NEW\"/" src-tauri/Cargo.toml
rm -f src-tauri/Cargo.toml.bak

# ── Commit, tag, push ──────────────────────────────────────────────────────
retry git add src-tauri/tauri.conf.json package.json src-tauri/Cargo.toml
retry git commit -m "release: v$NEW"
retry git tag "v$NEW"
retry git push origin HEAD --tags

echo "done: pushed v$NEW (release workflow will create the draft release)"
