// Верзија кеша и имена фајлова за кеширање
const CACHE_VERSION = 'v2';
const CACHE_NAME = `weather-app-cache-${CACHE_VERSION}`;
const APP_SHELL_CACHE = 'app-shell-cache';
const DATA_CACHE = 'weather-data-cache';

// Ресурси који се увек кеширају (app shell)
const APP_SHELL_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/offline.html',
    '/Meteo-180x180.png',
    '/Meteo-192x192.png',
    '/Meteo-512x512.png'
];

// API URLs које треба третирати другачије
const WEATHER_API_URLS = [
    'api.openweathermap.org/data/2.5/weather',
    'api.openweathermap.org/data/2.5/forecast',
    'api.openweathermap.org/data/2.5/uvi',
    'api.openweathermap.org/data/2.5/air_pollution'
];

// Функција за проверу да ли је захтев за API
const isWeatherAPI = (url) => WEATHER_API_URLS.some(apiUrl => url.includes(apiUrl));

// Функција за проверу валидности кешираног одговора
const isValidResponse = (response) => {
    if (!response) return false;
    const fetchTime = response.headers.get('sw-fetch-time');
    if (!fetchTime) return false;
    
    // Кеширани подаци су валидни 30 минута
    return (Date.now() - parseInt(fetchTime)) < 30 * 60 * 1000;
};

// Инсталација Service Worker-а
self.addEventListener('install', event => {
    event.waitUntil(
        Promise.all([
            // Кеширање app shell фајлова
            caches.open(APP_SHELL_CACHE).then(cache => 
                cache.addAll(APP_SHELL_FILES)
            ),
            // Креирање кеша за податке о времену
            caches.open(DATA_CACHE)
        ]).then(() => self.skipWaiting())
    );
});

// Активација Service Worker-а
self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            // Брисање старих верзија кешева
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (
                            cacheName !== APP_SHELL_CACHE &&
                            cacheName !== DATA_CACHE
                        ) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Преузимање контроле над клијентима
            self.clients.claim()
        ])
    );
});

// Обрада fetch захтева
self.addEventListener('fetch', event => {
    // Стратегија за API захтеве
    if (isWeatherAPI(event.request.url)) {
        event.respondWith(handleApiRequest(event.request));
        return;
    }

    // Стратегија за статичке фајлове (app shell)
    event.respondWith(handleStaticRequest(event.request));
});

// Функција за обраду API захтева
async function handleApiRequest(request) {
    try {
        // Прво покушавамо да дохватимо свеже податке
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DATA_CACHE);
            // Додајемо временску ознаку
            const responseToCache = networkResponse.clone();
            const headers = new Headers(responseToCache.headers);
            headers.append('sw-fetch-time', Date.now().toString());
            const modifiedResponse = new Response(await responseToCache.blob(), {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });
            cache.put(request, modifiedResponse);
            return networkResponse;
        }
    } catch (error) {
        // Ако је мрежа недоступна, користимо кеширане податке
        const cachedResponse = await caches.match(request);
        if (cachedResponse && isValidResponse(cachedResponse)) {
            return cachedResponse;
        }
    }

    // Ако немамо валидне податке, враћамо подразумеване
    return new Response(
        JSON.stringify({ error: 'No weather data available offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
}

// Функција за обраду статичких захтева
async function handleStaticRequest(request) {
    // Прво проверавамо кеш
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        // Ако нема у кешу, дохватамо са мреже
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(APP_SHELL_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
    } catch (error) {
        // Ако је захтев за HTML страницом, враћамо offline страницу
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/offline.html');
        }
    }

    // За све остале случајеве враћамо грешку
    return new Response('Service Unavailable', { status: 503 });
}

// Периодично чишћење старих кешираних података
self.addEventListener('periodicsync', event => {
    if (event.tag === 'clean-caches') {
        event.waitUntil(cleanOldCaches());
    }
});

async function cleanOldCaches() {
    const cache = await caches.open(DATA_CACHE);
    const requests = await cache.keys();
    const now = Date.now();

    return Promise.all(
        requests.map(async request => {
            const response = await cache.match(request);
            if (!isValidResponse(response)) {
                return cache.delete(request);
            }
        })
    );
}