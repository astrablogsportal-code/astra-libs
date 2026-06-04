#!/bin/bash
# Quick NPM Publishing Commands
# Run these commands to publish your library to NPM

# ==============================================================================
# STEP 1: SETUP (One-time)
# ==============================================================================

# 1a. Login to NPM (first time only)
npm login
# Follow prompts: username, password, email, 2FA code

# 1b. Verify you're logged in
npm whoami


# ==============================================================================
# STEP 2: PREPARE PACKAGE
# ==============================================================================

# 2a. Copy the library package.json
cp package-library.json package.json

# 2b. Create LICENSE
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2024 Astra Blogs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
EOF

# 2c. Create .npmignore (what NOT to publish)
cat > .npmignore << 'EOF'
.git
.gitignore
.vscode
.env
node_modules
test/
examples/
docs/
.DS_Store
*.log
EOF

# 2d. Create .gitignore (for your repo)
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
dist/
*.log
.DS_Store
EOF


# ==============================================================================
# STEP 3: UPDATE PACKAGE INFO
# ==============================================================================

# Edit package.json with your details:
# - "author": "Your Name <email@example.com>"
# - "repository": "https://github.com/your-username/astra-blogs-test"
# - "homepage": "https://github.com/your-username/astra-blogs-test#readme"
# - "bugs": "https://github.com/your-username/astra-blogs-test/issues"

nano package.json  # or use your editor


# ==============================================================================
# STEP 4: TEST BEFORE PUBLISHING
# ==============================================================================

# See what will be published
npm pack --dry-run

# Actually create a tarball for testing
npm pack

# Test install from tarball
npm install ./astra-blogs-lib-1.0.0.tgz

# Verify it works
node -e "const lib = require('./node_modules/astra-blogs-lib'); console.log(lib);"


# ==============================================================================
# STEP 5: PUBLISH TO NPM
# ==============================================================================

# Publish!
npm publish

# Verify it's published
npm view astra-blogs-lib

# Check on web
# https://www.npmjs.com/package/astra-blogs-lib


# ==============================================================================
# STEP 6: GITHUB RELEASE (Optional but recommended)
# ==============================================================================

# Create a git tag
git tag v1.0.0
git push origin v1.0.0

# Then on GitHub:
# 1. Go to Releases tab
# 2. Click "Create a new release"
# 3. Select tag: v1.0.0
# 4. Add description
# 5. Attach files (optional)
# 6. Click "Publish release"


# ==============================================================================
# UPDATING EXISTING PACKAGE
# ==============================================================================

# Update version (picks MAJOR, MINOR, or PATCH)
npm version patch    # 1.0.0 → 1.0.1
npm version minor    # 1.0.0 → 1.1.0
npm version major    # 1.0.0 → 2.0.0

# This auto-updates package.json, creates git commit and tag

# Publish update
npm publish

# Push to GitHub
git push origin main --tags


# ==============================================================================
# TROUBLESHOOTING
# ==============================================================================

# Check if name is taken
npm search astra-blogs-lib

# If taken, use scoped package name in package.json:
# "name": "@your-username/astra-blogs-lib"

# Then publish with scope:
npm publish --access public

# View all your published packages
npm profile get

# Unpublish (within 72 hours of publish)
npm unpublish astra-blogs-lib@1.0.0

# Remove old versions
npm deprecate astra-blogs-lib@1.0.0 "Use 1.1.0 instead"
