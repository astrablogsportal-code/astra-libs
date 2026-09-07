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
  static VERSION = '_VERSION_';

  /**
   * Initialize the Astra Blogs Library
   * @param {Object} config - Configuration object
   * @param {string} [config.token] - Encrypted initialization token that contains owner/repo/branch/githubToken
   * @param {string} [config.secret] - Secret used to decrypt the encrypted token
   * @param {number} [config.indexCacheTTL=3600000] - Cache TTL for blog index in milliseconds (default: 1 hour)
   * @param {number} [config.contentCacheTTL=86400000] - Cache TTL for blog content in milliseconds (default: 24 hours)
   * @param {Object} [config.storage=localStorage] - Storage mechanism (must have getItem/setItem/removeItem)
   * @param {boolean} [config.useCache=true] - Whether to use local storage caching
   * @param {boolean} [config.includeScheduled=false] - Whether to include scheduled posts (future-dated blogs)
   * @throws {Error} When direct owner/repo/branch/githubToken config is supplied
   */
  constructor(config = {}) {
    this.config = {
      owner: null,
      repo: null,
      branch: null,
      githubToken: null,
      indexCacheTTL: config.indexCacheTTL || 3600000, // 1 hour
      contentCacheTTL: config.contentCacheTTL || 86400000, // 24 hours
      storage: config.storage || (typeof window !== 'undefined' ? window.localStorage : null),
      useCache: config.useCache !== false, // Enable cache by default
      includeScheduled: config.includeScheduled === true, // Filter out scheduled posts by default
      allowedStatuses: config.allowedStatuses || ['published'],
      includeDrafts: config.includeDrafts === true
    };
    this.events = {};

    this.baseURL = 'https://api.github.com';
    this._decryptionPromise = null;

    if (config.token && config.secret) {
      this._decryptionPromise = this._decryptConfig(config.token, config.secret);
    } else if (config.owner || config.repo || config.branch || config.githubToken) {
      throw new Error('Direct configuration of owner/repo/branch/githubToken is not allowed. Provide encrypted token and secret.');
    }
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
   * Get the current library version.
   * @returns {string} Library version string
   */
  getVersion() {
    return AstraBlogsLib.VERSION;
  }

  /**
   * Subscribe to named events emitted by the library.
   * @param {string} event - Event name
   * @param {Function} callback - Callback to invoke when the event fires
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  /**
   * Unsubscribe from named events.
   * @param {string} event - Event name
   * @param {Function} [callback] - Specific callback to remove, or remove all if omitted
   */
  off(event, callback) {
    if (!this.events[event]) return;
    if (!callback) {
      delete this.events[event];
      return;
    }
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  /**
   * Subscribe to an event once.
   * @param {string} event - Event name
   * @param {Function} callback - Callback to invoke once
   */
  once(event, callback) {
    const wrapper = data => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  /**
   * Emit a named event with optional data.
   * @param {string} event - Event name
   * @param {any} [data] - Payload for listeners
   */
  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  async _applyDecryptedConfig() {
    if (!this._decryptionPromise) return;

    try {
      await this._decryptionPromise;
    } catch (error) {
      console.error('Error decrypting configuration token:', error);
    } finally {
      this._decryptionPromise = null;
    }
  }

  _getMissingConfigKeys() {
    return ['owner', 'repo', 'branch'].filter(key => !this.config[key]);
  }

  /**
   * Get allowed publication statuses based on runtime options and config
   * @private
   * @param {Object} [options={}] - Method options
   * @returns {Array<string>} Array of allowed statuses in lowercase
   */
  _getAllowedStatuses(options = {}) {
    let statuses = options.allowedStatuses || this.config.allowedStatuses || ['published'];
    if (!Array.isArray(statuses)) {
      statuses = [statuses];
    }
    statuses = statuses.map(s => String(s).toLowerCase());

    const includeDrafts = options.includeDrafts !== undefined ? options.includeDrafts : this.config.includeDrafts;
    if (includeDrafts && !statuses.includes('draft')) {
      statuses.push('draft');
    }

    return statuses;
  }

  async _decryptConfig(token, secret) {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      throw new Error('Web Crypto API is required to decrypt configuration values');
    }

    const decrypted = await this._aesGcmDecrypt(token, secret);
    if (decrypted && typeof decrypted === 'object') {
      const allowedKeys = ['owner', 'repo', 'branch'];
      const decryptedConfig = {};

      allowedKeys.forEach(key => {
        if (decrypted[key]) {
          decryptedConfig[key] = decrypted[key];
        }
      });

      // Handle githubToken or token key (including reversed token 'rev:...')
      let rawToken = decrypted.githubToken || decrypted.token || null;
      if (rawToken && typeof rawToken === 'string') {
        if (rawToken.startsWith('rev:')) {
          rawToken = rawToken.slice(4).split('').reverse().join('');
        }
        decryptedConfig.githubToken = rawToken;
      }

      this.config = { ...this.config, ...decryptedConfig };
      console.log('🔐 Decrypted configuration values successfully');
    }
  }

  async _aesGcmDecrypt(token, secret) {
    const enc = new TextEncoder();
    const hash = await window.crypto.subtle.digest('SHA-256', enc.encode(secret));
    const key = await window.crypto.subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const [ivHex, encryptedHex] = token.split(':');
    const iv = Uint8Array.from(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encryptedBuffer = Uint8Array.from(encryptedHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedBuffer
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedBuffer));
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
    await this._applyDecryptedConfig();

    const missingKeys = this._getMissingConfigKeys();
    if (missingKeys.length) {
      console.error(`Invalid configuration key(s): ${missingKeys.join(', ')}`);
      return [];
    }

    const { useCache = true, forceFresh = false } = options;
    const includeScheduled = options.includeScheduled !== undefined ? options.includeScheduled : this.config.includeScheduled;
    const cacheKey = 'astra_blogs_index_cache';

    // Helper to filter out scheduled blogs and non-allowed status blogs
    const allowedStatuses = this._getAllowedStatuses(options);
    const filterBlogs = (list) => {
      let filtered = list;
      if (!includeScheduled) {
        filtered = filtered.filter(blog => !blog.date || new Date(blog.date) <= new Date());
      }
      return filtered.filter(blog => {
        const blogStatus = (blog.status || 'published').toLowerCase();
        return allowedStatuses.includes(blogStatus);
      });
    };

    // Try cache first (unless forceFresh is set)
    if (useCache && !forceFresh) {
      const cached = this._getFromStorage(cacheKey, this.config.indexCacheTTL);
      if (cached) {
        console.log('📚 Returning blogs from cache');
        this.emit('cacheHit', cacheKey);
        const filteredCached = filterBlogs(cached);
        this.emit('blogsLoaded', filteredCached);
        return filteredCached;
      }
      this.emit('cacheMiss', cacheKey);
    }

    try {
      const url = `${this.baseURL}/repos/${this.config.owner}/${this.config.repo}/contents/index.json`;
      this.emit('fetchStarted', { key: cacheKey, url });
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

      // Cache the result (full unfiltered array)
      this._saveToStorage(cacheKey, data);
      const filteredData = filterBlogs(data);
      console.log(`📚 Fetched ${filteredData.length} blogs from repository`);
      this.emit('blogsLoaded', filteredData);

      return filteredData;
    } catch (error) {
      console.error('❌ Failed to fetch blog list:', error);
      this.emit('error', error);

      // Fallback to expired cache if available
      const expired = this._getFromStorage(cacheKey);
      if (expired) {
        console.log('⚠️ Returning expired cached blogs due to fetch error');
        const filteredExpired = filterBlogs(expired);
        return filteredExpired;
      }

      return [];
    }
  }

  /**
   * Fetch all cover image URLs from the blog index
   * @param {Object} [options={}] - Fetch options
   * @param {boolean} [options.useCache=true] - Use cached data if available
   * @param {boolean} [options.forceFresh=false] - Skip cache and fetch fresh data
   * @returns {Promise<Array<string>>} Array of unique cover image URLs
   */
  async getAllCovers(options = {}) {
    const blogs = await this.getAllBlogs(options);
    return this.getCoverUrls(blogs);
  }

  /**
   * Extract cover image URLs from an array of blog metadata
   * @param {Array} blogs - Array of blog metadata objects
   * @returns {Array<string>} Array of unique cover image URLs
   */
  getCoverUrls(blogs) {
    if (!Array.isArray(blogs)) {
      return [];
    }

    const urls = blogs
      .map(blog => blog.cover || blog.coverImage)
      .filter(url => typeof url === 'string' && url.trim().length > 0)
      .map(url => url.trim());

    return Array.from(new Set(urls));
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
    await this._applyDecryptedConfig();

    const missingKeys = this._getMissingConfigKeys();
    if (missingKeys.length) {
      console.error(`Invalid configuration key(s): ${missingKeys.join(', ')}`);
      return null;
    }

    const { useCache = true, forceFresh = false, parseYAML = true } = options;
    const includeScheduled = options.includeScheduled !== undefined ? options.includeScheduled : this.config.includeScheduled;
    const cacheKey = `astra_blog_content_${slug}`;

    const allowedStatuses = this._getAllowedStatuses(options);

    const isBlogScheduled = (blog, rawContent = null) => {
      if (!blog) return false;
      let dateVal = blog.metadata ? (blog.metadata.date || blog.metadata.Date) : null;
      if (!dateVal && rawContent) {
        try {
          const match = rawContent.match(/^---\n([\s\S]*?)\n---\n/);
          if (match) {
            const parsed = this._parseYAML(match[1]);
            dateVal = parsed.date || parsed.Date;
          }
        } catch (e) {}
      }
      return dateVal && new Date(dateVal) > new Date();
    };

    const isBlogStatusAllowed = (blog, rawContent = null) => {
      if (!blog) return false;
      let statusVal = blog.metadata ? (blog.metadata.status || blog.metadata.Status) : null;
      if (!statusVal && rawContent) {
        try {
          const match = rawContent.match(/^---\n([\s\S]*?)\n---\n/);
          if (match) {
            const parsed = this._parseYAML(match[1]);
            statusVal = parsed.status || parsed.Status;
          }
        } catch (e) {}
      }
      const status = (statusVal || 'published').toLowerCase();
      return allowedStatuses.includes(status);
    };

    // Try cache first (unless forceFresh is set)
    if (useCache && !forceFresh) {
      const cached = this._getFromStorage(cacheKey, this.config.contentCacheTTL);
      if (cached) {
        if (!includeScheduled && isBlogScheduled(cached)) {
          console.warn(`❌ Access to scheduled blog denied (cache): ${slug}`);
          return null;
        }
        if (!isBlogStatusAllowed(cached)) {
          console.warn(`❌ Access to blog with status denied (cache): ${slug}`);
          return null;
        }
        console.log(`📄 Returning blog "${slug}" from cache`);
        this.emit('cacheHit', cacheKey);
        this.emit('blogLoaded', { slug, content: cached });
        return cached;
      }
      this.emit('cacheMiss', cacheKey);
    }

    try {
      const url = `${this.baseURL}/repos/${this.config.owner}/${this.config.repo}/contents/blogs/${slug}.md`;
      this.emit('fetchStarted', { slug, key: cacheKey, url });
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

      // Check if scheduled
      if (!includeScheduled && isBlogScheduled(blogData, markdownContent)) {
        console.warn(`❌ Access to scheduled blog denied: ${slug}`);
        return null;
      }

      // Check if status is allowed
      if (!isBlogStatusAllowed(blogData, markdownContent)) {
        console.warn(`❌ Access to blog with status denied: ${slug}`);
        return null;
      }

      // Cache the result
      this._saveToStorage(cacheKey, blogData);
      console.log(`📄 Fetched blog content: ${slug}`);
      this.emit('blogLoaded', { slug, content: blogData });

      return blogData;
    } catch (error) {
      console.error(`❌ Failed to fetch blog ${slug}:`, error);
      this.emit('error', error);

      // Fallback to expired cache if available
      const expired = this._getFromStorage(cacheKey);
      if (expired) {
        if (!includeScheduled && isBlogScheduled(expired)) {
          console.warn(`❌ Access to scheduled blog denied (expired cache fallback): ${slug}`);
          return null;
        }
        if (!isBlogStatusAllowed(expired)) {
          console.warn(`❌ Access to blog with status denied (expired cache fallback): ${slug}`);
          return null;
        }
        console.log(`⚠️ Returning expired cached blog "${slug}" due to fetch error`);
        return expired;
      }

      return null;
    }
  }

  /**
   * Convert markdown content to HTML and optionally include default styling.
   * @param {string} markdownContent - Raw markdown content
   * @param {Object} [options={}] - Conversion options
   * @param {boolean} [options.includeStyles=true] - Include default markdown styles in the returned HTML
   * @returns {Object} HTML conversion result
   * @returns {string} return.html - Rendered HTML string
   * @returns {string} return.styledHtml - Rendered HTML wrapped with default styles
   */
  convertMarkdownToHtml(markdownContent, options = {}) {
    if (typeof markdownContent !== 'string') {
      return {
        html: '',
        styledHtml: ''
      };
    }

    const { includeStyles = true } = options;
    const html = this._markdownToHtml(markdownContent);
    const styledHtml = includeStyles
      ? `<style>${this._getMarkdownStyles()}</style>\n${html}`
      : html;

    return { html, styledHtml };
  }

  /**
   * Convert markdown to HTML using a lightweight renderer.
   * @private
   * @param {string} markdownContent - Raw markdown content
   * @returns {string} Rendered HTML
   */
  _markdownToHtml(markdownContent) {
    const escapeHtml = text => text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const renderInline = text => {
      let result = escapeHtml(text);

      result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
      result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      result = result.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
      result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
      result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
      result = result.replace(/_(.+?)_/g, '<em>$1</em>');
      result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

      return result;
    };

    const lines = markdownContent.replace(/\r\n/g, '\n').split('\n');
    const htmlLines = [];
    let listType = null;
    let inCodeBlock = false;
    let codeBlockLanguage = '';

    const closeList = () => {
      if (listType) {
        htmlLines.push(`</${listType}>`);
        listType = null;
      }
    };

    for (let line of lines) {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLanguage = line.slice(3).trim();
          htmlLines.push(`<pre><code class="language-${escapeHtml(codeBlockLanguage)}">`);
        } else {
          inCodeBlock = false;
          htmlLines.push('</code></pre>');
        }
        continue;
      }

      if (inCodeBlock) {
        htmlLines.push(escapeHtml(line));
        continue;
      }

      if (!line.trim()) {
        closeList();
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        closeList();
        const level = headingMatch[1].length;
        htmlLines.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
        continue;
      }

      const blockquoteMatch = line.match(/^>\s?(.*)$/);
      if (blockquoteMatch) {
        closeList();
        htmlLines.push(`<blockquote>${renderInline(blockquoteMatch[1])}</blockquote>`);
        continue;
      }

      const unorderedMatch = line.match(/^\s*[-*+]\s+(.*)$/);
      if (unorderedMatch) {
        const item = renderInline(unorderedMatch[1]);
        if (listType !== 'ul') {
          closeList();
          listType = 'ul';
          htmlLines.push('<ul>');
        }
        htmlLines.push(`<li>${item}</li>`);
        continue;
      }

      const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      if (orderedMatch) {
        const item = renderInline(orderedMatch[1]);
        if (listType !== 'ol') {
          closeList();
          listType = 'ol';
          htmlLines.push('<ol>');
        }
        htmlLines.push(`<li>${item}</li>`);
        continue;
      }

      closeList();
      htmlLines.push(`<p>${renderInline(line)}</p>`);
    }

    closeList();
    return htmlLines.join('\n');
  }

  /**
   * Return default markdown CSS styles for styled HTML output.
   * @private
   * @returns {string} CSS rules
   */
  _getMarkdownStyles() {
    return `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.7; color: #111; }
      h1, h2, h3, h4, h5, h6 { font-weight: 600; margin: 1.25em 0 0.75em; }
      p { margin: 0.85em 0; }
      a { color: #0366d6; text-decoration: none; }
      a:hover { text-decoration: underline; }
      strong { font-weight: 700; }
      em { font-style: italic; }
      code { font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; background: #f6f8fa; color: #e83e8c; padding: 0.2em 0.35em; border-radius: 6px; }
      pre { background: #0d1117; color: #c9d1d9; padding: 1em; border-radius: 12px; overflow-x: auto; }
      pre code { background: transparent; color: inherit; padding: 0; }
      blockquote { border-left: 4px solid #dfe2e5; color: #6a737d; margin: 0; padding: 0.5em 1em; background: #f6f8fa; }
      ul, ol { margin: 0.85em 0 0.85em 1.4em; }
      img { max-width: 100%; height: auto; }
    `.trim();
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

    const includeScheduled = options.includeScheduled !== undefined ? options.includeScheduled : this.config.includeScheduled;
    const allowedStatuses = this._getAllowedStatuses(options);
    const blogsToRecommend = (includeScheduled
      ? blogs
      : blogs.filter(blog => !blog.date || new Date(blog.date) <= new Date())
    ).filter(blog => {
      const blogStatus = (blog.status || 'published').toLowerCase();
      return allowedStatuses.includes(blogStatus);
    });

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
    const scoredBlogs = blogsToRecommend.map(blog => {
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

    if (!Array.isArray(blogs)) {
      return [];
    }

    const includeScheduled = options.includeScheduled !== undefined ? options.includeScheduled : this.config.includeScheduled;
    const allowedStatuses = this._getAllowedStatuses(options);
    const blogsToSearch = (includeScheduled
      ? blogs
      : blogs.filter(blog => !blog.date || new Date(blog.date) <= new Date())
    ).filter(blog => {
      const blogStatus = (blog.status || 'published').toLowerCase();
      return allowedStatuses.includes(blogStatus);
    });

    if (!query.trim()) {
      return blogsToSearch;
    }

    const lowerQuery = query.toLowerCase();

    return blogsToSearch.filter(blog => {
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
   * @param {Object} [options={}] - Filter options
   * @param {boolean} [options.includeScheduled] - Whether to include scheduled posts
   * @returns {Array} Filtered blogs
   */
  filterByTags(blogs, tagFilter, mode = 'any', options = {}) {
    if (!Array.isArray(blogs)) return [];

    const includeScheduled = options.includeScheduled !== undefined ? options.includeScheduled : this.config.includeScheduled;
    const allowedStatuses = this._getAllowedStatuses(options);
    const blogsToFilter = (includeScheduled
      ? blogs
      : blogs.filter(blog => !blog.date || new Date(blog.date) <= new Date())
    ).filter(blog => {
      const blogStatus = (blog.status || 'published').toLowerCase();
      return allowedStatuses.includes(blogStatus);
    });

    if (!tagFilter) return blogsToFilter;

    const tags = Array.isArray(tagFilter)
      ? tagFilter.map(t => String(t).toLowerCase().trim())
      : [String(tagFilter).toLowerCase().trim()];

    return blogsToFilter.filter(blog => {
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
   * @param {number} [newConfig.indexCacheTTL] - Cache TTL for blog index
   * @param {number} [newConfig.contentCacheTTL] - Cache TTL for blog content
   * @param {Object} [newConfig.storage] - Storage backend for cache and preferences
   * @param {boolean} [newConfig.useCache] - Enable or disable caching
   * @throws {Error} When direct owner/repo/branch/githubToken/token/secret config is supplied
   */
  setConfig(newConfig) {
    if (!newConfig || typeof newConfig !== 'object') return;

    const restrictedKeys = ['owner', 'repo', 'branch', 'githubToken', 'token', 'secret'];
    const invalidKeys = restrictedKeys.filter(key => key in newConfig);

    if (invalidKeys.length > 0) {
      throw new Error(
        `Direct configuration of sensitive values is not allowed (${invalidKeys.join(', ')}). ` +
        'Use encrypted token and secret only.'
      );
    }

    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Configuration updated');
  }
}

/**
 * Main library class for managing Headless CMS models and data from GitHub
 */
class AstraCmsLib {
  static VERSION = AstraBlogsLib.VERSION;
  /**
   * Initialize the Astra Headless CMS Library
   * @param {Object} [config={}] - Configuration options
   * @param {string} [config.token] - Encrypted credentials token
   * @param {string} [config.secret] - Decryption secret key
   * @param {number} [config.modelsCacheTTL=3600000] - Cache TTL for CMS models in milliseconds (default: 1 hour)
   * @param {number} [config.dataCacheTTL=3600000] - Cache TTL for CMS data records in milliseconds (default: 1 hour)
   * @param {Object} [config.storage=localStorage] - Storage mechanism (must have getItem/setItem/removeItem)
   * @param {boolean} [config.useCache=true] - Whether to use local storage caching
   * @param {Array<string>} [config.allowedStatuses=['published']] - Allowed statuses (default: ['published'])
   * @param {boolean} [config.includeDrafts=false] - Whether to include drafts
   * @throws {Error} When direct owner/repo/branch/githubToken config is supplied
   */
  constructor(config = {}) {
    this.config = {
      owner: null,
      repo: null,
      branch: null,
      githubToken: null,
      modelsCacheTTL: config.modelsCacheTTL || 3600000,
      dataCacheTTL: config.dataCacheTTL || 3600000,
      storage: config.storage || (typeof window !== 'undefined' ? window.localStorage : null),
      useCache: config.useCache !== false,
      allowedStatuses: config.allowedStatuses || ['published'],
      includeDrafts: config.includeDrafts === true
    };
    this.events = {};
    this.baseURL = 'https://api.github.com';
    this._decryptionPromise = null;

    if (config.token && config.secret) {
      this._decryptionPromise = this._decryptConfig(config.token, config.secret);
    } else if (config.owner || config.repo || config.branch || config.githubToken) {
      throw new Error('Direct configuration of owner/repo/branch/githubToken is not allowed. Provide encrypted token and secret.');
    }
  }

  _getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github.v3.raw',
      'If-None-Match': ''
    };
    if (this.config.githubToken) {
      headers['Authorization'] = `token ${this.config.githubToken}`;
    }
    return headers;
  }

  /**
   * Get current SDK version
   * @returns {string} Version string
   */
  getVersion() {
    return AstraCmsLib.VERSION;
  }

  /**
   * Subscribe to named events emitted by the library.
   * @param {string} event - Event name
   * @param {Function} callback - Callback to invoke
   */
  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }

  /**
   * Unsubscribe from named events.
   * @param {string} event - Event name
   * @param {Function} [callback] - Specific callback to remove, or remove all if omitted
   */
  off(event, callback) {
    if (!this.events[event]) return;
    if (!callback) {
      delete this.events[event];
      return;
    }
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  /**
   * Subscribe to an event once.
   * @param {string} event - Event name
   * @param {Function} callback - Callback to invoke once
   */
  once(event, callback) {
    const wrapper = data => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  /**
   * Emit a named event with optional data.
   * @param {string} event - Event name
   * @param {any} [data] - Payload for listeners
   */
  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  async _applyDecryptedConfig() {
    if (!this._decryptionPromise) return;
    try {
      await this._decryptionPromise;
    } catch (error) {
      console.error('Error decrypting CMS configuration token:', error);
    } finally {
      this._decryptionPromise = null;
    }
  }

  _getMissingConfigKeys() {
    return ['owner', 'repo', 'branch'].filter(key => !this.config[key]);
  }

  _getAllowedStatuses(options = {}) {
    let statuses = options.allowedStatuses || this.config.allowedStatuses || ['published'];
    if (!Array.isArray(statuses)) {
      statuses = [statuses];
    }
    statuses = statuses.map(s => String(s).toLowerCase());
    const includeDrafts = options.includeDrafts !== undefined ? options.includeDrafts : this.config.includeDrafts;
    if (includeDrafts && !statuses.includes('draft')) {
      statuses.push('draft');
    }
    return statuses;
  }

  _isItemStatusAllowed(item, allowedStatuses) {
    if (!item || typeof item !== 'object') return true;
    const itemStatus = (item._status || item.status || 'published').toLowerCase();
    return allowedStatuses.includes(itemStatus);
  }

  _filterCmsData(data, allowedStatuses, options = {}) {
    const includeDrafts = options.includeDrafts !== undefined ? options.includeDrafts : this.config.includeDrafts;

    if (Array.isArray(data)) {
      return data
        .map(record => {
          if (!record || typeof record !== 'object') return record;
          if (includeDrafts && record._draft && typeof record._draft === 'object') {
            return { ...record, ...record._draft };
          }
          const { _draft, ...cleanRecord } = record;
          return cleanRecord;
        })
        .filter(record => this._isItemStatusAllowed(record, allowedStatuses));
    }

    if (data && typeof data === 'object') {
      if (includeDrafts && data._draft && typeof data._draft === 'object') {
        const draftDoc = { ...data, ...data._draft };
        return this._isItemStatusAllowed(draftDoc, allowedStatuses) ? draftDoc : null;
      }
      const { _draft, ...cleanDoc } = data;
      return this._isItemStatusAllowed(cleanDoc, allowedStatuses) ? cleanDoc : null;
    }

    return data;
  }

  async _decryptConfig(token, secret) {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      throw new Error('Web Crypto API is required to decrypt configuration values');
    }

    const decrypted = await this._aesGcmDecrypt(token, secret);
    if (decrypted && typeof decrypted === 'object') {
      const allowedKeys = ['owner', 'repo', 'branch'];
      const decryptedConfig = {};

      allowedKeys.forEach(key => {
        if (decrypted[key]) {
          decryptedConfig[key] = decrypted[key];
        }
      });

      // Handle githubToken or token key (including reversed token 'rev:...')
      let rawToken = decrypted.githubToken || decrypted.token || null;
      if (rawToken && typeof rawToken === 'string') {
        if (rawToken.startsWith('rev:')) {
          rawToken = rawToken.slice(4).split('').reverse().join('');
        }
        decryptedConfig.githubToken = rawToken;
      }

      this.config = { ...this.config, ...decryptedConfig };
      console.log('🔐 Decrypted CMS configuration values successfully');
    }
  }

  async _aesGcmDecrypt(token, secret) {
    const enc = new TextEncoder();
    const hash = await window.crypto.subtle.digest('SHA-256', enc.encode(secret));
    const key = await window.crypto.subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const [ivHex, encryptedHex] = token.split(':');
    const iv = Uint8Array.from(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encryptedBuffer = Uint8Array.from(encryptedHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedBuffer
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedBuffer));
  }

  _getFromStorage(key, ttl = null) {
    if (!this.config.storage || !this.config.useCache) return null;
    try {
      const stored = this.config.storage.getItem(key);
      if (!stored) return null;
      const { data, timestamp } = JSON.parse(stored);
      if (ttl && Date.now() - timestamp > ttl) {
        return null;
      }
      return data;
    } catch (error) {
      console.error(`Error reading from storage (${key}):`, error);
      return null;
    }
  }

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
   * Clear CMS cache data
   * @param {string} [pattern='astra_cms_'] - Optional pattern to clear specific keys
   */
  clearCache(pattern = 'astra_cms_') {
    if (!this.config.storage) return;
    try {
      const keys = [];
      for (let i = 0; i < this.config.storage.length; i++) {
        const key = this.config.storage.key(i);
        if (!pattern || (key && key.includes(pattern))) {
          keys.push(key);
        }
      }
      keys.forEach(key => this.config.storage.removeItem(key));
    } catch (error) {
      console.error('Error clearing CMS cache:', error);
    }
  }

  /**
   * Fetch all CMS models definitions from GitHub
   * @param {Object} [options={}] - Fetch options
   * @param {boolean} [options.useCache=true] - Use cached data if available
   * @param {boolean} [options.forceFresh=false] - Skip cache and fetch fresh data
   * @returns {Promise<Array<Object>>} Array of CMS model schema definitions
   */
  async getModels(options = {}) {
    await this._applyDecryptedConfig();

    const missingKeys = this._getMissingConfigKeys();
    if (missingKeys.length) {
      console.error(`Invalid configuration key(s): ${missingKeys.join(', ')}`);
      return [];
    }

    const { useCache = true, forceFresh = false } = options;
    const cacheKey = 'astra_cms_models_cache';

    if (useCache && !forceFresh) {
      const cached = this._getFromStorage(cacheKey, this.config.modelsCacheTTL);
      if (cached) {
        console.log('📦 Returning CMS models from cache');
        this.emit('cacheHit', cacheKey);
        this.emit('modelsLoaded', cached);
        return cached;
      }
      this.emit('cacheMiss', cacheKey);
    }

    try {
      const url = `${this.baseURL}/repos/${this.config.owner}/${this.config.repo}/contents/cms/models.json`;
      this.emit('fetchStarted', { key: cacheKey, url });
      const response = await fetch(url, { headers: this._getHeaders() });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('❌ CMS models file not found (404)');
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const modelsList = Array.isArray(data) ? data : [];

      this._saveToStorage(cacheKey, modelsList);
      console.log(`📦 Fetched ${modelsList.length} CMS models from repository`);
      this.emit('modelsLoaded', modelsList);
      return modelsList;
    } catch (error) {
      console.error('❌ Failed to fetch CMS models:', error);
      this.emit('error', error);

      const expired = this._getFromStorage(cacheKey);
      if (expired) {
        console.log('⚠️ Returning expired cached CMS models due to fetch error');
        return Array.isArray(expired) ? expired : [];
      }
      return [];
    }
  }

  /**
   * Get a specific CMS model schema by its ID or Name
   * @param {string} modelId - Model ID (e.g. 'team_members') or Name
   * @param {Object} [options={}] - Fetch options
   * @returns {Promise<Object|null>} Model definition or null if not found
   */
  async getModel(modelId, options = {}) {
    if (!modelId) return null;
    const models = await this.getModels(options);
    const target = String(modelId).toLowerCase();
    return models.find(m => String(m.id).toLowerCase() === target || String(m.name).toLowerCase() === target) || null;
  }

  /**
   * Get all single-document CMS models
   * @param {Object} [options={}] - Fetch options
   * @returns {Promise<Array<Object>>} Single document model schemas
   */
  async getSingleModels(options = {}) {
    const models = await this.getModels(options);
    return models.filter(m => m.modelType === 'single');
  }

  /**
   * Get all collection-based CMS models
   * @param {Object} [options={}] - Fetch options
   * @returns {Promise<Array<Object>>} Collection model schemas
   */
  async getCollectionModels(options = {}) {
    const models = await this.getModels(options);
    return models.filter(m => m.modelType !== 'single');
  }

  /**
   * Fetch data records (collection) or single document (single-type) for a specific CMS model from GitHub
   * @param {string} modelId - Model ID (e.g. 'team_members', 'privacy_policy')
   * @param {Object} [options={}] - Fetch options
   * @param {boolean} [options.useCache=true] - Use cached data if available
   * @param {boolean} [options.forceFresh=false] - Skip cache and fetch fresh data
   * @param {Array<string>} [options.allowedStatuses] - Allowed publication statuses (default: ['published'])
   * @param {boolean} [options.includeDrafts] - Whether to include drafts
   * @returns {Promise<Array<Object>|Object|null>} Array of data records for collection types, or document object for single types
   */
  async getData(modelId, options = {}) {
    if (!modelId) return null;
    await this._applyDecryptedConfig();

    const missingKeys = this._getMissingConfigKeys();
    if (missingKeys.length) {
      console.error(`Invalid configuration key(s): ${missingKeys.join(', ')}`);
      return null;
    }

    const { useCache = true, forceFresh = false } = options;
    const cacheKey = `astra_cms_data_${modelId}`;
    const allowedStatuses = this._getAllowedStatuses(options);

    if (useCache && !forceFresh) {
      const cached = this._getFromStorage(cacheKey, this.config.dataCacheTTL);
      if (cached !== null && cached !== undefined) {
        const filteredCached = this._filterCmsData(cached, allowedStatuses, options);
        const isArr = Array.isArray(filteredCached);
        console.log(`📑 Returning CMS ${isArr ? `${filteredCached.length} records` : (filteredCached ? 'document' : 'null (draft/status filtered)')} for model "${modelId}" from cache`);
        this.emit('cacheHit', cacheKey);
        this.emit('dataLoaded', { modelId, records: filteredCached, data: filteredCached, isSingle: !Array.isArray(cached) });
        return filteredCached;
      }
      this.emit('cacheMiss', cacheKey);
    }

    try {
      const url = `${this.baseURL}/repos/${this.config.owner}/${this.config.repo}/contents/cms/data/${modelId}.json`;
      this.emit('fetchStarted', { key: cacheKey, url });
      const response = await fetch(url, { headers: this._getHeaders() });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`❌ CMS data for model "${modelId}" not found (404)`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const payload = (data !== null && typeof data === 'object') ? data : (Array.isArray(data) ? data : null);

      this._saveToStorage(cacheKey, payload);
      const filteredPayload = this._filterCmsData(payload, allowedStatuses, options);
      const isArr = Array.isArray(filteredPayload);
      console.log(`📑 Fetched ${isArr ? `${filteredPayload.length} records` : (filteredPayload ? 'single document' : 'null (draft/status filtered)')} for model "${modelId}" from repository`);
      this.emit('dataLoaded', { modelId, records: filteredPayload, data: filteredPayload, isSingle: !Array.isArray(payload) });
      return filteredPayload;
    } catch (error) {
      console.error(`❌ Failed to fetch CMS data for model "${modelId}":`, error);
      this.emit('error', error);

      const expired = this._getFromStorage(cacheKey);
      if (expired !== null && expired !== undefined) {
        console.log(`⚠️ Returning expired cached CMS data for "${modelId}" due to fetch error`);
        return this._filterCmsData(expired, allowedStatuses, options);
      }
      return null;
    }
  }

  /**
   * Fetch a single type CMS document from GitHub
   * @param {string} modelId - Model ID (e.g. 'privacy_policy', 'cookie_policy', 'terms')
   * @param {Object} [options={}] - Fetch options
   * @returns {Promise<Object|null>} Single document object or null if not found
   */
  async getDocument(modelId, options = {}) {
    if (!modelId) return null;
    const data = await this.getData(modelId, options);
    if (!data) return null;
    if (Array.isArray(data)) {
      return data[0] || null;
    }
    return typeof data === 'object' ? data : null;
  }

  /**
   * Alias for getDocument - fetch a single type CMS document from GitHub
   * @param {string} modelId - Model ID
   * @param {Object} [options={}] - Fetch options
   * @returns {Promise<Object|null>} Single document object or null
   */
  async getSingle(modelId, options = {}) {
    return this.getDocument(modelId, options);
  }

  /**
   * Fetch a single CMS record by its record ID (or single document if model is single-type)
   * @param {string} modelId - Model ID
   * @param {string} [recordId] - Record ID (e.g. 'rec_abc123'). Optional for single-type models.
   * @param {Object} [options={}] - Fetch options
   * @returns {Promise<Object|null>} Found record/document object or null
   */
  async getRecord(modelId, recordId, options = {}) {
    if (!modelId) return null;
    const data = await this.getData(modelId, options);
    if (!data) return null;

    if (Array.isArray(data)) {
      if (!recordId) return data[0] || null;
      return data.find(r => r.id === recordId) || null;
    }

    if (typeof data === 'object') {
      if (!recordId || data.id === recordId) {
        return data;
      }
      return null;
    }

    return null;
  }

  /**
   * Search records of a model by query text (supports both collections and single documents)
   * @param {string} modelId - Model ID
   * @param {string} query - Search query
   * @param {Object} [options={}] - Search and fetch options
   * @param {Array<string>} [options.searchFields] - Specific fields to search within
   * @returns {Promise<Array<Object>>} Matching records
   */
  async searchData(modelId, query = '', options = {}) {
    const data = await this.getData(modelId, options);
    const records = Array.isArray(data) ? data : (data && typeof data === 'object' ? [data] : []);

    if (!query || typeof query !== 'string' || !query.trim()) {
      return records;
    }

    const q = query.toLowerCase().trim();
    const { searchFields } = options;

    return records.filter(record => {
      if (Array.isArray(searchFields) && searchFields.length > 0) {
        return searchFields.some(field => {
          const val = record[field];
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(q);
          return String(val).toLowerCase().includes(q);
        });
      }

      return Object.values(record).some(val => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(q);
        return String(val).toLowerCase().includes(q);
      });
    });
  }

  /**
   * Filter records of a model by custom predicate function or key-value criteria
   * @param {string} modelId - Model ID
   * @param {Function|Object} criteria - Filter predicate function (record => boolean) or criteria object ({ field: value })
   * @param {Object} [options={}] - Fetch options
   * @returns {Promise<Array<Object>>} Filtered records
   */
  async filterData(modelId, criteria, options = {}) {
    const data = await this.getData(modelId, options);
    const records = Array.isArray(data) ? data : (data && typeof data === 'object' ? [data] : []);
    if (!criteria) return records;

    if (typeof criteria === 'function') {
      return records.filter(criteria);
    }

    if (typeof criteria === 'object') {
      const entries = Object.entries(criteria);
      return records.filter(record => {
        return entries.every(([key, expectedVal]) => {
          return record[key] === expectedVal;
        });
      });
    }

    return records;
  }

  /**
   * Get current library configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update library configuration
   * @param {Object} newConfig - Partial configuration to update
   * @param {number} [newConfig.modelsCacheTTL] - Cache TTL for models
   * @param {number} [newConfig.dataCacheTTL] - Cache TTL for data records
   * @param {Object} [newConfig.storage] - Storage backend
   * @param {boolean} [newConfig.useCache] - Enable or disable caching
   * @throws {Error} When direct owner/repo/branch/githubToken/token/secret config is supplied
   */
  setConfig(newConfig) {
    if (!newConfig || typeof newConfig !== 'object') return;

    const restrictedKeys = ['owner', 'repo', 'branch', 'githubToken', 'token', 'secret'];
    const invalidKeys = restrictedKeys.filter(key => key in newConfig);

    if (invalidKeys.length > 0) {
      throw new Error(
        `Direct configuration of sensitive values is not allowed (${invalidKeys.join(', ')}). ` +
        'Use encrypted token and secret only.'
      );
    }

    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ CMS Configuration updated');
  }
}

// Attach CMS references onto AstraBlogsLib
AstraBlogsLib.Cms = AstraCmsLib;
AstraBlogsLib.CMS = AstraCmsLib;
AstraBlogsLib.AstraCmsLib = AstraCmsLib;

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AstraBlogsLib;
  module.exports.AstraBlogsLib = AstraBlogsLib;
  module.exports.AstraCmsLib = AstraCmsLib;
  module.exports.AstraCMS = AstraCmsLib;
  module.exports.default = AstraBlogsLib;
}
if (typeof define === 'function' && define.amd) {
  define([], () => AstraBlogsLib);
}
if (typeof window !== 'undefined') {
  window.AstraBlogsLib = AstraBlogsLib;
  window.AstraCmsLib = AstraCmsLib;
  window.AstraCMS = AstraCmsLib;
}
