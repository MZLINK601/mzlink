// sw.js - Versão de Elite, simples e segura

const CACHE_NAME = 'mzlink-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
  // Adiciona aqui o caminho para o teu logo/ícone principal, se quiseres
  // '/icons/icon-192x192.png' 
];

// 1. Instalação: guarda os ficheiros base na cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('A abrir cache e a guardar assets base');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Ativa o novo SW imediatamente
});

// 2. Ativação: limpa caches antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('A apagar cache antiga:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Assume o controlo das páginas abertas
});

// 3. Fetch: Estratégia "Network First, falling back to Cache"
// Tenta sempre a rede primeiro. Se falhar, usa a cache.
self.addEventListener('fetch', (event) => {
  // Ignora pedidos que não são GET ou que vão para outros domínios (ex: Supabase)
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return; 
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for boa, guarda uma cópia na cache e devolve-a
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Se a rede falhar, tenta buscar à cache
        return caches.match(event.request);
      })
  );
});
