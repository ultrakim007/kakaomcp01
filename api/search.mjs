import { handleSearch } from "../lib/apiHandlers.mjs";

export default async function handler(req, res) {
  return handleSearch(req, res);
}
