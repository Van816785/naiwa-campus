(() => {
  "use strict";
  const form = document.getElementById("destination-form");
  const grid = document.getElementById("school-grid");
  const status = document.getElementById("navigation-status");
  const schools = (Array.isArray(window.CAMPUS_SCHOOLS) ? window.CAMPUS_SCHOOLS : []).filter(school => {
    if (!school || typeof school.name !== "string" || typeof school.id !== "string") return false;
    try { const url = new URL(school.url); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
  });
  if (!schools.length) { document.getElementById("load-error").hidden = false; return; }
  const buildingIcon = '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="m4 10 10-5 10 5M6 11h16M7 12v10m5-10v10m4-10v10m5-10v10M4 23h20M12 5V2h5l-1 2h-4"/></svg>';
  const span = (className, text) => { const el = document.createElement("span"); el.className = className; if (text !== undefined) el.textContent = text; return el; };
  schools.forEach((school, index) => {
    const card = document.createElement("label"); card.className = "school-card school-option";
    const radio = document.createElement("input"); radio.type = "radio"; radio.name = "school"; radio.value = String(index); radio.checked = index === 0;
    const icon = span("school-icon"); icon.innerHTML = buildingIcon;
    const name = span("school-name", school.name); const meta = span("school-meta");
    meta.append(span("", school.location || "学校官网"));
    card.append(radio, icon, name, meta, span("official-tag", "官网入口")); grid.append(card);
  });
  for (let i = 0; i < Math.max(0, 3 - schools.length); i++) {
    const placeholder = document.createElement("div"); placeholder.className = "school-card upcoming";
    placeholder.setAttribute("aria-disabled", "true");
    placeholder.append(span("coming-badge", "COMING SOON"), span("school-icon", "+"), span("school-name", "下一所学校，待添加"), span("school-meta", "新的目的地，敬请期待")); grid.append(placeholder);
  }
  const currentSchool = () => schools[Number(form.querySelector('input[name="school"]:checked')?.value ?? 0)];
  const updateSelection = () => {
    const school = currentSchool();
    document.getElementById("selected-name").textContent = school.name;
    document.getElementById("selected-domain").textContent = new URL(school.url).hostname;
    status.replaceChildren();
  };
  document.getElementById("school-count").textContent = `目前开放 ${schools.length} 所学校`;
  form.addEventListener("change", updateSelection);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const school = currentSchool();
    const link = document.createElement("a"); link.href = school.url; link.target = "_blank"; link.rel = "noopener noreferrer";
    link.hidden = true; document.body.append(link); link.click(); link.remove();
    status.textContent = "若官网没有打开，请点击：";
    const fallback = document.createElement("a"); fallback.href = school.url; fallback.target = "_blank"; fallback.rel = "noopener noreferrer"; fallback.textContent = `${school.name}官网 ↗`; status.append(fallback);
  });
  updateSelection(); form.hidden = false;
})();
