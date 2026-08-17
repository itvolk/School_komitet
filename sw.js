// sw.js — Service Worker для офлайн-режима
const CACHE_NAME = 'treasurer-cache-v1';
const urlsToCache = [
  '.',
  'index.html',
  'manifest.json'
];

// Устанавливаем кэш
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('✅ Кэш открыт');
        return cache.addAll(urlsToCache);
      })
  );
});

// Активируем и удаляем старые кэши
self.addEventListener('activate', function(event) {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Перехватываем запросы и отвечаем из кэша или сети
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Если есть в кэше — возвращаем
        if (response) {
          return response;
        }
        // Иначе идём в сеть
        return fetch(event.request).then(function(response) {
          // Проверяем, что ответ валидный
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          // Кэшируем новый файл
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
  );
});