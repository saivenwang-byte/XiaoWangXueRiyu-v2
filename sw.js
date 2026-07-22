/** Service Worker · P1 语音包分批预缓存（支持独立 TTS CDN） */
/* global self, caches, fetch */

const MANIFEST_URL = "tts-cache/sw-manifest.json";
const DEFAULT_BATCH = 40;
let cacheConfigPromise = null;

function parseManifest(data) {
  if (!data || typeof data !== "object") return { cacheName: "hyouga-tts-v0", ttsBase: "", batchSize: DEFAULT_BATCH };
  const ver = String(data.cacheVer || "0").trim();
  const ttsBase = String(data.ttsBase || "").trim();
  const batchSize = Math.max(10, Math.min(80, Number(data.batchSize) || DEFAULT_BATCH));
  return {
    cacheName: "hyouga-tts-v" + ver,
    ttsBase: ttsBase.endsWith("/") ? ttsBase : ttsBase ? ttsBase + "/" : "",
    batchSize,
  };
}

async function loadCacheConfig() {
  if (!cacheConfigPromise) {
    cacheConfigPromise = fetch(MANIFEST_URL, { cache: "no-store" })
      .then(async (cfgRes) => parseManifest(cfgRes.ok ? await cfgRes.json() : {}))
      .catch((error) => {
        cacheConfigPromise = null;
        throw error;
      });
  }
  return cacheConfigPromise;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const plan = await loadCacheConfig();
      await caches.open(plan.cacheName);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const plan = await loadCacheConfig().catch(() => ({ cacheName: "hyouga-tts-v0" }));
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("hyouga-tts-") && n !== plan.cacheName)
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

function isTtsMp3Request(url) {
  return url.pathname.includes("/tts-cache/") && url.pathname.endsWith(".mp3");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!isTtsMp3Request(url)) return;
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      try {
        const res = await fetch(event.request, { mode: "cors", credentials: "omit" });
        if (res.ok) {
          const plan = await loadCacheConfig().catch(() => ({ cacheName: "hyouga-tts-v0" }));
          const cache = await caches.open(plan.cacheName);
          await cache.put(event.request, res.clone());
        }
        return res;
      } catch (e) {
        const fallback = await caches.match(event.request);
        if (fallback) return fallback;
        return Response.error();
      }
    })()
  );
});
