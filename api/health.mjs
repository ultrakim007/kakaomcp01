import { handleHealth } from "../lib/apiHandlers.mjs";

export default function handler(req, res) {
  return handleHealth(req, res);
}
