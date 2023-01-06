import path from "path";

export const pathFromRoot = (pathToFile) => {
  const { __dirname } = getFileDirGlobals(import.meta);
  return path.resolve(__dirname, pathToFile);
};
