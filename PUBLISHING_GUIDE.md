# Publishing Astra Blogs Library - Complete Guide

Guide to distribute your library to users via NPM, GitHub, CDN, and other channels.

---

## 📦 Method 1: Publish to NPM Registry (RECOMMENDED)

NPM is the standard package manager for JavaScript. Users can install with: `npm install astra-blogs-lib`

### Prerequisites
1. **Create NPM Account**
   - Go to [npmjs.com](https://www.npmjs.com)
   - Sign up for free
   - Verify email

2. **Install npm CLI**
   ```bash
   npm install -g npm  # Update to latest
   npm --version       # Verify
   ```

3. **Login to NPM**
   ```bash
   npm login
   # Enter:
   # - Username
   # - Password
   # - Email
   # - OTP (One-Time Password) if 2FA enabled
   ```

### Prepare Package

1. **Update package.json** (use the provided `package-library.json`)
   ```bash
   cp package-library.json package.json
   ```

2. **Create essential files**:
   ```bash
   # README.md (main documentation)
   cp LIBRARY_README.md README.md
   
   # LICENSE file
   cat > LICENSE << 'EOF'
   MIT License
   
   Copyright (c) 2024 Astra Blogs
   
   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:
   
   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.
   EOF
   
   # .npmignore (what to exclude from package)
   cat > .npmignore << 'EOF'
   .git
   .gitignore
   .vscode
   .env
   .env.local
   node_modules
   *.test.js
   test/
   examples/
   docs/
   .DS_Store
   *.log
   dist/
   build/
   EOF
   ```

3. **Create .gitignore**
   ```bash
   cat > .gitignore << 'EOF'
   node_modules/
   .env
   .env.local
   .env.*.local
   dist/
   build/
   *.log
   .DS_Store
   EOF
   ```

### Publish to NPM

1. **Verify package.json** is correct:
   ```bash
   npm pack --dry-run  # See what will be published
   ```

2. **Publish**:
   ```bash
   npm publish
   ```

3. **Verify publication**:
   ```bash
   npm view astra-blogs-lib  # Check if published
   npm search astra-blogs-lib  # Search NPM registry
   ```

### Users Can Now Install
```bash
npm install astra-blogs-lib
```

### Update Package (Version Management)

```bash
# 1. Update version in package.json (follow semantic versioning)
# MAJOR.MINOR.PATCH (e.g., 1.0.1 → 1.1.0)
npm version patch   # 1.0.0 → 1.0.1 (bug fixes)
npm version minor   # 1.0.0 → 1.1.0 (new features)
npm version major   # 1.0.0 → 2.0.0 (breaking changes)

# 2. Push to GitHub
git add .
git commit -m "Release v1.0.1"
git push origin main

# 3. Publish update
npm publish

# 4. Create GitHub Release (optional)
git tag v1.0.1
git push origin v1.0.1
```

---

## 🐙 Method 2: GitHub Releases & Releases Page

Direct distribution from GitHub without NPM.

### Create GitHub Release

1. **Go to your repository**
   - Click "Releases" tab
   - Click "Create a new release"

2. **Fill in details**
   ```
   Tag version: v1.0.0
   Release title: Version 1.0.0 - Initial Release
   
   Description:
   ## Features
   - Fetch blogs from GitHub API
   - Built-in caching with localStorage
   - Search and filter functionality
   - Recommendation engine
   
   ## Installation
   ```bash
   npm install astra-blogs-lib
   ```
   
   Or download astra-blogs-lib.js and include directly in your project.
   
   ## Documentation
   - [Usage Guide](./LIBRARY_USAGE_GUIDE.md)
   - [Framework Examples](./FRAMEWORK_EXAMPLES.md)
   ```

3. **Attach files**
   - `astra-blogs-lib.js` (main library)
   - `astra-blogs-lib.min.js` (minified version)
   - `LIBRARY_USAGE_GUIDE.md` (documentation)

4. **Click "Publish release"**

### Users Can Download
```
https://github.com/your-username/astra-blogs-test/releases/download/v1.0.0/astra-blogs-lib.js
```

---

## 🌐 Method 3: CDN Distribution

Host your library on a CDN so users can include it directly in HTML.

### Option A: jsDelivr (Free, recommended)

jsDelivr automatically serves files from your GitHub releases.

**Users can include:**
```html
<!-- Latest version -->
<script src="https://cdn.jsdelivr.net/gh/your-username/astra-blogs-test/astra-blogs-lib.js"></script>

<!-- Specific version -->
<script src="https://cdn.jsdelivr.net/gh/your-username/astra-blogs-test@v1.0.0/astra-blogs-lib.js"></script>

<!-- Minified -->
<script src="https://cdn.jsdelivr.net/gh/your-username/astra-blogs-test/astra-blogs-lib.min.js"></script>
```

**Test it:**
```bash
curl https://cdn.jsdelivr.net/gh/your-username/astra-blogs-test/astra-blogs-lib.js | head -20
```

### Option B: unpkg (Free)

Similar to jsDelivr, works with NPM packages.

**Users can include:**
```html
<!-- From NPM -->
<script src="https://unpkg.com/astra-blogs-lib"></script>
<script src="https://unpkg.com/astra-blogs-lib@1.0.0/astra-blogs-lib.js"></script>
```

### Option C: Custom CDN (Cloudflare, AWS CloudFront)

For enterprise/production deployments.

---

## 📚 Method 4: Direct Installation from GitHub

Users can install directly from your GitHub repo.

```bash
# Latest version from main branch
npm install github:your-username/astra-blogs-test

# Specific tag/version
npm install github:your-username/astra-blogs-test#v1.0.0

# Specific branch
npm install github:your-username/astra-blogs-test#develop
```

---

## 🎯 Method 5: Create TypeScript Definitions

Allow TypeScript users to get autocomplete.

### Create `astra-blogs-lib.d.ts`

```typescript
/**
 * Astra Blogs Library - TypeScript Definitions
 */

export interface BlogConfig {
  owner?: string;
  repo?: string;
  branch?: string;
  githubToken?: string;
  indexCacheTTL?: number;
  contentCacheTTL?: number;
  storage?: Storage;
  useCache?: boolean;
}

export interface BlogMetadata {
  slug: string;
  title: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  tags: string[];
  author: string;
  date: string;
  updatedAt?: string;
  cover: string;
  coverImage?: string;
  readTime: number;
  canonical?: string;
  [key: string]: any;
}

export interface BlogContent {
  rawFrontmatter: string | null;
  content: string;
  rawTotal: string;
  metadata: Record<string, any>;
}

export interface FetchOptions {
  useCache?: boolean;
  forceFresh?: boolean;
  parseYAML?: boolean;
}

export interface RecommendationOptions {
  count?: number;
  userPreferences?: Record<string, number>;
  randomizeTies?: boolean;
}

export interface SearchOptions {
  searchFields?: string[];
}

export default class AstraBlogsLib {
  constructor(config?: BlogConfig);
  
  getAllBlogs(options?: FetchOptions): Promise<BlogMetadata[]>;
  getBlogContent(slug: string, options?: FetchOptions): Promise<BlogContent | null>;
  getRecommendations(blogs: BlogMetadata[], options?: RecommendationOptions): BlogMetadata[];
  searchBlogs(blogs: BlogMetadata[], query: string, options?: SearchOptions): BlogMetadata[];
  filterByTags(blogs: BlogMetadata[], tagFilter: string | string[], mode?: 'any' | 'all'): BlogMetadata[];
  trackReadBlog(tags: string[], weight?: number): void;
  clearCache(pattern?: string): void;
  getUserPreferences(): Record<string, number>;
  clearUserPreferences(): void;
  getConfig(): BlogConfig;
  setConfig(newConfig: Partial<BlogConfig>): void;
}
```

---

## 📋 Complete Publishing Checklist

### Before Publishing
- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md` (document changes)
- [ ] Test library works: `npm test`
- [ ] Minify library: `npm run minify`
- [ ] Create TypeScript definitions (`astra-blogs-lib.d.ts`)
- [ ] Update README.md
- [ ] Review LICENSE (MIT)
- [ ] Create `.npmignore`
- [ ] Git commit: `git add . && git commit -m "Release v1.0.0"`

### Publishing
- [ ] Publish to NPM: `npm publish`
- [ ] Create GitHub Release with tag
- [ ] Verify NPM package: `npm view astra-blogs-lib`
- [ ] Test CDN: `curl https://cdn.jsdelivr.net/...`
- [ ] Update documentation with installation links

### After Publishing
- [ ] Announce on social media
- [ ] Post to relevant forums (dev.to, Reddit, etc.)
- [ ] Update GitHub repository topics
- [ ] Create issue/discussion for feedback

---

## 🚀 Step-by-Step: First NPM Publish

```bash
# 1. Prepare files
cp package-library.json package.json
cat > LICENSE << 'EOF'
MIT License
Copyright (c) 2024 Astra Blogs
...
EOF

# 2. Update package.json with your details
# Edit: author, repository, bugs, homepage

# 3. Login to NPM
npm login

# 4. Verify what will be published
npm pack --dry-run

# 5. Publish!
npm publish

# 6. Verify
npm view astra-blogs-lib
```

---

## 📊 Distribution Channels Summary

| Channel | Pros | Cons | Users Install |
|---------|------|------|----------------|
| **NPM** | Standard, discoverable, version mgmt | Requires account | `npm install astra-blogs-lib` |
| **GitHub** | Direct control, no account needed | Less discoverable | `npm install github:user/repo` |
| **CDN (jsDelivr)** | No setup needed, instant access | Limited to GitHub | `<script src="...cdn.jsdelivr.net...">` |
| **Direct file** | Simple, full control | No version mgmt | Copy `astra-blogs-lib.js` |
| **Yarn** | Works like NPM | Needs NPM publish | `yarn add astra-blogs-lib` |

---

## 🔧 Version Management (Semantic Versioning)

Follow semver: `MAJOR.MINOR.PATCH`

```
1.0.0 = MAJOR.MINOR.PATCH

MAJOR (breaking changes):
  1.0.0 → 2.0.0 (function signature changed)

MINOR (new features):
  1.0.0 → 1.1.0 (added searchBlogs method)

PATCH (bug fixes):
  1.0.0 → 1.0.1 (fixed caching issue)
```

---

## 📝 Create CHANGELOG.md

Track version history:

```markdown
# Changelog

## [1.1.0] - 2024-01-15

### Added
- TypeScript definitions
- User preference filtering
- CDN distribution via jsDelivr

### Fixed
- Cache TTL validation
- YAML parsing edge cases

### Changed
- Improved error messages
- Better performance for large blog lists

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Core functionality (fetch, search, recommendations)
- localStorage caching
- GitHub API support
```

---

## 🎯 Recommended Publishing Strategy

### Phase 1: Initial Release (v1.0.0)
1. Publish to NPM ✅
2. Create GitHub Release ✅
3. Test CDN (jsDelivr) ✅

### Phase 2: Community (v1.0.1+)
1. Gather feedback from early users
2. Fix bugs and improve
3. Update NPM: `npm publish`

### Phase 3: Growth (v1.1.0+)
1. Add requested features
2. Improve documentation
3. Create example projects
4. Post on dev.to, Medium, etc.

---

## 🔗 Publishing Links to Share

After publishing, share these:

```markdown
# Install
npm install astra-blogs-lib

# NPM Package
https://www.npmjs.com/package/astra-blogs-lib

# GitHub Repository
https://github.com/your-username/astra-blogs-test

# CDN (jsDelivr)
https://cdn.jsdelivr.net/gh/your-username/astra-blogs-test/astra-blogs-lib.js

# Documentation
- [Usage Guide](./LIBRARY_USAGE_GUIDE.md)
- [Framework Examples](./FRAMEWORK_EXAMPLES.md)
- [Project Analysis](./PROJECT_ANALYSIS.md)
```

---

## ⚠️ Important Before Publishing

1. **Check package.json**
   ```json
   {
     "name": "astra-blogs-lib",        // Unique name
     "version": "1.0.0",
     "main": "astra-blogs-lib.js",
     "description": "...",
     "author": "Your Name",
     "license": "MIT",
     "repository": {
       "type": "git",
       "url": "https://github.com/your-username/astra-blogs-test"
     }
   }
   ```

2. **Name must be unique** on NPM
   - Check: `npm view astra-blogs-lib`
   - If taken, rename to: `@your-username/astra-blogs-lib`

3. **Don't publish node_modules**
   - Create `.npmignore` to exclude files

4. **Test before publishing**
   - `npm pack` locally
   - Install from tarball
   - Verify it works

---

## 🆘 Troubleshooting

### "Package name already taken"
```bash
# Use scoped package
npm publish --access public
# In package.json, change name to:
"name": "@your-username/astra-blogs-lib"
```

### "Not logged in"
```bash
npm login
npm whoami  # Verify
```

### "Permission denied"
```bash
# You don't have rights to that package
# Either use different name or contact original owner
```

### Update existing package
```bash
# Only owner can update
npm version patch
npm publish
```

---

## 📈 Marketing Your Library

After publishing:

1. **Share on dev.to**
   - Create article: "I built a JavaScript library for..."
   - Link to NPM and GitHub

2. **GitHub Topics**
   - Add: `javascript`, `blog`, `github-api`, `library`

3. **Awesome Lists**
   - Submit to [awesome-javascript](https://github.com/sorrycc/awesome-javascript)

4. **Social Media**
   - Tweet about release
   - Post on LinkedIn

5. **Documentation**
   - Add badges to README
   - Create example projects

---

## Next Steps

1. **Test library locally**
   ```bash
   npm pack
   npm install ./astra-blogs-lib-1.0.0.tgz
   ```

2. **Create NPM account** at npmjs.com

3. **Login**: `npm login`

4. **Publish**: `npm publish`

5. **Share** NPM link: `https://www.npmjs.com/package/astra-blogs-lib`

---

Done! Your library is now available to the world! 🎉
