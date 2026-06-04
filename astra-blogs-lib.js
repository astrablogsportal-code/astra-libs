/**
 * @fileoverview Astra Blogs Library
 * A standalone JavaScript library for fetching and managing blog content from GitHub repositories
 * 
 * Features:
 * - Fetch blog list from GitHub repository
 * - Fetch individual blog content with YAML frontmatter parsing
 * - Generate recommendations based on user preferences
 * - Built-in localStorage caching with configurable TTL
 * - Support for GitHub authentication tokens
 * 
 * @version 1.0.0
 */

class AstraBlogsLib {
  /**
   * Initialize the Astra Blogs Library
   * @param {Object} config - Configuration object
   * @param {string} config.owner - GitHub repository owner
   * @param {string} config.repo - GitHub repository name
   * @param {string} [config.branch='main'] - GitHub branch name
   * @param {string} [config.githubToken] - GitHub authentication token (optional)
   * @param {number} [config.indexCacheTTL=3600000] - Cache TTL for blog index in milliseconds (default: 1 hour)
   * @param {number} [config.contentCacheTTL=86400000] - Cache TTL for blog content in milliseconds (default: 24 hours)
   * @param {Object} [config.storage=localStorage] - Storage mechanism (must have getItem/setItem)
   */
  constructor(config = {}) {
    this.config = {
      owner: config.owner || 'Santhosh20112003',
      repo: config.repo || 'rtym-blog-files',
      branch: config.branch || 'main',
      githubToken: config.githubToken || null,
      indexCacheTTL: config.indexCacheTTL || 3600000, // 1 hour
      contentCacheTTL: config.contentCacheTTL || 86400000, // 24 hours
      storage: config.storage || (typeof window !== 'undefined' ? window.localStorage : null),
      useCache: config.useCache !== false // Enable cache by default
    };

    this.baseURL = 'https://api.github.com';
  }

  /**
   * Build GitHub API headers with optional authentication
   * @private
   * @returns {Object} Headers object
   */
  _getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github.v3.raw',
      'If-None-Match': '' // Bypass CDN/browser caching
    };

    if (this.config.githubToken) {
      headers['Authorization'] = `token ${this.config.githubToken}`;
    }

    return headers;
  }

  /**
   * Get item from storage with optional TTL validation
   * @private
   * @param {string} key - Storage key
   * @param {number} [ttl] - Time to live in milliseconds
   * @returns {any|null} Stored data or null if expired/not found
   */
  _getFromStorage(key, ttl = null) {
    if (!this.config.storage || !this.config.useCache) return null;

    try {
      const stored = this.config.storage.getItem(key);
      if (!stored) return null;

      const { data, timestamp } = JSON.parse(stored);
      
      // Check if cache has expired
      if (ttl && Date.now() - timestamp > ttl) {
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error reading from storage (${key}):`, error);
      return null;
    }
  }

  /**
   * Save item to storage with timestamp
   * @private
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   */
  _saveToStorage(key, data) {
    if (!this.config.storage || !this.config.useCache) return;

    try {
      this.config.storage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error(`Error saving to storage (${key}):`, error);
    }
  }

  /**
   * Clear all cache data
   * @param {string} [pattern] - Optional pattern to clear specific keys (e.g., 'blog_')
   */
  clearCache(pattern = null) {
    if (!this.config.storage) return;

    try {
      const keys = [];
      for (let i = 0; i < this.config.storage.length; i++) {
        const key = this.config.storage.key(i);
        if (!pattern || key.includes(pattern)) {
          keys.push(key);
        }
      }
      keys.forEach(key => this.config.storage.removeItem(key));
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Fetch all published blogs
   * Returns array of blog metadata objects
   * 
   * @param {Object} [options={}] - Fetch options
   * @param {boolean} [options.useCache=true] - Use cached data if available
   * @param {boolean} [options.forceFresh=false] - Skip cache and fetch fresh data
   * 
   * @returns {Promise<Array>} Array of blog objects with metadata
   * @throws {Error} If fetch fails and no cache available
   * 
   * @example
   * const blogs = await blogsLib.getAllBlogs();
   * // Returns:
   * // [
   * //   {
   * //     slug: "getting-started-with-react",
   * //     title: "Getting Started with React",
   * //     description: "Learn React basics...",
   * //     tags: ["react", "javascript"],
   * //     date: "2024-01-01",
   * //     author: "John Doe",
   * //     cover: "https://..."
   * //   }
   * // ]
   */
  async getAllBlogs(options = {}) {
    const { useCache = true, forceFresh = false } = options;
    const cacheKey = 'astra_blogs_index_cache';

    // Try cache first (unless forceFresh is set)
    if (useCache && !forceFresh) {
      const cached = this._getFromStorage(cacheKey, this.config.indexCacheTTL);
      if (cached) {
        console.log('📚 Returning blogs from cache');
        return cached;
      }
    }

    try {
      const url = `${this.baseURL}/repos/${this.config.owner}/${this.config.repo}/contents/index.json`;
      const response = await fetch(url, {
        headers: this._getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('❌ Blog index not found (404)');
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate response is an array
      if (!Array.isArray(data)) {
        console.warn('⚠️ Blog index is not an array');
        return [];
      }

      // Cache the result
      this._saveToStorage(cacheKey, data);
      console.log(`📚 Fetched ${data.length} blogs from repository`);

      return data;
    } catch (error) {
      console.error('❌ Failed to fetch blog list:', error);

      // Fallback to expired cache if available
      const expired = this._getFromStorage(cacheKey);
      if (expired) {
        console.log('⚠️ Returning expired cached blogs due to fetch error');
        return expired;
      }

      return [];
    }
  }

  /**
   * Fetch content of a specific blog
   * Returns markdown content with frontmatter separated
   * 
   * @param {string} slug - Blog slug (filename without .md extension)
   * @param {Object} [options={}] - Fetch options
   * @param {boolean} [options.useCache=true] - Use cached data if available
   * @param {boolean} [options.forceFresh=false] - Skip cache and fetch fresh data
   * @param {boolean} [options.parseYAML=true] - Parse YAML frontmatter
   * 
   * @returns {Promise<Object|null>} Blog content object or null if not found
   * @throws {Error} If fetch fails and no cache available
   * 
   * @example
   * const blog = await blogsLib.getBlogContent('getting-started-with-react');
   * // Returns:
   * // {
   * //   rawFrontmatter: "title: Getting Started...",
   * //   content: "# Getting Started\n\nContent here...",
   * //   rawTotal: "---\ntitle:...\n---\n# Getting Started...",
   * //   metadata: { title: "Getting Started", tags: [...] } // if parseYAML=true
   * // }
   */
  async getBlogContent(slug, options = {}) {
    const { useCache = true, forceFresh = false, parseYAML = true } = options;
    const cacheKey = `astra_blog_content_${slug}`;

    // Try cache first (unless forceFresh is set)
    if (useCache && !forceFresh) {
      const cached = this._getFromStorage(cacheKey, this.config.contentCacheTTL);
      if (cached) {
        console.log(`📄 Returning blog "${slug}" from cache`);
        return cached;
      }
    }

    try {
      const url = `${this.baseURL}/repos/${this.config.owner}/${this.config.repo}/contents/blogs/${slug}.md`;
      const response = await fetch(url, {
        headers: this._getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`❌ Blog not found: ${slug} (404)`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const markdownContent = await response.text();
      const blogData = this._parseMarkdown(markdownContent, parseYAML);

      // Cache the result
      this._saveToStorage(cacheKey, blogData);
      console.log(`📄 Fetched blog content: ${slug}`);

      return blogData;
    } catch (error) {
      console.error(`❌ Failed to fetch blog ${slug}:`, error);

      // Fallback to expired cache if available
      const expired = this._getFromStorage(cacheKey);
      if (expired) {
        console.log(`⚠️ Returning expired cached blog "${slug}" due to fetch error`);
        return expired;
      }

      return null;
    }
  }

  /**
   * Parse markdown content and extract frontmatter
   * @private
   * @param {string} markdownContent - Full markdown file content
   * @param {boolean} parseYAML - Whether to parse YAML metadata
   * @returns {Object} Parsed blog object
   */
  _parseMarkdown(markdownContent, parseYAML = true) {
    let result = {
      rawFrontmatter: null,
      content: markdownContent,
      rawTotal: markdownContent,
      metadata: {}
    };

    // Match YAML frontmatter between --- delimiters
    const match = markdownContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (match) {
      result.rawFrontmatter = match[1];
      result.content = match[2].trim();

      // Parse YAML if requested
      if (parseYAML) {
        try {
          result.metadata = this._parseYAML(match[1]);
        } catch (error) {
          console.warn('⚠️ Failed to parse YAML frontmatter:', error);
          result.metadata = {};
        }
      }
    }

    return result;
  }

  /**
   * Parse YAML string (simple implementation)
   * For complex YAML, use a dedicated YAML parser like js-yaml
   * @private
   * @param {string} yamlString - YAML content
   * @returns {Object} Parsed YAML object
   */
  _parseYAML(yamlString) {
    const metadata = {};
    const lines = yamlString.split('\n');

    for (const line of lines) {
      // Handle simple key: value pairs
      if (!line.trim() || line.trim().startsWith('#')) continue;

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value
          .slice(1, -1)
          .split(',')
          .map(v => v.trim().replace(/["']/g, ''));
      }

      metadata[key] = value;
    }

    return metadata;
  }

  /**
   * Get blog recommendations based on user preferences
   * Uses tag-based scoring with configurable algorithm
   * 
   * @param {Array} blogs - Array of blog objects
   * @param {Object} [options={}] - Recommendation options
   * @param {number} [options.count=3] - Number of recommendations to return
   * @param {Object} [options.userPreferences=null] - User preferences object { tag: count }
   * @param {boolean} [options.randomizeTies=true] - Randomize blogs with equal scores
   * 
   * @returns {Array} Recommended blog objects
   * 
   * @example
   * const userPrefs = { 'react': 3, 'javascript': 2 };
   * const recommended = blogsLib.getRecommendations(blogs, {
   *   count: 5,
   *   userPreferences: userPrefs
   * });
   */
  getRecommendations(blogs, options = {}) {
    const {
      count = 3,
      userPreferences = null,
      randomizeTies = true
    } = options;

    if (!Array.isArray(blogs) || blogs.length === 0) {
      return [];
    }

    // Use provided preferences or load from storage
    let preferences = userPreferences;
    if (!preferences && this.config.storage) {
      try {
        const stored = this.config.storage.getItem('astra_user_preferences');
        preferences = stored ? JSON.parse(stored) : {};
      } catch (error) {
        console.warn('Failed to load user preferences:', error);
        preferences = {};
      }
    }

    if (!preferences) {
      preferences = {};
    }

    // Score blogs based on tag overlap
    const scoredBlogs = blogs.map(blog => {
      let score = 0;

      if (blog.tags && Array.isArray(blog.tags)) {
        blog.tags.forEach(tag => {
          const normalizedTag = tag.toLowerCase().trim();
          
          // Check for exact and partial matches
          Object.entries(preferences).forEach(([prefTag, count]) => {
            const normalizedPref = prefTag.toLowerCase().trim();
            
            if (normalizedTag === normalizedPref ||
                normalizedTag.includes(normalizedPref) ||
                normalizedPref.includes(normalizedTag)) {
              score += count;
            }
          });
        });
      }

      return { ...blog, _recommendationScore: score };
    });

    // Sort by score, with optional randomization for ties
    const sorted = scoredBlogs.sort((a, b) => {
      if (a._recommendationScore !== b._recommendationScore) {
        return b._recommendationScore - a._recommendationScore;
      }
      return randomizeTies ? (0.5 - Math.random()) : 0;
    });

    // Remove scoring metadata and return top N
    return sorted
      .slice(0, count)
      .map(blog => {
        const { _recommendationScore, ...clean } = blog;
        return clean;
      });
  }

  /**
   * Track user reading history and update preferences
   * Used to personalize recommendations
   * 
   * @param {Array} tags - Array of tags from read blog
   * @param {number} [weight=1] - Weight/importance of this interaction
   */
  trackReadBlog(tags, weight = 1) {
    if (!this.config.storage || !Array.isArray(tags)) return;

    try {
      const stored = this.config.storage.getItem('astra_user_preferences');
      let preferences = stored ? JSON.parse(stored) : {};

      tags.forEach(tag => {
        const normalizedTag = tag.toLowerCase().trim();
        preferences[normalizedTag] = (preferences[normalizedTag] || 0) + weight;
      });

      // Keep only top 20 to prevent bloated storage
      const sorted = Object.entries(preferences)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20);

      this.config.storage.setItem(
        'astra_user_preferences',
        JSON.stringify(Object.fromEntries(sorted))
      );

      console.log('👤 Updated user preferences');
    } catch (error) {
      console.error('Error tracking blog read:', error);
    }
  }

  /**
   * Get user preferences from storage
   * @returns {Object} User preferences object
   */
  getUserPreferences() {
    if (!this.config.storage) return {};

    try {
      const stored = this.config.storage.getItem('astra_user_preferences');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading user preferences:', error);
      return {};
    }
  }

  /**
   * Clear user preferences
   */
  clearUserPreferences() {
    if (!this.config.storage) return;

    try {
      this.config.storage.removeItem('astra_user_preferences');
      console.log('👤 Cleared user preferences');
    } catch (error) {
      console.error('Error clearing user preferences:', error);
    }
  }

  /**
   * Search blogs by query string
   * @param {Array} blogs - Array of blog objects to search
   * @param {string} query - Search query
   * @param {Object} [options={}] - Search options
   * @param {Array} [options.searchFields=['title', 'description', 'tags']] - Fields to search
   * @returns {Array} Filtered blogs matching query
   */
  searchBlogs(blogs, query, options = {}) {
    const { searchFields = ['title', 'description', 'tags'] } = options;

    if (!query.trim() || !Array.isArray(blogs)) {
      return blogs;
    }

    const lowerQuery = query.toLowerCase();

    return blogs.filter(blog => {
      for (const field of searchFields) {
        if (!(field in blog)) continue;

        const value = blog[field];

        if (Array.isArray(value)) {
          // Search in array (like tags)
          if (value.some(item =>
            String(item).toLowerCase().includes(lowerQuery)
          )) {
            return true;
          }
        } else if (value !== null && value !== undefined) {
          // Search in string fields
          if (String(value).toLowerCase().includes(lowerQuery)) {
            return true;
          }
        }
      }
      return false;
    });
  }

  /**
   * Filter blogs by tags
   * @param {Array} blogs - Array of blog objects
   * @param {Array|string} tagFilter - Tag or array of tags to filter by
   * @param {string} [mode='any'] - 'any' (OR) or 'all' (AND) matching
   * @returns {Array} Filtered blogs
   */
  filterByTags(blogs, tagFilter, mode = 'any') {
    if (!Array.isArray(blogs)) return [];
    if (!tagFilter) return blogs;

    const tags = Array.isArray(tagFilter)
      ? tagFilter.map(t => String(t).toLowerCase().trim())
      : [String(tagFilter).toLowerCase().trim()];

    return blogs.filter(blog => {
      if (!blog.tags || !Array.isArray(blog.tags)) return false;

      const blogTags = blog.tags.map(t => String(t).toLowerCase().trim());

      if (mode === 'all') {
        return tags.every(tag => blogTags.includes(tag));
      } else {
        return tags.some(tag => blogTags.includes(tag));
      }
    });
  }

  /**
   * Get library configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update library configuration
   * @param {Object} newConfig - Partial configuration to update
   */
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Configuration updated');
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AstraBlogsLib;
}
if (typeof define === 'function' && define.amd) {
  define([], () => AstraBlogsLib);
}
if (typeof window !== 'undefined') {
  window.AstraBlogsLib = AstraBlogsLib;
}
