import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [html, css, engineSource, watchlistSource, appSource, liveSource, alertsSource, alertsUiSource, portfolioSource, positionsUiSource, macroSource, macroUiSource] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "styles.css"), "utf8"),
  readFile(resolve(root, "src/engine.js"), "utf8"),
  readFile(resolve(root, "src/watchlist.js"), "utf8"),
  readFile(resolve(root, "src/app.js"), "utf8"),
  readFile(resolve(root, "src/live.js"), "utf8"),
  readFile(resolve(root, "src/alerts.js"), "utf8"),
  readFile(resolve(root, "src/alerts-ui.js"), "utf8"),
  readFile(resolve(root, "src/portfolio.js"), "utf8"),
  readFile(resolve(root, "src/positions-ui.js"), "utf8"),
  readFile(resolve(root, "src/macro.js"), "utf8"),
  readFile(resolve(root, "src/macro-ui.js"), "utf8")
]);

const withoutExports = source => source.replace(/^export\s+/gm, "");
const withoutImports = source => source.replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];\s*$/gm, "");
const engine = `const ChiefEngine = (() => {\n${withoutExports(engineSource)}\nreturn { evaluateSetup };\n})();`;
const watchlist = `const ChiefWatchlist = (() => {\n${withoutExports(watchlistSource)}\nreturn { ACTIVE_WATCHLIST, WATCHLIST_VERSION, exportWatchlist, getMarketSignal, getWatchlistSignal, groupWatchlist, mergeWatchlists, migrateLegacyWatchlist, parseWatchlist };\n})();`;
const app = `(() => {\nconst { evaluateSetup } = ChiefEngine;\nconst { journalContextAt } = ChiefMacro;\nconst { ACTIVE_WATCHLIST, WATCHLIST_VERSION, exportWatchlist, getMarketSignal, getWatchlistSignal, groupWatchlist, mergeWatchlists, migrateLegacyWatchlist, parseWatchlist } = ChiefWatchlist;\n${withoutImports(appSource)}\n})();`;
const alerts = `const ChiefAlerts = (() => {\n${withoutExports(alertsSource)}\nreturn { buildAlertDefinitions, advanceAlert, confirmAlert, freshAlertPrice };\n})();`;
const alertsUi = `(() => {\nconst { buildAlertDefinitions, advanceAlert, confirmAlert, freshAlertPrice } = ChiefAlerts;\n${withoutImports(alertsUiSource)}\n})();`;
const portfolio = `const ChiefPortfolio = (() => {\n${withoutExports(portfolioSource)}\nreturn { openPosition, recordExit, positionResult, portfolioRisk, journalStatistics };\n})();`;
const positionsUi = `(() => {\nconst { openPosition, recordExit, positionResult, portfolioRisk, journalStatistics } = ChiefPortfolio;\n${withoutImports(positionsUiSource)}\n})();`;
const macro = `const ChiefMacro = (() => {\n${withoutExports(macroSource)}\nreturn { createCatalyst, publishCatalyst, applyCatalystToPlan, journalContextAt };\n})();`;
const macroUi = `(() => {\nconst { createCatalyst, publishCatalyst } = ChiefMacro;\n${withoutImports(macroUiSource)}\n})();`;
new Function(`${engine}\n${watchlist}\n${macro}\n${app}\n${liveSource}\n${alerts}\n${alertsUi}\n${portfolio}\n${positionsUi}\n${macroUi}`);

const stylesheetTag = '<link rel="stylesheet" href="styles.css">';
const scriptTag = '<script type="module" src="src/app.js"></script>';
const positionsTag = '<script type="module" src="src/positions-ui.js"></script>';
const macroTag = '<script type="module" src="src/macro-ui.js"></script>';
if (!html.includes(stylesheetTag) || !html.includes(scriptTag) || !html.includes(positionsTag) || !html.includes(macroTag)) {
  throw new Error("Erwartete CSS oder JavaScript Referenz fehlt in index.html");
}

const portable = html
  .replace(stylesheetTag, `<style>\n${css}\n</style>`)
  .replace(scriptTag, `<script>\n${engine}\n${watchlist}\n${macro}\n${app}\n${liveSource}\n${alerts}\n${alertsUi}\n${portfolio}\n${positionsUi}\n${macroUi}\n</script>`)
  .replace(/^\s*<script type="module" src="src\/positions-ui\.js"><\/script>\s*$/m, "")
  .replace(/^\s*<script type="module" src="src\/macro-ui\.js"><\/script>\s*$/m, "");

const output = resolve(root, "dist/Investment-Chief.html");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, portable, "utf8");
console.log(`Portable Anwendung erstellt: ${output}`);
