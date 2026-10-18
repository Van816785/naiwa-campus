(() => {
  "use strict";
  const form = document.getElementById("destination-form");
  const grid = document.getElementById("school-grid");
  const status = document.getElementById("navigation-status");
  const knownUrls = new Set();
  const schools = (Array.isArray(window.CAMPUS_SCHOOLS) ? window.CAMPUS_SCHOOLS : []).filter(school => {
    if (!school || typeof school.name !== "string" || typeof school.id !== "string") return false;
    try {
      const url = new URL(school.url);
      if (url.protocol !== "https:" || url.username || url.password || knownUrls.has(url.href)) return false;
      knownUrls.add(url.href); return true;
    } catch { return false; }
  });
  if (!schools.length) { document.getElementById("load-error").hidden = false; return; }
  // 每个已加入的有效网址拥有相同的抽中机会，重复网址只计一次。
  const destinations = schools;
  const defaultIndex = Math.max(0, schools.findIndex(school => school.id === "hnust"));
  const buildingIcon = '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="m4 10 10-5 10 5M6 11h16M7 12v10m5-10v10m4-10v10m5-10v10M4 23h20M12 5V2h5l-1 2h-4"/></svg>';
  const span = (className, text) => { const el = document.createElement("span"); el.className = className; if (text !== undefined) el.textContent = text; return el; };
  schools.forEach((school, index) => {
    const card = document.createElement("label"); card.className = "school-card school-option";
    const radio = document.createElement("input"); radio.type = "radio"; radio.name = "school"; radio.value = String(index); radio.checked = index === defaultIndex;
    const icon = span("school-icon"); icon.innerHTML = buildingIcon;
    const name = span("school-name", school.name); const meta = span("school-meta");
    meta.append(span("", school.note || school.location || "学校官网"));
    card.append(radio, icon, name, meta, span("official-tag", "官网入口")); grid.append(card);
  });
  for (let i = 0; i < Math.max(0, 3 - schools.length); i++) {
    const placeholder = document.createElement("div"); placeholder.className = "school-card upcoming";
    placeholder.setAttribute("aria-disabled", "true");
    placeholder.append(span("coming-badge", "COMING SOON"), span("school-icon", "+"), span("school-name", "下一所学校，待添加"), span("school-meta", "新的目的地，敬请期待")); grid.append(placeholder);
  }
  const currentSchool = () => schools[Number(form.querySelector('input[name="school"]:checked')?.value ?? defaultIndex)];
  const search = document.getElementById("school-search");
  const filterSchools = () => {
    const query = search.value.trim().toLowerCase();
    let count = 0;
    schools.forEach((school, index) => {
      const matches = `${school.name} ${school.url} ${school.location || ""} ${school.note || ""}`.toLowerCase().includes(query);
      grid.children[index].hidden = !matches;
      if (matches) count++;
    });
    grid.querySelectorAll(".upcoming").forEach(card => { card.hidden = Boolean(query); });
    document.getElementById("search-count").textContent = query ? `找到 ${count} 所 / 共 ${schools.length} 所` : `全部 ${schools.length} 所学校`;
    document.getElementById("no-results").hidden = count > 0;
    grid.scrollTop = 0;
  };
  search.addEventListener("input", filterSchools);
  const updateSelection = () => {
    const school = currentSchool();
    document.getElementById("selected-name").textContent = school.name;
    document.getElementById("selected-domain").textContent = new URL(school.url).hostname;
    status.replaceChildren();
  };
  document.getElementById("school-count").textContent = `目前开放 ${schools.length} 所学校`;
  document.getElementById("explore-note").textContent = destinations.length === 1
    ? `目前仅加入 1 个网址，逛一逛将前往${destinations[0].name}。`
    : `逛一逛：从全部 ${destinations.length} 个已加入的网址中等概率随机选择，也可能遇见刚刚去过的学校。`;
  const departureOverlay = document.createElement("div");
  departureOverlay.className = "departure-overlay";
  departureOverlay.hidden = true;
  departureOverlay.setAttribute("role", "dialog");
  departureOverlay.setAttribute("aria-modal", "true");
  departureOverlay.setAttribute("aria-label", "正在前往学校官网");
  departureOverlay.innerHTML = '<div class="departure-stage">' +
    '<video class="departure-video" src="./transit.mp4" playsinline webkit-playsinline preload="metadata"></video>' +
    '<div class="departure-fallback" hidden><img class="departure-mascot" src="./mascot.jpg" alt="中国奶蛙科技大学吉祥物" width="1536" height="2048"><p class="departure-text">马上出发…</p></div>' +
    '<a class="departure-skip" href="https://www.hnust.edu.cn/">跳过动画，直接前往</a></div>';
  document.body.append(departureOverlay);
  const skipLink = departureOverlay.querySelector(".departure-skip");
  const visitButton = form.querySelector('button[type="submit"]');
  const exploreButton = document.getElementById("explore-button");
  let navigationBusy = false;
  let activeCancel = null;
  const setBusy = busy => {
    navigationBusy = busy;
    visitButton.disabled = busy; exploreButton.disabled = busy;
  };
  const resetDeparture = () => {
    if (activeCancel) activeCancel();
    departureOverlay.hidden = true; setBusy(false);
  };
  // 普通链接使用当前标签页，跳过入口不依赖弹窗权限或视频事件。
  skipLink.addEventListener("click", resetDeparture);
  window.addEventListener("pagehide", resetDeparture);
  window.addEventListener("pageshow", event => { if (event.persisted) resetDeparture(); });
  const playDeparture = (school, onDone) => {
    const video = departureOverlay.querySelector(".departure-video");
    const fallback = departureOverlay.querySelector(".departure-fallback");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { onDone(); return; }
    let done = false; let waitingTimer = 0; let fallbackTimer = 0; let deadlineTimer = 0;
    let fallbackShown = false;
    const cleanup = () => {
      clearTimeout(waitingTimer); clearTimeout(fallbackTimer); clearTimeout(deadlineTimer);
      video.onended = video.onerror = video.onplaying = video.onwaiting = video.onstalled = video.ontimeupdate = null;
      video.pause(); departureOverlay.hidden = true; activeCancel = null;
    };
    const cancel = () => { if (!done) { done = true; cleanup(); } };
    const finish = () => {
      if (done) return;
      done = true; cleanup(); onDone();
    };
    const useFallback = () => {
      if (done || fallbackShown) return;
      fallbackShown = true; clearTimeout(waitingTimer); video.pause();
      video.hidden = true; fallback.hidden = false;
      fallbackTimer = setTimeout(finish, 700);
    };
    const clearWaiting = () => { clearTimeout(waitingTimer); };
    const armWaiting = () => {
      clearWaiting();
      if (!done && !fallbackShown) waitingTimer = setTimeout(useFallback, 3000);
    };
    activeCancel = cancel;
    skipLink.href = school.url;
    video.hidden = false; fallback.hidden = true;
    departureOverlay.hidden = false;
    try { video.currentTime = 0; } catch { /* 尚未载入媒体元数据时从默认起点播放。 */ }
    video.onended = finish;
    video.onerror = useFallback;
    video.onplaying = clearWaiting;
    video.ontimeupdate = () => { if (!video.paused && video.currentTime > 0) clearWaiting(); };
    video.onwaiting = armWaiting; video.onstalled = armWaiting;
    // 保留约 14 秒的完整视频；无论媒体事件如何，16 秒内结束转场。
    deadlineTimer = setTimeout(finish, 16000); armWaiting();
    const startVideo = mutedRetry => {
      if (done || fallbackShown) return;
      try {
        const playing = video.play();
        if (playing && typeof playing.catch === "function") playing.catch(() => {
          if (done || fallbackShown) return;
          if (mutedRetry) { video.muted = true; startVideo(false); } else useFallback();
        });
      } catch { useFallback(); }
    };
    startVideo(true);
    skipLink.focus({ preventScroll: true });
  };
  const visit = (school, random = false) => {
    if (navigationBusy) return;
    setBusy(true);
    status.textContent = `${random ? `这次奶蛙选中了${school.name}。` : ""}若未自动跳转，可直接访问：`;
    const fallbackLink = document.createElement("a");
    fallbackLink.href = school.url; fallbackLink.textContent = `${school.name}官网 ↗`;
    status.append(fallbackLink);
    playDeparture(school, () => {
      setBusy(false);
      // 动画结束已离开点击事件的调用栈；当前页跳转不受弹窗拦截影响。
      try { window.location.assign(school.url); } catch { fallbackLink.focus(); }
    });
  };
  form.addEventListener("change", updateSelection);
  form.addEventListener("submit", event => {
    event.preventDefault(); visit(currentSchool());
  });
  document.getElementById("explore-button").addEventListener("click", () => {
    if (navigationBusy) return;
    const school = destinations[Math.floor(Math.random() * destinations.length)];
    search.value = ""; filterSchools();
    form.querySelectorAll('input[name="school"]')[schools.indexOf(school)].checked = true;
    updateSelection(); visit(school, true);
  });
  updateSelection(); filterSchools(); form.hidden = false;
})();
