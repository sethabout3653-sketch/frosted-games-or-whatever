import { ArrowLeft, Expand, RotateCw } from "lucide-react";
import { useRef } from "react";

import { gameEntry } from "@/lib/games";

type Props = {
  directory: string;
  name: string;
  onBack: () => void;
};

export function GameView({ directory, name, onBack }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Library
        </button>
        <span className="truncate text-xs text-muted-foreground">{name}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            aria-label="Reload game"
            onClick={() => {
              if (frameRef.current) frameRef.current.src = gameEntry(directory);
            }}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            aria-label="Fullscreen"
            onClick={() => frameRef.current?.requestFullscreen?.()}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>
      <iframe
        ref={frameRef}
        src={gameEntry(directory)}
        title={name}
        className="h-full w-full flex-1 border-0 bg-background"
        allow="fullscreen; autoplay; gamepad; pointer-lock"
      />
    </div>
  );
}