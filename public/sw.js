/** Headers polyfill for older environments or specific Scramjet versions */
if (typeof Headers !== "undefined" && !Headers.prototype[Symbol.iterator]) {
  Headers.prototype[Symbol.iterator] = function* () {
    if (typeof this.entries === "function") {
      for (const entry of this.entries()) {
        yield entry;
      }
    }
  };
}

importScripts("/proxy/baremux-worker.js");
importScripts("/proxy/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      await scramjet.loadConfig();
      if (scramjet.route(event)) {
        return await scramjet.fetch(event);
      }
      return await fetch(event.request);
    })(),
  );
});
