import test from "node:test";
import assert from "node:assert/strict";
import { calculateHealthStats } from "../lib/kakaoClient.mjs";
import { createAppServer } from "../server.mjs";

async function startTestServer() {
  const server = createAppServer({ getApiKey: () => "" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${addr.port}`,
  };
}

test("calculateHealthStats computes 30-min health goal metrics accurately", () => {
  const walkStats = calculateHealthStats(1800, 1800, "walk");
  assert.equal(walkStats.minutes, 30);
  assert.equal(walkStats.goalPercent, 100);
  assert.equal(walkStats.distanceKm, 1.8);
  assert.equal(walkStats.estimatedSteps, 2500);
  assert.ok(walkStats.estimatedKcal > 0);

  const bikeStats = calculateHealthStats(6000, 1800, "bike");
  assert.equal(bikeStats.minutes, 30);
  assert.equal(bikeStats.estimatedSteps, 0);
  assert.equal(bikeStats.estimatedKcal, 165);
});

test("HTTP endpoints work in demo mode and reject invalid inputs", async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.ok, true);
    assert.equal(healthData.mode, "demo");
    assert.equal(healthData.presets.length, 4);

    const searchRes = await fetch(`${baseUrl}/api/search?query=${encodeURIComponent("잠실")}`);
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.ok(searchData.places.some((p) => p.placeName.includes("잠실")));

    const badCourseRes = await fetch(`${baseUrl}/api/course?startX=abc&startY=37&endX=127&endY=37`);
    assert.equal(badCourseRes.status, 400);

    const courseRes = await fetch(
      `${baseUrl}/api/course?startX=127.1001&startY=37.5133&endX=127.1157&endY=37.5186&sName=${encodeURIComponent(
        "잠실역"
      )}&eName=${encodeURIComponent("올림픽공원")}`
    );
    assert.equal(courseRes.status, 200);
    const courseData = await courseRes.json();
    assert.equal(courseData.walk.status, "OK");
    assert.equal(courseData.bike.status, "OK");
    assert.ok(courseData.walk.steps.length > 0);
    assert.ok(courseData.walk.landingUrl.includes("map.kakao.com"));

    const mapRes = await fetch(
      `${baseUrl}/api/staticmap?startX=127.1001&startY=37.5133&endX=127.1157&endY=37.5186`
    );
    assert.equal(mapRes.status, 200);
    assert.ok(mapRes.headers.get("content-type").includes("image/svg+xml"));

    const traversalRes = await fetch(`${baseUrl}/../package.json`);
    assert.notEqual(traversalRes.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
