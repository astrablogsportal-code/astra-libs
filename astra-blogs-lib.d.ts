/**
 * Astra Blogs Library - TypeScript Type Definitions
 * 
 * A standalone JavaScript library for fetching and managing blog content
 * from GitHub repositories.
 * 
 * @version 1.0.0
 * @license MIT
 */

/**
 * Configuration object for initializing AstraBlogsLib
 */
export interface AstraBlogsConfig {
  /**
   * GitHub username or organization name
   * @default 'Santhosh20112003'
   */
  owner?: string;

  /**
   * GitHub repository name
   * @default 'rtym-blog-files'
   */
  repo?: string;

  /**
   * GitHub branch name
   * @default 'main'
   */
  branch?: string;

  /**
   * GitHub Personal Access Token (optional)
   * Increases rate limit from 60 to 5000 requests/hour
   */
  githubToken?: string;

  /**
   * Cache time-to-live for blog index in milliseconds
   * @default 3600000 (1 hour)
   */
  indexCacheTTL?: number;

  /**
   * Cache time-to-live for blog content in milliseconds
   * @default 86400000 (24 hours)
   */
  contentCacheTTL?: number;

  /**
   * Storage backend (default: window.localStorage in browser)
   * Must implement Storage interface (getItem, setItem, removeItem)
   */
  storage?: Storage | null;

  /**
   * Enable/disable caching
   * @default true
   */
  useCache?: boolean;
}

/**
 * Options for fetch operations
 */
export interface FetchOptions {
  /**
   * Use cached data if available
   * @default true
   */
  useCache?: boolean;

  /**
   * Skip cache and force fresh fetch from GitHub
   * @default false
   */
  forceFresh?: boolean;

  /**
   * Parse YAML frontmatter (for getBlogContent only)
   * @default true
   */
  parseYAML?: boolean;
}

/**
 * Blog metadata object (from index.json)
 */
export interface BlogMetadata {
  /**
   * URL-friendly blog identifier
   * Example: 'getting-started-with-react'
   */
  slug: string;

  /**
   * Display title of the blog
   */
  title: string;

  /**
   * Short description of the blog
   */
  description: string;

  /**
   * SEO-optimized title (optional)
   */
  seoTitle?: string;

  /**
   * SEO-optimized description (optional)
   */
  seoDescription?: string;

  /**
   * Category tags for the blog
   * Example: ['react', 'javascript', 'tutorial']
   */
  tags: string[];

  /**
   * Author name
   */
  author: string;

  /**
   * Publication date (ISO 8601 format)
   * Example: '2024-01-15'
   */
  date: string;

  /**
   * Last update date (ISO 8601 format, optional)
   */
  updatedAt?: string;

  /**
   * Cover image URL
   */
  cover: string;

  /**
   * Alternative cover image field
   */
  coverImage?: string;

  /**
   * Estimated reading time in minutes
   */
  readTime: number;

  /**
   * Canonical URL for the blog (optional)
   */
  canonical?: string;

  /**
   * Additional metadata (custom fields)
   */
  [key: string]: any;
}

/**
 * Parsed blog content with frontmatter separated
 */
export interface BlogContent {
  /**
   * Raw YAML frontmatter string
   * Contains metadata between '---' markers
   */
  rawFrontmatter: string | null;

  /**
   * Markdown content (without frontmatter)
   */
  content: string;

  /**
   * Full raw markdown file content
   */
  rawTotal: string;

  /**
   * Parsed YAML metadata as object
   * Only populated if parseYAML=true
   */
  metadata: Record<string, any>;
}

/**
 * Options for getRecommendations method
 */
export interface RecommendationOptions {
  /**
   * Number of recommendations to return
   * @default 3
   */
  count?: number;

  /**
   * User preferences object { tag: score }
   * If not provided, uses stored preferences from localStorage
   * Example: { 'react': 3, 'javascript': 2 }
   */
  userPreferences?: Record<string, number>;

  /**
   * Randomize blogs with equal scores
   * @default true
   */
  randomizeTies?: boolean;
}

/**
 * Options for searchBlogs method
 */
export interface SearchOptions {
  /**
   * Fields to search in
   * @default ['title', 'description', 'tags']
   */
  searchFields?: string[];
}

/**
 * Filter mode for filterByTags
 * 'any' = blogs with ANY of the tags (OR logic)
 * 'all' = blogs with ALL of the tags (AND logic)
 */
export type FilterMode = 'any' | 'all';

/**
 * Main library class for managing blogs from GitHub
 */
declare class AstraBlogsLib {
  /**
   * Initialize the Astra Blogs Library
   * 
   * @param config - Configuration object
   * 
   * @example
   * const blogsLib = new AstraBlogsLib({
   *   owner: 'your-username',
   *   repo: 'your-blog-repo',
   *   githubToken: 'ghp_...'
   * });
   */
  constructor(config?: AstraBlogsConfig);

  /**
   * Fetch all published blogs from the repository index
   * 
   * @param options - Fetch options
   * @returns Promise resolving to array of blog metadata
   * 
   * @example
   * const blogs = await blogsLib.getAllBlogs();
   * const freshBlogs = await blogsLib.getAllBlogs({ forceFresh: true });
   */
  getAllBlogs(options?: FetchOptions): Promise<BlogMetadata[]>;

  /**
   * Fetch full content of a specific blog with markdown and YAML
   * 
   * @param slug - Blog slug/identifier
   * @param options - Fetch options
   * @returns Promise resolving to parsed blog content or null if not found
   * 
   * @example
   * const blog = await blogsLib.getBlogContent('my-blog-slug');
   * if (blog) {
   *   console.log(blog.metadata.title);
   *   console.log(blog.content);
   * }
   */
  getBlogContent(slug: string, options?: FetchOptions): Promise<BlogContent | null>;

  /**
   * Search blogs by query string
   * Searches in title, description, and tags by default
   * 
   * @param blogs - Array of blogs to search
   * @param query - Search query
   * @param options - Search options
   * @returns Array of matching blogs
   * 
   * @example
   * const results = blogsLib.searchBlogs(blogs, 'react');
   * const tagSearch = blogsLib.searchBlogs(blogs, 'hooks', {
   *   searchFields: ['tags']
   * });
   */
  searchBlogs(
    blogs: BlogMetadata[],
    query: string,
    options?: SearchOptions
  ): BlogMetadata[];

  /**
   * Filter blogs by one or more tags
   * 
   * @param blogs - Array of blogs to filter
   * @param tagFilter - Single tag string or array of tags
   * @param mode - Filter mode: 'any' (OR) or 'all' (AND)
   * @returns Array of blogs matching the filter
   * 
   * @example
   * // Blogs with 'react' OR 'vue'
   * const filtered = blogsLib.filterByTags(blogs, ['react', 'vue'], 'any');
   * 
   * // Blogs with BOTH 'javascript' AND 'advanced'
   * const advanced = blogsLib.filterByTags(blogs, ['javascript', 'advanced'], 'all');
   */
  filterByTags(
    blogs: BlogMetadata[],
    tagFilter: string | string[],
    mode?: FilterMode
  ): BlogMetadata[];

  /**
   * Get personalized blog recommendations based on reading history
   * 
   * @param blogs - Array of blogs to recommend from
   * @param options - Recommendation options
   * @returns Array of recommended blogs
   * 
   * @example
   * const recommendations = blogsLib.getRecommendations(blogs, { count: 5 });
   * 
   * // With custom preferences
   * const custom = blogsLib.getRecommendations(blogs, {
   *   count: 3,
   *   userPreferences: { 'react': 3, 'javascript': 2 }
   * });
   */
  getRecommendations(
    blogs: BlogMetadata[],
    options?: RecommendationOptions
  ): BlogMetadata[];

  /**
   * Track that user read a blog (for recommendation personalization)
   * 
   * @param tags - Tags from the blog that was read
   * @param weight - Importance weight for this interaction (default: 1)
   * 
   * @example
   * blogsLib.trackReadBlog(['react', 'hooks'], 1);
   * blogsLib.trackReadBlog(['typescript'], 2); // Higher weight
   */
  trackReadBlog(tags: string[], weight?: number): void;

  /**
   * Clear all cached data
   * 
   * @param pattern - Optional pattern to clear specific keys
   * 
   * @example
   * blogsLib.clearCache();                    // Clear all
   * blogsLib.clearCache('blog_content');      // Clear only content cache
   * blogsLib.clearCache('astra_blogs_index'); // Clear only index cache
   */
  clearCache(pattern?: string): void;

  /**
   * Get user reading preferences/tag scores
   * 
   * @returns Object mapping tags to their score (frequency)
   * 
   * @example
   * const prefs = blogsLib.getUserPreferences();
   * // { 'react': 3, 'javascript': 2, 'typescript': 1 }
   */
  getUserPreferences(): Record<string, number>;

  /**
   * Clear all user preferences and reading history
   * 
   * @example
   * blogsLib.clearUserPreferences();
   */
  clearUserPreferences(): void;

  /**
   * Get current library configuration
   * 
   * @returns Current configuration object
   * 
   * @example
   * const config = blogsLib.getConfig();
   * console.log(config.owner, config.repo);
   */
  getConfig(): Required<AstraBlogsConfig>;

  /**
   * Update library configuration
   * 
   * @param newConfig - Partial configuration to update
   * 
   * @example
   * blogsLib.setConfig({
   *   owner: 'new-owner',
   *   githubToken: 'new-token'
   * });
   */
  setConfig(newConfig: Partial<AstraBlogsConfig>): void;
}

export default AstraBlogsLib;
