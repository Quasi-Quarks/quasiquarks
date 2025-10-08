// sw.js — TTS Localizer (same-origin response)
const CACHE_NAME = 'tts-localizer-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Intercept /local-tts?tl=..&q=.. and fetch from translate_tts,
// then return it as a same-origin audio/mpeg response.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/local-tts') {
    event.respondWith(handleLocalTTS(url));
  }
});

async function handleLocalTTS(url) {
  const tl = url.searchParams.get('tl') || 'ar';
  const q = url.searchParams.get('q') || '';
  const client = url.searchParams.get('client') || 'gtx';

  // Build remote URL
  const remote = new URL('https://translate.googleapis.com/translate_tts');
  remote.searchParams.set('ie', 'UTF-8');
  remote.searchParams.set('q', q);
  remote.searchParams.set('tl', tl);
  remote.searchParams.set('client', client);
  remote.searchParams.set('_', Date.now().toString()); // cache-bust

  // Fetch remote MP3 (as opaque or CORS-ok); convert to blob/arrayBuffer
  const r = await fetch(remote.toString(), {
    // No credentials; keep simple
    referrerPolicy: 'no-referrer',
  });

  if (!r.ok) {
    return new Response('TTS fetch failed', { status: 502 });
  }

  const buf = await r.arrayBuffer();

  // Return SAME-ORIGIN audio with correct headers (looks "local")
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store, max-age=0',
      'Accept-Ranges': 'bytes', // hint to media pipeline
    },
  });
}
