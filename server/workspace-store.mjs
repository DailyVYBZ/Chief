import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { validateWorkspaceData } from "../src/workspace.js";

const emptyData = () => ({ watchlist: [], journal: [], positions: [], riskSettings: {}, macroEvents: [], alertStates: {}, alertHistory: [] });

export function createWorkspaceStore(path) {
  let queue = Promise.resolve();
  async function read() {
    try {
      const item = JSON.parse(await readFile(path, "utf8"));
      return { revision: item.revision, updatedAt: item.updatedAt, data: validateWorkspaceData(item.data) };
    } catch (error) {
      if (error.code === "ENOENT") return { revision: 0, updatedAt: null, data: emptyData() };
      throw error;
    }
  }
  return {
    read,
    save(baseRevision, input) {
      const operation = queue.then(async () => {
        const current = await read();
        if (!Number.isSafeInteger(baseRevision) || baseRevision !== current.revision) {
          return { conflict: true, current };
        }
        const next = { revision: current.revision + 1, updatedAt: new Date().toISOString(), data: validateWorkspaceData(input) };
        await mkdir(dirname(path), { recursive: true });
        const temporary = `${path}.${process.pid}.tmp`;
        await writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
        await rename(temporary, path);
        return { conflict: false, current: next };
      });
      queue = operation.catch(() => {});
      return operation;
    }
  };
}
