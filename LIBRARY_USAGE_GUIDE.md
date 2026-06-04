# Astra Blogs Library - Usage Guide

A standalone JavaScript library for fetching and managing blog content from GitHub repositories. Works in any JavaScript environment (browser, Node.js, etc.).

---

## Installation

### Option 1: Direct Script Tag (Browser)
```html
<script src="path/to/astra-blogs-lib.js"></script>
<script>
  const blogsLib = new AstraBlogsLib();
</script>
```

### Option 2: Module Import (ES6)
```javascript
import AstraBlogsLib from './astra-blogs-lib.js';

const blogsLib = new AstraBlogsLib();
```

### Option 3: CommonJS
```javascript
const AstraBlogsLib = require('./astra-blogs-lib.js');

const blogsLib = new AstraBlogsLib();
```

---

## Quick Start

### Basic Setup
```javascript
// Initialize with default config (uses Santhosh20112003/rtym-blog-files)
const blogsLib = new AstraBlogsLib();

// Or customize with your GitHub repository
const blogsLib = new AstraBlogsLib({
  owner: 'your-username',
  repo: 'your-blogs-repo',
  branch: 'main',
  githubToken: 'ghp_xxxxxxxxxxxx' // Optional, for higher rate limits
});

// Fetch all blogs
const blogs = await blogsLib.getAllBlogs();
console.log(`Found ${blogs.length} blogs`);

// Fetch specific blog content
const blog = await blogsLib.getBlogContent('blog-slug');
console.log(blog.metadata); // YAML frontmatter parsed as object
console.log(blog.content);  // Markdown content
```

---

## API Reference

### Constructor

```javascript
new AstraBlogsLib(config)
```

**Configuration Options:**
```javascript
{
  owner: 'string',              // GitHub username (default: 'Santhosh20112003')
  repo: 'string',               // Repository name (default: 'rtym-blog-files')
  branch: 'string',             // Branch name (default: 'main')
  githubToken: 'string',        // GitHub PAT (optional)
  indexCacheTTL: 3600000,       // Cache duration for blog list (default: 1 hour)
  contentCacheTTL: 86400000,    // Cache duration for blog content (default: 24 hours)
  storage: localStorage,        // Storage backend (default: window.localStorage)
  useCache: true                // Enable/disable caching (default: true)
}
```

---

## Methods

### 1. `getAllBlogs(options)`

Fetch all published blogs from the repository.

**Parameters:**
```javascript
{
  useCache: true,     // Use cached data if available
  forceFresh: false   // Skip cache and fetch from GitHub
}
```

**Returns:** `Promise<Array>` - Array of blog objects

**Example:**
```javascript
// Get blogs from cache or GitHub
const blogs = await blogsLib.getAllBlogs();

// Force fresh fetch from GitHub
const freshBlogs = await blogsLib.getAllBlogs({ forceFresh: true });

// Disable cache for this request
const blogsNoCached = await blogsLib.getAllBlogs({ useCache: false });

// Result format
[
  {
    slug: 'blog-slug',
    title: 'Blog Title',
    description: 'Short description',
    seoTitle: 'SEO Title',
    seoDescription: 'SEO Description',
    tags: ['react', 'javascript'],
    author: 'John Doe',
    date: '2024-01-01',
    updatedAt: '2024-01-15',
    cover: 'https://example.com/image.jpg',
    readTime: 5,
    canonical: 'https://example.com/blog/slug'
  }
]
```

---

### 2. `getBlogContent(slug, options)`

Fetch full content of a specific blog with markdown and frontmatter.

**Parameters:**
- `slug` (string): Blog identifier (filename without .md)
- `options` (object, optional):
  ```javascript
  {
    useCache: true,      // Use cached content
    forceFresh: false,   // Fetch fresh from GitHub
    parseYAML: true      // Parse YAML metadata
  }
  ```

**Returns:** `Promise<Object|null>` - Blog content object or null if not found

**Example:**
```javascript
const blog = await blogsLib.getBlogContent('getting-started-with-react');

// Result format
{
  rawFrontmatter: "title: Getting Started with React\n...",
  content: "# Getting Started\n\nContent here...",
  rawTotal: "---\ntitle:...\n---\n# Getting Started...",
  metadata: {
    title: "Getting Started with React",
    author: "John Doe",
    tags: ["react", "javascript"],
    date: "2024-01-01",
    readTime: 5
  }
}
```

---

### 3. `getRecommendations(blogs, options)`

Get personalized blog recommendations based on user reading history.

**Parameters:**
- `blogs` (Array): Blog array to recommend from
- `options` (object, optional):
  ```javascript
  {
    count: 3,                    // Number of recommendations (default: 3)
    userPreferences: null,       // Custom preferences object { tag: count }
    randomizeTies: true          // Randomize blogs with equal scores
  }
  ```

**Returns:** `Array` - Recommended blog objects

**Example:**
```javascript
// Get 5 recommendations (uses stored user preferences)
const recommendations = blogsLib.getRecommendations(blogs, { count: 5 });

// Get recommendations with custom preferences
const recommendations = blogsLib.getRecommendations(blogs, {
  count: 3,
  userPreferences: {
    'react': 3,
    'javascript': 2,
    'web-development': 1
  }
});

console.log(recommendations); // Top 3 matching blogs
```

---

### 4. `trackReadBlog(tags, weight)`

Record that user read a blog to improve recommendations.

**Parameters:**
- `tags` (Array): Tag array from blog
- `weight` (number, optional): Importance weight (default: 1)

**Example:**
```javascript
// Track that user read a React blog
blogsLib.trackReadBlog(['react', 'hooks', 'javascript'], 1);

// Track with higher weight (more important)
blogsLib.trackReadBlog(['typescript', 'advanced'], 2);
```

---

### 5. `searchBlogs(blogs, query, options)`

Search blogs by title, description, tags, or custom fields.

**Parameters:**
- `blogs` (Array): Blog array to search
- `query` (string): Search query
- `options` (object, optional):
  ```javascript
  {
    searchFields: ['title', 'description', 'tags'] // Fields to search
  }
  ```

**Returns:** `Array` - Filtered blogs matching query

**Example:**
```javascript
const results = blogsLib.searchBlogs(blogs, 'react');
// Returns blogs with 'react' in title, description, or tags

// Search in specific fields
const results = blogsLib.searchBlogs(blogs, 'hooks', {
  searchFields: ['title', 'tags']
});

// Case-insensitive search
const results = blogsLib.searchBlogs(blogs, 'JAVASCRIPT');
// Matches 'javascript', 'JavaScript', 'JavaScript', etc.
```

---

### 6. `filterByTags(blogs, tagFilter, mode)`

Filter blogs by one or more tags.

**Parameters:**
- `blogs` (Array): Blog array to filter
- `tagFilter` (string|Array): Tag(s) to filter by
- `mode` (string, optional): 'any' (OR) or 'all' (AND) - default: 'any'

**Returns:** `Array` - Filtered blogs

**Example:**
```javascript
// Blogs with 'react' OR 'vue' tag
const filtered = blogsLib.filterByTags(blogs, ['react', 'vue'], 'any');

// Blogs with BOTH 'javascript' AND 'advanced' tags
const filtered = blogsLib.filterByTags(blogs, ['javascript', 'advanced'], 'all');

// Single tag
const filtered = blogsLib.filterByTags(blogs, 'react');
```

---

### 7. Cache Management

**Clear all cache:**
```javascript
blogsLib.clearCache();
```

**Clear specific cache (e.g., only blog content):**
```javascript
blogsLib.clearCache('blog_content');
```

---

### 8. User Preferences

**Get user preferences:**
```javascript
const prefs = blogsLib.getUserPreferences();
console.log(prefs);
// { 'react': 3, 'javascript': 2, 'typescript': 1 }
```

**Clear user preferences:**
```javascript
blogsLib.clearUserPreferences();
```

---

### 9. Configuration Management

**Get current configuration:**
```javascript
const config = blogsLib.getConfig();
console.log(config);
```

**Update configuration:**
```javascript
blogsLib.setConfig({
  owner: 'new-username',
  repo: 'new-repo',
  githubToken: 'new-token'
});
```

---

## Complete Example: Build a Blog Portal

```javascript
// Initialize library
const blogsLib = new AstraBlogsLib({
  owner: 'your-username',
  repo: 'your-blog-repo'
});

// Load all blogs
async function loadBlogPortal() {
  try {
    // 1. Fetch all blogs
    const blogs = await blogsLib.getAllBlogs();
    
    // 2. Display sorted by date
    const sorted = blogs.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    // 3. Get recommendations
    const recommendations = blogsLib.getRecommendations(blogs, { count: 5 });
    
    // 4. Render UI
    renderBlogList(sorted);
    renderRecommendations(recommendations);
    
    // 5. Setup search
    document.getElementById('search').addEventListener('input', (e) => {
      const results = blogsLib.searchBlogs(blogs, e.target.value);
      renderBlogList(results);
    });
    
  } catch (error) {
    console.error('Failed to load portal:', error);
  }
}

// Load single blog
async function loadBlogDetail(slug) {
  try {
    const blog = await blogsLib.getBlogContent(slug);
    
    if (!blog) {
      console.error('Blog not found');
      return;
    }
    
    // Display content
    renderBlogContent(blog);
    
    // Track that user read this blog
    if (blog.metadata.tags) {
      blogsLib.trackReadBlog(blog.metadata.tags);
    }
    
  } catch (error) {
    console.error('Failed to load blog:', error);
  }
}

// Filter by tags
function filterBlogs(blogs, tags) {
  return blogsLib.filterByTags(blogs, tags, 'any');
}

// Start portal
loadBlogPortal();
```

---

## GitHub Repository Structure

Your blog repository should have this structure:

```
your-blog-repo/
├── index.json          # List of all blogs
└── blogs/
    ├── blog-slug-1.md
    ├── blog-slug-2.md
    └── blog-slug-3.md
```

### index.json Format
```json
[
  {
    "slug": "getting-started",
    "title": "Getting Started",
    "description": "Learn the basics",
    "tags": ["beginner", "tutorial"],
    "author": "John Doe",
    "date": "2024-01-01",
    "cover": "https://example.com/image.jpg",
    "readTime": 5
  }
]
```

### Blog Markdown Format (e.g., getting-started.md)
```markdown
---
title: Getting Started
author: John Doe
date: 2024-01-01
tags: [beginner, tutorial]
cover: https://example.com/image.jpg
readTime: 5
---

# Getting Started

Your content here...

## Section 1
More content...
```

---

## Browser Compatibility

Works in:
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Node.js (with custom storage backend)
- ✅ React, Vue, Angular, or vanilla JS
- ✅ Any framework that supports JavaScript

**Note:** Uses Fetch API, requires browser support or polyfill for IE11

---

## Rate Limits

**GitHub API Rate Limits:**
- Unauthenticated: 60 requests/hour
- Authenticated (with token): 5,000 requests/hour

**Caching reduces API calls significantly:**
- Blog index: 1-hour cache (30 API calls/day max)
- Blog content: 24-hour cache (1-2 API calls/day per blog)

---

## Performance Tips

1. **Enable Caching** (default: enabled)
   - Reduces API calls and network bandwidth
   - Set appropriate TTL values for your use case

2. **Use GitHub Token**
   - Higher rate limits (5,000 vs 60 per hour)
   - Recommended for production

3. **Lazy Load Content**
   - Fetch blog list once, content on demand
   - Saves bandwidth and improves page load time

4. **Batch Operations**
   ```javascript
   // Good: Fetch once, operate multiple times
   const blogs = await blogsLib.getAllBlogs();
   const search1 = blogsLib.searchBlogs(blogs, 'react');
   const search2 = blogsLib.searchBlogs(blogs, 'vue');
   const filtered = blogsLib.filterByTags(blogs, 'javascript');
   
   // Avoid: Multiple fetches
   // const blogs1 = await blogsLib.getAllBlogs();
   // const blogs2 = await blogsLib.getAllBlogs();
   ```

---

## Error Handling

```javascript
try {
  const blogs = await blogsLib.getAllBlogs();
  
  if (blogs.length === 0) {
    console.warn('No blogs found');
  }
  
  const blog = await blogsLib.getBlogContent('nonexistent');
  
  if (!blog) {
    console.warn('Blog not found');
  }
  
} catch (error) {
  console.error('API error:', error.message);
  
  // Library provides fallback to cached data when available
  // Check console for informative error messages
}
```

---

## Migrating from Current Project

The current React project uses individual components. Here's how to migrate:

**Before (separate files):**
```javascript
// AllBlogs.jsx
import { getAllBlogs } from "./blogService";
const blogs = await getAllBlogs();

// Blog.jsx
import { getBlogContent } from "./blogService";
const content = await getBlogContent(slug);
```

**After (with library):**
```javascript
import AstraBlogsLib from './astra-blogs-lib.js';

const blogsLib = new AstraBlogsLib();
const blogs = await blogsLib.getAllBlogs();
const content = await blogsLib.getBlogContent(slug);
```

---

## License

MIT - Use freely in your projects
