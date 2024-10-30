
if (!globalThis.BigInt64Array) globalThis.BigInt64Array = function () { };
if (!globalThis.BigUint64Array) globalThis.BigUint64Array = function () { };

// WASM feature detection requires an async call so the code is wrapped in an async function.
(async function () {
    // Caution! Be sure you understand the caveats before publishing an application with
    // offline support. See https://aka.ms/blazor-offline-considerations

    // Use SIMD support detection to decide which build assets to cache
    // Below line can be removed in place of SIMD detection which will determine which assets lsit to load
    // self.importScripts('./service-worker-assets.js');
    self.importScripts('./wasm-feature-detect.1.5.1.js');
    var supportsSimd = await wasmFeatureDetect.simd();
    var supportsExceptions = await wasmFeatureDetect.exceptions();
    var useCompatMode = !supportsSimd || !supportsExceptions;
    var serviceWorkerAssetsFile = useCompatMode ? './service-worker-assets-compat.js' : './service-worker-assets.js';
    self.importScripts(serviceWorkerAssetsFile);
    if (useCompatMode) {
        // update the url of the assets to use _frameworkCompat/ instead of _framework/
        self.assetsManifest.assets.forEach(function(o) {
            if (o.url.startsWith('_framework/')) {
                o.url = o.url.replace('_framework/', '_frameworkCompat/');
            }
        });
    }

    self.addEventListener('install', event => event.waitUntil(onInstall(event)));
    self.addEventListener('activate', event => event.waitUntil(onActivate(event)));
    self.addEventListener('fetch', event => event.respondWith(onFetch(event)));

    const cacheNamePrefix = 'offline-cache-';
    const cacheName = `${cacheNamePrefix}${self.assetsManifest.version}`;
    const offlineAssetsInclude = [/\.dll$/, /\.pdb$/, /\.wasm/, /\.html/, /\.js$/, /\.json$/, /\.css$/, /\.woff$/, /\.png$/, /\.jpe?g$/, /\.gif$/, /\.ico$/, /\.blat$/, /\.dat$/];
    const offlineAssetsExclude = [/^service-worker\.js$/];

    // Replace with your base path if you are hosting on a subfolder. Ensure there is a trailing '/'.
    const base = "/";
    const baseUrl = new URL(base, self.origin);
    const manifestUrlList = self.assetsManifest.assets.map(asset => new URL(asset.url, baseUrl).href);

    async function onInstall(event) {
        console.info('Service worker: Install');
        // Fetch and cache all matching items from the assets manifest
        const assetsRequests = self.assetsManifest.assets
            .filter(asset => offlineAssetsInclude.some(pattern => pattern.test(asset.url)))
            .filter(asset => !offlineAssetsExclude.some(pattern => pattern.test(asset.url)))
            .map(asset => new Request(asset.url, { integrity: asset.hash, cache: 'no-cache' }));
        await caches.open(cacheName).then(cache => cache.addAll(assetsRequests));
    }

    async function onActivate(event) {
        console.info('Service worker: Activate');
        // Delete unused caches
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys
            .filter(key => key.startsWith(cacheNamePrefix) && key !== cacheName)
            .map(key => caches.delete(key)));
    }

    async function onFetch(event) {
        let cachedResponse = null;
        if (event.request.method === 'GET') {
            // For all navigation requests, try to serve index.html from cache,
            // unless that request is for an offline resource.
            // If you need some URLs to be server-rendered, edit the following check to exclude those URLs
            const shouldServeIndexHtml = event.request.mode === 'navigate'
                && !manifestUrlList.some(url => url === event.request.url);

            const request = shouldServeIndexHtml ? 'index.html' : event.request;
            const cache = await caches.open(cacheName);
            cachedResponse = await cache.match(request);
        }
        return cachedResponse || fetch(event.request);
    }

})()