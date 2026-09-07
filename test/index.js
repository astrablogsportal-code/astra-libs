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

  // ==========================================
  // AstraCmsLib Headless CMS Unit & Integration Tests
  // ==========================================
  console.log('\n🧪 Starting Astra CMS Library (AstraCmsLib) tests...');

  const { AstraCmsLib } = AstraBlogsLib;
  assert.ok(AstraCmsLib, 'AstraCmsLib should be exported on AstraBlogsLib');
  assert.strictEqual(AstraBlogsLib.CMS, AstraCmsLib, 'AstraBlogsLib.CMS should alias AstraCmsLib');

  const mockCmsModels = [
    {
      id: 'team_members',
      name: 'Team Members',
      modelType: 'collection',
      description: 'Directory of company team members',
      icon: 'FiUsers',
      fields: [
        { name: 'name', label: 'Full Name', type: 'text', required: true },
        { name: 'role', label: 'Job Role', type: 'text', required: true },
        { name: 'department', label: 'Department', type: 'select', options: ['Engineering', 'Design', 'Marketing'] },
        { name: 'bio', label: 'Biography', type: 'rich_text' },
        { name: 'experienceYears', label: 'Years of Experience', type: 'number' },
        { name: 'isActive', label: 'Is Active', type: 'boolean' }
      ],
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z'
    },
    {
      id: 'testimonials',
      name: 'Customer Testimonials',
      modelType: 'collection',
      description: 'Client reviews and testimonials',
      icon: 'FiMessageSquare',
      fields: [
        { name: 'clientName', label: 'Client Name', type: 'text', required: true },
        { name: 'quote', label: 'Quote', type: 'textarea', required: true },
        { name: 'rating', label: 'Rating', type: 'number' }
      ]
    },
    {
      id: 'privacy_policy',
      name: 'Privacy Policy',
      modelType: 'single',
      description: 'Single document privacy policy agreement',
      icon: 'FiShield',
      fields: [
        { name: 'title', label: 'Document Title', type: 'text', required: true },
        { name: 'content', label: 'Policy Content', type: 'rich_text', required: true },
        { name: 'lastUpdated', label: 'Last Updated', type: 'date' },
        { name: 'contactEmail', label: 'Contact Email', type: 'email' }
      ]
    },
    {
      id: 'cookie_policy',
      name: 'Cookie Policy',
      modelType: 'single',
      description: 'Single document cookie policy banner & details',
      icon: 'FiLayers',
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'bannerText', label: 'Banner Text', type: 'textarea' }
      ]
    }
  ];

  const mockTeamRecords = [
    {
      id: 'rec_alice',
      name: 'Alice Johnson',
      role: 'Lead Architect',
      department: 'Engineering',
      bio: 'Alice builds scalable cloud applications with React and Node.',
      experienceYears: 8,
      isActive: true,
      createdAt: '2026-06-01T11:00:00.000Z'
    },
    {
      id: 'rec_bob',
      name: 'Bob Smith',
      role: 'Frontend Developer',
      department: 'Engineering',
      bio: 'Bob specializes in modern UI design and animation.',
      experienceYears: 4,
      isActive: true,
      createdAt: '2026-06-01T11:10:00.000Z'
    },
    {
      id: 'rec_carol',
      name: 'Carol White',
      role: 'Product Designer',
      department: 'Design',
      bio: 'Carol crafts delightful and accessible user interfaces.',
      experienceYears: 6,
      isActive: false,
      createdAt: '2026-06-01T11:20:00.000Z'
    }
  ];

  const mockPrivacyDoc = {
    id: 'privacy_policy',
    title: 'Global Privacy Policy',
    content: '## Privacy Policy\nWe value your privacy and safeguard your personal information.',
    lastUpdated: '2026-09-01',
    contactEmail: 'privacy@example.com',
    _status: 'published',
    _updatedAt: '2026-09-01T12:00:00.000Z'
  };

  // CMS Test 1: getModels() and getModel()
  {
    console.log('\nCMS Test 1: getModels() & getModel() caching and lookup');
    const storage = createMockStorage();
    storage.setItem('astra_cms_models_cache', JSON.stringify({
      data: mockCmsModels,
      timestamp: Date.now()
    }));

    const cms = new AstraCmsLib({ storage, useCache: true });
    cms.config.owner = 'test-owner';
    cms.config.repo = 'test-repo';
    cms.config.branch = 'main';

    let cacheHitFired = false;
    let modelsLoadedFired = false;
    cms.on('cacheHit', () => { cacheHitFired = true; });
    cms.on('modelsLoaded', (models) => { modelsLoadedFired = true; });

    const models = await cms.getModels();
    assert.strictEqual(models.length, 4, 'Should return 4 CMS models from cache');
    assert.ok(cacheHitFired, 'Should fire cacheHit event');
    assert.ok(modelsLoadedFired, 'Should fire modelsLoaded event');

    // Test getModel() by id and name
    const teamModel = await cms.getModel('team_members');
    assert.notStrictEqual(teamModel, null, 'Should find model by id');
    assert.strictEqual(teamModel.name, 'Team Members');

    const testimonialModel = await cms.getModel('Customer Testimonials');
    assert.notStrictEqual(testimonialModel, null, 'Should find model by name');
    assert.strictEqual(testimonialModel.id, 'testimonials');

    const privacyModel = await cms.getModel('privacy_policy');
    assert.notStrictEqual(privacyModel, null, 'Should find single type model');
    assert.strictEqual(privacyModel.modelType, 'single');

    // Test getSingleModels() and getCollectionModels()
    const singleModels = await cms.getSingleModels();
    assert.strictEqual(singleModels.length, 2, 'Should return 2 single-document models');
    assert.ok(singleModels.some(m => m.id === 'privacy_policy'));
    assert.ok(singleModels.some(m => m.id === 'cookie_policy'));

    const collectionModels = await cms.getCollectionModels();
    assert.strictEqual(collectionModels.length, 2, 'Should return 2 collection models');
    assert.ok(collectionModels.some(m => m.id === 'team_members'));

    const missingModel = await cms.getModel('non_existent');
    assert.strictEqual(missingModel, null, 'Should return null for missing model');
    console.log('✅ CMS Test 1 passed');
  }

  // CMS Test 2: getData() and getRecord()
  {
    console.log('\nCMS Test 2: getData() & getRecord() caching and lookup');
    const storage = createMockStorage();
    storage.setItem('astra_cms_data_team_members', JSON.stringify({
      data: mockTeamRecords,
      timestamp: Date.now()
    }));

    const cms = new AstraCmsLib({ storage, useCache: true });
    cms.config.owner = 'test-owner';
    cms.config.repo = 'test-repo';
    cms.config.branch = 'main';

    const records = await cms.getData('team_members');
    assert.strictEqual(records.length, 3, 'Should return 3 records for team_members');

    const alice = await cms.getRecord('team_members', 'rec_alice');
    assert.notStrictEqual(alice, null, 'Should find Alice by ID');
    assert.strictEqual(alice.name, 'Alice Johnson');
    assert.strictEqual(alice.role, 'Lead Architect');

    const unknownRec = await cms.getRecord('team_members', 'rec_unknown');
    assert.strictEqual(unknownRec, null, 'Should return null for unknown record');
    console.log('✅ CMS Test 2 passed');
  }

  // CMS Test 3: Single Type CMS Documents (getData, getDocument, getSingle, getRecord)
  {
    console.log('\nCMS Test 3: Single Type Document (getData, getDocument, getSingle)');
    const storage = createMockStorage();
    storage.setItem('astra_cms_data_privacy_policy', JSON.stringify({
      data: mockPrivacyDoc,
      timestamp: Date.now()
    }));

    const cms = new AstraCmsLib({ storage, useCache: true });
    cms.config.owner = 'test-owner';
    cms.config.repo = 'test-repo';
    cms.config.branch = 'main';

    // getData returns single document object directly
    const privacyData = await cms.getData('privacy_policy');
    assert.ok(privacyData && typeof privacyData === 'object', 'getData should return object for single type');
    assert.strictEqual(privacyData.title, 'Global Privacy Policy');
    assert.strictEqual(privacyData.contactEmail, 'privacy@example.com');

    // getDocument returns the document object
    const privacyDoc = await cms.getDocument('privacy_policy');
    assert.notStrictEqual(privacyDoc, null, 'getDocument should return privacy document');
    assert.strictEqual(privacyDoc.title, 'Global Privacy Policy');

    // getSingle alias returns the document object
    const privacySingle = await cms.getSingle('privacy_policy');
    assert.notStrictEqual(privacySingle, null, 'getSingle should return privacy document');
    assert.strictEqual(privacySingle.contactEmail, 'privacy@example.com');

    // getRecord with or without recordId
    const recordDoc = await cms.getRecord('privacy_policy');
    assert.notStrictEqual(recordDoc, null, 'getRecord without recordId returns single document');
    assert.strictEqual(recordDoc.title, 'Global Privacy Policy');

    const recordById = await cms.getRecord('privacy_policy', 'privacy_policy');
    assert.notStrictEqual(recordById, null, 'getRecord with matching recordId returns single document');

    // searchData on single type document
    const privacySearch = await cms.searchData('privacy_policy', 'safeguard');
    assert.strictEqual(privacySearch.length, 1, 'Should find match in single document');
    assert.strictEqual(privacySearch[0].title, 'Global Privacy Policy');

    // filterData on single type document
    const privacyFilter = await cms.filterData('privacy_policy', { contactEmail: 'privacy@example.com' });
    assert.strictEqual(privacyFilter.length, 1, 'Should filter single document');

    console.log('✅ CMS Test 3 passed');
  }

  // CMS Test 4: searchData() querying
  {
    console.log('\nCMS Test 4: searchData() querying');
    const storage = createMockStorage();
    storage.setItem('astra_cms_data_team_members', JSON.stringify({
      data: mockTeamRecords,
      timestamp: Date.now()
    }));

    const cms = new AstraCmsLib({ storage, useCache: true });
    cms.config.owner = 'test-owner';
    cms.config.repo = 'test-repo';
    cms.config.branch = 'main';

    // Global text search
    const devSearch = await cms.searchData('team_members', 'Developer');
    assert.strictEqual(devSearch.length, 1, 'Should find 1 record with Developer');
    assert.strictEqual(devSearch[0].id, 'rec_bob');

    // Field-specific search
    const roleSearch = await cms.searchData('team_members', 'Architect', { searchFields: ['role'] });
    assert.strictEqual(roleSearch.length, 1);
    assert.strictEqual(roleSearch[0].id, 'rec_alice');

    // Search matching in bio
    const bioSearch = await cms.searchData('team_members', 'accessible');
    assert.strictEqual(bioSearch.length, 1);
    assert.strictEqual(bioSearch[0].id, 'rec_carol');

    console.log('✅ CMS Test 4 passed');
  }

  // CMS Test 5: filterData() with predicate and object criteria
  {
    console.log('\nCMS Test 5: filterData() with predicate and object criteria');
    const storage = createMockStorage();
    storage.setItem('astra_cms_data_team_members', JSON.stringify({
      data: mockTeamRecords,
      timestamp: Date.now()
    }));

    const cms = new AstraCmsLib({ storage, useCache: true });
    cms.config.owner = 'test-owner';
    cms.config.repo = 'test-repo';
    cms.config.branch = 'main';

    // Filter using object criteria
    const engineeringMembers = await cms.filterData('team_members', { department: 'Engineering' });
    assert.strictEqual(engineeringMembers.length, 2, 'Should return 2 Engineering records');

    const activeMembers = await cms.filterData('team_members', { isActive: true });
    assert.strictEqual(activeMembers.length, 2, 'Should return 2 active records');

    // Filter using predicate function
    const seniorMembers = await cms.filterData('team_members', (rec) => rec.experienceYears >= 6);
    assert.strictEqual(seniorMembers.length, 2, 'Should return 2 records with >= 6 years exp');
    assert.ok(seniorMembers.some(r => r.id === 'rec_alice'));
    assert.ok(seniorMembers.some(r => r.id === 'rec_carol'));

    console.log('✅ CMS Test 5 passed');
  }

  // CMS Test 6: clearCache()
  {
    console.log('\nCMS Test 6: clearCache() cache eviction');
    const storage = createMockStorage();
    storage.setItem('astra_cms_models_cache', JSON.stringify({ data: mockCmsModels, timestamp: Date.now() }));
    storage.setItem('astra_cms_data_team_members', JSON.stringify({ data: mockTeamRecords, timestamp: Date.now() }));
    storage.setItem('astra_cms_data_privacy_policy', JSON.stringify({ data: mockPrivacyDoc, timestamp: Date.now() }));
    storage.setItem('astra_blogs_index_cache', JSON.stringify({ data: [], timestamp: Date.now() }));

    const cms = new AstraCmsLib({ storage, useCache: true });
    cms.clearCache('astra_cms_');

    assert.strictEqual(storage.getItem('astra_cms_models_cache'), null, 'CMS models cache should be cleared');
    assert.strictEqual(storage.getItem('astra_cms_data_team_members'), null, 'CMS data cache should be cleared');
    assert.strictEqual(storage.getItem('astra_cms_data_privacy_policy'), null, 'CMS single doc cache should be cleared');
    assert.notStrictEqual(storage.getItem('astra_blogs_index_cache'), null, 'Blog cache should be preserved');

    console.log('✅ CMS Test 6 passed');
  }

  // CMS Test 7: Status & Draft Filtering (Single & Collection)
  {
    console.log('\nCMS Test 7: Status & Draft Filtering');
    const storage = createMockStorage();

    const mockDraftSingleDoc = {
      id: 'terms_draft',
      title: 'Terms of Service (Work in Progress)',
      content: '# Terms Draft',
      _status: 'draft',
      _updatedAt: '2026-09-07T12:00:00.000Z'
    };

    const mockCollectionWithStatuses = [
      { id: 'item_1', name: 'Published Item', status: 'published' },
      { id: 'item_2', name: 'Draft Item', _status: 'draft' },
      { id: 'item_3', name: 'No Status Item (Defaults Published)' }
    ];

    storage.setItem('astra_cms_data_terms_draft', JSON.stringify({ data: mockDraftSingleDoc, timestamp: Date.now() }));
    storage.setItem('astra_cms_data_collection_status', JSON.stringify({ data: mockCollectionWithStatuses, timestamp: Date.now() }));

    // Default CMS instance (allowedStatuses: ['published'], includeDrafts: false)
    const cms = new AstraCmsLib({ storage, useCache: true });
    cms.config.owner = 'test-owner';
    cms.config.repo = 'test-repo';
    cms.config.branch = 'main';

    // 1. Single Document draft check: should return null by default
    const draftDocDefault = await cms.getDocument('terms_draft');
    assert.strictEqual(draftDocDefault, null, 'Draft single document should be hidden by default');

    // 2. Single Document with includeDrafts: true
    const draftDocIncluded = await cms.getDocument('terms_draft', { includeDrafts: true });
    assert.notStrictEqual(draftDocIncluded, null, 'Draft single document should be returned when includeDrafts is true');
    assert.strictEqual(draftDocIncluded.id, 'terms_draft');

    // 3. Single Document with allowedStatuses: ['draft']
    const draftDocAllowed = await cms.getDocument('terms_draft', { allowedStatuses: ['draft'] });
    assert.notStrictEqual(draftDocAllowed, null, 'Draft single document should be returned when draft is in allowedStatuses');

    // 4. Collection draft filtering: item_2 (draft) should be excluded
    const collectionDefault = await cms.getData('collection_status');
    assert.strictEqual(collectionDefault.length, 2, 'Should only return 2 items (published & no status)');
    assert.ok(collectionDefault.some(i => i.id === 'item_1'));
    assert.ok(collectionDefault.some(i => i.id === 'item_3'));
    assert.ok(!collectionDefault.some(i => i.id === 'item_2'));

    // 5. Collection with includeDrafts: true
    const collectionAll = await cms.getData('collection_status', { includeDrafts: true });
    assert.strictEqual(collectionAll.length, 3, 'Should return all 3 items when includeDrafts is true');

    // 6. Global config override
    const draftEnabledCms = new AstraCmsLib({ storage, useCache: true, includeDrafts: true });
    draftEnabledCms.config.owner = 'test-owner';
    draftEnabledCms.config.repo = 'test-repo';
    draftEnabledCms.config.branch = 'main';
    const globalDraftDoc = await draftEnabledCms.getDocument('terms_draft');
    assert.notStrictEqual(globalDraftDoc, null, 'Global includeDrafts should allow draft single documents');

    // 7. Published document with draft edits: default gets published version, includeDrafts gets draft version
    const mockPublishedDocWithDraft = {
      id: 'privacy_policy',
      title: 'Published Privacy Policy v1.0',
      content: '# Privacy Policy v1.0',
      _status: 'published',
      _updatedAt: '2026-09-01T12:00:00.000Z',
      _draft: {
        title: 'Draft Privacy Policy v2.0',
        content: '# Privacy Policy v2.0 (Work in progress)',
        _status: 'draft',
        _updatedAt: '2026-09-07T12:00:00.000Z'
      }
    };
    storage.setItem('astra_cms_data_privacy_live', JSON.stringify({ data: mockPublishedDocWithDraft, timestamp: Date.now() }));

    const liveDoc = await cms.getDocument('privacy_live');
    assert.notStrictEqual(liveDoc, null, 'Should return published document');
    assert.strictEqual(liveDoc.title, 'Published Privacy Policy v1.0', 'Public consumers must see the published version');
    assert.strictEqual(liveDoc._draft, undefined, 'Public consumers should not receive internal _draft object');

    const previewDoc = await cms.getDocument('privacy_live', { includeDrafts: true });
    assert.notStrictEqual(previewDoc, null);
    assert.strictEqual(previewDoc.title, 'Draft Privacy Policy v2.0', 'Preview mode must see the draft changes');

    console.log('✅ CMS Test 7 passed');
  }

  console.log('\n🎉 All AstraBlogsLib and AstraCmsLib tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
