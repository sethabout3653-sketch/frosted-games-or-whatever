import {
  ArrowLeft,
  ArrowRight,
  Gamepad2,
  Plus,
  RotateCw,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { toUrl } from "@/lib/proxy";
import { useBrowserChrome, useSettings } from "@/lib/settings";
import type { Game } from "@/lib/games";
import { GameView } from "./GameView";
import { GamesLibrary } from "./GamesLibrary";
import { NewTabPage } from "./NewTabPage";
import { SettingsPanel } from "./SettingsPanel";
import { WebView, faviconFor } from "./WebView";
import { newTab, type Tab } from "./types";

type Nav = { back: () => void; forward: () => void; reload: () => void } | null;

export function BrowserShell() {
  const { settings, update } = useSettings();
  const [tabs, setTabs] = useState<Tab[]>(() => [newTab()]);
  const [activeId, setActiveId] = useState(() => tabs[0]!.id);
  const [showSettings, setShowSettings] = useState(false);
  const [omnibox, setOmnibox] = useState("");
  const navs = useRef<Record<string, Nav>>({});

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]!;
  useBrowserChrome(active.title || "Frosted", active.icon);

  const patchTab = useCallback((id: string, patch: Partial<Tab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const addTab = (patch: Partial<Tab> = {}) => {
    const tab = { ...newTab(), ...patch };
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
    setOmnibox(tab.url ?? "");
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fresh = newTab();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[next.length - 1]!.id);
      return next;
    });
    delete navs.current[id];
  };

  const navigate = (input: string, id = activeId) => {
    const url = toUrl(input, settings.engine);
    if (!url) return;
    patchTab(id, {
      kind: "web",
      url,
      target: url,
      title: hostOf(url),
      icon: faviconFor(url),
    });
    setOmnibox(url);
  };

  const openGames = (id = activeId) =>
    patchTab(id, { kind: "games", title: "Games", url: "frosted://games", icon: "" });

  const launchGame = (game: Game) =>
    patchTab(activeId, {
      kind: "game",
      title: game.name,
      url: `frosted://games/${game.directory}`,
      gameDir: game.directory,
      gameName: game.name,
    });

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Tab strip */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-card px-2 pt-2">
        <div className="flex flex-1 items-end gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => {
                setActiveId(tab.id);
                setOmnibox(tab.kind === "web" ? tab.url : "");
              }}
              className={`group flex min-w-[9rem] max-w-[14rem] cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2 text-xs ${
                tab.id === activeId
                  ? "border-border bg-background text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent"
              }`}
            >
              {tab.kind === "games" || tab.kind === "game" ? (
                <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
              ) : tab.icon ? (
                <img src={tab.icon} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
              ) : (
                <span className="h-3.5 w-3.5 shrink-0 rounded-sm border border-border" />
              )}
              <span className="truncate">{tab.title}</span>
              <button
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="ml-auto rounded p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            aria-label="New tab"
            onClick={() => addTab()}
            className="mb-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
        <ToolbarButton label="Back" onClick={() => navs.current[activeId]?.back()}>
          <ArrowLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Forward" onClick={() => navs.current[activeId]?.forward()}>
          <ArrowRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Reload"
          onClick={() => {
            if (active.kind === "web") navs.current[activeId]?.reload();
          }}
        >
          <RotateCw className="h-4 w-4" />
        </ToolbarButton>

        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(omnibox);
          }}
        >
          <input
            value={active.kind === "web" ? omnibox : displayUrl(active)}
            onChange={(e) => setOmnibox(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            placeholder="Search or enter address"
            className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/40"
          />
        </form>

        <ToolbarButton label="Games" onClick={() => addTab({ kind: "games", title: "Games", url: "frosted://games" })}>
          <Gamepad2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Settings" onClick={() => setShowSettings(true)}>
          <SettingsIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="absolute inset-0"
            style={{ visibility: tab.id === activeId ? "visible" : "hidden" }}
          >
            {tab.kind === "new" && (
              <NewTabPage
                engine={settings.engine}
                onEngineChange={(engine) => update({ engine })}
                onNavigate={(input) => navigate(input, tab.id)}
                onOpenGames={() => openGames(tab.id)}
              />
            )}
            {tab.kind === "games" && <GamesLibrary onLaunch={launchGame} />}
            {tab.kind === "game" && (
              <GameView
                directory={tab.gameDir!}
                name={tab.gameName ?? tab.title}
                onBack={() => openGames(tab.id)}
              />
            )}
            {tab.kind === "web" && (
              <WebView
                url={tab.target}
                wisp={settings.wisp}
                active={tab.id === activeId}
                onMeta={(meta) => {
                  patchTab(tab.id, {
                    ...(meta.title ? { title: meta.title } : {}),
                    ...(meta.icon ? { icon: meta.icon } : {}),
                    ...(meta.url ? { url: meta.url } : {}),
                  });
                  if (meta.url && tab.id === activeId) setOmnibox(meta.url);
                }}
                registerNav={(nav) => {
                  navs.current[tab.id] = nav;
                }}
              />
            )}
          </div>
        ))}
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function displayUrl(tab: Tab) {
  return tab.kind === "new" ? "" : tab.url;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}