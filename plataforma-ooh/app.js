/* =========================================================================
   PLATAFORMA OOH — PERIFA MÍDIA
   Inteligência de rotas, mapeamento de comunidades e estimativa de impacto.
   App estático (sem backend). Requer uma chave da API do Google Maps.
   ========================================================================= */

/* ============ CONFIGURAÇÃO (edite aqui) ============ */
const CONFIG = {
  // Senha de acesso à plataforma. TROQUE por uma senha sua.
  SENHA: 'Perifaooh26!',
  // Cole aqui sua chave da API do Google Maps (Maps JavaScript API + Places + Geocoding).
  // Enquanto estiver vazia, o mapa mostra instruções de configuração.
  GOOGLE_MAPS_API_KEY: 'AIzaSyD1ljX-Ea072T_2n7FpZxN_sMSGO76pSWw',
  // Centro inicial do mapa (Brasil).
  MAP_CENTER: { lat: -14.24, lng: -51.92 },
  MAP_ZOOM: 4,
};

/* ============ DEFINIÇÃO DAS ROTAS ============ */
/* Cada rota agrupa categorias de comércio buscadas no Google Places por
   palavra-chave, num raio ao redor de cada comunidade adicionada ao plano. */
const ROTAS = [
  { id: 'r1', nome: 'ROTA 01', cor: '#3B82F6',
    desc: 'Bancas, lotéricas, bancos, farmácias e mercados',
    cats: 'Banca · Lotérica · Banco · Farmácia',
    keywords: ['banca de jornal', 'lotérica', 'banco', 'farmácia', 'supermercado'] },
  { id: 'r2', nome: 'ROTA 02', cor: '#22C55E',
    desc: 'Campos de futebol, quadras, praças e bares/botecos',
    cats: 'Campo / Quadra · Praça · Bar / Boteco · Esporte',
    keywords: ['campo de futebol', 'quadra poliesportiva', 'praça', 'bar', 'boteco'] },
  { id: 'r3', nome: 'ROTA 03', cor: '#EC4899',
    desc: 'UBS, postos de saúde, barbearias, saúde/beleza e igrejas',
    cats: 'UBS / Saúde · Posto de Saúde · Barbearia · Salão de Beleza',
    keywords: ['UBS', 'posto de saúde', 'barbearia', 'salão de beleza', 'igreja'] },
  { id: 'r4', nome: 'ROTA 04', cor: '#F5C542',
    desc: 'Principais avenidas, ruas e locais de alto fluxo na comunidade',
    cats: 'Avenidas · alto fluxo · score',
    keywords: ['avenida', 'terminal de ônibus', 'mercado municipal'] },
];

/* ============ METODOLOGIA VAC (impacto) ============ */
const FATOR_SOV_MEDIO = 0.1667; // aplicado ao DOOH digital
function getTierByPopulation(pop) {
  if (pop > 70000) return 'A';
  if (pop > 20000) return 'B';
  if (pop > 5000) return 'C';
  return 'D';
}
function getImpactPercentage(tier) {
  return ({ A: 0.10, B: 0.08, C: 0.06, D: 0.04 })[tier] || 0.06;
}
// População estimada quando a comunidade não tem dado de habitantes.
const POP_POR_NIVEL = { A: 90000, B: 40000, C: 12000, D: 3000 };
function popDaComunidade(c) {
  if (c.habitantes) return c.habitantes;
  if (c.nivel && POP_POR_NIVEL[c.nivel]) return POP_POR_NIVEL[c.nivel];
  return 8000;
}

/* ============ ESTADO GLOBAL ============ */
const DADOS = window.PERIFA_DADOS || { base: [], prioritarias: [] };
const State = {
  plano: [],        // comunidades adicionadas ao mapa: {key,comunidade,cidade,uf,habitantes,nivel,marker,latlng}
  rotaAtiva: null,  // id da rota ativa
  comercios: [],    // comércios encontrados: {rota,nome,endereco,latlng,marker}
  carrinho: [],     // itens da proposta
  impLocais: [],    // locais da calculadora de impacto
  onlyPriority: false,
};

let map = null, geocoder = null, placesService = null, mapsReady = false;
let searchMarker = null;
let booted = false;

/* ============ UTIL ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const nf = new Intl.NumberFormat('pt-BR');
const cf = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const normStr = s => (s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function keyOf(c) { return normStr(c.comunidade) + '|' + normStr(c.cidade) + '|' + normStr(c.uf); }
function parseMoney(v) { return parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0; }

/* Base unificada (prioritárias marcadas com estrela). */
const PRIOR_KEYS = new Set(DADOS.prioritarias.map(keyOf));
function comunidadesDisponiveis() {
  const map = new Map();
  DADOS.base.forEach(c => map.set(keyOf(c), { ...c, prioritaria: PRIOR_KEYS.has(keyOf(c)) }));
  DADOS.prioritarias.forEach(c => {
    const k = keyOf(c);
    if (!map.has(k)) map.set(k, { ...c, prioritaria: true });
  });
  return Array.from(map.values());
}
const TODAS = comunidadesDisponiveis();
const UF_NOMES = {
  AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',
  ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',
  PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',
  RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'
};

/* =========================================================================
   PORTÃO DE ACESSO
   ========================================================================= */
(function initGate() {
  const form = $('#gate-form'), pass = $('#gate-pass'), err = $('#gate-err');
  $('#gate-eye').addEventListener('click', () => {
    pass.type = pass.type === 'password' ? 'text' : 'password';
  });
  // Sessão: se já entrou nesta aba, pula o portão.
  if (sessionStorage.getItem('perifa_ok') === '1') abrirApp();
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (pass.value === CONFIG.SENHA) {
      sessionStorage.setItem('perifa_ok', '1');
      abrirApp();
    } else {
      err.textContent = 'Senha incorreta. Tente novamente.';
      pass.value = ''; pass.focus();
    }
  });
})();

function abrirApp() {
  $('#gate').classList.add('hidden');
  $('#app').classList.remove('hidden');
  boot();
}

/* =========================================================================
   BOOT DA APLICAÇÃO
   ========================================================================= */
function boot() {
  if (booted) return; booted = true;
  renderRoutes();
  buildFilters();
  bindTopbar();
  bindImpactos();
  bindProposta();
  bindPlaceSearch();
  loadGoogleMaps();
}

/* ============ TOPBAR / TROCA DE VISTAS ============ */
function bindTopbar() {
  $('#btn-impactos').addEventListener('click', () => showView('impactos'));
  $('#btn-proposta').addEventListener('click', openDrawer);
  $('#btn-sair').addEventListener('click', () => {
    sessionStorage.removeItem('perifa_ok');
    location.reload();
  });
  $('#btn-clear').addEventListener('click', limparTudo);
}
function showView(which) {
  const isImp = which === 'impactos';
  $('#view-map').classList.toggle('hidden', isImp);
  $('#view-impactos').classList.toggle('hidden', !isImp);
  $('#btn-impactos').textContent = isImp ? '← Voltar ao mapa' : 'Impactos';
  $('#btn-impactos').onclick = () => showView(isImp ? 'map' : 'impactos');
  $('#btn-proposta').classList.toggle('hidden', isImp && false);
  $('#topbar-hint').textContent = isImp
    ? 'Calculadora de impacto — metodologia VAC'
    : 'Escolha comunidades e uma rota (ou endereço/CEP)';
  if (!isImp && mapsReady && map) setTimeout(nudgeMap, 100);
}

/* =========================================================================
   ROTAS (sidebar)
   ========================================================================= */
function renderRoutes() {
  const wrap = $('#routes-list');
  wrap.innerHTML = '';
  ROTAS.forEach(r => {
    const el = document.createElement('div');
    el.className = 'route-card locked';
    el.style.setProperty('--rc', r.cor);
    el.dataset.rota = r.id;
    el.innerHTML = `
      <div class="rc-head">
        <span class="rc-name">${r.nome}</span>
        <span class="rc-count" id="count-${r.id}">0</span>
      </div>
      <div class="rc-desc">${r.desc}</div>
      <div class="rc-cats">${r.cats}</div>`;
    el.addEventListener('click', () => ativarRota(r.id));
    wrap.appendChild(el);
  });
}
function unlockRoutes(unlock) {
  $('#routes-note').classList.toggle('hidden', unlock);
  $$('#routes-list .route-card').forEach(c => c.classList.toggle('locked', !unlock));
}
function ativarRota(id) {
  if (!State.plano.length) return;
  State.rotaAtiva = id;
  $$('#routes-list .route-card').forEach(c => c.classList.toggle('active', c.dataset.rota === id));
  buscarComerciosDaRota(id);
}

/* =========================================================================
   FILTROS EM CASCATA (Estado → Cidade → Comunidade)
   ========================================================================= */
function poolAtual() {
  return State.onlyPriority ? TODAS.filter(c => c.prioritaria) : TODAS;
}
function buildFilters() {
  $('#only-priority').addEventListener('change', e => {
    State.onlyPriority = e.target.checked;
    fillUF(); fillCity(); fillComm();
  });
  $('#f-uf').addEventListener('change', () => { fillCity(); fillComm(); });
  $('#f-city').addEventListener('change', fillComm);
  $('#f-comm').addEventListener('change', e => {
    const k = e.target.value;
    if (k) { adicionarComunidade(k); e.target.value = ''; }
  });
  fillUF(); fillCity(); fillComm();
}
function fillUF() {
  const ufs = Array.from(new Set(poolAtual().map(c => c.uf))).sort();
  const sel = $('#f-uf');
  sel.innerHTML = '<option value="">Todos os estados</option>' +
    ufs.map(u => `<option value="${u}">${u} — ${UF_NOMES[u] || u}</option>`).join('');
}
function fillCity() {
  const uf = $('#f-uf').value;
  let pool = poolAtual();
  if (uf) pool = pool.filter(c => c.uf === uf);
  const cities = Array.from(new Set(pool.map(c => c.cidade))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const sel = $('#f-city');
  sel.innerHTML = '<option value="">Todas as cidades</option>' +
    cities.map(c => `<option value="${c}">${c}</option>`).join('');
}
function fillComm() {
  const uf = $('#f-uf').value, city = $('#f-city').value;
  let pool = poolAtual();
  if (uf) pool = pool.filter(c => c.uf === uf);
  if (city) pool = pool.filter(c => c.cidade === city);
  pool = pool.slice().sort((a, b) => (b.prioritaria - a.prioritaria) || a.comunidade.localeCompare(b.comunidade, 'pt-BR'));
  const sel = $('#f-comm');
  sel.innerHTML = '<option value="">Adicionar comunidade ao plano...</option>' +
    pool.map(c => `<option value="${keyOf(c)}">${c.prioritaria ? '★ ' : ''}${c.comunidade} · ${c.cidade}/${c.uf}</option>`).join('');
}

/* =========================================================================
   PLANO DE COMUNIDADES (no mapa)
   ========================================================================= */
function findByKey(k) { return TODAS.find(c => keyOf(c) === k); }

function adicionarComunidade(k) {
  if (State.plano.some(p => p.key === k)) return;
  const c = findByKey(k);
  if (!c) return;
  const item = { key: k, ...c, marker: null, latlng: null };
  State.plano.push(item);
  renderPlano();
  unlockRoutes(true);
  hideMapHint();
  if (mapsReady) geocodeComunidade(item);
}
function removerComunidade(k) {
  const i = State.plano.findIndex(p => p.key === k);
  if (i < 0) return;
  const it = State.plano[i];
  if (it.marker) it.marker.setMap(null);
  State.plano.splice(i, 1);
  // remove comércios ligados
  State.comercios = State.comercios.filter(cm => { if (cm.commKey === k) { cm.marker && cm.marker.setMap(null); return false; } return true; });
  renderPlano();
  renderComercios();
  if (!State.plano.length) { unlockRoutes(false); State.rotaAtiva = null; $$('#routes-list .route-card').forEach(c => c.classList.remove('active')); ROTAS.forEach(r => $('#count-' + r.id).textContent = '0'); }
}
function renderPlano() {
  const panel = $('#commerces-panel');
  if (!State.plano.length) {
    panel.innerHTML = '<div class="note">Adicione uma comunidade ao plano para listar e buscar todos os comércios salvos.</div>';
    return;
  }
  const chips = State.plano.map(p => `
    <div class="comm-chip">
      <div class="meta"><b>${p.prioritaria ? '★ ' : ''}${p.comunidade}</b><span>${p.cidade}/${p.uf} · ${nf.format(popDaComunidade(p))} hab.</span></div>
      <button class="x" data-k="${p.key}" title="Remover">&times;</button>
    </div>`).join('');
  panel.innerHTML = `<div class="chip-list">${chips}</div>` + renderComerciosHTML();
  $$('.comm-chip .x', panel).forEach(b => b.addEventListener('click', () => removerComunidade(b.dataset.k)));
}
function renderComerciosHTML() {
  if (!State.comercios.length) return '';
  const byRota = {};
  State.comercios.forEach(cm => (byRota[cm.rota] = byRota[cm.rota] || []).push(cm));
  let html = '<div class="sec-title" style="margin-top:20px">Comércios encontrados</div><div class="chip-list">';
  Object.keys(byRota).forEach(rid => {
    const r = ROTAS.find(x => x.id === rid);
    byRota[rid].forEach(cm => {
      html += `<div class="comm-chip"><div class="meta"><b style="color:${r.cor}">${cm.nome}</b><span>${cm.endereco || ''}</span></div>
        <button class="x add-prop" data-i="${cm._i}" title="Adicionar à proposta">＋</button></div>`;
    });
  });
  html += '</div>';
  return html;
}
function renderComercios() { renderPlano(); }

/* =========================================================================
   GOOGLE MAPS
   ========================================================================= */
function loadGoogleMaps() {
  if (!CONFIG.GOOGLE_MAPS_API_KEY) { showMapMissing(); return; }
  window.__perifaMapInit = initMap;
  const s = document.createElement('script');
  s.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places&language=pt-BR&region=BR&callback=__perifaMapInit`;
  s.async = true; s.defer = true;
  s.onerror = () => showMapMissing('Não foi possível carregar o Google Maps. Verifique a chave da API.');
  document.head.appendChild(s);
}
function showMapMissing(msg) {
  $('#map').innerHTML = `<div class="map-missing"><div class="box">
    <h3>Configure o Google Maps</h3>
    <p>${msg || 'Para ativar o mapa, a busca de endereços e os comércios das rotas, cole sua chave da API do Google Maps em'} <code>CONFIG.GOOGLE_MAPS_API_KEY</code> ${msg ? '' : 'no arquivo <code>app.js</code>.'}</p>
    <p style="margin-top:14px;font-size:13px">Ative <b>Maps JavaScript API</b>, <b>Places API</b> e <b>Geocoding API</b> no Google Cloud e restrinja a chave ao domínio da plataforma.</p>
  </div></div>`;
  $('#map-hint').classList.add('hidden');
}
function initMap() {
  const styles = [ // tema escuro discreto
    { elementType: 'geometry', stylers: [{ color: '#1d1d1f' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d1f' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#9aa0a6' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2e' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ];
  map = new google.maps.Map($('#map'), {
    center: CONFIG.MAP_CENTER, zoom: CONFIG.MAP_ZOOM, styles,
    mapTypeControl: true, streetViewControl: false, fullscreenControl: true,
  });
  geocoder = new google.maps.Geocoder();
  placesService = new google.maps.places.PlacesService(map);
  mapsReady = true;
  // geocodifica comunidades já adicionadas
  State.plano.forEach(geocodeComunidade);
  setupAutocomplete();
  // Corrige o repaint inicial dos tiles (mapa criado dentro de container flex).
  setTimeout(nudgeMap, 500);
  google.maps.event.addListenerOnce(map, 'idle', nudgeMap);
}
function nudgeMap() {
  if (!map) return;
  google.maps.event.trigger(map, 'resize');
  map.panBy(0, 1); map.panBy(0, -1);
}
function geocodeComunidade(item) {
  if (!geocoder || item.latlng) return;
  const q = `${item.comunidade}, ${item.cidade}, ${item.uf}, Brasil`;
  geocoder.geocode({ address: q }, (res, status) => {
    if (status === 'OK' && res[0]) {
      const loc = res[0].geometry.location;
      item.latlng = loc;
      item.marker = new google.maps.Marker({
        map, position: loc, title: item.comunidade,
        icon: {
          path: google.maps.SymbolPath.CIRCLE, scale: 9,
          fillColor: '#FFD400', fillOpacity: 1, strokeColor: '#000', strokeWeight: 2,
        },
      });
      const iw = new google.maps.InfoWindow({ content: `<div class="place-pop"><h4>${item.comunidade}</h4><div class="addr">${item.cidade}/${item.uf} · ${nf.format(popDaComunidade(item))} hab.</div></div>` });
      item.marker.addListener('click', () => iw.open(map, item.marker));
      fitPlano();
    }
  });
}
function fitPlano() {
  const pts = State.plano.filter(p => p.latlng);
  if (!pts.length || !map) return;
  if (pts.length === 1) { map.setCenter(pts[0].latlng); map.setZoom(14); setTimeout(nudgeMap, 150); return; }
  const b = new google.maps.LatLngBounds();
  pts.forEach(p => b.extend(p.latlng));
  map.fitBounds(b, 80);
  setTimeout(nudgeMap, 150);
}

/* Busca de comércios de uma rota ao redor de cada comunidade do plano. */
function buscarComerciosDaRota(rid) {
  if (!mapsReady) { showMapMissing(); return; }
  const rota = ROTAS.find(r => r.id === rid);
  // limpa comércios anteriores dessa rota
  State.comercios = State.comercios.filter(cm => { if (cm.rota === rid) { cm.marker && cm.marker.setMap(null); return false; } return true; });
  const withLoc = State.plano.filter(p => p.latlng);
  if (!withLoc.length) return;
  let pending = withLoc.length * rota.keywords.length;
  const seen = new Set();
  withLoc.forEach(comm => {
    rota.keywords.forEach(kw => {
      placesService.nearbySearch({ location: comm.latlng, radius: 1600, keyword: kw }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          results.slice(0, 6).forEach(pl => {
            const id = pl.place_id;
            if (seen.has(id)) return; seen.add(id);
            addComercio(rota, comm.key, pl);
          });
        }
        if (--pending <= 0) { updateRouteCount(rid); renderComercios(); }
      });
    });
  });
}
let _cmIndex = 0;
function addComercio(rota, commKey, pl) {
  const loc = pl.geometry && pl.geometry.location; if (!loc) return;
  const marker = new google.maps.Marker({
    map, position: loc, title: pl.name,
    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: rota.cor, fillOpacity: 1, strokeColor: '#0b0b0c', strokeWeight: 1.5 },
  });
  const item = { _i: _cmIndex++, rota: rota.id, commKey, nome: pl.name, endereco: pl.vicinity || '', latlng: loc, marker };
  const iw = new google.maps.InfoWindow({
    content: `<div class="place-pop"><h4>${pl.name}</h4><div class="addr">${pl.vicinity || ''}</div>
      <button onclick="window.__addComercioProposta(${item._i})">Adicionar à proposta</button></div>`,
  });
  marker.addListener('click', () => iw.open(map, marker));
  State.comercios.push(item);
}
function updateRouteCount(rid) {
  const n = State.comercios.filter(c => c.rota === rid).length;
  $('#count-' + rid).textContent = n;
}

/* Busca livre (comércio, rua, CEP) via Places Autocomplete. */
function bindPlaceSearch() { /* ligado após o mapa carregar (setupAutocomplete) */ }
function setupAutocomplete() {
  const input = $('#place-search');
  const ac = new google.maps.places.Autocomplete(input, { fields: ['geometry', 'name', 'formatted_address'], componentRestrictions: { country: 'br' } });
  ac.addListener('place_changed', () => {
    const p = ac.getPlace();
    if (!p.geometry) return;
    if (searchMarker) searchMarker.setMap(null);
    map.setCenter(p.geometry.location); map.setZoom(16);
    searchMarker = new google.maps.Marker({ map, position: p.geometry.location, title: p.name });
  });
}

/* =========================================================================
   IMPACTOS (Calculadora VAC)
   ========================================================================= */
function bindImpactos() {
  const search = $('#imp-search'), ac = $('#imp-ac');
  search.addEventListener('input', () => {
    const q = normStr(search.value.trim());
    if (q.length < 2) { ac.classList.add('hidden'); return; }
    const pool = poolAtual();
    const hits = pool.filter(c => normStr(c.comunidade).includes(q) || normStr(c.cidade).includes(q)).slice(0, 8);
    if (!hits.length) { ac.classList.add('hidden'); return; }
    ac.innerHTML = hits.map(c => `<div class="ac-item" data-k="${keyOf(c)}">${c.prioritaria ? '<span class="star">★</span>' : ''}${c.comunidade}<small>${c.cidade}/${c.uf}</small></div>`).join('');
    ac.classList.remove('hidden');
    $$('.ac-item', ac).forEach(it => it.addEventListener('click', () => {
      search.dataset.k = it.dataset.k; search.value = it.textContent.replace('★', '').trim(); ac.classList.add('hidden');
    }));
  });
  document.addEventListener('click', e => { if (!ac.contains(e.target) && e.target !== search) ac.classList.add('hidden'); });

  $('#imp-add').addEventListener('click', () => {
    const k = search.dataset.k;
    const c = k && findByKey(k);
    if (!c) { alert('Selecione uma comunidade da lista.'); return; }
    const plates = Math.max(1, parseInt($('#imp-plates').value, 10) || 1);
    if (State.impLocais.some(l => l.key === k)) { alert('Este local já foi adicionado.'); return; }
    State.impLocais.push({ key: k, ...c, plates });
    search.value = ''; search.dataset.k = ''; $('#imp-plates').value = 1;
    renderImpLocais();
  });
  $('#imp-calc').addEventListener('click', calcularImpacto);
}
function renderImpLocais() {
  const wrap = $('#imp-locais');
  wrap.innerHTML = State.impLocais.map(l => `
    <div class="local-item">
      <div class="meta"><b>${l.prioritaria ? '★ ' : ''}${l.comunidade}</b><span>${l.cidade}/${l.uf} · ${nf.format(popDaComunidade(l))} hab. · nível ${getTierByPopulation(popDaComunidade(l))}</span></div>
      <span class="pl">${l.plates} placa(s)</span>
      <button class="x" data-k="${l.key}">&times;</button>
    </div>`).join('');
  $$('.local-item .x', wrap).forEach(b => b.addEventListener('click', () => {
    State.impLocais = State.impLocais.filter(l => l.key !== b.dataset.k); renderImpLocais();
  }));
}
function calcularImpacto() {
  if (!State.impLocais.length) { alert('Adicione ao menos um local.'); return; }
  const days = Math.max(1, parseInt($('#imp-days').value, 10) || 1);
  const media = $('#imp-media').value;
  const valor = parseMoney($('#imp-value').value);

  let totalImpressions = 0, totalPop = 0, detalhes = '';
  State.impLocais.forEach(l => {
    const pop = popDaComunidade(l);
    const tier = getTierByPopulation(pop);
    const pct = getImpactPercentage(tier);
    const diariaLocal = pop * pct * l.plates;
    let totalLocal = diariaLocal * days;
    if (media === 'dooh') totalLocal *= FATOR_SOV_MEDIO;
    totalImpressions += totalLocal; totalPop += pop;
    detalhes += `<p><b>${l.comunidade}</b> (pop. ${nf.format(pop)} · nível ${tier} · ${(pct*100)}%): ${l.plates} placa(s) × ${days} dia(s) = <b>${nf.format(Math.round(totalLocal))}</b> impressões</p>`;
  });
  const daily = totalImpressions / days;
  const cpm = valor > 0 ? (valor / totalImpressions) * 1000 : null;

  $('#imp-result').innerHTML = `
    <div class="results-grid">
      <div class="result-box"><div class="rv">${nf.format(Math.round(totalImpressions))}</div><div class="rl">Total de impressões</div></div>
      <div class="result-box"><div class="rv">${nf.format(Math.round(daily))}</div><div class="rl">Impressões / dia</div></div>
      <div class="result-box"><div class="rv">${cpm !== null ? cf.format(cpm) : '—'}</div><div class="rl">CPM estimado</div></div>
    </div>
    <div class="details">${detalhes}</div>
    <button class="btn-accent" id="imp-to-cart" style="width:100%;margin-top:8px">Adicionar à proposta</button>`;
  $('#imp-to-cart').addEventListener('click', () => {
    State.carrinho.push({
      titulo: State.impLocais.map(l => l.comunidade).join(', '),
      locais: State.impLocais.length, placas: State.impLocais.reduce((a, l) => a + l.plates, 0),
      dias: days, media, impressoes: Math.round(totalImpressions), valor,
    });
    updateCart(); openDrawer();
  });
}

/* =========================================================================
   PROPOSTA (carrinho)
   ========================================================================= */
window.__addComercioProposta = function (i) {
  const cm = State.comercios.find(c => c._i === i); if (!cm) return;
  State.carrinho.push({ titulo: cm.nome, subtitulo: cm.endereco, comercio: true, impressoes: 0, valor: 0 });
  updateCart();
};
function bindProposta() {
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#drawer-mask').addEventListener('click', closeDrawer);
  $('#cart-clear').addEventListener('click', () => { State.carrinho = []; updateCart(); });
  $('#cart-export').addEventListener('click', exportarProposta);
  // delega clique nos "＋" dos comércios da sidebar
  $('#commerces-panel').addEventListener('click', e => {
    const b = e.target.closest('.add-prop'); if (!b) return;
    window.__addComercioProposta(parseInt(b.dataset.i, 10));
  });
}
function openDrawer() { $('#drawer').classList.add('open'); $('#drawer-mask').classList.add('open'); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer-mask').classList.remove('open'); }
function updateCart() {
  const n = State.carrinho.length;
  $('#cart-badge').textContent = n;
  $('#cart-title').textContent = `Carrinho (${n})`;
  const body = $('#cart-body');
  if (!n) {
    body.innerHTML = '<div class="empty">Nenhuma seleção salva ainda. Faça as estimativas em <b>Impactos</b> e clique em <b>Adicionar à proposta</b>.</div>';
  } else {
    body.innerHTML = State.carrinho.map((it, idx) => `
      <div class="cart-item">
        <div class="ci-top"><div><b>${it.titulo}</b><div class="ci-sub">${it.comercio ? (it.subtitulo || 'Comércio') : `${it.locais} local(is) · ${it.placas} placa(s) · ${it.dias} dia(s) · ${it.media.toUpperCase()}`}</div></div>
        <button class="ci-x" data-i="${idx}">&times;</button></div>
        ${it.comercio ? '' : `<div class="ci-stats"><div><span>Impressões</span><b>${nf.format(it.impressoes)}</b></div><div><span>Investimento</span><b>${it.valor ? cf.format(it.valor) : '—'}</b></div></div>`}
      </div>`).join('');
    $$('.ci-x', body).forEach(b => b.addEventListener('click', () => { State.carrinho.splice(parseInt(b.dataset.i, 10), 1); updateCart(); }));
  }
  const totImp = State.carrinho.reduce((a, it) => a + (it.impressoes || 0), 0);
  const totVal = State.carrinho.reduce((a, it) => a + (it.valor || 0), 0);
  $('#cart-total-imp').textContent = nf.format(totImp);
  $('#cart-total-val').textContent = cf.format(totVal);
}
function exportarProposta() {
  if (!State.carrinho.length) { alert('O carrinho está vazio.'); return; }
  const totImp = State.carrinho.reduce((a, it) => a + (it.impressoes || 0), 0);
  const totVal = State.carrinho.reduce((a, it) => a + (it.valor || 0), 0);
  const linhas = State.carrinho.map(it => `<tr><td>${it.titulo}${it.comercio ? '' : `<br><small>${it.locais} local(is) · ${it.placas} placa(s) · ${it.dias} dia(s) · ${it.media.toUpperCase()}</small>`}</td>
    <td style="text-align:right">${it.comercio ? '—' : nf.format(it.impressoes)}</td>
    <td style="text-align:right">${it.valor ? cf.format(it.valor) : '—'}</td></tr>`).join('');
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Proposta OOH — Perifa Mídia</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:40px}
    .brand{font-weight:800;font-size:22px;text-transform:uppercase}.brand b{background:#FFD400;padding:2px 8px;border-radius:6px}
    h1{font-size:26px;margin:18px 0 4px}.sub{color:#666;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border-bottom:1px solid #ddd;padding:12px 10px;font-size:14px;text-align:left}
    th{background:#faf3cf;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
    tfoot td{font-weight:800;border-top:2px solid #111}small{color:#888}
    @media print{button{display:none}}</style></head><body>
    <div class="brand">Perifa <b>Mídia</b></div>
    <h1>Proposta OOH · Inteligência de Rotas</h1>
    <div class="sub">Documento gerado pela plataforma · ${State.carrinho.length} item(ns)</div>
    <table><thead><tr><th>Seleção</th><th style="text-align:right">Impressões</th><th style="text-align:right">Investimento</th></tr></thead>
    <tbody>${linhas}</tbody>
    <tfoot><tr><td>Total</td><td style="text-align:right">${nf.format(totImp)}</td><td style="text-align:right">${cf.format(totVal)}</td></tr></tfoot></table>
    <p style="margin-top:30px"><button onclick="window.print()" style="padding:12px 20px;background:#FFD400;border:none;border-radius:8px;font-weight:700;cursor:pointer">Imprimir / Salvar em PDF</button></p>
    </body></html>`;
  const w = window.open('', '_blank');
  if (!w) { alert('Permita pop-ups para exportar a proposta.'); return; }
  w.document.write(html); w.document.close();
}

/* =========================================================================
   LIMPAR TUDO
   ========================================================================= */
function limparTudo() {
  State.plano.forEach(p => p.marker && p.marker.setMap(null));
  State.comercios.forEach(c => c.marker && c.marker.setMap(null));
  if (searchMarker) { searchMarker.setMap(null); searchMarker = null; }
  State.plano = []; State.comercios = []; State.rotaAtiva = null;
  renderPlano(); unlockRoutes(false);
  ROTAS.forEach(r => $('#count-' + r.id).textContent = '0');
  $$('#routes-list .route-card').forEach(c => c.classList.remove('active'));
  $('#f-uf').value = ''; fillCity(); fillComm();
  showMapHint();
  if (map) { map.setCenter(CONFIG.MAP_CENTER); map.setZoom(CONFIG.MAP_ZOOM); }
}
function hideMapHint() { const h = $('#map-hint'); if (h) h.style.display = 'none'; }
function showMapHint() { const h = $('#map-hint'); if (h && CONFIG.GOOGLE_MAPS_API_KEY) h.style.display = 'flex'; }
