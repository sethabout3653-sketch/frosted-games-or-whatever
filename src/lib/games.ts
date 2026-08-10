export type Game = {
  name: string;
  directory: string;
  image: string;
  recommended?: string;
};

/**
 * Lumin game source, hosted on jsDelivr. The CDN serves .html as text/plain,
 * so games are rendered through the /api/public/g/* passthrough route which
 * restores correct content types and rewrites root-relative asset paths.
 */
export const GAME_CDN = "https://cdn.jsdelivr.net/gh/selenite-cc/selenite-old@main";
export const GAME_PROXY = "/api/public/g";

export function gameEntry(directory: string) {
  return `${GAME_PROXY}/${directory}/index.html`;
}

export function gameCover(game: Game) {
  const image = game.image === "cover.svg" ? "index.jpg" : game.image;
  return `${GAME_CDN}/${game.directory}/${image}`;
}

export async function fetchGames(): Promise<Game[]> {
  const res = await fetch(`${GAME_CDN}/games.json`);
  if (!res.ok) throw new Error("Could not load the game library");
  const data = (await res.json()) as Game[];
  return data.filter((g) => g && g.name && g.directory);
}