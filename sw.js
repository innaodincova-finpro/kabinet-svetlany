'use strict';
const SCOPE = new URL(self.registration.scope);
const VERSION = '3.2';
const CACHE = 'svetlana-' + VERSION + '-' + SCOPE.pathname;
const FILES = ['index.html','manifest.webmanifest','icon192.png','icon512.png','appletouchicon.png'];
const URLS = FILES.map(name => new URL(name, SCOPE).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  // Clean up only our versioned caches for this exact cabinet path.
  for(const key of await caches.keys())if(/^svetlana-[0-9.]+-/.test(key)&&key.endsWith('-'+SCOPE.pathname)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==SCOPE.origin)return;
  if(request.mode==='navigate'&&url.pathname.startsWith(SCOPE.pathname)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try {
        const response=await fetch(request);
        // Keep the installed release atomic: the next SW version installs its own set.
        if(response.ok)return response;
      }catch(e){}
      return await cache.match(URLS[0]) || new Response('Офлайн-копия ещё не готова. Откройте кабинет с интернетом.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
    })());return;
  }
  if(URLS.includes(url.href))event.respondWith((async()=>{
    const cache=await caches.open(CACHE);return await cache.match(url.href)||fetch(request);
  })());
});
