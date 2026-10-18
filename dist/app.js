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
  departureOverlay.innerHTML = '<div class="departure-stage">' +
    '<video class="departure-video" src="./transit.mp4" playsinline preload="auto"></video>' +
    '<div class="departure-fallback" hidden><img class="departure-mascot" src="./mascot.jpg" alt="中国奶蛙科技大学吉祥物" width="1536" height="2048"><p class="departure-text">正在打开，稍等片刻…</p></div>' +
    '<button type="button" class="departure-skip">跳过动画</button></div>';
  document.body.append(departureOverlay);
  let activeFinish = null;
  departureOverlay.querySelector(".departure-skip").addEventListener("click", () => { if (activeFinish) activeFinish(); });
  const playDeparture = (school, onDone) => {
    const video = departureOverlay.querySelector(".departure-video");
    const fallback = departureOverlay.querySelector(".departure-fallback");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const MIN_MS = reduced ? 300 : 1200; // 转场最短停留时长，避免一闪而过
    let done = false; let minTimer = 0; let fallbackTimer = 0; let probe = null;
    let minDone = false; let probeDone = reduced;
    const finish = () => {
      if (done) return; done = true;
      clearTimeout(minTimer); clearTimeout(fallbackTimer); video.pause();
      if (probe) { probe.remove(); probe = null; }
      departureOverlay.hidden = true; activeFinish = null; onDone();
    };
    const tryFinish = () => { if (minDone && probeDone) finish(); };
    const useFallback = () => {
      video.hidden = true; fallback.hidden = false;
      fallbackTimer = setTimeout(finish, reduced ? 600 : 2400);
    };
    activeFinish = finish;
    video.hidden = false; fallback.hidden = true;
    departureOverlay.hidden = false;
    video.onended = finish;
    video.onerror = useFallback;
    video.play().then(() => {}).catch(() => { video.muted = true; video.play().catch(useFallback); });
    minTimer = setTimeout(() => { minDone = true; tryFinish(); }, MIN_MS);
    if (!reduced) {
      // 后台预检目标官网：加载完成或失败都视为检测结束，随后关闭动画并转跳
      probe = document.createElement("iframe");
      probe.setAttribute("aria-hidden", "true");
      probe.setAttribute("tabindex", "-1");
      probe.setAttribute("sandbox", "");
      probe.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none";
      probe.addEventListener("load", () => { probeDone = true; tryFinish(); }, { once: true });
      probe.addEventListener("error", () => { probeDone = true; tryFinish(); }, { once: true });
      probe.src = school.url;
      document.body.append(probe);
    }
  };
  const visit = (school, random = false) => {
    playDeparture(school, () => {
      const link = document.createElement("a");
      link.href = school.url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.hidden = true; document.body.append(link); link.click(); link.remove();
      status.textContent = `${random ? `这次奶蛙选中了${school.name}。` : ""}若官网没有打开，请点击：`;
      const fallbackLink = document.createElement("a");
      fallbackLink.href = school.url; fallbackLink.target = "_blank"; fallbackLink.rel = "noopener noreferrer";
      fallbackLink.textContent = `${school.name}官网 ↗`;
      status.append(fallbackLink);
    });
  };
  form.addEventListener("change", updateSelection);
  form.addEventListener("submit", event => {
    event.preventDefault(); visit(currentSchool());
  });
  document.getElementById("explore-button").addEventListener("click", () => {
    const school = destinations[Math.floor(Math.random() * destinations.length)];
    search.value = ""; filterSchools();
    form.querySelectorAll('input[name="school"]')[schools.indexOf(school)].checked = true;
    updateSelection(); visit(school, true);
  });
  updateSelection(); filterSchools(); form.hidden = false;
})();
