import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [html, css, engineSource, watchlistSource, appSource] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "styles.css"), "utf8"),
  readFile(resolve(root, "src/engine.js"), "utf8"),
  readFile(resolve(root, "src/watchlist.js"), "utf8"),
  readFile(resolve(root, "src/app.js"), "utf8")
]);

const withoutExports = source => source.replace(/^export\s+/gm, "");
const withoutImports = source => source.replace(/^import\s+.*?;\s*$/gm, "");
const engine = `const ChiefEngine = (() => {
${withoutExports(engineSource)}
return { evaluateSetup };
})();`;
const watchlist = `const ChiefWatchlist = (() => {
${withoutExports(watchlistSource)}
return { exportWatchlist, getWatchlistSignal, mergeWatchlists, parseWatchlist, SEED_WATCHLIST };
})();`;
const app = `(() => {
const { evaluateSetup } = ChiefEngine;
const { exportWatchlist, getWatchlistSignal, mergeWatchlists, parseWatchlist, SEED_WATCHLIST } = ChiefWatchlist;
${withoutImports(appSource)}
})();`;
new Function(`${engine}\n${watchlist}\n${app}`);

const stylesheetTag = '<link rel="stylesheet" href="styles.css">';
const scriptTag = '<script type="module" src="src/app.js"></script>';
if (!html.includes(stylesheetTag) || !html.includes(scriptTag)) {
  throw new Error("Erwartete CSS oder JavaScript Referenz fehlt in index.html");
}

const portable = html
  .replace(stylesheetTag, `<style>\n${css}\n</style>`)
  .replace(scriptTag, `<script>\n${engine}\n${watchlist}\n${app}\n</script>`);

const output = resolve(root, "dist/Investment-Chief.html");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, portable, "utf8");
console.log(`Portable Anwendung erstellt: ${output}`);
