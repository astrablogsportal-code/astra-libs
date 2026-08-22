# astra-libs

A standalone JavaScript library for fetching, caching, searching, and rendering blog content stored in repository metadata.

> Framework-agnostic, browser-friendly, and compatible with CommonJS/ES modules.

## Features

- Fetch blog index metadata from a repository index
- Load individual markdown blog content with YAML frontmatter parsing
- Convert markdown to HTML with built-in default styling
- Search and filter blogs by title, description, tags, or custom fields
- Personalized recommendations using reading history and tag weights
- Local cache support with configurable time-to-live (TTL)
- Version API for SDK tracing
- Event system for cache, fetch, and error notifications
- Supports script tag, ES module import, and CommonJS usage

## Installation

### Browser via CDN

```html
<script src="https://cdn.jsdelivr.net/npm/astra-blogs-lib@latest/astra-blogs-lib.min.js"></script>
<script>
  const blogsLib = new AstraBlogsLib();
</script>
```

### Browser via local script

```html
<script src="./astra-blogs-lib.js"></script>
<script>
  const blogsLib = new AstraBlogsLib();
</script>
```

### ES module import

```js
import AstraBlogsLib from './astra-blogs-lib.js';
const blogsLib = new AstraBlogsLib();
```

### CommonJS import

```js
const AstraBlogsLib = require('./astra-blogs-lib.js');
const blogsLib = new AstraBlogsLib();
```

## Quick Start

```js
const blogsLib = new AstraBlogsLib({
  token: 'encrypted-token',
  secret: 'decryption-secret'
});

blogsLib.setConfig({
  indexCacheTTL: 3600000,
  contentCacheTTL: 86400000,
  useCache: true
});

const blogs = await blogsLib.getAllBlogs();
console.log('blogs', blogs);

const blog = await blogsLib.getBlogContent(blogs[0].slug);
console.log('content metadata', blog.metadata);
console.log('markdown body', blog.content);
```

> Note: `AstraBlogsLib` expects decryption-based initialization using `token` and `secret`.

## Repository Layout

The repository used by this library should contain:

```
index.json
blogs/
  post-one.md
  post-two.md
  ...
```

### `index.json`

This file should contain an array of blog metadata objects:

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

### Blog markdown files

Each blog should be stored under `blogs/{slug}.md` and may include YAML frontmatter:

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

Content here...
```

## API Reference

### `new AstraBlogsLib(config?)`

Creates a library instance.

**Config options:**

- `token` - encrypted initialization token
- `secret` - secret used to decrypt the token
- `indexCacheTTL` - cache time for blog index in milliseconds
- `contentCacheTTL` - cache time for blog content in milliseconds
- `storage` - storage backend implementing `getItem`/`setItem`/`removeItem`
- `useCache` - enable or disable caching
- `includeScheduled` - include scheduled posts (future-dated blogs) (default: `false`)
- `allowedStatuses` - allowed publication statuses (array of strings) (default: `['published']`)
- `includeDrafts` - include draft posts (default: `false`)

> Direct repository settings are not accepted in the constructor. Use `token` and `secret` only for initialization, and use `setConfig()` only for non-sensitive runtime settings like cache control.

### `getVersion()`

Returns the current SDK version.

```js
console.log(blogsLib.getVersion());
```

### `getConfig()`

Returns the current runtime configuration.

### `setConfig(newConfig)`

Update the library configuration at runtime.

### `getAllBlogs(options?)`

Fetches all blog metadata from the repository index.

**Options:**

- `useCache` (boolean) — use cached index if available
- `forceFresh` (boolean) — skip cache and fetch fresh
- `includeScheduled` (boolean) — include scheduled posts (future-dated blogs)
- `allowedStatuses` (string[]) — allowed publication statuses (default: `['published']`)
- `includeDrafts` (boolean) — include draft posts (default: `false`)

```js
const blogs = await blogsLib.getAllBlogs({ forceFresh: true });
```

### `getAllCovers(options?)`

Returns an array of unique cover image URLs from the blog index.

```js
const covers = await blogsLib.getAllCovers();
```

### `getCoverUrls(blogs)`

Extracts cover URLs from blog metadata using `cover` or `coverImage`.

```js
const coverUrls = blogsLib.getCoverUrls(blogs);
```

### `getBlogContent(slug, options?)`

Fetches a single blog markdown file and parses YAML metadata.

**Options:**

- `useCache` (boolean)
- `forceFresh` (boolean)
- `parseYAML` (boolean)
- `includeScheduled` (boolean) — include scheduled posts (checks and denies access if `false`)
- `allowedStatuses` (string[]) — allowed publication statuses (default: `['published']`)
- `includeDrafts` (boolean) — include draft posts (default: `false`)

```js
const blog = await blogsLib.getBlogContent('getting-started-with-react');
console.log(blog.metadata.title);
console.log(blog.content);
```

### `convertMarkdownToHtml(markdown, options?)`

Convert markdown text into HTML with optional inline markdown styling.

**Returns:**

- `html` — plain rendered HTML
- `styledHtml` — HTML wrapped with built-in markdown styles

```js
const result = blogsLib.convertMarkdownToHtml(blog.rawTotal);
console.log(result.styledHtml);
```

### `getRecommendations(blogs, options?)`

Generate blog recommendations based on tag matching and preferences.

**Options:**

- `count` — number of recommendations
- `userPreferences` — explicit preference weights
- `randomizeTies` — randomize blogs with equal scores
- `includeScheduled` — include scheduled posts (future-dated blogs)
- `allowedStatuses` — allowed publication statuses (array of strings)
- `includeDrafts` — include draft posts (boolean)

```js
const recommendations = blogsLib.getRecommendations(blogs, {
  count: 5,
  userPreferences: { react: 3, javascript: 2 }
});
```

### `trackReadBlog(tags, weight?)`

Record a read interaction for recommendation personalization.

```js
blogsLib.trackReadBlog(['react', 'hooks'], 1);
```

### `getUserPreferences()`

Returns stored user preference data.

```js
const prefs = blogsLib.getUserPreferences();
```

### `clearUserPreferences()`

Clear stored recommendation preferences.

```js
blogsLib.clearUserPreferences();
```

### `searchBlogs(blogs, query, options?)`

Search a blog list by query text.

**Options:**

- `searchFields` — array of fields to search (default: `['title', 'description', 'tags']`)
- `includeScheduled` — include scheduled posts (future-dated blogs)
- `allowedStatuses` — allowed publication statuses (array of strings)
- `includeDrafts` — include draft posts (boolean)

```js
const results = blogsLib.searchBlogs(blogs, 'react');
```

### `filterByTags(blogs, tagFilter, mode?, options?)`

Filter blogs by one or more tags using `any` or `all` logic.

**Options:**

- `includeScheduled` — include scheduled posts (future-dated blogs)
- `allowedStatuses` — allowed publication statuses (array of strings)
- `includeDrafts` — include draft posts (boolean)

```js
const filtered = blogsLib.filterByTags(blogs, ['react', 'javascript'], 'any', { includeScheduled: true });
```

### `clearCache(pattern?)`

Clear cached library data.

```js
blogsLib.clearCache();
blogsLib.clearCache('astra_blog_content_');
```

## Event System

`astra-libs` emits lifecycle and cache events so you can observe library behavior.

### Supported events

- `fetchStarted` — when a repository fetch begins
- `cacheHit` — when cached data is returned
- `cacheMiss` — when cached data is missing
- `blogsLoaded` — when blog metadata is loaded
- `blogLoaded` — when a single blog is loaded
- `error` — when an operation fails

### Usage

```js
blogsLib.on('cacheHit', key => {
  console.log('Cache hit:', key);
});

blogsLib.on('blogsLoaded', blogs => {
  console.log('Loaded blogs:', blogs.length);
});

blogsLib.on('error', error => {
  console.error('Library error:', error);
});
```

### Unsubscribe

```js
const callback = data => console.log(data);
blogsLib.on('cacheHit', callback);
blogsLib.off('cacheHit', callback);
```

### One-time listener

```js
blogsLib.once('blogsLoaded', blogs => {
  console.log('Loaded once:', blogs.length);
});
```

## Version API

Retrieve the SDK version directly from the library.

```js
console.log(blogsLib.getVersion());
```

This is useful for debugging and support when you need to know exactly which library version is running.

## Example: Full workflow

```js
const blogsLib = new AstraBlogsLib({
  token: 'encrypted-token',
  secret: 'decryption-secret'
});

blogsLib.setConfig({
  indexCacheTTL: 3600000,
  contentCacheTTL: 86400000,
  useCache: true
});

blogsLib.on('fetchStarted', data => console.log('Fetch started:', data));
blogsLib.on('cacheHit', key => console.log('Cache hit:', key));
blogsLib.on('error', err => console.error('Error:', err));

const blogs = await blogsLib.getAllBlogs();
const blog = await blogsLib.getBlogContent(blogs[0].slug);
const html = blogsLib.convertMarkdownToHtml(blog.rawTotal, { includeStyles: true });
console.log(html.styledHtml);
```

## Headless CMS Support (`AstraCmsLib`)

`astra-libs` includes a dedicated **`AstraCmsLib`** class for managing and querying Headless CMS data models and records created by `blog-builder`.

### CMS Features

- Fetch CMS template models (`cms/models.json`) and specific model schema definitions
- Fetch all data records for any model (`cms/data/{modelId}.json`)
- Retrieve individual records by unique ID (`getRecord`)
- Perform fuzzy/query searches across records and specific fields (`searchData`)
- Filter records with custom predicate functions or object criteria (`filterData`)
- Dual-tier caching with configurable TTL and automatic offline fallback
- Lifecycle event hooks (`cacheHit`, `modelsLoaded`, `dataLoaded`, `error`)

### Usage

```js
import { AstraCmsLib } from 'astra-blogs-lib';
// Or: const { AstraCmsLib } = require('astra-blogs-lib');
// Or in browser: const cmsLib = new AstraCmsLib({ token, secret });

const cmsLib = new AstraCmsLib({
  token: 'encrypted-token',
  secret: 'decryption-secret'
});

// 1. Fetch all CMS models (schemas)
const models = await cmsLib.getModels();
console.log('Available Models:', models);

// 2. Get a single model schema by ID
const teamModel = await cmsLib.getModel('team_members');

// 3. Fetch all records for a model
const teamMembers = await cmsLib.getData('team_members');

// 4. Get a specific record by ID
const member = await cmsLib.getRecord('team_members', 'rec_123');

// 5. Search records with a query text
const engineers = await cmsLib.searchData('team_members', 'Engineer', {
  searchFields: ['role', 'bio']
});

// 6. Filter records with criteria object or predicate function
const activeMembers = await cmsLib.filterData('team_members', { isActive: true });
const experienced = await cmsLib.filterData('team_members', r => r.experienceYears >= 5);
```

## Notes

- The library uses local storage caching by default in browser environments.
- If fetching fails, it may return expired cached data when available.
- For advanced markdown parsing, replace the simple internal parser with a dedicated YAML/markdown library if needed.

## Additional Resources

- [Full library documentation](ASTRA_BLOGS_LIBRARY_DOCUMENTATION.md)
- [Usage guide](LIBRARY_USAGE_GUIDE.md)
- [Framework examples](FRAMEWORK_EXAMPLES.md)

