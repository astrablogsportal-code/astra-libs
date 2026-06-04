# Project Analysis: Astra Blogs Portal

## Project Overview
A React-based blog portal that fetches and displays blog content from a GitHub repository. The application uses Vite as the build tool and Tailwind CSS for styling.

---

## Current Architecture

### 1. **Data Source**
- **Repository**: GitHub-hosted (`owner`/`repo` format)
- **Default Config**: 
  - Owner: `Santhosh20112003`
  - Repo: `rtym-blog-files`
  - Branch: `main`
- **File Structure in GitHub**:
  - `index.json` - List of all published blogs (metadata)
  - `blogs/{slug}.md` - Individual blog markdown files with YAML frontmatter

### 2. **Core Functions**

#### `getAllBlogs(githubToken = null)`
**Purpose**: Fetch list of all published blogs
**Returns**: Array of blog objects with metadata
**Features**:
- Fetches from GitHub API: `/repos/{owner}/{repo}/contents/index.json`
- **Caching**: Uses `localStorage` with 1-hour TTL
- **Token Support**: Optional GitHub token to increase API rate limits
- **Error Handling**: Fallback to cached data if fetch fails

**Response Format**:
```json
[
  {
    "slug": "blog-slug",
    "title": "Blog Title",
    "description": "Short description",
    "tags": ["tag1", "tag2"],
    "date": "2024-01-01",
    "updatedAt": "2024-01-15",
    "author": "Author Name",
    "cover": "image-url",
    "readTime": 5
  }
]
```

#### `getBlogContent(slug, githubToken = null)`
**Purpose**: Fetch raw markdown content of a specific blog
**Returns**: Object with frontmatter and content separated
**Features**:
- Fetches from GitHub API: `/repos/{owner}/{repo}/contents/blogs/{slug}.md`
- **YAML Frontmatter Parsing**: Extracts metadata between `---` markers
- **Caching**: Uses `localStorage` with 24-hour TTL
- **Cache Key**: `blog_content_{slug}`
- **Returns Object**:
  ```javascript
  {
    rawFrontmatter: "# YAML content",
    content: "# Markdown content",
    rawTotal: "Full markdown file"
  }
  ```

### 3. **Caching Strategy**
- **Blog Index**: 1-hour cache (frequently updated content)
- **Blog Content**: 24-hour cache (stable content)
- **Storage**: Browser's `localStorage`
- **Bypass Method**: Empty `If-None-Match` header prevents CDN caching

### 4. **Recommendation Engine**
**Location**: `AllBlogs.jsx` component

**How It Works**:
1. Stores user reading preferences in `localStorage` under `user_blog_preferences`
2. Tracks tags from visited blogs
3. Scores blogs based on tag overlap with user history
4. Returns top 3 recommended blogs
5. Uses random tie-breaking for equal scores

**Data Structure**:
```javascript
{
  "tag1": 3,      // Count of interactions with this tag
  "tag2": 1,
  "tag3": 5
}
```
- Maximum 20 tags stored (to prevent localStorage bloat)
- Tags are normalized to lowercase with trimmed whitespace

### 5. **Components Structure**

#### `App.jsx`
- Sets up React Router with two routes:
  - `/blog` → AllBlogs component
  - `/blog/:slug` → Blog component
- Handles scroll-to-top functionality

#### `AllBlogs.jsx`
- Displays all blogs with search and filter functionality
- **Features**:
  - Search by title, description, and tags
  - Sort by date (ascending/descending)
  - Display recommended blogs
  - Loading state with spinner

#### `Blog.jsx`
- Displays individual blog content
- **Features**:
  - Markdown rendering with syntax highlighting
  - Table of contents (H2 and H3 headings)
  - Copy-to-clipboard for code blocks
  - Share functionality (Twitter, LinkedIn, Facebook, WhatsApp)
  - Image expansion modal
  - SEO metadata (Open Graph, canonical URLs)
  - Reading time calculation

---

## Key Technologies

| Technology | Purpose | Version |
|-----------|---------|---------|
| React | UI Framework | 19.2.6 |
| React Router | Client-side routing | 7.16.0 |
| Vite | Build tool | 8.0.12 |
| Tailwind CSS | Styling | 4.3.0 |
| React Markdown | Markdown rendering | 10.1.0 |
| js-yaml | YAML parsing | 4.1.1 |
| Framer Motion | Animations | 12.40.0 |
| Highlight.js | Code syntax highlighting | Via rehype-highlight |

---

## Blog Metadata Specification

### Index.json Structure (Blog List)
```json
{
  "slug": "string",              // URL-friendly identifier
  "title": "string",              // Display title
  "seoTitle": "string",           // SEO-optimized title (optional)
  "description": "string",        // Short description
  "seoDescription": "string",     // SEO-optimized description (optional)
  "tags": ["string"],             // Category tags
  "date": "ISO-8601",            // Publication date
  "updatedAt": "ISO-8601",       // Last update (optional)
  "author": "string",             // Author name
  "cover": "url",                 // Cover image URL
  "coverImage": "url",            // Alternative field name
  "readTime": "number",           // Minutes to read
  "canonical": "url"              // Canonical URL (optional)
}
```

### Markdown File Format (Blog Content)
```markdown
---
title: "Blog Title"
seoTitle: "SEO Title (optional)"
description: "Short description"
seoDescription: "SEO description (optional)"
author: "Author Name"
date: 2024-01-01
tags: [tag1, tag2, tag3]
cover: "image-url"
readTime: 5
canonical: "https://example.com/blog/slug"
---

# Main Content

## Heading 2
Content here...

### Heading 3
More content...
```

---

## API Limits & Considerations

- **GitHub API Rate Limits**:
  - 60 requests/hour (unauthenticated)
  - 5,000 requests/hour (authenticated with token)
- **Caching reduces API calls** significantly for production
- **CORS**: Uses GitHub API v3 with `Accept: application/vnd.github.v3.raw` header

---

## Configuration Points for Your Library

1. **Blog Repository**:
   - Change `owner`, `repo`, `branch` in `BLOG_CONFIG`
   - Support for multiple repositories

2. **Caching**:
   - TTL values (1 hour for index, 24 hours for content)
   - Storage backend (currently localStorage)

3. **Authentication**:
   - Optional GitHub token for increased rate limits
   - Can be user-provided or environment-based

4. **Recommendation Algorithm**:
   - Currently tag-based with random tie-breaking
   - Can be enhanced with ML models

---

## Usage Pattern in Current Project

1. Components call `getAllBlogs()` to fetch blog list
2. User can search/filter blogs in AllBlogs component
3. User clicks on a blog → navigates to `/blog/:slug`
4. Blog component calls `getBlogContent(slug)` to fetch markdown
5. Markdown is parsed and rendered with syntax highlighting
6. User preferences are stored for recommendations

---

## For Your Standalone Library

The `blogService.js` file contains the core logic and can be:
- **Extracted as a standalone package**
- **Enhanced with additional features**: pagination, advanced filtering, caching strategies
- **Made framework-agnostic**: Remove React dependencies
- **Published to NPM** for use in other projects
- **Extended with**:
  - TypeScript definitions
  - Error handling enhancements
  - Batch operations
  - Advanced recommendation algorithms
  - Multiple repository support
