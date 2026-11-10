import { handleStaticMap } from "../lib/apiHandlers.mjs";

export default async function handler(req, res) {
  return handleStaticMap(req, res);
}
