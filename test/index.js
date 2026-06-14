const assert = require('assert');
const AstraBlogsLib = require('../astra-blogs-lib.js');

// Helper to create mock storage
function createMockStorage() {
  const store = {};
  return {
    store,
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    key(i) {
      return Object.keys(store)[i];
    },
    get length() {
      return Object.keys(store).length;
    }
  };
}

async function runTests() {
  console.log('🧪 Starting Astra Blogs Library status filter tests...');

  // Mock list of blogs in the index, including published, draft, in-review, and no-status
  const mockBlogsIndex = [
    {
      slug: 'published-blog',
      title: 'Published Blog Title',
      status: 'published',
      date: '2026-05-29T10:57:41.008Z',
      tags: ['ai', 'agent']
    },
    {
      slug: 'draft-blog',
      title: 'Draft Blog Title',
      status: 'draft',
      date: '2026-05-30T10:57:41.008Z',
      tags: ['react']
    },
    {
      slug: 'in-review-blog',
      title: 'In Review Blog Title',
      status: 'in-review',
      date: '2026-06-01T10:57:41.008Z',
      tags: ['css']
    },
    {
      slug: 'no-status-blog',
      title: 'No Status Blog Title',
      date: '2026-05-31T10:57:41.008Z',
      tags: ['javascript']
    },
    {
      slug: 'archived-blog',
      title: 'Archived Blog Title',
      status: 'archived',
      date: '2026-05-28T10:57:41.008Z',
      tags: ['old']
    }
  ];

  // Test 1: getAllBlogs status filter (using cache fallback)
  {
    console.log('\nTest 1: getAllBlogs() status filtering');
    const storage = createMockStorage();
    
    // Save unfiltered list to storage cache
    storage.setItem('astra_blogs_index_cache', JSON.stringify({
      data: mockBlogsIndex,
      timestamp: Date.now()
    }));

    const lib = new AstraBlogsLib({
      storage,
      useCache: true
    });

    lib.config.owner = 'test-owner';
    lib.config.repo = 'test-repo';
    lib.config.branch = 'main';

    const blogs = await lib.getAllBlogs({ useCache: true });
    
    console.log(`- Loaded ${blogs.length} blogs`);
    // Expected: 2 blogs (published-blog and no-status-blog, since missing status defaults to published)
    assert.strictEqual(blogs.length, 2, 'Should return 2 blogs (published & no-status)');
    assert.ok(blogs.some(b => b.slug === 'published-blog'), 'Should include published-blog');
    assert.ok(blogs.some(b => b.slug === 'no-status-blog'), 'Should include no-status-blog');
    assert.ok(!blogs.some(b => b.slug === 'draft-blog'), 'Should NOT include draft-blog');
    assert.ok(!blogs.some(b => b.slug === 'in-review-blog'), 'Should NOT include in-review-blog');
    console.log('✅ Test 1 passed');
  }

  // Test 2: getBlogContent status filtering
  {
    console.log('\nTest 2: getBlogContent() status filtering');
    const storage = createMockStorage();
    
    // Cache a published blog
    storage.setItem('astra_blog_content_published-blog', JSON.stringify({
      data: {
        rawFrontmatter: 'title: Published Blog Title\nstatus: published',
        content: '# Published Blog',
        rawTotal: '---\ntitle: Published Blog Title\nstatus: published\n---\n# Published Blog',
        metadata: { title: 'Published Blog Title', status: 'published' }
      },
      timestamp: Date.now()
    }));

    // Cache a draft blog
    storage.setItem('astra_blog_content_draft-blog', JSON.stringify({
      data: {
        rawFrontmatter: 'title: Draft Blog Title\nstatus: draft',
        content: '# Draft Blog',
        rawTotal: '---\ntitle: Draft Blog Title\nstatus: draft\n---\n# Draft Blog',
        metadata: { title: 'Draft Blog Title', status: 'draft' }
      },
      timestamp: Date.now()
    }));

    const lib = new AstraBlogsLib({
      storage,
      useCache: true
    });
    lib.config.owner = 'test-owner';
    lib.config.repo = 'test-repo';
    lib.config.branch = 'main';

    // Fetch published blog
    const published = await lib.getBlogContent('published-blog');
    assert.notStrictEqual(published, null, 'Should load the published blog content');
    assert.strictEqual(published.metadata.status, 'published');

    // Fetch draft blog (should be blocked by default)
    const draft = await lib.getBlogContent('draft-blog');
    assert.strictEqual(draft, null, 'Should block access and return null for draft blog content');
    console.log('✅ Test 2 passed');
  }

  // Test 3: getRecommendations status filtering
  {
    console.log('\nTest 3: getRecommendations() status filtering');
    const lib = new AstraBlogsLib({ useCache: false });
    const recommendations = lib.getRecommendations(mockBlogsIndex, {
      count: 5,
      userPreferences: { ai: 1, react: 1, javascript: 1 }
    });

    // Expected: published-blog and no-status-blog
    assert.strictEqual(recommendations.length, 2, 'Should recommend published and no-status blogs');
    console.log('✅ Test 3 passed');
  }

  // Test 4: searchBlogs status filtering
  {
    console.log('\nTest 4: searchBlogs() status filtering');
    const lib = new AstraBlogsLib({ useCache: false });
    
    // Search with empty query returns all filtered blogs (published and no-status)
    const allSearch = lib.searchBlogs(mockBlogsIndex, '');
    assert.strictEqual(allSearch.length, 2);

    // Search with matching draft content should return nothing because drafts are filtered out
    const draftSearch = lib.searchBlogs(mockBlogsIndex, 'React');
    assert.strictEqual(draftSearch.length, 0, 'Search matching draft query should return 0 results');
    console.log('✅ Test 4 passed');
  }

  // Test 5: filterByTags status filtering
  {
    console.log('\nTest 5: filterByTags() status filtering');
    const lib = new AstraBlogsLib({ useCache: false });

    // Filter with tag 'react' matches draft-blog but it should be excluded due to status
    const reactFilter = lib.filterByTags(mockBlogsIndex, 'react');
    assert.strictEqual(reactFilter.length, 0, 'Filter by draft tags should return 0 results');

    // Filter with tag 'ai' matches published-blog and should be returned
    const aiFilter = lib.filterByTags(mockBlogsIndex, 'ai');
    assert.strictEqual(aiFilter.length, 1);
    console.log('✅ Test 5 passed');
  }

  // Test 6: config overrides (includeDrafts / allowedStatuses)
  {
    console.log('\nTest 6: config overrides (includeDrafts / allowedStatuses)');
    const storage = createMockStorage();
    storage.setItem('astra_blogs_index_cache', JSON.stringify({
      data: mockBlogsIndex,
      timestamp: Date.now()
    }));

    // Config option 1: includeDrafts: true
    const lib1 = new AstraBlogsLib({
      storage,
      useCache: true,
      includeDrafts: true
    });
    lib1.config.owner = 'test-owner';
    lib1.config.repo = 'test-repo';
    lib1.config.branch = 'main';

    const blogs1 = await lib1.getAllBlogs();
    // Expected: published, no-status (defaults to published), and draft. (3 blogs total)
    assert.strictEqual(blogs1.length, 3, 'includeDrafts: true should return 3 blogs');

    // Config option 2: allowedStatuses: ['draft']
    const lib2 = new AstraBlogsLib({
      storage,
      useCache: true,
      allowedStatuses: ['draft']
    });
    lib2.config.owner = 'test-owner';
    lib2.config.repo = 'test-repo';
    lib2.config.branch = 'main';

    const blogs2 = await lib2.getAllBlogs();
    assert.strictEqual(blogs2.length, 1, 'allowedStatuses: [draft] should return only draft blog');
    assert.strictEqual(blogs2[0].slug, 'draft-blog');

    console.log('✅ Test 6 passed');
  }

  // Test 7: options overrides dynamically
  {
    console.log('\nTest 7: options overrides dynamically');
    const storage = createMockStorage();
    storage.setItem('astra_blogs_index_cache', JSON.stringify({
      data: mockBlogsIndex,
      timestamp: Date.now()
    }));

    const lib = new AstraBlogsLib({
      storage,
      useCache: true
    });
    lib.config.owner = 'test-owner';
    lib.config.repo = 'test-repo';
    lib.config.branch = 'main';

    // Override with options.includeDrafts = true
    const blogs1 = await lib.getAllBlogs({ includeDrafts: true });
    assert.strictEqual(blogs1.length, 3, 'options.includeDrafts = true should load 3 blogs');

    // Override with options.allowedStatuses = ['draft']
    const blogs2 = await lib.getAllBlogs({ allowedStatuses: ['draft'] });
    assert.strictEqual(blogs2.length, 1);
    assert.strictEqual(blogs2[0].slug, 'draft-blog');

    console.log('✅ Test 7 passed');
  }

  // Test 8: specific status list ["published", "in-review", "draft"]
  {
    console.log('\nTest 8: specific status list ["published", "in-review", "draft"]');
    const storage = createMockStorage();
    storage.setItem('astra_blogs_index_cache', JSON.stringify({
      data: mockBlogsIndex,
      timestamp: Date.now()
    }));

    const lib = new AstraBlogsLib({
      storage,
      useCache: true,
      allowedStatuses: ['published', 'in-review', 'draft']
    });
    lib.config.owner = 'test-owner';
    lib.config.repo = 'test-repo';
    lib.config.branch = 'main';

    const blogs = await lib.getAllBlogs();
    
    // Expected: published-blog, draft-blog, in-review-blog, and no-status-blog (defaults to published) -> 4 blogs total.
    // archived-blog (status: archived) should NOT be returned.
    console.log(`- Loaded ${blogs.length} blogs with status list`);
    assert.strictEqual(blogs.length, 4, 'Should load 4 blogs matching the specified status list');
    assert.ok(blogs.some(b => b.slug === 'published-blog'));
    assert.ok(blogs.some(b => b.slug === 'draft-blog'));
    assert.ok(blogs.some(b => b.slug === 'in-review-blog'));
    assert.ok(blogs.some(b => b.slug === 'no-status-blog'));
    assert.ok(!blogs.some(b => b.slug === 'archived-blog'));
    console.log('✅ Test 8 passed');
  }

  console.log('\n🎉 All tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
