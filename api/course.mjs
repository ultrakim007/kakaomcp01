import { handleCourse } from "../lib/apiHandlers.mjs";

export default async function handler(req, res) {
  return handleCourse(req, res);
}
