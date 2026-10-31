<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>여행지 탐색</title><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><link rel="stylesheet" href="css/style.css"></head><body>
<main>
 <div class="bar">
  <select id="area"><option value="">전체 지역</option></select>
  <select id="type"><option value="">전체 유형</option></select>
  <input id="kw" placeholder="키워드 검색 (예: 해변, 한옥)">
  <button class="pri" id="go">검색</button>
  <button id="near">📍 내 주변</button>
 </div>
 <div class="split"><div><div class="list" id="list"></div>
  <div class="pager"><button id="prev">◀</button><span id="pg">1</span><button id="next">▶</button></div></div>
 <div id="map"></div></div>
</main>
<script src="js/config.js"></script><script src="js/common.js"></script>
<script>
header("i");
const map = L.map("map").setView([36.5, 127.8], 7);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: "© OpenStreetMap"}).addTo(map);
let layer = L.layerGroup().addTo(map), page = 1, total = 0, geo = null;
const $ = id => document.getElementById(id);
const ROWS = 12;

Object.entries(TYPES).forEach(([k, v]) => $("type").add(new Option(v, k)));
api("areaCode2", {numOfRows: 50, pageNo: 1}).then(r => r.items.forEach(a => $("area").add(new Option(a.name, a.code)))).catch(()=>{});

async function load() {
  $("list").innerHTML = '<div class="msg">불러오는 중…</div>';
  try {
    const kw = $("kw").value.trim(), p = {numOfRows: ROWS, pageNo: page, arrange: "O"};
    if ($("area").value) p.areaCode = $("area").value;
    if ($("type").value) p.contentTypeId = $("type").value;
    let r;
    if (geo) { r = await api("locationBasedList2", {...p, mapX: geo.lng, mapY: geo.lat, radius: 10000, arrange: "E"}); }
    else if (kw) { r = await api("searchKeyword2", {...p, keyword: kw}); }
    else { r = await api("areaBasedList2", p); }
    total = +r.total; render(r.items);
  } catch (e) { $("list").innerHTML = '<div class="msg">⚠️ ' + esc(e.message) + '</div>'; }
}
function render(items) {
  $("list").scrollTop = 0;
  $("pg").textContent = page + " / " + Math.max(1, Math.ceil(total / ROWS));
  layer.clearLayers();
  if (!items.length) { $("list").innerHTML = '<div class="msg">결과가 없습니다</div>'; return; }
  const pts = [];
  $("list").innerHTML = items.map(i => {
    const p = toPlace(i), has = Course.has(p.id);
    return `<div class="item">${p.img ? '<img src="'+esc(p.img)+'" loading="lazy">' : '<div class="noimg"></div>'}
      <div><a href="detail.html?id=${p.id}"><h3>${esc(p.title)}</h3></a><p>${esc(p.addr)}</p>
      ${i.dist ? '<p>'+fmtKm(i.dist/1000)+'</p>' : ''}
      <div class="btns"><button class="sm" data-id="${p.id}">${has ? '✔ 담김' : '+ 코스에 담기'}</button></div></div></div>`;
  }).join("");
  items.forEach(i => {
    const p = toPlace(i); if (!p.lat || !p.lng) return;
    L.marker([p.lat, p.lng]).addTo(layer).bindPopup(`<b>${esc(p.title)}</b><br><a href="detail.html?id=${p.id}">상세보기</a>`);
    pts.push([p.lat, p.lng]);
  });
  if (pts.length) map.fitBounds(pts, {padding: [30, 30], maxZoom: 13});
  $("list").onclick = e => {
    const b = e.target.closest("button[data-id]"); if (!b) return;
    const it = items.find(x => x.contentid === b.dataset.id);
    if (Course.add(toPlace(it))) { b.textContent = "✔ 담김"; toast("코스에 담았어요"); } else toast("이미 담겨 있어요");
  };
}
$("go").onclick = () => { geo = null; page = 1; load(); };
$("kw").onkeydown = e => { if (e.key === "Enter") $("go").click(); };
$("prev").onclick = () => { if (page > 1) { page--; load(); } };
$("next").onclick = () => { if (page * ROWS < total) { page++; load(); } };
$("near").onclick = () => navigator.geolocation.getCurrentPosition(
  pos => { geo = {lat: pos.coords.latitude, lng: pos.coords.longitude}; $("kw").value = ""; page = 1; load(); },
  () => toast("위치 권한이 필요해요"));
load();
</script></body></html>
