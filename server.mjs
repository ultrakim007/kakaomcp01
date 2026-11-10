import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnvFile } from "./lib/kakaoClient.mjs";
import {
  handleCourse,
  handleHealth,
  handleSearch,
  handleStaticMap,
  sendJson,
} from "./lib/apiHandlers.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
};

/**
 * Create the Node (req, res) request handler for both local HTTP and Vercel runtime.
 */
export function createRequestHandler({
  publicDir = path.join(__dirname, "public"),
  getApiKey = () => (process.env.KAKAO_REST_API_KEY || "").trim(),
} = {}) {
  const resolvedPublicDir = path.resolve(publicDir);

  return async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const pathname = requestUrl.pathname;

      if (req.method === "GET" && pathname === "/api/health") {
        return handleHealth(req, res, getApiKey);
      }

      if (req.method === "GET" && pathname === "/api/search") {
        return await handleSearch(req, res, getApiKey);
      }

      if (req.method === "GET" && pathname === "/api/course") {
        return await handleCourse(req, res, getApiKey);
      }

      if (req.method === "GET" && pathname === "/api/staticmap") {
        return await handleStaticMap(req, res, getApiKey);
      }

      if (req.method !== "GET" && req.method !== "HEAD") {
        return sendJson(res, 405, { error: "지원하지 않는 요청 방식입니다." });
      }

      const relPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
      const filePath = path.resolve(resolvedPublicDir, relPath);
      if (!filePath.startsWith(resolvedPublicDir + path.sep) && filePath !== resolvedPublicDir) {
        return sendJson(res, 403, { error: "접근할 수 없는 경로입니다." });
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return sendJson(res, 404, { error: "요청하신 페이지를 찾을 수 없습니다." });
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      });
      if (req.method === "HEAD") {
        return res.end();
      }
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
      sendJson(res, status, {
        error: err.message || "서버 처리 중 문제가 발생했습니다.",
      });
    }
  };
}

/**
 * Create the HTTP server for the Kakao Map 30-Minute Health Course web app.
 */
export function createAppServer(options) {
  return http.createServer(createRequestHandler(options));
}

const defaultHandler = createRequestHandler();
export default defaultHandler;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadEnvFile(path.join(__dirname, ".env"));
  const port = Number(process.env.PORT) || 3000;
  const server = createAppServer();
  server.listen(port, () => {
    const mode = process.env.KAKAO_REST_API_KEY
      ? "실시간 카카오맵 API 모드"
      : "체험 모드 (API 키 미설정)";
    console.log(`[오늘의 30분 건강 코스 메이커] 실행 중: http://localhost:${port} (${mode})`);
  });
}
