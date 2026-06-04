# Astra Blogs Library - Framework Examples

Implementation examples for using the Astra Blogs Library in different frameworks and scenarios.

---

## 1. Vanilla JavaScript

### HTML Page
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog Portal</title>
  <style>
    body { font-family: sans-serif; margin: 20px; }
    .blog-item { border: 1px solid #ccc; padding: 15px; margin: 10px 0; }
    .loader { display: none; }
    .loader.active { display: block; }
  </style>
</head>
<body>
  <h1>My Blog Portal</h1>
  
  <input type="text" id="searchInput" placeholder="Search blogs...">
  <button id="sortBtn">Sort by Date</button>
  
  <div class="loader active" id="loader">Loading blogs...</div>
  <div id="blogList"></div>
  <div id="recommendations">
    <h2>Recommended for You</h2>
    <div id="recommendedList"></div>
  </div>

  <script src="astra-blogs-lib.js"></script>
  <script src="vanilla-example.js"></script>
</body>
</html>
```

### JavaScript (vanilla-example.js)
```javascript
const blogsLib = new AstraBlogsLib({
  owner: 'your-username',
  repo: 'your-blog-repo'
});

let allBlogs = [];
let sortAsc = false;

// Initialize
async function init() {
  try {
    allBlogs = await blogsLib.getAllBlogs();
    displayBlogs(allBlogs);
    displayRecommendations();
  } catch (error) {
    document.getElementById('loader').innerHTML = 'Failed to load blogs';
  } finally {
    document.getElementById('loader').classList.remove('active');
  }
}

function displayBlogs(blogs) {
  const html = blogs.map(blog => `
    <div class="blog-item">
      <h3>${blog.title}</h3>
      <p>${blog.description}</p>
      <p><small>By ${blog.author} • ${blog.date}</small></p>
      <p>Tags: ${blog.tags.join(', ')}</p>
      <button onclick="viewBlog('${blog.slug}')">Read More</button>
    </div>
  `).join('');
  
  document.getElementById('blogList').innerHTML = html;
}

function displayRecommendations() {
  const recommended = blogsLib.getRecommendations(allBlogs, { count: 5 });
  const html = recommended.map(blog => `
    <div class="blog-item">
      <h4>${blog.title}</h4>
      <button onclick="viewBlog('${blog.slug}')">Read</button>
    </div>
  `).join('');
  
  document.getElementById('recommendedList').innerHTML = html;
}

function viewBlog(slug) {
  // Fetch and display full blog content
  blogsLib.getBlogContent(slug).then(blog => {
    if (blog) {
      // Mark as read for recommendations
      const metadata = blog.metadata;
      if (metadata.tags) {
        blogsLib.trackReadBlog(metadata.tags);
      }
      
      // Display content (implement as needed)
      alert(`Viewing: ${metadata.title}\n\n${blog.content.substring(0, 100)}...`);
    }
  });
}

// Search
document.getElementById('searchInput').addEventListener('input', (e) => {
  const results = blogsLib.searchBlogs(allBlogs, e.target.value);
  displayBlogs(results);
});

// Sort
document.getElementById('sortBtn').addEventListener('click', () => {
  sortAsc = !sortAsc;
  const sorted = [...allBlogs].sort((a, b) => {
    const comparison = new Date(a.date) - new Date(b.date);
    return sortAsc ? comparison : -comparison;
  });
  displayBlogs(sorted);
});

// Start
init();
```

---

## 2. React

### Setup
```bash
npm install astra-blogs-lib
```

### Hook for Blog Management
```javascript
// hooks/useBlogsLib.js
import { useState, useCallback, useEffect } from 'react';
import AstraBlogsLib from 'astra-blogs-lib';

export function useBlogsLib(config = {}) {
  const [blogsLib] = useState(() => new AstraBlogsLib(config));
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        const data = await blogsLib.getAllBlogs();
        setBlogs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBlogs();
  }, [blogsLib]);

  const getBlogContent = useCallback(async (slug, options) => {
    return blogsLib.getBlogContent(slug, options);
  }, [blogsLib]);

  const search = useCallback((query) => {
    return blogsLib.searchBlogs(blogs, query);
  }, [blogs, blogsLib]);

  const filterByTags = useCallback((tags, mode = 'any') => {
    return blogsLib.filterByTags(blogs, tags, mode);
  }, [blogs, blogsLib]);

  const getRecommendations = useCallback((options) => {
    return blogsLib.getRecommendations(blogs, options);
  }, [blogs, blogsLib]);

  const trackRead = useCallback((tags, weight) => {
    blogsLib.trackReadBlog(tags, weight);
  }, [blogsLib]);

  return {
    blogs,
    loading,
    error,
    getBlogContent,
    search,
    filterByTags,
    getRecommendations,
    trackRead,
    blogsLib
  };
}
```

### Blog List Component
```javascript
// components/BlogList.jsx
import React, { useState } from 'react';
import { useBlogsLib } from '../hooks/useBlogsLib';

export function BlogList() {
  const { blogs, loading, error, search, getRecommendations } = useBlogsLib({
    owner: 'your-username',
    repo: 'your-blog-repo'
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  
  if (loading) return <div>Loading blogs...</div>;
  if (error) return <div>Error: {error}</div>;
  
  const filtered = searchQuery ? search(searchQuery) : blogs;
  const recommended = getRecommendations({ count: 5 });

  return (
    <div>
      <h1>Blog Portal</h1>
      
      <input
        type="text"
        placeholder="Search blogs..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      
      <h2>All Blogs ({filtered.length})</h2>
      <div className="blog-grid">
        {filtered.map(blog => (
          <BlogCard key={blog.slug} blog={blog} />
        ))}
      </div>
      
      <h2>Recommended for You</h2>
      <div className="blog-grid">
        {recommended.map(blog => (
          <BlogCard key={blog.slug} blog={blog} />
        ))}
      </div>
    </div>
  );
}

function BlogCard({ blog }) {
  return (
    <div className="blog-card">
      {blog.cover && <img src={blog.cover} alt={blog.title} />}
      <h3>{blog.title}</h3>
      <p>{blog.description}</p>
      <div className="tags">
        {blog.tags.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      <p className="meta">
        By {blog.author} • {new Date(blog.date).toLocaleDateString()}
      </p>
    </div>
  );
}
```

### Blog Detail Component
```javascript
// components/BlogDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBlogsLib } from '../hooks/useBlogsLib';
import ReactMarkdown from 'react-markdown';

export function BlogDetail() {
  const { slug } = useParams();
  const { getBlogContent, trackRead } = useBlogsLib({
    owner: 'your-username',
    repo: 'your-blog-repo'
  });
  
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBlog = async () => {
      try {
        setLoading(true);
        const data = await getBlogContent(slug);
        
        if (data) {
          setBlog(data);
          
          // Track that user is reading this blog
          if (data.metadata.tags) {
            trackRead(data.metadata.tags);
          }
        } else {
          setError('Blog not found');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBlog();
  }, [slug, getBlogContent, trackRead]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!blog) return <div>Blog not found</div>;

  const { metadata, content } = blog;

  return (
    <article className="blog-detail">
      <h1>{metadata.title}</h1>
      <p className="meta">
        By {metadata.author} • {new Date(metadata.date).toLocaleDateString()}
        • {metadata.readTime} min read
      </p>
      
      {metadata.cover && (
        <img src={metadata.cover} alt={metadata.title} className="cover" />
      )}
      
      <div className="tags">
        {metadata.tags.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      
      <ReactMarkdown className="content">
        {content}
      </ReactMarkdown>
    </article>
  );
}
```

---

## 3. Vue 3

### Composable
```javascript
// composables/useBlogsLib.js
import { ref, reactive, computed } from 'vue';
import AstraBlogsLib from 'astra-blogs-lib';

export function useBlogsLib(config = {}) {
  const blogsLib = new AstraBlogsLib(config);
  const blogs = ref([]);
  const loading = ref(true);
  const error = ref(null);

  const loadBlogs = async () => {
    try {
      loading.value = true;
      error.value = null;
      blogs.value = await blogsLib.getAllBlogs();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const getBlogContent = async (slug, options) => {
    return blogsLib.getBlogContent(slug, options);
  };

  const search = (query) => {
    return blogsLib.searchBlogs(blogs.value, query);
  };

  const getRecommendations = (options) => {
    return blogsLib.getRecommendations(blogs.value, options);
  };

  const trackRead = (tags) => {
    blogsLib.trackReadBlog(tags);
  };

  return {
    blogs,
    loading,
    error,
    loadBlogs,
    getBlogContent,
    search,
    getRecommendations,
    trackRead
  };
}
```

### Component
```vue
<!-- components/BlogList.vue -->
<template>
  <div class="blog-portal">
    <h1>Blog Portal</h1>
    
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Search blogs..."
      class="search-input"
    />
    
    <div v-if="loading" class="loader">Loading blogs...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <h2>All Blogs ({{ filteredBlogs.length }})</h2>
      <div class="blog-grid">
        <BlogCard
          v-for="blog in filteredBlogs"
          :key="blog.slug"
          :blog="blog"
          @click="viewBlog(blog.slug)"
        />
      </div>

      <h2>Recommended for You</h2>
      <div class="blog-grid">
        <BlogCard
          v-for="blog in recommended"
          :key="blog.slug"
          :blog="blog"
          @click="viewBlog(blog.slug)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useBlogsLib } from '@/composables/useBlogsLib';
import BlogCard from './BlogCard.vue';

const { blogs, loading, error, loadBlogs, search, getRecommendations } = useBlogsLib({
  owner: 'your-username',
  repo: 'your-blog-repo'
});

const searchQuery = ref('');

const filteredBlogs = computed(() => {
  return searchQuery.value
    ? search(searchQuery.value)
    : blogs.value;
});

const recommended = computed(() => {
  return getRecommendations({ count: 5 });
});

onMounted(() => {
  loadBlogs();
});

const viewBlog = (slug) => {
  // Navigate to blog detail
  // Example: router.push(`/blog/${slug}`)
};
</script>
```

---

## 4. Next.js

### API Route
```javascript
// pages/api/blogs/index.js
import AstraBlogsLib from 'astra-blogs-lib';

const blogsLib = new AstraBlogsLib({
  owner: process.env.NEXT_PUBLIC_BLOG_OWNER,
  repo: process.env.NEXT_PUBLIC_BLOG_REPO,
  githubToken: process.env.GITHUB_TOKEN // Server-only
});

export default async function handler(req, res) {
  try {
    const { forceFresh } = req.query;
    const blogs = await blogsLib.getAllBlogs({
      forceFresh: forceFresh === 'true'
    });
    
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Component with SWR
```javascript
// components/BlogList.js
import useSWR from 'swr';
import AstraBlogsLib from 'astra-blogs-lib';

const blogsLib = new AstraBlogsLib({
  owner: process.env.NEXT_PUBLIC_BLOG_OWNER,
  repo: process.env.NEXT_PUBLIC_BLOG_REPO
});

const fetcher = async (url) => {
  const res = await fetch(url);
  return res.json();
};

export default function BlogList() {
  const { data: blogs, error, isLoading } = useSWR('/api/blogs', fetcher);
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Failed to load blogs</div>;

  const filtered = searchQuery
    ? blogsLib.searchBlogs(blogs, searchQuery)
    : blogs;

  return (
    <div>
      <input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {/* Render filtered blogs */}
    </div>
  );
}
```

---

## 5. Node.js Server (Express)

### Setup
```javascript
// server.js
import express from 'express';
import AstraBlogsLib from 'astra-blogs-lib';

const app = express();

// Create library instance with environment config
const blogsLib = new AstraBlogsLib({
  owner: process.env.BLOG_OWNER,
  repo: process.env.BLOG_REPO,
  githubToken: process.env.GITHUB_TOKEN,
  storage: null // Use custom storage or null for no caching
});

// Routes
app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await blogsLib.getAllBlogs();
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/blogs/:slug', async (req, res) => {
  try {
    const blog = await blogsLib.getBlogContent(req.params.slug);
    
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/blogs/search', (req, res) => {
  try {
    const { q } = req.query;
    
    // Note: Need to load blogs first
    blogsLib.getAllBlogs().then(blogs => {
      const results = blogsLib.searchBlogs(blogs, q);
      res.json(results);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Blog server running on port 3000');
});
```

### Custom Storage Backend
```javascript
// Using Redis for caching in Node.js
import redis from 'redis';

const redisClient = redis.createClient();
const blogsLib = new AstraBlogsLib({
  owner: 'your-username',
  repo: 'your-blog-repo',
  storage: {
    getItem: async (key) => {
      return await redisClient.get(key);
    },
    setItem: async (key, value) => {
      return await redisClient.set(key, value);
    },
    removeItem: async (key) => {
      return await redisClient.del(key);
    }
  }
});
```

---

## 6. Static Site Generator (11ty)

### Data File
```javascript
// _data/blogs.js
import AstraBlogsLib from '../astra-blogs-lib.js';

const blogsLib = new AstraBlogsLib({
  owner: 'your-username',
  repo: 'your-blog-repo'
});

module.exports = async function() {
  return await blogsLib.getAllBlogs();
};
```

### Template
```liquid
<!-- blog-list.liquid -->
<h1>All Blogs</h1>
<ul>
{% for blog in blogs %}
  <li>
    <a href="/blog/{{ blog.slug }}/">{{ blog.title }}</a>
    <p>{{ blog.description }}</p>
  </li>
{% endfor %}
</ul>
```

---

## 7. Error Handling Best Practices

```javascript
// Comprehensive error handling
async function loadBlogSafely(slug) {
  try {
    // Fetch with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    
    const blog = await Promise.race([
      blogsLib.getBlogContent(slug),
      timeoutPromise
    ]);
    
    if (!blog) {
      throw new Error('Blog not found');
    }
    
    return blog;
    
  } catch (error) {
    if (error.message === 'Timeout') {
      console.error('Blog fetch timed out');
      // Fall back to cache or offline version
    } else if (error.message.includes('404')) {
      console.error('Blog not found');
      // Show 404 page
    } else {
      console.error('Unexpected error:', error);
      // Show generic error
    }
    
    return null;
  }
}
```

---

## Environment Variables

### .env Example
```
# GitHub Repository Configuration
VITE_BLOG_OWNER=your-username
VITE_BLOG_REPO=your-blog-repo
VITE_BLOG_BRANCH=main

# Optional: GitHub token for higher rate limits
VITE_GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Server-side only
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

### Usage
```javascript
const blogsLib = new AstraBlogsLib({
  owner: import.meta.env.VITE_BLOG_OWNER,
  repo: import.meta.env.VITE_BLOG_REPO,
  githubToken: import.meta.env.VITE_GITHUB_TOKEN
});
```

---

This covers the most common use cases. Adapt these examples to your specific project needs!
