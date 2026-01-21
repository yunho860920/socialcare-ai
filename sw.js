const CACHE_NAME = 'social-care-ai-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './ai-engine.js',
    './manifest.json',
    'https://esm.run/@mlc-ai/web-llm'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // LLM models are large and usually fetched via specific libraries (WebLLM).
    // WebLLM handles its own caching via Cache API.
    // This SW handles the UI assets.
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
