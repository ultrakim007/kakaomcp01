const state = {
  mode: "demo",
  presets: [],
  startPlace: null,
  endPlace: null,
  activeTab: "walk",
  courseData: null,
  speaking: false,
};

const el = {
  modeBadge: document.getElementById("modeBadge"),
  fontSizeToggle: document.getElementById("fontSizeToggle"),
  openGuideBtn: document.getElementById("openGuideBtn"),
  closeGuideBtn: document.getElementById("closeGuideBtn"),
  guideModal: document.getElementById("guideModal"),
  presetList: document.getElementById("presetList"),
  courseForm: document.getElementById("courseForm"),
  startInput: document.getElementById("startInput"),
  endInput: document.getElementById("endInput"),
  startSearchBtn: document.getElementById("startSearchBtn"),
  endSearchBtn: document.getElementById("endSearchBtn"),
  startSelectedInfo: document.getElementById("startSelectedInfo"),
  endSelectedInfo: document.getElementById("endSelectedInfo"),
  startResults: document.getElementById("startResults"),
  endResults: document.getElementById("endResults"),
  swapBtn: document.getElementById("swapBtn"),
  walkModeSelect: document.getElementById("walkModeSelect"),
  bikeModeSelect: document.getElementById("bikeModeSelect"),
  emptyState: document.getElementById("emptyState"),
  loadingState: document.getElementById("loadingState"),
  errorState: document.getElementById("errorState"),
  resultContent: document.getElementById("resultContent"),
  routePairTitle: document.getElementById("routePairTitle"),
  speakBtn: document.getElementById("speakBtn"),
  copyShareBtn: document.getElementById("copyShareBtn"),
  tabButtons: Array.from(document.querySelectorAll(".tab-btn")),
  singleModeView: document.getElementById("singleModeView"),
  compareModeView: document.getElementById("compareModeView"),
  healthCard: document.querySelector(".health-card"),
  healthBadge: document.getElementById("healthBadge"),
  healthGoalText: document.getElementById("healthGoalText"),
  mainMinutes: document.getElementById("mainMinutes"),
  goalPercentText: document.getElementById("goalPercentText"),
  goalProgressBar: document.getElementById("goalProgressBar"),
  metricDistance: document.getElementById("metricDistance"),
  metricThirdLabel: document.getElementById("metricThirdLabel"),
  metricThirdValue: document.getElementById("metricThirdValue"),
  metricKcal: document.getElementById("metricKcal"),
  kakaoMapLink: document.getElementById("kakaoMapLink"),
  staticMapImg: document.getElementById("staticMapImg"),
  stepsList: document.getElementById("stepsList"),
  cmpWalkMin: document.getElementById("cmpWalkMin"),
  cmpWalkDist: document.getElementById("cmpWalkDist"),
  cmpWalkSteps: document.getElementById("cmpWalkSteps"),
  cmpWalkKcal: document.getElementById("cmpWalkKcal"),
  cmpWalkGoal: document.getElementById("cmpWalkGoal"),
  cmpWalkLink: document.getElementById("cmpWalkLink"),
  cmpBikeMin: document.getElementById("cmpBikeMin"),
  cmpBikeDist: document.getElementById("cmpBikeDist"),
  cmpBikeKcal: document.getElementById("cmpBikeKcal"),
  cmpBikeGoal: document.getElementById("cmpBikeGoal"),
  cmpBikeLink: document.getElementById("cmpBikeLink"),
  toast: document.getElementById("toast"),
};

let toastTimer = null;

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.classList.add("hidden");
  }, 2600);
}

function setSelectedPlace(kind, place) {
  if (kind === "start") {
    state.startPlace = place;
    el.startInput.value = place.placeName;
    el.startSelectedInfo.textContent = `✓ 선택됨: ${place.roadAddressName || place.addressName}`;
    el.startResults.classList.add("hidden");
  } else {
    state.endPlace = place;
    el.endInput.value = place.placeName;
    el.endSelectedInfo.textContent = `✓ 선택됨: ${place.roadAddressName || place.addressName}`;
    el.endResults.classList.add("hidden");
  }
}

async function runPlaceSearch(kind) {
  const inputEl = kind === "start" ? el.startInput : el.endInput;
  const listEl = kind === "start" ? el.startResults : el.endResults;
  const query = inputEl.value.trim();

  if (!query) {
    showToast("찾고 싶은 장소 이름이나 동네를 먼저 적어 주세요!");
    inputEl.focus();
    return;
  }

  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    const places = data.places || [];

    listEl.innerHTML = "";
    if (places.length === 0) {
      const li = document.createElement("li");
      li.className = "search-item";
      li.textContent = "검색 결과가 없어요. 동네 이름과 함께 다시 적어 보세요.";
      listEl.appendChild(li);
      listEl.classList.remove("hidden");
      return;
    }

    for (const place of places) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-item";
      btn.innerHTML = `
        <span class="search-item-name"></span>
        <span class="search-item-addr"></span>
      `;
      btn.querySelector(".search-item-name").textContent = place.placeName;
      btn.querySelector(".search-item-addr").textContent =
        place.roadAddressName || place.addressName || "";
      btn.addEventListener("click", () => {
        setSelectedPlace(kind, place);
        markActivePreset(null);
      });
      li.appendChild(btn);
      listEl.appendChild(li);
    }

    listEl.classList.remove("hidden");
  } catch {
    showToast("장소를 찾는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
  }
}

function markActivePreset(activeIndex) {
  const chips = el.presetList.querySelectorAll(".preset-chip");
  chips.forEach((chip, idx) => {
    chip.classList.toggle("active", idx === activeIndex);
  });
}

function renderPresets() {
  el.presetList.innerHTML = "";
  state.presets.forEach((preset, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-chip";
    btn.textContent = preset.label;
    btn.addEventListener("click", () => {
      markActivePreset(idx);
      setSelectedPlace("start", preset.start);
      setSelectedPlace("end", preset.end);
      fetchCourse();
    });
    el.presetList.appendChild(btn);
  });
}

async function resolvePlaceIfNeeded(kind) {
  const existing = kind === "start" ? state.startPlace : state.endPlace;
  const inputVal = (kind === "start" ? el.startInput.value : el.endInput.value).trim();
  if (existing && existing.placeName === inputVal) {
    return existing;
  }
  if (!inputVal) return null;

  const res = await fetch(`/api/search?query=${encodeURIComponent(inputVal)}`);
  const data = await res.json();
  if (data.places && data.places.length > 0) {
    setSelectedPlace(kind, data.places[0]);
    return data.places[0];
  }
  return null;
}

async function fetchCourse() {
  stopSpeaking();
  el.emptyState.classList.add("hidden");
  el.errorState.classList.add("hidden");
  el.resultContent.classList.add("hidden");
  el.loadingState.classList.remove("hidden");

  try {
    const start = await resolvePlaceIfNeeded("start");
    const end = await resolvePlaceIfNeeded("end");

    if (!start || !end) {
      throw new Error("출발지와 도착지 장소를 모두 입력하거나 검색해서 선택해 주세요.");
    }

    const params = new URLSearchParams({
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      sName: start.placeName,
      eName: end.placeName,
      walkMode: el.walkModeSelect.value,
      bikeMode: el.bikeModeSelect.value,
    });

    const res = await fetch(`/api/course?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "경로를 불러오지 못했어요.");
    }

    state.courseData = data;
    el.loadingState.classList.add("hidden");
    el.resultContent.classList.remove("hidden");
    renderCourseResult();
  } catch (err) {
    el.loadingState.classList.add("hidden");
    el.errorState.textContent = err.message || "코스 생성 중 오류가 발생했어요.";
    el.errorState.classList.remove("hidden");
  }
}

function renderCourseResult() {
  const data = state.courseData;
  if (!data) return;

  el.routePairTitle.textContent = `${data.origin.name} → ${data.destination.name}`;

  const mapParams = new URLSearchParams({
    startX: data.origin.x,
    startY: data.origin.y,
    endX: data.destination.x,
    endY: data.destination.y,
    sName: data.origin.name,
    eName: data.destination.name,
  });
  el.staticMapImg.src = `/api/staticmap?${mapParams.toString()}`;

  if (state.activeTab === "compare") {
    el.singleModeView.classList.add("hidden");
    el.compareModeView.classList.remove("hidden");
    renderCompareView(data);
    return;
  }

  el.compareModeView.classList.add("hidden");
  el.singleModeView.classList.remove("hidden");

  const isBike = state.activeTab === "bike";
  const route = isBike ? data.bike : data.walk;
  const stats = route.stats;

  el.healthCard.classList.toggle("bike-theme", isBike);
  el.healthBadge.textContent = isBike ? "🚲 자전거 라이딩" : "🚶 도보 산책";
  el.healthGoalText.textContent =
    route.status === "OK"
      ? stats.goalLabel
      : "해당 구간은 카카오맵 앱에서 직접 경로를 확인해 주세요.";

  el.mainMinutes.textContent = String(stats.minutes);
  el.goalPercentText.textContent = `${stats.goalPercent}%`;
  el.goalProgressBar.style.width = `${stats.goalPercent}%`;
  el.metricDistance.textContent = `${stats.distanceKm.toFixed(2)} km`;

  if (isBike) {
    el.metricThirdLabel.textContent = "코스 성격";
    el.metricThirdValue.textContent =
      route.routeMode === "BIKE_ONLY"
        ? "자전거도로 우선"
        : route.routeMode === "ACCESSIBLE"
          ? "편안한 길"
          : "최단 경로";
  } else {
    el.metricThirdLabel.textContent = "예상 걸음 수";
    el.metricThirdValue.textContent = `${stats.estimatedSteps.toLocaleString("ko-KR")} 걸음`;
  }
  el.metricKcal.textContent = `${stats.estimatedKcal} kcal`;
  el.kakaoMapLink.href = route.landingUrl || "https://map.kakao.com/";

  el.stepsList.innerHTML = "";
  if (!route.steps || route.steps.length === 0) {
    const li = document.createElement("li");
    li.className = "step-item";
    li.textContent = "세부 단계 안내가 없어 위 '카카오맵으로 길안내 시작' 버튼을 이용해 주세요.";
    el.stepsList.appendChild(li);
    return;
  }

  route.steps.slice(0, 20).forEach((step, index) => {
    const li = document.createElement("li");
    li.className = `step-item${isBike ? " bike-step" : ""}`;
    const distText = step.distance >= 1000 ? `${(step.distance / 1000).toFixed(1)}km` : `${step.distance}m`;
    const minText = Math.max(1, Math.round((step.time || 0) / 60));

    li.innerHTML = `
      <span class="step-num">${index + 1}</span>
      <div class="step-body">
        <p class="step-guidance"></p>
        <p class="step-meta">약 ${distText} · 약 ${minText}분</p>
      </div>
    `;
    li.querySelector(".step-guidance").textContent = step.guidance;
    el.stepsList.appendChild(li);
  });
}

function renderCompareView(data) {
  const w = data.walk;
  const b = data.bike;

  el.cmpWalkMin.textContent = String(w.stats.minutes);
  el.cmpWalkDist.textContent = `${w.stats.distanceKm.toFixed(2)} km`;
  el.cmpWalkSteps.textContent = `${w.stats.estimatedSteps.toLocaleString("ko-KR")} 걸음`;
  el.cmpWalkKcal.textContent = `${w.stats.estimatedKcal} kcal`;
  el.cmpWalkGoal.textContent = `${w.stats.goalPercent}%`;
  el.cmpWalkLink.href = w.landingUrl || "https://map.kakao.com/";

  el.cmpBikeMin.textContent = String(b.stats.minutes);
  el.cmpBikeDist.textContent = `${b.stats.distanceKm.toFixed(2)} km`;
  el.cmpBikeKcal.textContent = `${b.stats.estimatedKcal} kcal`;
  el.cmpBikeGoal.textContent = `${b.stats.goalPercent}%`;
  el.cmpBikeLink.href = b.landingUrl || "https://map.kakao.com/";
}

function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  state.speaking = false;
  el.speakBtn.textContent = "🔊 소리로 듣기";
}

function toggleSpeakCourse() {
  if (!state.courseData) return;
  if (!("speechSynthesis" in window)) {
    showToast("이 브라우저는 음성 읽기 기능을 지원하지 않아요.");
    return;
  }

  if (state.speaking) {
    stopSpeaking();
    return;
  }

  const data = state.courseData;
  const activeRoute = state.activeTab === "bike" ? data.bike : data.walk;
  const transportLabel = state.activeTab === "bike" ? "자전거로" : "걸어서";
  const text = `${data.origin.name}에서 ${data.destination.name}까지 ${transportLabel} 약 ${activeRoute.stats.minutes}분, 거리는 ${activeRoute.stats.distanceKm}킬로미터입니다. ${activeRoute.stats.goalLabel}`;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.rate = 0.92;
  utterance.onend = () => {
    state.speaking = false;
    el.speakBtn.textContent = "🔊 소리로 듣기";
  };

  state.speaking = true;
  el.speakBtn.textContent = "⏹️ 읽기 멈춤";
  window.speechSynthesis.speak(utterance);
}

async function copyShareText() {
  if (!state.courseData) return;
  const data = state.courseData;
  const w = data.walk.stats;
  const b = data.bike.stats;

  const text = [
    `[오늘의 30분 건강 코스]`,
    `📍 ${data.origin.name} → ${data.destination.name}`,
    `🚶 도보 산책: 약 ${w.minutes}분 (${w.distanceKm}km, 약 ${w.estimatedSteps.toLocaleString("ko-KR")}걸음)`,
    `🚲 자전거: 약 ${b.minutes}분 (${b.distanceKm}km)`,
    `🗺️ 길안내: ${state.activeTab === "bike" ? data.bike.landingUrl : data.walk.landingUrl}`,
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast("카톡에 바로 붙여넣을 수 있게 복사했어요!");
  } catch {
    showToast("복사에 실패했어요. 직접 선택해서 복사해 주세요.");
  }
}

async function init() {
  // 폰트 크기 토글
  el.fontSizeToggle.addEventListener("click", () => {
    const isLarge = document.body.classList.toggle("large-text");
    el.fontSizeToggle.setAttribute("aria-pressed", String(isLarge));
    el.fontSizeToggle.textContent = isLarge ? "🔍 글씨 보통 크기" : "🔍 글씨 더 크게";
  });

  // 모달 열기/닫기
  el.openGuideBtn.addEventListener("click", () => el.guideModal.classList.remove("hidden"));
  el.closeGuideBtn.addEventListener("click", () => el.guideModal.classList.add("hidden"));
  el.guideModal.addEventListener("click", (event) => {
    if (event.target === el.guideModal) {
      el.guideModal.classList.add("hidden");
    }
  });

  // 장소 검색 버튼 및 엔터키
  el.startSearchBtn.addEventListener("click", () => runPlaceSearch("start"));
  el.endSearchBtn.addEventListener("click", () => runPlaceSearch("end"));
  el.startInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runPlaceSearch("start");
    }
  });
  el.endInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runPlaceSearch("end");
    }
  });

  // 출발/도착 바꾸기
  el.swapBtn.addEventListener("click", () => {
    const prevStart = state.startPlace;
    const prevEnd = state.endPlace;
    if (prevEnd) {
      setSelectedPlace("start", prevEnd);
    } else {
      el.startInput.value = "";
      el.startSelectedInfo.textContent = "";
      state.startPlace = null;
    }
    if (prevStart) {
      setSelectedPlace("end", prevStart);
    } else {
      el.endInput.value = "";
      el.endSelectedInfo.textContent = "";
      state.endPlace = null;
    }
    if (state.startPlace && state.endPlace) {
      fetchCourse();
    }
  });

  // 코스 폼 제출 및 옵션 변경
  el.courseForm.addEventListener("submit", (e) => {
    e.preventDefault();
    fetchCourse();
  });
  el.walkModeSelect.addEventListener("change", () => {
    if (state.startPlace && state.endPlace) fetchCourse();
  });
  el.bikeModeSelect.addEventListener("change", () => {
    if (state.startPlace && state.endPlace) fetchCourse();
  });

  // 탭 전환
  el.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeTab = btn.dataset.tab;
      el.tabButtons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", String(active));
      });
      stopSpeaking();
      renderCourseResult();
    });
  });

  el.speakBtn.addEventListener("click", toggleSpeakCourse);
  el.copyShareBtn.addEventListener("click", copyShareText);

  // 초기 상태 및 추천 코스 불러오기
  try {
    const res = await fetch("/api/health");
    const info = await res.json();
    state.mode = info.mode;
    state.presets = info.presets || [];

    if (info.mode === "live") {
      el.modeBadge.textContent = "🟢 실시간 카카오맵 연결됨";
      el.modeBadge.className = "status-pill status-live";
    } else {
      el.modeBadge.textContent = "🟡 체험 모드 (API 키 없이 실행)";
      el.modeBadge.className = "status-pill status-demo";
    }

    renderPresets();
    if (state.presets.length > 0) {
      markActivePreset(0);
      setSelectedPlace("start", state.presets[0].start);
      setSelectedPlace("end", state.presets[0].end);
      await fetchCourse();
    }
  } catch {
    el.modeBadge.textContent = "⚠️ 서버 연결 확인 필요";
  }
}

init();
