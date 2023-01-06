import fs from "fs/promises";
import { pathFromRoot } from "./pathFromRoot.js";

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
export const indexPageHandler = async (req, res) => {
  const indexFilePath = pathFromRoot("index.html");
  const html = await fs.readFile(indexFilePath);
  res.statusCode = 200;
  res.write(html);
  res.end();
};
