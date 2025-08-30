// Enhanced Service Worker for CryptoCraze
// Provides offline functionality, caching, and performance optimizations

const VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${VERSION}`;
const DYNAMIC_CACHE = `dynamic-${VERSION}`;
const IMAGE_CACHE = `images-${VERSION}`;
const API_CACHE = `api-${VERSION}`;

// Cache duration in milliseconds
const CACHE_DURATIONS = {
  static: 7 * 24 * 60 * 60 * 1000,    // 7 days
  dynamic: 24 * 60 * 60 * 1000,       // 1 day
  images: 30 * 24 * 60 * 60 * 1000,   // 30 days
  api: 5 * 60 * 1000,                 // 5 minutes
};

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API endpoints to cache
const CACHEABLE_API_PATTERNS = [
  /^\/api\/crypto\/list/,
  /^\/api\/crypto\/icons/,
  /^\/api\/locales/,
];

// API endpoints to never cache
const NEVER_CACHE_PATTERNS = [
  /^\/api\/auth/,
  /^\/api\/user/,
  /^\/api\/tasks\/.*\/(complete|progress)/,
  /^\/socket\.io/,
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE &&
                cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip requests we should never cache
  if (NEVER_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return;
  }
  
  event.respondWith(
    handleRequest(request)
  );
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Handle different types of requests
    if (url.pathname.startsWith('/api/')) {
      return await handleApiRequest(request);
    } else if (isImageRequest(request)) {
      return await handleImageRequest(request);
    } else if (isStaticAsset(request)) {
      return await handleStaticRequest(request);
    } else {
      return await handleDynamicRequest(request);
    }
  } catch (error) {
    console.error('Service Worker error handling request:', error);
    
    // Fallback to network
    try {
      return await fetch(request);
    } catch (networkError) {
      console.error('Network request failed:', networkError);
      return new Response('Offline', { 
        status: 503, 
        statusText: 'Service Unavailable' 
      });
    }
  }
}

async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this API endpoint should be cached
  const shouldCache = CACHEABLE_API_PATTERNS.some(pattern => 
    pattern.test(url.pathname)
  );
  
  if (!shouldCache || request.method !== 'GET') {
    // Don't cache, just fetch
    return await fetch(request);
  }
  
  // Try cache first for GET requests
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && !isExpired(cachedResponse, CACHE_DURATIONS.api)) {
    console.log('Serving API from cache:', url.pathname);
    
    // Fetch in background to update cache
    fetchAndUpdateCache(request, cache);
    
    return cachedResponse;
  }
  
  // Fetch from network
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    // Cache successful responses
    const responseClone = networkResponse.clone();
    await cache.put(request, responseClone);
    console.log('API response cached:', url.pathname);
  }
  
  return networkResponse;
}

async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && !isExpired(cachedResponse, CACHE_DURATIONS.images)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      console.log('Image cached:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached version even if expired, as fallback
    if (cachedResponse) {
      console.log('Serving expired cached image as fallback');
      return cachedResponse;
    }
    throw error;
  }
}

async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && !isExpired(cachedResponse, CACHE_DURATIONS.static)) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const responseClone = networkResponse.clone();
    await cache.put(request, responseClone);
  }
  
  return networkResponse;
}

async function handleDynamicRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && !isExpired(cachedResponse, CACHE_DURATIONS.dynamic)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && request.method === 'GET') {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached version as fallback
    if (cachedResponse) {
      console.log('Serving cached version as offline fallback');
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      const offlineResponse = await cache.match('/');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    throw error;
  }
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i);
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/i) ||
         url.pathname === '/' ||
         url.pathname === '/index.html' ||
         url.pathname === '/manifest.json';
}

function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return true;
  
  const date = new Date(dateHeader);
  const now = new Date();
  
  return (now.getTime() - date.getTime()) > maxAge;
}

async function fetchAndUpdateCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      console.log('Cache updated in background:', request.url);
    }
  } catch (error) {
    console.log('Background cache update failed:', error);
  }
}

// Handle periodic cache cleanup
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    event.waitUntil(cleanupExpiredCache());
  }
});

async function cleanupExpiredCache() {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response && isExpired(response, CACHE_DURATIONS.dynamic)) {
        await cache.delete(request);
        console.log('Deleted expired cache entry:', request.url);
      }
    }
  }
}

console.log('Service Worker loaded and ready!');

