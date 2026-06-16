const CACHE = 'quiz-v2';
const URLS = [
    '.',
    'index.html',
    'manifest.json'
];

// Install: cache core files, activate immediately
self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(URLS).catch(err => {
            console.warn('SW install: some files failed to cache', err);
        }))
    );
});

// Activate: delete old caches, take control of all clients
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE).map(k => caches.delete(k))
        ))
    );
    self.clients.claim();
});

// Fetch: stale-while-revalidate for HTML/manifest, cache-first for others
self.addEventListener('fetch', e => {
    const url = e.request.url;
    const isPage = e.request.destination === 'document' || url.endsWith('manifest.json');

    if (isPage) {
        // Stale-while-revalidate: return cache immediately, update in background
        e.respondWith(
            caches.open(CACHE).then(cache => {
                return cache.match(e.request).then(cached => {
                    const fetchPromise = fetch(e.request).then(networkRes => {
                        if (networkRes && networkRes.ok) {
                            cache.put(e.request, networkRes.clone());
                        }
                        return networkRes;
                    }).catch(() => cached);
                    return cached || fetchPromise;
                });
            })
        );
    } else {
        // Cache-first for static assets (sw.js itself)
        e.respondWith(
            caches.match(e.request).then(r => r || fetch(e.request))
        );
    }
});

// Listen for update message from page
self.addEventListener('message', e => {
    if (e.data && e.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
