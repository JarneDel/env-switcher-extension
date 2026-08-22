import { performance } from 'perf_hooks';

// Simulate Chrome/Firefox storage and tabs APIs with realistic IPC latency (1-3ms per IPC call)
const mockStorageData = {
  config_global: {
    projects: [
      { id: 'proj1', name: 'Main Platform', color: '#3b82f6' },
      { id: 'proj2', name: 'Admin Portal', color: '#10b981' }
    ],
    autoDetectLanguages: true,
    faviconEnabled: true,
    borderEnabled: true,
    currentEnvironment: 'env-prod',
    recentEnvironmentIds: ['env-prod', 'env-stage', 'env-dev'],
    favorites: [
      { key: '/dashboard', url: 'https://example.com/dashboard', title: 'Dashboard', projectId: 'proj1', addedAt: Date.now() },
      { key: '/settings', url: 'https://example.com/settings', title: 'Settings', projectId: 'proj1', addedAt: Date.now() }
    ],
    healthChecksEnabled: true,
  },
  proj_envs_proj1: [
    { id: 'env-local', name: 'Localhost', baseUrl: 'http://localhost:3000', color: '#64748b', projectId: 'proj1' },
    { id: 'env-dev', name: 'Development', baseUrl: 'https://dev.example.com', color: '#f59e0b', projectId: 'proj1' },
    { id: 'env-stage', name: 'Staging', baseUrl: 'https://staging.example.com', color: '#8b5cf6', projectId: 'proj1' },
    { id: 'env-prod', name: 'Production', baseUrl: 'https://example.com', color: '#ef4444', projectId: 'proj1' }
  ],
  proj_envs_proj2: [
    { id: 'env-admin-local', name: 'Local Admin', baseUrl: 'http://localhost:3001', color: '#64748b', projectId: 'proj2' },
    { id: 'env-admin-prod', name: 'Production Admin', baseUrl: 'https://admin.example.com', color: '#ef4444', projectId: 'proj2' }
  ]
};

// Mock async browser APIs with simulated browser IPC delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const mockBrowser = {
  storage: {
    sync: {
      get: async (key: any) => {
        await delay(3); // 3ms storage IPC
        return mockStorageData;
      }
    }
  },
  tabs: {
    query: async (_query: any) => {
      await delay(4); // 4ms tabs IPC
      return [{ id: 101, url: 'https://staging.example.com/dashboard' }];
    },
    sendMessage: async (_id: number, _msg: any) => {
      await delay(25); // 25ms content-script roundtrip
      return { languages: [{ code: 'en', name: 'English' }, { code: 'nl', name: 'Nederlands' }] };
    }
  },
  history: {
    search: async (opts: any) => {
      await delay(18); // 18ms SQLite history scan across entire history
      return [
        { url: opts.text + '/dashboard', title: 'Dashboard', visitCount: 14, lastVisitTime: Date.now() - 5000 },
        { url: opts.text + '/users', title: 'User Management', visitCount: 8, lastVisitTime: Date.now() - 100000 },
        { url: opts.text + '/settings', title: 'App Settings', visitCount: 5, lastVisitTime: Date.now() - 500000 },
      ];
    }
  }
};

// --- SIMULATE OLD STARTUP PIPELINE (BEFORE OPTIMIZATION) ---
async function runOldStartup() {
  const start = performance.now();

  // 1. await ExtensionStorage.getConfig()
  const config = await mockBrowser.storage.sync.get(null);
  
  // 2. await ExtensionStorage.isConfigured() (2nd storage read)
  const config2 = await mockBrowser.storage.sync.get(null);
  const isConfigured = Boolean(config2);

  // 3. await getCurrentTabInfo() (blocks on tabs.query + content script IPC)
  const tabs = await mockBrowser.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  const response = await mockBrowser.tabs.sendMessage(activeTab.id, { action: 'getLanguages' });
  const languages = response?.languages || [];

  // 4. await loadHistoryPages() (sequential loop for every env in project)
  const projectEnvs = mockStorageData.proj_envs_proj1;
  const allItems = [];
  for (const env of projectEnvs) {
    const results = await mockBrowser.history.search({ text: env.baseUrl, maxResults: 200, startTime: 0 });
    allItems.push(...results);
  }

  // 5. setLoading(false) - First paint finally unblocked
  const end = performance.now();
  return { timeMs: end - start, itemsFound: allItems.length, languagesCount: languages.length };
}

// --- SIMULATE NEW STARTUP PIPELINE (AFTER OPTIMIZATION) ---
async function runNewStartup() {
  const start = performance.now();

  // 1. Parallelize storage and tab query
  const [config, tabs] = await Promise.all([
    mockBrowser.storage.sync.get(null),
    mockBrowser.tabs.query({ active: true, currentWindow: true })
  ]);

  // 2. Immediate synchronous derivation
  const configured = Boolean(config);
  const activeTab = tabs[0];
  
  // 3. First paint happens HERE (setLoading(false))!
  const firstPaintTime = performance.now() - start;

  // Background non-blocking tasks (do not block the user from seeing/clicking environments)
  const bgTasksPromise = Promise.all([
    mockBrowser.tabs.sendMessage(activeTab.id, { action: 'getLanguages' }),
    Promise.all(mockStorageData.proj_envs_proj1.map(env => mockBrowser.history.search({ text: env.baseUrl, maxResults: 100, startTime: 0 })))
  ]);

  const [langRes, historyRes] = await bgTasksPromise;
  const totalWithBgTasks = performance.now() - start;

  return { firstPaintTime, totalWithBgTasks };
}

async function benchmark() {
  console.log('=== STARTUP PIPELINE BENCHMARK (10 iterations) ===\n');

  let oldTotal = 0;
  for (let i = 0; i < 10; i++) {
    const res = await runOldStartup();
    oldTotal += res.timeMs;
  }
  const oldAvg = oldTotal / 10;

  let newFirstPaintTotal = 0;
  let newFullTotal = 0;
  for (let i = 0; i < 10; i++) {
    const res = await runNewStartup();
    newFirstPaintTotal += res.firstPaintTime;
    newFullTotal += res.totalWithBgTasks;
  }
  const newFirstPaintAvg = newFirstPaintTotal / 10;
  const newFullAvg = newFullTotal / 10;

  console.log(`OLD Startup Time (blocking spinner): ${oldAvg.toFixed(2)} ms`);
  console.log(`NEW First Paint Time (UI ready):     ${newFirstPaintAvg.toFixed(2)} ms`);
  console.log(`NEW Background Hydration Complete:    ${newFullAvg.toFixed(2)} ms`);
  console.log(`\nStartup Speedup to First Interactive: ${(oldAvg / newFirstPaintAvg).toFixed(1)}x faster`);
}

benchmark();
