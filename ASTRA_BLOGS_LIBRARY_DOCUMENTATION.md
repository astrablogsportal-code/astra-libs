# Astra Blogs Library Documentation

## Overview

`AstraBlogsLib` is a standalone JavaScript library for fetching, caching, searching, and recommending blog content stored in a GitHub repository. It is framework-agnostic and can be used in browser environments, Node.js, and modern frontend frameworks such as React, Vue, Angular, and Next.js.

The library reads:
- `index.json` in the repository root for published blog metadata
- `blogs/{slug}.md` for individual blog markdown content

It provides built-in support for:
- GitHub API access
- optional GitHub token authentication
- localStorage-based caching
- YAML frontmatter parsing
- search, filtering, and recommendations

## Key Features

- Fetch blog list from GitHub repository
- Fetch individual blog markdown with YAML metadata parsing
- Tag-based search and filtering
- Personalized recommendations via stored user preferences
- Cache blog index and content with configurable TTL
- Compatible with browser, Node.js, and module systems
- Minimal dependencies and easy integration

## Installation

### Option 1: Use the script directly in a browser

```html
<script src="astra-blogs-lib.js"></script>
<script>
  const blogsLib = new AstraBlogsLib();
</script>
```

### Option 2: ES Module import

```javascript
import AstraBlogsLib from './astra-blogs-lib.js';
const blogsLib = new AstraBlogsLib();
```

### Option 3: CommonJS import

```javascript
const AstraBlogsLib = require('./astra-blogs-lib.js');
const blogsLib = new AstraBlogsLib();
```

## Initialization

```javascript
const blogsLib = new AstraBlogsLib({
  owner: 'your-github-username',
  repo: 'your-blog-repository',
  branch: 'main',
  githubToken: 'ghp_...optional',
  indexCacheTTL: 3600000,
  contentCacheTTL: 86400000,
  storage: window.localStorage,
  useCache: true
});
```

### Default Configuration

If no config is provided, the library uses:
- `owner`: `Santhosh20112003`
- `repo`: `rtym-blog-files`
- `branch`: `main`
- `indexCacheTTL`: 1 hour
- `contentCacheTTL`: 24 hours
- `useCache`: true

## Repository Structure

The GitHub blog repository must contain:

```
index.json
blogs/
  ├── my-first-blog.md
  ├── another-post.md
  └── example-blog.md
```

### `index.json` format

Each item in `index.json` should include metadata such as:

```json
[
  {
    "slug": "getting-started-with-react",
    "title": "Getting Started with React",
    "description": "Learn React basics...",
    "tags": ["react", "javascript"],
    "author": "John Doe",
    "date": "2024-01-01",
    "cover": "https://example.com/cover.jpg",
    "readTime": 5
  }
]
```

### Blog markdown file format

Each post in `blogs/{slug}.md` should use YAML frontmatter:

```markdown
---
title: Getting Started with React
author: John Doe
date: 2024-01-01
tags: [react, javascript]
cover: https://example.com/cover.jpg
readTime: 5
---

# Getting Started with React

Content goes here...
```

## API Reference

### `new AstraBlogsLib(config)`

Creates a new library instance.

**Config options**:
- `owner` - GitHub username or org
- `repo` - GitHub repository name
- `branch` - branch name
- `githubToken` - optional GitHub PAT
- `indexCacheTTL` - blog index cache duration in ms
- `contentCacheTTL` - blog content cache duration in ms
- `storage` - storage backend implementing `getItem`/`setItem`/`removeItem`
- `useCache` - enable or disable caching

### `getAllBlogs(options)`

Fetch all blog metadata from `index.json`.

**Options**:
- `useCache` (default `true`)
- `forceFresh` (default `false`)

**Returns**: `Promise<Array>`

**Behavior**:
- Returns cached index if available and valid
- Fetches fresh data from GitHub if cache is expired or `forceFresh=true`
- Falls back to expired cache if network fails
- Returns `[]` if the index is missing or invalid

**Example**:

```javascript
const blogs = await blogsLib.getAllBlogs();
```

### `getBlogContent(slug, options)`

Fetch the markdown content and parsed frontmatter for one blog.

**Options**:
- `useCache` (default `true`)
- `forceFresh` (default `false`)
- `parseYAML` (default `true`)

**Returns**: `Promise<Object|null>`

**Result shape**:
- `rawFrontmatter` - raw YAML frontmatter text
- `content` - markdown content without frontmatter
- `rawTotal` - full markdown text
- `metadata` - parsed YAML metadata object

**Example**:

```javascript
const blog = await blogsLib.getBlogContent('getting-started-with-react');
console.log(blog.metadata.title);
console.log(blog.content);
```

### `getRecommendations(blogs, options)`

Build recommendations from a list of blogs using stored or provided preferences.

**Options**:
- `count` (default `3`)
- `userPreferences` - explicit `{ tag: score }` map
- `randomizeTies` (default `true`)

**Returns**: `Array`

**Behavior**:
- Scores each blog by tag overlap with preferences
- Returns the highest-scoring blog items
- Randomizes tie order when enabled

**Example**:

```javascript
const recommended = blogsLib.getRecommendations(blogs, {
  count: 5,
  userPreferences: { react: 3, javascript: 2 }
});
```

### `trackReadBlog(tags, weight)`

Record a blog read event to update the user preference model.

**Parameters**:
- `tags` - array of tags from the blog
- `weight` - integer weight (default `1`)

**Example**:

```javascript
blogsLib.trackReadBlog(['react', 'hooks', 'javascript']);
```

### `getUserPreferences()`

Returns the stored user preference object.

**Example**:

```javascript
const prefs = blogsLib.getUserPreferences();
```

### `clearUserPreferences()`

Removes saved reading preferences from storage.

**Example**:

```javascript
blogsLib.clearUserPreferences();
```

### `searchBlogs(blogs, query, options)`

Search blogs by query text across configured fields.

**Options**:
- `searchFields` (default `['title', 'description', 'tags']`)

**Returns**: `Array`

**Example**:

```javascript
const results = blogsLib.searchBlogs(blogs, 'react');
```

### `filterByTags(blogs, tagFilter, mode)`

Filter blog list by matching tags.

**Parameters**:
- `blogs` - blog array
- `tagFilter` - string or array of tags
- `mode` - `'any'` or `'all'` (default `'any'`)

**Example**:

```javascript
const filteredAny = blogsLib.filterByTags(blogs, ['react', 'javascript']);
const filteredAll = blogsLib.filterByTags(blogs, ['react', 'javascript'], 'all');
```

### `clearCache(pattern)`

Clear the library cache stored in the configured storage backend.

**Parameters**:
- `pattern` - optional string to remove matching keys only

**Example**:

```javascript
blogsLib.clearCache();
blogsLib.clearCache('astra_blog_content_');
```

### `getConfig()`

Returns a copy of the current library config.

**Example**:

```javascript
console.log(blogsLib.getConfig());
```

### `setConfig(newConfig)`

Update library configuration at runtime.

**Example**:

```javascript
blogsLib.setConfig({ useCache: false });
```

## Data and Parsing Details

### YAML frontmatter parsing

The library supports a simple YAML parser for frontmatter content. It can parse:

- plain `key: value`
- quoted strings
- arrays in bracket form `['tag1', 'tag2']`

For more complex YAML needs, integrate a library such as `js-yaml` before processing content.

### Markdown parsing

The library returns raw markdown content. Rendering must be handled by the host application.

## Caching Behavior

- `index.json` cache TTL: `indexCacheTTL` (default 1 hour)
- blog content cache TTL: `contentCacheTTL` (default 24 hours)
- uses `storage` backend if available
- cache is bypassed when `forceFresh=true`
- expired cache may be returned if network fetch fails

## Recommendation Algorithm

The recommendation engine works by:

1. Loading stored user preferences from storage
2. Scoring each blog based on tag overlap
3. Sorting blogs by score
4. Returning the top `count` blogs

Preferences are updated with `trackReadBlog(tags, weight)`.

## Example Usage

### Basic usage

```javascript
const blogsLib = new AstraBlogsLib({
  owner: 'your-username',
  repo: 'your-blog-repo'
});

const blogs = await blogsLib.getAllBlogs();
const blog = await blogsLib.getBlogContent('my-first-post');
const filtered = blogsLib.filterByTags(blogs, 'react');
const searchResults = blogsLib.searchBlogs(blogs, 'javascript');

blogsLib.trackReadBlog(blog.metadata.tags);
const recommendations = blogsLib.getRecommendations(blogs);
```

### Recommended blog repository structure

```
index.json
blogs/
  my-first-post.md
  advanced-topics.md
```

## Framework Integration Notes

The library is designed for any environment that supports JavaScript and the Fetch API. Common integration patterns include:

- Browser script import
- ES module import
- CommonJS import
- Framework-specific adapters (React hooks, Vue composables, server-side rendering, static site generation)

## Troubleshooting

- If `index.json` returns `404`, verify the repository path and branch.
- If blog content returns `null`, ensure `blogs/{slug}.md` exists and the filename matches the slug.
- If metadata parsing fails, verify YAML frontmatter formatting.
- For GitHub rate limits, provide `githubToken`.

## Notes

- The library defines `AstraBlogsLib` globally in browser contexts.
- If the library is loaded in Node.js, it exports via `module.exports`.
- The library uses GitHub raw content API headers and returns raw markdown text.

## Files in this package

- `astra-blogs-lib.js` — library implementation
- `astra-blogs-lib.d.ts` — TypeScript definitions
- `README.md` — repository homepage
- `LIBRARY_USAGE_GUIDE.md` — usage guide
- `FRAMEWORK_EXAMPLES.md` — framework examples
- `LICENSE` — license file
