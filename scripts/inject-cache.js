const fs = require('fs');
let c = fs.readFileSync('c:/Users/admin/Desktop/onboarder/views/admin/dashboard.ejs', 'utf8');

const cacheCode = `
/* ── API Response Cache (60s TTL) ── */
const _apiCache = new Map();
const _CACHE_TTL = 60000;

async function cachedFetch(url, opts) {
    if (opts && opts.method && opts.method !== 'GET') return fetch(url, opts).then(r => r.json());
    const key = url;
    const hit = _apiCache.get(key);
    if (hit && (Date.now() - hit.ts) < _CACHE_TTL) return hit.data;
    const data = await fetch(url).then(r => r.json());
    _apiCache.set(key, { data, ts: Date.now() });
    return data;
}

function clearCache(pattern) {
    for (const k of _apiCache.keys()) {
        if (!pattern || k.includes(pattern)) _apiCache.delete(k);
    }
}

/* ── Skeleton helpers ── */
(function() {
    const s = document.createElement('style');
    s.textContent = '.sk{background:linear-gradient(90deg,rgba(94,194,19,.07) 25%,rgba(94,194,19,.14) 50%,rgba(94,194,19,.07) 75%);background-size:200% 100%;animation:skP 1.4s ease-in-out infinite;border-radius:6px;display:inline-block}.sk-v{height:2rem;width:64px;vertical-align:middle}.sk-t{height:1rem;width:80px}@keyframes skP{0%{background-position:200% 0}to{background-position:-200% 0}}';
    document.head.appendChild(s);
})();

function showSkeleton(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<span class="sk sk-v"></span>';
}

`;

c = c.replace('let taskCounter = 0;', cacheCode + 'let taskCounter = 0;');

// Replace fetch calls in loadOverviewData with cachedFetch
c = c.replace(
    `const [users, quests, events, apps, statistics] = await Promise.all([
            fetch('/admin/api/users/count').then(r => r.json()).catch(() => ({count: 0})),
            fetch('/admin/api/quests/stats').then(r => r.json()).catch(() => ({active: 0})),
            fetch('/admin/api/events/stats').then(r => r.json()).catch(() => ({upcoming: 0})),
            fetch('/admin/api/applications/stats').then(r => r.json()).catch(() => ({pending: 0})),
            fetch('/admin/api/statistics').then(r => r.json()).catch(() => ({stats: {apiUsage: {today: 0, last30Days: 0}}}))
        ]);`,
    `// Show skeletons while loading
        ['totalUsers','activeQuests','upcomingEvents','pendingApplications'].forEach(showSkeleton);

        const [users, quests, events, apps, statistics] = await Promise.all([
            cachedFetch('/admin/api/users/count').catch(() => ({count: 0})),
            cachedFetch('/admin/api/quests/stats').catch(() => ({active: 0})),
            cachedFetch('/admin/api/events/stats').catch(() => ({upcoming: 0})),
            cachedFetch('/admin/api/applications/stats').catch(() => ({pending: 0})),
            cachedFetch('/admin/api/statistics').catch(() => ({stats: {apiUsage: {today: 0, last30Days: 0}}}))
        ]);`
);

// Replace fetch calls in loadUsers with cachedFetch
c = c.replace(
    "const response = await fetch('/admin/api/users');",
    "const response = { json: async () => cachedFetch('/admin/api/users') };\n        const _raw = await response.json();\n        const data = _raw;"
);

fs.writeFileSync('c:/Users/admin/Desktop/onboarder/views/admin/dashboard.ejs', c, 'utf8');
console.log('Cache injected. Lines:', c.split('\n').length);
