import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [html, css, engineSource, watchlistSource, appSource, liveSource] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "styles.css"), "utf8"),
  readFile(resolve(root, "src/engine.js"), "utf8"),
  readFile(resolve(root, "src/watchlist.js"), "utf8"),
  readFile(resolve(root, "src/app.js"), "utf8"),
  readFile(resolve(root, "src/live.js"), "utf8")
]);

const withoutExports = source => source.replace(/^export\s+/gm, "");
const withoutImports = source => source.replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];\s*$/gm, "");
const engine = `const ChiefEngine = (() => {\n${withoutExports(engineSource)}\nreturn { evaluateSetup };\n})();`;
const watchlist = `const ChiefWatchlist = (() => {\n${withoutExports(watchlistSource)}\nreturn { ACTIVE_WATCHLIST, WATCHLIST_VERSION, exportWatchlist, getMarketSignal, getWatchlistSignal, groupWatchlist, mergeWatchlists, parseWatchlist };\n})();`;
const app = `(() => {\nconst { evaluateSetup } = ChiefEngine;\nconst { ACTIVE_WATCHLIST, WATCHLIST_VERSION, exportWatchlist, getMarketSignal, getWatchlistSignal, groupWatchlist, mergeWatchlists, parseWatchlist } = ChiefWatchlist;\n${withoutImports(appSource)}\n})();`;
new Function(`${engine}\n${watchlist}\n${app}\n${liveSource}`);

const stylesheetTag = '<link rel="stylesheet" href="styles.css">';
const scriptTag = '<script type="module" src="src/app.js"></script>';
if (!html.includes(stylesheetTag) || !html.includes(scriptTag)) {
  throw new Error("Erwartete CSS oder JavaScript Referenz fehlt in index.html");
}

const portable = html
  .replace(stylesheetTag, `<style>\n${css}\n</style>`)
  .replace(scriptTag, `<script>\n${engine}\n${watchlist}\n${app}\n${liveSource}\n</script>`);

const output = resolve(root, "dist/Investment-Chief.html");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, portable, "utf8");
console.log(`Portable Anwendung erstellt: ${output}`);
