import {
  DEMO_PLACES,
  getDirectionCourse,
  getStaticMapAsset,
  searchPlaces,
} from "./kakaoClient.mjs";

export function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function getQueryParams(req) {
  const url = new URL(req.url || "/", "http://localhost");
  return url.searchParams;
}

function isValidCoord(value) {
  if (value === null || value === undefined || value === "") return false;
  const num = Number(value);
  return Number.isFinite(num);
}

function defaultApiKey() {
  return (process.env.KAKAO_REST_API_KEY || "").trim();
}

export function handleHealth(_req, res, getApiKey = defaultApiKey) {
  const apiKey = getApiKey();
  return sendJson(res, 200, {
    ok: true,
    mode: apiKey ? "live" : "demo",
    presets: [
      {
        label: "잠실역 → 올림픽공원",
        start: DEMO_PLACES[0],
        end: DEMO_PLACES[1],
      },
      {
        label: "판교역 → 탄천 산책로",
        start: DEMO_PLACES[2],
        end: DEMO_PLACES[3],
      },
      {
        label: "여의나루역 → 여의도 한강공원",
        start: DEMO_PLACES[4],
        end: DEMO_PLACES[5],
      },
      {
        label: "광화문역 → 청계천",
        start: DEMO_PLACES[6],
        end: DEMO_PLACES[7],
      },
    ],
  });
}

export async function handleSearch(req, res, getApiKey = defaultApiKey) {
  try {
    const params = getQueryParams(req);
    const query = params.get("query") || "";
    const result = await searchPlaces(query, getApiKey());
    return sendJson(res, 200, result);
  } catch (err) {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    return sendJson(res, status, {
      error: err.message || "장소 검색 중 오류가 발생했습니다.",
    });
  }
}

export async function handleCourse(req, res, getApiKey = defaultApiKey) {
  try {
    const params = getQueryParams(req);
    const startX = params.get("startX");
    const startY = params.get("startY");
    const endX = params.get("endX");
    const endY = params.get("endY");
    const sName = params.get("sName") || "출발지";
    const eName = params.get("eName") || "도착지";
    const walkMode = params.get("walkMode") || "ACCESSIBLE";
    const bikeMode = params.get("bikeMode") || "BIKE_ONLY";

    if (
      !isValidCoord(startX) ||
      !isValidCoord(startY) ||
      !isValidCoord(endX) ||
      !isValidCoord(endY)
    ) {
      return sendJson(res, 400, {
        error: "출발지와 도착지 좌표가 올바르지 않습니다. 장소를 다시 선택해 주세요.",
      });
    }

    const apiKey = getApiKey();
    const [walk, bike] = await Promise.all([
      getDirectionCourse(
        {
          startX,
          startY,
          endX,
          endY,
          sName,
          eName,
          transportType: "walk",
          routeMode: walkMode,
        },
        apiKey
      ),
      getDirectionCourse(
        {
          startX,
          startY,
          endX,
          endY,
          sName,
          eName,
          transportType: "bike",
          routeMode: bikeMode,
        },
        apiKey
      ),
    ]);

    return sendJson(res, 200, {
      mode: apiKey ? "live" : "demo",
      origin: { name: sName, x: startX, y: startY },
      destination: { name: eName, x: endX, y: endY },
      walk,
      bike,
    });
  } catch (err) {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    return sendJson(res, status, {
      error: err.message || "경로 조회 중 오류가 발생했습니다.",
    });
  }
}

export async function handleStaticMap(req, res, getApiKey = defaultApiKey) {
  try {
    const params = getQueryParams(req);
    const startX = params.get("startX");
    const startY = params.get("startY");
    const endX = params.get("endX");
    const endY = params.get("endY");
    const sName = params.get("sName") || "출발지";
    const eName = params.get("eName") || "도착지";

    if (
      !isValidCoord(startX) ||
      !isValidCoord(startY) ||
      !isValidCoord(endX) ||
      !isValidCoord(endY)
    ) {
      return sendJson(res, 400, { error: "지도 좌표가 올바르지 않습니다." });
    }

    const asset = await getStaticMapAsset(
      { startX, startY, endX, endY, sName, eName },
      getApiKey()
    );
    res.writeHead(200, {
      "Content-Type": asset.contentType,
      "Cache-Control": "public, max-age=300",
    });
    return res.end(asset.buffer);
  } catch (err) {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    return sendJson(res, status, {
      error: err.message || "정적 지도를 불러오는 중 오류가 발생했습니다.",
    });
  }
}
