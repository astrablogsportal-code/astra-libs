#!/usr/bin/env sh
set -eu

# Usage:
#   ./publish-auto.sh [bump] [tag]
# Examples:
#   ./publish-auto.sh patch next
#   ./publish-auto.sh minor latest
#   ./publish-auto.sh prerelease next

cd "$(dirname "$0")"

BUMP_TYPE="${1:-patch}"
DIST_TAG="${2:-next}"

if [ ! -f package-library.json ]; then
  echo "Error: package-library.json not found."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required."
  exit 1
fi

# Copy package-library.json to package.json for publish preparation
cp package-library.json package.json

# Compute the new version and update package files
NEW_VERSION=$(BUMP_TYPE="$BUMP_TYPE" node <<'NODE'
const fs = require('fs');
const bump = process.env.BUMP_TYPE || 'patch';
const pkg = JSON.parse(fs.readFileSync('package-library.json', 'utf8'));
if (!pkg.version) {
  throw new Error('package-library.json must contain a version');
}
const semver = pkg.version.trim();
const m = semver.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([\w.]+))?$/);
if (!m) {
  throw new Error(`Invalid semver in package-library.json: ${semver}`);
}
let [_, major, minor, patch, prerelease] = m;
major = Number(major);
minor = Number(minor);
patch = Number(patch);
let newVersion;
if (bump === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
  newVersion = `${major}.${minor}.${patch}`;
} else if (bump === 'minor') {
  minor += 1;
  patch = 0;
  newVersion = `${major}.${minor}.${patch}`;
} else if (bump === 'patch') {
  patch += 1;
  newVersion = `${major}.${minor}.${patch}`;
} else if (bump === 'prerelease') {
  if (!prerelease) {
    newVersion = `${major}.${minor}.${patch}-next.0`;
  } else {
    const parts = prerelease.split('.');
    const last = Number(parts[parts.length - 1]);
    if (Number.isNaN(last)) {
      newVersion = `${major}.${minor}.${patch}-${prerelease}.0`;
    } else {
      parts[parts.length - 1] = last + 1;
      newVersion = `${major}.${minor}.${patch}-${parts.join('.')}`;
    }
  }
} else {
  throw new Error(`Unknown bump type: ${bump}`);
}

const updateJson = (path, version) => {
  const content = fs.readFileSync(path, 'utf8');
  const json = JSON.parse(content);
  json.version = version;
  fs.writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
};

updateJson('package-library.json', newVersion);
updateJson('package.json', newVersion);
if (fs.existsSync('package-lock.json')) {
  updateJson('package-lock.json', newVersion);
}

console.log(newVersion);
NODE
)

echo "Bumping version to $NEW_VERSION"

echo "Running npm pack --dry-run..."
npm pack --dry-run

echo "Creating tarball..."
npm pack

EXTRA_FLAGS=""
if [ "$DIST_TAG" != "latest" ]; then
  EXTRA_FLAGS="--tag $DIST_TAG"
fi

echo "Publishing to npm with tag: ${DIST_TAG}"
npm publish $EXTRA_FLAGS

# Git commit and tag

git add package-library.json package.json
if [ -f package-lock.json ]; then
  git add package-lock.json
fi

git commit -m "chore(release): ${NEW_VERSION}"
git tag "v${NEW_VERSION}"
git push origin main --tags

echo "Published astra-blogs-lib@${NEW_VERSION} with tag '${DIST_TAG}'"
