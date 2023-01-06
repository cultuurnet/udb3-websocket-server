import fs from "fs/promises";
import { pathFromRoot } from "./pathFromRoot.js";

const getJSON = async (fileName) => {
  const configPath = pathFromRoot(fileName);
  const fileText = await fs.readFile(configPath);

  return JSON.parse(fileText);
};

/**
 *
 * @returns {Promise<Record<string, unknown>>}
 */
export const readConfig = async () => {
  try {
    return await getJSON("config.json");
  } catch {
    return await getJSON("config.default.json");
  }
};
