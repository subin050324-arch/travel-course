const BASE = "https://apis.data.go.kr/B551011/KorService2/";
const TYPES = {12:"관광지",14:"문화시설",15:"축제/행사",28:"레포츠",32:"숙박",38:"쇼핑",39:"음식점"};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtKm = k => k < 1 ? Math.round(k * 1000) + " m" : k.toFixed(1) + " km";

// ---- API 호출 (JSON) ----
async function api(op, params = {}) {
  const q = new URLSearchParams({ serviceKey: CONFIG.API_KEY, MobileOS: "ETC", MobileApp: "TravelCourse", _type: "json", ...params });
  const r = await fetch(BASE + op + "?" + q);
  if (!r.ok) throw new Error("HTTP " + r.status);
  let j;
  try { j = await r.json(); } catch { throw new Error("응답이 JSON이 아닙니다 (인증키/오퍼레이션명을 확인하세요)"); }
  const h = j.response?.header;
  if (h && h.resultCode !== "0000") throw new Error(h.resultMsg);
  const b = j.response.body, it = b.items?.item;
  return { items: !it ? [] : Array.isArray(it) ? it : [it], total: b.totalCount };
}

// ---- 내 코스 (localStorage) ----
const Course = {
  get() { try { return JSON.parse(localStorage.getItem("course")) || []; } catch { return []; } },
  set(a) { localStorage.setItem("course", JSON.stringify(a)); Course.badge(); },
  has(id) { return Course.get().some(p => p.id === id); },
  add(p) { const a = Course.get(); if (a.some(x => x.id === p.id)) return false; a.push(p); Course.set(a); return true; },
  remove(id) { Course.set(Course.get().filter(p => p.id !== id)); },
  badge() { const e = document.getElementById("badge"); if (e) e.textContent = Course.get().length; }
};
const toPlace = i => ({ id: i.contentid, title: i.title, addr: i.addr1 || "", img: i.firstimage || "", lat: +i.mapy, lng: +i.mapx });

// ---- 거리/경로 ----
function haversine(a, b) {
  const R = 6371, r = d => d * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// 최근접 이웃: 현재 지점에서 가장 가까운 미방문 지점을 계속 선택
function nearestNeighbor(points, start) {
  const left = [...points], out = [];
  let cur = start || left.shift();
  if (!start) out.push(cur);
  while (left.length) {
    let bi = 0;
    left.forEach((p, i) => { if (haversine(cur, p) < haversine(cur, left[bi])) bi = i; });
    cur = left.splice(bi, 1)[0]; out.push(cur);
  }
  return out;
}
function toast(m) { const t = document.getElementById("toast"); t.textContent = m; t.style.display = "block"; setTimeout(() => t.style.display = "none", 1800); }
function header(active) {
  document.body.insertAdjacentHTML("afterbegin",
    `<header><b>🧭 나만의 여행코스</b>
     <a href="index.html" class="${active==='i'?'on':''}">탐색</a>
     <a href="planner.html" class="${active==='p'?'on':''}">내 코스<span class="badge" id="badge">0</span></a></header>
     <div id="toast"></div>`);
  Course.badge();
}
