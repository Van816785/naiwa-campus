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
  departureOverlay.setAttribute("aria-label", "出发视频");
  departureOverlay.innerHTML = '<div class="departure-dialog"><div class="departure-stage">' +
    '<video class="departure-video" src="./transit.mp4" playsinline webkit-playsinline preload="metadata" controls></video>' +
    '<div class="departure-fallback" hidden><img class="departure-mascot" src="./mascot.jpg" alt="中国奶蛙科技大学吉祥物" width="1536" height="2048"><p class="departure-text">官网同步打开中</p></div></div>' +
    '<div class="departure-controls"><p class="departure-title"></p><p class="departure-hint" role="status"></p>' +
    '<div class="departure-buttons"><a class="departure-skip" href="https://www.hnust.edu.cn/">结束视频，查看官网</a><button class="departure-continue" type="button">继续看完</button></div>' +
    '<a class="departure-direct" href="https://www.hnust.edu.cn/">在当前页打开官网</a>' +
    '<p class="departure-browser-note">如果浏览器切到了官网，可返回本页继续看视频。</p></div></div>';
  document.body.append(departureOverlay);
  const skipLink = departureOverlay.querySelector(".departure-skip");
  const directLink = departureOverlay.querySelector(".departure-direct");
  const continueButton = departureOverlay.querySelector(".departure-continue");
  const hint = departureOverlay.querySelector(".departure-hint");
  const video = departureOverlay.querySelector(".departure-video");
  const visitButton = form.querySelector('button[type="submit"]');
  const exploreButton = document.getElementById("explore-button");
  let navigationBusy = false;
  let activeCancel = null;
  let activeVisit = null;
  const setBusy = busy => {
    navigationBusy = busy;
    visitButton.disabled = busy; exploreButton.disabled = busy;
  };
  const resetDeparture = () => {
    if (activeCancel) activeCancel();
    departureOverlay.hidden = true; setBusy(false);
  };
  const focusDestination = visit => {
    try {
      if (visit && visit.popup && !visit.popup.closed) {
        visit.popup.focus();
        return true;
      }
    } catch { /* 官网隔离策略可能切断窗口引用；保留普通链接。 */ }
    return false;
  };
  const viewDestination = (event, visit) => {
    // 复用已经打开的窗口，不再次导航，以保留官网正在进行或已完成的加载。
    if (focusDestination(visit)) event.preventDefault();
    resetDeparture();
  };
  skipLink.addEventListener("click", event => viewDestination(event, activeVisit));
  directLink.addEventListener("click", resetDeparture);
  continueButton.addEventListener("click", () => {
    continueButton.hidden = true;
    hint.textContent = activeVisit && activeVisit.popup
      ? "继续播放视频。官网已另外打开，可随时切换查看。"
      : "继续播放视频。需要前往官网时，请点击打开入口。";
    // 用户可能通过原生控件暂停过视频，继续观看仍属于本次点击。
    try { const playing = video.play(); if (playing && playing.catch) playing.catch(() => {}); } catch {}
  });
  window.addEventListener("pagehide", resetDeparture);
  window.addEventListener("pageshow", event => { if (event.persisted) resetDeparture(); });

  const playDeparture = onDone => {
    const fallback = departureOverlay.querySelector(".departure-fallback");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { onDone(); return; }
    let done = false; let waitingTimer = 0; let fallbackTimer = 0;
    let fallbackShown = false;
    const cleanup = () => {
      clearTimeout(waitingTimer); clearTimeout(fallbackTimer);
      video.onended = video.onerror = video.onplaying = video.onwaiting = video.onstalled = video.ontimeupdate = video.onpause = null;
      document.removeEventListener("visibilitychange", onVisibility);
      video.pause(); departureOverlay.hidden = true; activeCancel = null;
    };
    const cancel = () => { if (!done) { done = true; cleanup(); } };
    const finish = () => { if (!done) { done = true; cleanup(); onDone(); } };
    const useFallback = () => {
      if (done || fallbackShown) return;
      fallbackShown = true; clearTimeout(waitingTimer); video.pause();
      video.hidden = true; fallback.hidden = false;
      hint.textContent = "视频暂时无法播放。官网打开不受影响，可以直接查看。";
      fallbackTimer = setTimeout(finish, 1200);
    };
    const clearWaiting = () => { clearTimeout(waitingTimer); };
    const armWaiting = () => {
      clearWaiting();
      if (!done && !fallbackShown && !document.hidden) waitingTimer = setTimeout(useFallback, 5000);
    };
    const onVisibility = () => {
      // 切到官网时，手机可能暂停视频。保留播放进度，返回后由用户继续。
      if (document.hidden) clearWaiting();
      else if (!video.paused && video.readyState < 3) armWaiting();
    };
    activeCancel = cancel;
    video.hidden = false; fallback.hidden = true; continueButton.hidden = false;
    departureOverlay.hidden = false;
    try { video.currentTime = 0; } catch {}
    video.onended = finish; video.onerror = useFallback;
    video.onplaying = clearWaiting; video.onpause = clearWaiting;
    video.ontimeupdate = () => { if (!video.paused && video.currentTime > 0) clearWaiting(); };
    video.onwaiting = armWaiting; video.onstalled = armWaiting;
    document.addEventListener("visibilitychange", onVisibility);
    armWaiting();
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
  const openDestination = school => {
    let popup = null;
    try {
      // 必须同步发生在用户点击中；不等待视频、定时器或网络探测。
      popup = window.open("about:blank", "_blank");
      if (!popup) return null;
      popup.opener = null;
      popup.location.replace(school.url);
      return popup;
    } catch {
      try { if (popup) popup.close(); } catch {}
      return null;
    }
  };
  const visit = (school, random = false) => {
    if (navigationBusy) return;
    setBusy(true);
    const visitState = { school, popup: openDestination(school) };
    activeVisit = visitState;
    skipLink.href = directLink.href = school.url;
    departureOverlay.querySelector(".departure-title").textContent = school.name;
    hint.textContent = visitState.popup
      ? "官网已在新页面开始打开，视频在本页同步播放。"
      : "浏览器未允许打开新页面。你可以现在打开官网，或继续看视频。";
    skipLink.textContent = visitState.popup ? "结束视频，查看官网" : "结束视频，打开官网";
    status.textContent = (random ? "这次奶蛙选中了" + school.name + "。" : "") +
      (visitState.popup ? "官网已另外打开；视频播放不会阻挡官网加载。" : "浏览器未允许新页面，请使用官网入口。");
    const fallbackLink = document.createElement("a");
    fallbackLink.href = school.url; fallbackLink.textContent = "查看" + school.name + "官网 ↗";
    fallbackLink.addEventListener("click", event => viewDestination(event, visitState));
    status.append(" ", fallbackLink);
    playDeparture(() => {
      setBusy(false);
      // 结束时只尝试切换到已经打开的官网，不重新请求、不再创建窗口。
      if (!document.hidden) focusDestination(visitState);
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
