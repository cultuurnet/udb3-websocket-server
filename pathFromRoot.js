import path from "path";
import { getFileDirGlobals } from "./getFileDirGlobals.js";

export const pathFromRoot = (pathToFile) => {
  const { __dirname } = getFileDirGlobals(import.meta);
  return path.resolve(__dirname, pathToFile);
};
