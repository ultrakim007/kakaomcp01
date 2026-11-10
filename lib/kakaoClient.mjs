import fs from "node:fs";
import path from "node:path";

const KAKAO_API_BASE = "https://dapi.kakao.com";

export const VALID_WALK_MODES = new Set(["ACCESSIBLE", "BROAD_FIRST", "SHORTEST"]);
export const VALID_BIKE_MODES = new Set(["BIKE_ONLY", "ACCESSIBLE", "SHORTEST"]);

/**
 * Load simple KEY=VALUE pairs from a .env file into process.env if not already set.
 */
export function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

/**
 * Built-in senior-friendly sample places so the app works immediately in demo mode.
 */
export const DEMO_PLACES = [
  {
    id: "demo-jamsil",
    placeName: "잠실역 2호선",
    categoryName: "교통,수송 > 지하철,전철",
    addressName: "서울 송파구 신천동 8",
    roadAddressName: "서울 송파구 올림픽로 265",
    x: "127.1001",
    y: "37.5133",
    placeUrl: "https://place.map.kakao.com/21160803",
  },
  {
    id: "demo-olympic",
    placeName: "올림픽공원 평화의광장",
    categoryName: "여행 > 공원 > 도시근린공원",
    addressName: "서울 송파구 방이동 88-2",
    roadAddressName: "서울 송파구 올림픽로 424",
    x: "127.1157",
    y: "37.5186",
    placeUrl: "https://place.map.kakao.com/7896266",
  },
  {
    id: "demo-pangyo",
    placeName: "판교역 신분당선",
    categoryName: "교통,수송 > 지하철,전철",
    addressName: "경기 성남시 분당구 백현동 534",
    roadAddressName: "경기 성남시 분당구 판교역로 160",
    x: "127.1112",
    y: "37.3948",
    placeUrl: "https://place.map.kakao.com/17565772",
  },
  {
    id: "demo-tancheon",
    placeName: "탄천 산책로(서현교)",
    categoryName: "여행 > 공원 > 산책로",
    addressName: "경기 성남시 분당구 서현동",
    roadAddressName: "경기 성남시 분당구 탄천로",
    x: "127.1263",
    y: "37.3865",
    placeUrl: "https://map.kakao.com/",
  },
  {
    id: "demo-yeouinaru",
    placeName: "여의나루역 5호선",
    categoryName: "교통,수송 > 지하철,전철",
    addressName: "서울 영등포구 여의도동 84-4",
    roadAddressName: "서울 영등포구 여의동로 343",
    x: "126.9329",
    y: "37.5271",
    placeUrl: "https://place.map.kakao.com/21160711",
  },
  {
    id: "demo-yeouido-park",
    placeName: "여의도 한강공원 물빛광장",
    categoryName: "여행 > 공원 > 한강공원",
    addressName: "서울 영등포구 여의도동 84-9",
    roadAddressName: "서울 영등포구 여의동로 330",
    x: "126.9242",
    y: "37.5301",
    placeUrl: "https://place.map.kakao.com/18577297",
  },
  {
    id: "demo-gwanghwamun",
    placeName: "광화문역 5호선",
    categoryName: "교통,수송 > 지하철,전철",
    addressName: "서울 종로구 세종로 1-68",
    roadAddressName: "서울 종로구 세종대로 172",
    x: "126.9769",
    y: "37.5716",
    placeUrl: "https://place.map.kakao.com/21160604",
  },
  {
    id: "demo-cheonggyecheon",
    placeName: "청계천 청계광장",
    categoryName: "여행 > 관광,명소 > 하천",
    addressName: "서울 종로구 서린동 14-1",
    roadAddressName: "서울 중구 태평로1가 1",
    x: "126.9779",
    y: "37.5691",
    placeUrl: "https://place.map.kakao.com/10421599",
  },
];

/**
 * Shared Kakao REST API JSON fetcher.
 */
async function fetchKakaoJson(url, apiKey) {
  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${apiKey}`,
    },
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    const error = new Error(`Kakao API 요청 실패 (HTTP ${response.status}): ${bodyText}`);
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Search places in South Korea via Kakao Local Keyword Search API (or demo presets).
 */
export async function searchPlaces(query, apiKey) {
  const trimmed = String(query || "").trim();
  if (!trimmed) {
    return { mode: apiKey ? "live" : "demo", places: [] };
  }

  if (!apiKey) {
    const lower = trimmed.toLowerCase();
    const matched = DEMO_PLACES.filter(
      (p) =>
        p.placeName.toLowerCase().includes(lower) ||
        p.addressName.toLowerCase().includes(lower) ||
        p.roadAddressName.toLowerCase().includes(lower)
    );
    return {
      mode: "demo",
      places: matched.length > 0 ? matched : DEMO_PLACES.slice(0, 4),
    };
  }

  const params = new URLSearchParams({
    query: trimmed,
    size: "7",
  });
  const data = await fetchKakaoJson(
    `${KAKAO_API_BASE}/v2/local/search/keyword.json?${params.toString()}`,
    apiKey
  );

  const places = (data.documents || []).map((doc) => ({
    id: doc.id,
    placeName: doc.place_name,
    categoryName: doc.category_name,
    addressName: doc.address_name,
    roadAddressName: doc.road_address_name,
    x: doc.x,
    y: doc.y,
    placeUrl: doc.place_url,
  }));

  return { mode: "live", places };
}

/**
 * Compute senior-friendly 30-minute health goal metrics from route distance & duration.
 */
export function calculateHealthStats(distanceMeters, timeSeconds, transportType) {
  const safeDistance = Math.max(0, Number(distanceMeters) || 0);
  const safeSeconds = Math.max(0, Number(timeSeconds) || 0);
  const minutes = Math.max(1, Math.round(safeSeconds / 60));
  const goalMinutes = 30;
  const goalPercent = Math.min(100, Math.round((minutes / goalMinutes) * 100));

  // Average adult walking stride ~0.72m; cycling burns ~5.5 kcal/min, walking ~3.8 kcal/min
  const estimatedSteps = transportType === "walk" ? Math.round(safeDistance / 0.72) : 0;
  const kcalPerMinute = transportType === "bike" ? 5.5 : 3.8;
  const estimatedKcal = Math.round(minutes * kcalPerMinute);

  let goalLabel = "가볍게 몸 풀기 좋은 코스예요!";
  if (minutes >= 25 && minutes <= 40) {
    goalLabel = "오늘의 30분 건강 목표에 딱 맞아요!";
  } else if (minutes > 40) {
    goalLabel = "든든한 장거리 유산소 코스예요! 물 챙기세요!";
  }

  return {
    distanceMeters: safeDistance,
    distanceKm: Number((safeDistance / 1000).toFixed(2)),
    timeSeconds: safeSeconds,
    minutes,
    goalMinutes,
    goalPercent,
    estimatedSteps,
    estimatedKcal,
    goalLabel,
  };
}

/**
 * Flatten route legs/steps into concise, readable guidance items for seniors.
 */
function extractSteps(route) {
  const legs = route?.legs || [];
  const items = [];
  for (const leg of legs) {
    for (const step of leg.steps || []) {
      const props = step.properties || {};
      items.push({
        guidance: props.guidance || "길을 따라 직진하세요",
        distance: props.distance || 0,
        time: props.time || 0,
        points: step.path?.points || [],
      });
    }
  }
  return items;
}

/**
 * Build a great-circle approximate distance (in meters) for realistic demo calculations.
 */
function haversineMeters(lon1, lat1, lon2, lat2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Generate a realistic demo route response when no Kakao API key is set yet.
 */
function buildDemoRoute({ startX, startY, endX, endY, sName, eName, transportType, routeMode }) {
  const sx = Number(startX);
  const sy = Number(startY);
  const ex = Number(endX);
  const ey = Number(endY);
  const direct = Math.max(450, haversineMeters(sx, sy, ex, ey));

  const detourFactor =
    routeMode === "SHORTEST" ? 1.18 : routeMode === "ACCESSIBLE" ? 1.32 : 1.25;
  const totalDistance = Math.round(direct * detourFactor);
  // Walk speed ~1.12 m/s (~4 km/h), bike speed ~3.6 m/s (~13 km/h)
  const speed = transportType === "bike" ? 3.6 : 1.12;
  const totalTime = Math.round(totalDistance / speed);

  const midX = Number(((sx + ex) / 2 + 0.0012).toFixed(6));
  const midY = Number(((sy + ey) / 2 + 0.0009).toFixed(6));
  const linkKind = transportType === "bike" ? "bicycle" : "walk";
  const landingUrl = `https://map.kakao.com/link/by/${linkKind}/${encodeURIComponent(
    sName
  )},${sy},${sx}/${encodeURIComponent(eName)},${ey},${ex}`;

  const steps =
    transportType === "bike"
      ? [
          {
            guidance: `${sName} 부근 자전거도로 진입 후 직진`,
            distance: Math.round(totalDistance * 0.35),
            time: Math.round(totalTime * 0.35),
            points: [
              [sx, sy],
              [midX, midY],
            ],
          },
          {
            guidance: "안전 횡단보도 건너 공원 자전거길 따라 이동",
            distance: Math.round(totalDistance * 0.4),
            time: Math.round(totalTime * 0.4),
            points: [
              [midX, midY],
              [(midX + ex) / 2, (midY + ey) / 2],
            ],
          },
          {
            guidance: `${eName} 입구 자전거 거치대 앞 도착`,
            distance: Math.round(totalDistance * 0.25),
            time: Math.round(totalTime * 0.25),
            points: [
              [(midX + ex) / 2, (midY + ey) / 2],
              [ex, ey],
            ],
          },
        ]
      : [
          {
            guidance: `${sName} 출구에서 횡단보도 방향으로 천천히 출발`,
            distance: Math.round(totalDistance * 0.3),
            time: Math.round(totalTime * 0.3),
            points: [
              [sx, sy],
              [midX, midY],
            ],
          },
          {
            guidance:
              routeMode === "ACCESSIBLE"
                ? "계단 없는 평지 보행로를 따라 편안하게 이동"
                : "넓은 보행자 도로와 가로수길을 따라 이동",
            distance: Math.round(totalDistance * 0.45),
            time: Math.round(totalTime * 0.45),
            points: [
              [midX, midY],
              [(midX + ex) / 2, (midY + ey) / 2],
            ],
          },
          {
            guidance: `${eName} 앞 도착! 가볍게 스트레칭으로 마무리하세요`,
            distance: Math.round(totalDistance * 0.25),
            time: Math.round(totalTime * 0.25),
            points: [
              [(midX + ex) / 2, (midY + ey) / 2],
              [ex, ey],
            ],
          },
        ];

  return {
    status: "OK",
    routeMode,
    landingUrl,
    stats: calculateHealthStats(totalDistance, totalTime, transportType),
    steps,
  };
}

/**
 * Fetch walk or bike route from Kakao Map Routing REST API (or demo fallback).
 */
export async function getDirectionCourse(
  { startX, startY, endX, endY, sName, eName, transportType, routeMode },
  apiKey
) {
  const safeType = transportType === "bike" ? "bike" : "walk";
  const validSet = safeType === "bike" ? VALID_BIKE_MODES : VALID_WALK_MODES;
  const safeMode = validSet.has(routeMode)
    ? routeMode
    : safeType === "bike"
      ? "BIKE_ONLY"
      : "ACCESSIBLE";

  if (!apiKey) {
    return buildDemoRoute({
      startX,
      startY,
      endX,
      endY,
      sName: sName || "출발지",
      eName: eName || "도착지",
      transportType: safeType,
      routeMode: safeMode,
    });
  }

  const endpoint = safeType === "bike" ? "/v2/routing/bicycle" : "/v2/routing/walk";
  const params = new URLSearchParams({
    start_x: String(startX),
    start_y: String(startY),
    end_x: String(endX),
    end_y: String(endY),
    s_name: sName || "출발",
    e_name: eName || "도착",
    route_mode: safeMode,
  });

  const data = await fetchKakaoJson(`${KAKAO_API_BASE}${endpoint}?${params.toString()}`, apiKey);

  if (data.status !== "OK" || !data.route) {
    return {
      status: data.status || "ROUTE_RESULT_NOT_FOUND",
      routeMode: safeMode,
      landingUrl: `https://map.kakao.com/link/by/${
        safeType === "bike" ? "bicycle" : "walk"
      }/${encodeURIComponent(sName || "출발")},${startY},${startX}/${encodeURIComponent(
        eName || "도착"
      )},${endY},${endX}`,
      stats: calculateHealthStats(0, 0, safeType),
      steps: [],
    };
  }

  const props = data.route.properties || {};
  return {
    status: "OK",
    routeMode: safeMode,
    landingUrl: props.landingUrl,
    stats: calculateHealthStats(props.totalDistance, props.totalTime, safeType),
    steps: extractSteps(data.route),
  };
}

/**
 * Fetch static map PNG from Kakao Static Map API, or generate a crisp SVG fallback in demo mode.
 */
export async function getStaticMapAsset({ startX, startY, endX, endY, sName, eName }, apiKey) {
  if (!apiKey) {
    const safeStart = escapeXml(sName || "출발지");
    const safeEnd = escapeXml(eName || "도착지");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e8f5ee"/>
      <stop offset="100%" stop-color="#e3f1fb"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" rx="20" fill="url(#bg)"/>
  <g stroke="#cde3d6" stroke-width="1">
    <line x1="0" y1="90" x2="640" y2="90"/>
    <line x1="0" y1="180" x2="640" y2="180"/>
    <line x1="0" y1="270" x2="640" y2="270"/>
    <line x1="160" y1="0" x2="160" y2="360"/>
    <line x1="320" y1="0" x2="320" y2="360"/>
    <line x1="480" y1="0" x2="480" y2="360"/>
  </g>
  <path d="M 115 250 C 220 245, 250 130, 340 155 C 425 178, 455 110, 525 110"
        fill="none" stroke="#15803d" stroke-width="8" stroke-linecap="round" stroke-dasharray="14 10"/>
  <circle cx="115" cy="250" r="18" fill="#15803d" stroke="#ffffff" stroke-width="4"/>
  <text x="115" y="256" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">출</text>
  <rect x="30" y="276" width="170" height="34" rx="10" fill="#ffffff" opacity="0.95"/>
  <text x="115" y="298" font-family="sans-serif" font-size="13" font-weight="bold" fill="#14532d" text-anchor="middle">${safeStart}</text>
  <circle cx="525" cy="110" r="18" fill="#0369a1" stroke="#ffffff" stroke-width="4"/>
  <text x="525" y="116" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">도</text>
  <rect x="435" y="54" width="180" height="34" rx="10" fill="#ffffff" opacity="0.95"/>
  <text x="525" y="76" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0c4a6e" text-anchor="middle">${safeEnd}</text>
  <rect x="18" y="16" width="340" height="32" rx="16" fill="#ffffff" opacity="0.94"/>
  <text x="34" y="37" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b" text-anchor="start">체험 모드 미리보기 지도 (API 키 연결 시 실제 지도)</text>
</svg>`;
    return {
      contentType: "image/svg+xml; charset=utf-8",
      buffer: Buffer.from(svg, "utf8"),
    };
  }

  const params = new URLSearchParams({
    size: "640x360",
    scale: "2",
    format: "png",
    logo_pos: "BOTTOM_RIGHT",
  });
  params.append("markers", `location:${startX},${startY}|option:false`);
  params.append("markers", `location:${endX},${endY}|option:false`);

  const response = await fetch(`${KAKAO_API_BASE}/v2/maps/staticmap?${params.toString()}`, {
    headers: {
      Authorization: `KakaoAK ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`정적 지도 조회 실패 (HTTP ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    contentType: response.headers.get("content-type") || "image/png",
    buffer: Buffer.from(arrayBuffer),
  };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .slice(0, 14);
}
