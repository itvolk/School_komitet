// sw-parent.js
const CACHE_NAME = 'parent-cache-v2';
const urlsToCache = [
  '.',
  'index.html',
  'manifest-parent.json',
  'data/parents.json'
];

// Устанавливаем кэш
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('✅ Кэш для родителей открыт');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        // Пропускаем ожидание и активируем сразу
        return self.skipWaiting();
      })
  );
});

// Активация - удаляем старые кэши
self.addEventListener('activate', function(event) {
  event.waitUntil(
    Promise.all([
      // Удаляем старые кэши
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Удаляем старый кэш:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Принудительно обновляем клиенты
      self.clients.claim()
    ])
  );
});

// Стратегия: Сначала пытаемся загрузить с сети, если не получается - из кэша
// Но для HTML-страниц проверяем обновления
self.addEventListener('fetch', function(event) {
  const request = event.request;
  const url = new URL(request.url);
  
  // Для запросов к data/parents.json - всегда с сервера (с обновлением кэша)
  if (url.pathname.includes('/data/parents.json')) {
    event.respondWith(
      fetch(request, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      .then(function(response) {
        // Обновляем кэш
        if (response && response.ok) {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, response.clone());
          });
        }
        return response;
      })
      .catch(function() {
        // Если сеть недоступна - из кэша
        return caches.match(request);
      })
    );
    return;
  }
  
  // Для HTML-страниц - проверяем обновления
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '') {
    event.respondWith(
      fetch(request, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
      .then(function(response) {
        // Обновляем кэш
        if (response && response.ok) {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, response.clone());
          });
        }
        return response;
      })
      .catch(function() {
        // Если сеть недоступна - из кэша
        return caches.match(request);
      })
    );
    return;
  }
  
  // Для остальных ресурсов - сначала кэш, потом сеть (OFFLINE FIRST)
  event.respondWith(
    caches.match(request)
      .then(function(response) {
        // Если есть в кэше - возвращаем, но фоново обновляем
        if (response) {
          // Фоновое обновление для CSS, JS, иконок
          if (request.url.match(/\.(css|js|png|jpg|jpeg|svg|ico)$/i)) {
            fetch(request)
              .then(function(fetchResponse) {
                if (fetchResponse && fetchResponse.ok) {
                  caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(request, fetchResponse);
                  });
                }
              })
              .catch(function() {
                // Игнорируем ошибки фонового обновления
              });
          }
          return response;
        }
        
        // Если нет в кэше - загружаем из сети
        return fetch(request)
          .then(function(fetchResponse) {
            if (fetchResponse && fetchResponse.ok) {
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(request, fetchResponse.clone());
              });
            }
            return fetchResponse;
          });
      })
  );
});

// Проверка обновлений приложения
self.addEventListener('message', function(event) {
  if (event.data === 'checkForUpdate') {
    // Проверяем, есть ли новая версия
    self.skipWaiting();
  }
});