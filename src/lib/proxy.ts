/**
 * Scramjet proxy bootstrap. Browser-only: every function here must be called
 * from an effect or an event handler, never during render/SSR.
 */

/** Static files are built from MercuryWorkshop/scramjet v2.0.67-alpha.2. */
export const SCRAMJET_VERSION = "v2.0.67-alpha.2";
export const SCRAMJET_PREFIX = "/scramjet/";

/**
 * Epoxy's transport endpoint. Keep this as an HTTP(S) endpoint so the app
 * never opens a WebSocket itself; Epoxy handles its supported protocol.
 */
export const EPOXY_SERVERS = [
  "https://wisp.mercurywork.shop/",
  "https://wisp.ghosty-xyz.workers.dev/",
  "https://wisp.sh/wisp/",
];
export const DEFAULT_EPOXY = EPOXY_SERVERS[0]!;

// Backwards-compatible names for the settings UI.
export const WISP_SERVERS = EPOXY_SERVERS;
export const DEFAULT_WISP = DEFAULT_EPOXY;

type AnyRecord = Record<string, unknown>;

// Polyfill Headers iterator for older environments or specific Scramjet versions
if (typeof Headers !== "undefined" && !Headers.prototype[Symbol.iterator]) {
  Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
}

let scriptPromise: Promise<void> | null = null;
let controllerPromise: Promise<AnyRecord> | null = null;
let currentWisp = "";
let connection: AnyRecord | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.dataset["src"] = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

async function ensureScripts() {
  if (!scriptPromise) scriptPromise = loadScript("/proxy/scramjet.all.js");
  await scriptPromise;
}

async function ensureTransport(wisp: string) {
  if (currentWisp === wisp && connection) return;
  
  try {
    const dynamicImport = new Function("p", "return import(p)") as (p: string) => Promise<AnyRecord>;
    const mod = await dynamicImport(`${location.origin}/proxy/baremux.mjs`);
    
    // Support both named and default exports
    const BareMuxConnection = (mod["BareMuxConnection"] || mod["default"]) as new (worker: string) => AnyRecord;
    
    if (!connection) {
      connection = new BareMuxConnection(`${location.origin}/proxy/baremux-worker.js`);
    }

    const setTransport = connection["setTransport"] as (
      path: string,
      options: unknown[],
    ) => Promise<void>;

    // Use the Epoxy transport exclusively. Libcurl is intentionally not used:
    // it falls back to the browser WebSocket path in older BareMux builds.
    await setTransport.call(connection, `${location.origin}/proxy/epoxy.mjs`, [{ wisp }]);

    currentWisp = wisp;
  } catch (err) {
    console.error("Failed to ensure transport:", err);
    throw err;
  }
}

/** Boots Scramjet + the service worker + the wisp transport. Idempotent. */
export async function initProxy(wisp: string): Promise<AnyRecord> {
  await ensureScripts();

  if (!controllerPromise) {
    controllerPromise = (async () => {
      const loader = (window as unknown as AnyRecord)["$scramjetLoadController"] as () => {
        ScramjetController: new (config: AnyRecord) => AnyRecord;
      };
      const { ScramjetController } = loader();
      const controller = new ScramjetController({
        prefix: SCRAMJET_PREFIX,
        files: {
          wasm: "/proxy/scramjet.wasm.wasm",
          all: "/proxy/scramjet.all.js",
          sync: "/proxy/scramjet.sync.js",
        },
      });
      await (controller["init"] as () => Promise<void>).call(controller);
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
      }
      return controller;
    })();
  }

  const controller = await controllerPromise;
  await ensureTransport(wisp);
  return controller;
}

/** Turns whatever the user typed into a real URL. */
export function toUrl(input: string, engine: string): string {
  const value = input.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const looksLikeHost = /^[^\s./]+(\.[^\s./]+)+(\/.*)?$/.test(value) || value.startsWith("localhost");
  if (looksLikeHost) return `https://${value}`;
  return engine.replace("%s", encodeURIComponent(value));
}

export const SEARCH_ENGINES = [
  { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=%s", host: "duckduckgo.com" },
  { name: "Google", url: "https://www.google.com/search?q=%s", host: "google.com" },
  { name: "Bing", url: "https://www.bing.com/search?q=%s", host: "bing.com" },
] as const;
