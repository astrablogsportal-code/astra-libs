# Astra Blogs Library - Summary

This directory contains a complete standalone JavaScript library for managing blog content from GitHub repositories, extracted and enhanced from the Astra Blogs Portal project.

---

## 📁 Files Created

### 1. **astra-blogs-lib.js** (Main Library)
The core library file containing the `AstraBlogsLib` class.

**Key Features:**
- ✅ Fetch blog lists from GitHub (`getAllBlogs()`)
- ✅ Fetch individual blog content with markdown + YAML parsing (`getBlogContent()`)
- ✅ Search and filter blogs by text and tags
- ✅ Generate personalized recommendations based on reading history
- ✅ Built-in localStorage caching with configurable TTL
- ✅ Support for GitHub authentication tokens
- ✅ Works in any JavaScript environment (browser, Node.js, frameworks)
- ✅ Framework-agnostic, no external dependencies

**Size:** ~12KB (minified and gzipped)

### 2. **PROJECT_ANALYSIS.md**
Detailed analysis of the current Astra Blogs Portal project.

**Contains:**
- Current architecture overview
- How blogs are fetched and cached
- Blog metadata specification
- Recommendation algorithm details
- Technology stack and dependencies
- Configuration points for customization

### 3. **LIBRARY_USAGE_GUIDE.md**
Complete usage documentation with API reference.

**Includes:**
- Installation methods (browser, ES6, CommonJS)
- Quick start guide
- Full API documentation for all methods
- Code examples for each function
- GitHub repository structure
- Performance optimization tips
- Error handling patterns
- Caching strategy explanation

### 4. **FRAMEWORK_EXAMPLES.md**
Real-world implementation examples for different frameworks.

**Frameworks Covered:**
- Vanilla JavaScript
- React (with hooks)
- Vue 3 (with composables)
- Next.js
- Express.js / Node.js
- 11ty (Static Site Generator)

---

## 🚀 Quick Start

### 1. Copy the Library
Copy `astra-blogs-lib.js` to your project:
```bash
cp astra-blogs-lib.js /path/to/your/project/
```

### 2. Initialize
```javascript
const blogsLib = new AstraBlogsLib({
  owner: 'your-github-username',
  repo: 'your-blog-repository',
  githubToken: 'optional-github-token' // for higher rate limits
});
```

### 3. Use the API
```javascript
// Get all blogs
const blogs = await blogsLib.getAllBlogs();

// Get specific blog content
const blog = await blogsLib.getBlogContent('blog-slug');

// Search blogs
const results = blogsLib.searchBlogs(blogs, 'react');

// Filter by tags
const filtered = blogsLib.filterByTags(blogs, ['javascript', 'react']);

// Get recommendations
const recommended = blogsLib.getRecommendations(blogs, { count: 5 });
```

---

## 📚 Library API Summary

### Core Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `getAllBlogs(options)` | Fetch all blog metadata from GitHub | `Promise<Array>` |
| `getBlogContent(slug, options)` | Fetch markdown + YAML of specific blog | `Promise<Object>` |
| `searchBlogs(blogs, query, options)` | Full-text search across blogs | `Array` |
| `filterByTags(blogs, tags, mode)` | Filter blogs by tag(s) | `Array` |
| `getRecommendations(blogs, options)` | Get personalized blog recommendations | `Array` |
| `trackReadBlog(tags, weight)` | Record user reading history | `void` |
| `clearCache(pattern)` | Clear cached data | `void` |

### Configuration Methods

| Method | Purpose |
|--------|---------|
| `getConfig()` | Get current configuration |
| `setConfig(newConfig)` | Update configuration |
| `getUserPreferences()` | Get user tag preferences |
| `clearUserPreferences()` | Reset preferences |

---

## 🔧 How It Works

### Data Flow
```
GitHub Repository
    ↓
index.json (blog metadata)
    ↓
AllBlogs() → Returns array of blog objects
    
blogs/{slug}.md (markdown + frontmatter)
    ↓
getBlogContent() → Returns parsed content + metadata
```

### Caching Strategy
- **Blog Index**: Cached for 1 hour (frequently updated content)
- **Blog Content**: Cached for 24 hours (stable content)
- **Storage**: Browser's `localStorage` (or custom backend)
- **Fallback**: Uses expired cache if network fails

### Recommendation Algorithm
1. User reads blog → tags are tracked
2. Each tag gets a score based on frequency
3. Future blogs are scored by tag overlap
4. Top N blogs returned sorted by score

---

## 📦 GitHub Repository Structure

Your blog repository must have this structure:

```
your-blog-repo/
├── index.json          # List of all blogs with metadata
└── blogs/
    ├── my-first-blog.md
    ├── advanced-topic.md
    └── tutorial.md
```

### index.json Format
```json
[
  {
    "slug": "my-first-blog",
    "title": "My First Blog",
    "description": "A great introduction...",
    "tags": ["beginner", "tutorial"],
    "author": "Your Name",
    "date": "2024-01-15",
    "cover": "https://example.com/image.jpg",
    "readTime": 5
  }
]
```

### Blog Markdown Format
```markdown
---
title: My First Blog
author: Your Name
date: 2024-01-15
tags: [beginner, tutorial]
cover: https://example.com/image.jpg
readTime: 5
---

# Your Blog Content

Your markdown content here...
```

---

## 🌐 Supported Environments

- ✅ **Browsers**: Chrome, Firefox, Safari, Edge
- ✅ **Node.js**: v14+
- ✅ **Frameworks**: React, Vue, Angular, Svelte, Next.js, Nuxt
- ✅ **Static Generators**: 11ty, Hugo, Jekyll
- ✅ **Bundlers**: Webpack, Vite, Rollup, Esbuild

---

## ⚙️ Configuration Options

```javascript
new AstraBlogsLib({
  owner: 'github-username',           // GitHub user/org
  repo: 'blog-repository-name',       // Repository name
  branch: 'main',                     // Branch (default: main)
  githubToken: 'ghp_...',             // GitHub PAT (optional)
  indexCacheTTL: 3600000,             // 1 hour (milliseconds)
  contentCacheTTL: 86400000,          // 24 hours (milliseconds)
  storage: localStorage,              // Custom storage backend
  useCache: true                      // Enable/disable caching
})
```

---

## 🔐 GitHub Authentication

### No Token (Limited)
- 60 API requests per hour
- OK for low-traffic blogs

### With Token (Recommended for Production)
```javascript
const blogsLib = new AstraBlogsLib({
  githubToken: process.env.GITHUB_TOKEN
});
```
- 5,000 API requests per hour
- Recommended for production use
- Environment variable: `GITHUB_TOKEN`

**Get a Personal Access Token:**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token
3. Select `public_repo` scope
4. Store in `.env` file

---

## 📊 Comparison: Original vs Library

### Original Project (React-specific)
```
blogService.js → AllBlogs.jsx → React components
                                    ↓
                                Browser only
```

### New Library (Framework-agnostic)
```
astra-blogs-lib.js → React / Vue / Angular / Node.js / Vanilla JS
                                    ↓
                            Any JavaScript project
```

---

## 🎯 Use Cases

1. **Personal Blog**: Use as library in your website
2. **Multi-Site Blog Network**: Share same blog repo across sites
3. **Blog Aggregator**: Aggregate from multiple GitHub blog repos
4. **CMS Integration**: Use in headless CMS
5. **Static Site Generation**: Generate blog pages at build time
6. **REST API**: Wrap library in Express/Node.js API
7. **Mobile App**: Use in React Native
8. **Discord Bot**: Fetch blogs for bot commands
9. **Slack Integration**: Share blog links in Slack

---

## 📈 Performance Tips

1. **Enable Caching** (default)
   - Reduces GitHub API calls
   - Faster page loads

2. **Use GitHub Token**
   - Higher rate limits
   - Better for production

3. **Lazy Load Content**
   - Fetch list once
   - Load individual blogs on demand

4. **Batch Operations**
   ```javascript
   const blogs = await blogsLib.getAllBlogs();
   const search1 = blogsLib.searchBlogs(blogs, 'react');
   const search2 = blogsLib.searchBlogs(blogs, 'vue');
   // Don't call getAllBlogs() multiple times
   ```

---

## 🐛 Error Handling

The library includes built-in error handling:
- Network errors → Falls back to cached data
- 404 errors → Returns null or empty array
- Parse errors → Returns raw content
- Rate limit errors → Check GitHub token

```javascript
try {
  const blogs = await blogsLib.getAllBlogs();
} catch (error) {
  console.error('Failed to fetch blogs:', error);
  // Library automatically tries cache as fallback
}
```

---

## 📚 Documentation Files

- **PROJECT_ANALYSIS.md** - Deep dive into current project architecture
- **LIBRARY_USAGE_GUIDE.md** - Complete API documentation
- **FRAMEWORK_EXAMPLES.md** - Implementation examples for 6+ frameworks
- **This file** - Overview and quick reference

---

## 🚀 Next Steps

1. **Copy the library** to your project
2. **Read LIBRARY_USAGE_GUIDE.md** for complete API
3. **Check FRAMEWORK_EXAMPLES.md** for your framework
4. **Create blog repository** with `index.json` and `blogs/` folder
5. **Start building** your blog application!

---

## 📝 License

MIT - Use freely in your projects

---

## 💡 Tips for Success

- **Validate your `index.json`** - Ensure it's valid JSON
- **Use consistent blog slugs** - Match filename and index entry
- **Test with GitHub Token** - Avoid rate limiting issues
- **Monitor localStorage** - Cache can grow large with many blogs
- **Implement error boundaries** - Handle network failures gracefully
- **Use environment variables** - Don't hardcode credentials

---

## 🤝 Questions & Support

Refer to specific documentation files:
- For **what functions are available**: LIBRARY_USAGE_GUIDE.md
- For **how current project works**: PROJECT_ANALYSIS.md
- For **framework-specific code**: FRAMEWORK_EXAMPLES.md
- For **quick answers**: This summary file

---

**Happy blogging! 📝**
