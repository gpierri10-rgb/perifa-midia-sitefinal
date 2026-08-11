/* =========================================================================
   PLATAFORMA OOH — PERIFA MÍDIA
   Inteligência de rotas · seleção de comércios · simulador de impacto · proposta
   App estático. Requer chave da API do Google Maps (Maps JS + Places + Geocoding).

   MODELO (estimado/derivado da referência):
   - Impactos  = Σ(passantes/dia) × dias × visibilidade × placas
   - Alcance   = Σ(passantes/dia) × visibilidade × dias × K_REACH   (K_REACH≈1,227)
   - Frequência= impactos ÷ alcance  (= placas ÷ K_REACH)
   - CPM       = investimento ÷ impactos × 1000
   ========================================================================= */

/* ============ CONFIGURAÇÃO ============ */
const CONFIG = {
  SENHA: 'Perifaooh26!',
  GOOGLE_MAPS_API_KEY: 'AIzaSyD1ljX-Ea072T_2n7FpZxN_sMSGO76pSWw',
  MAP_CENTER: { lat: -14.24, lng: -51.92 },
  MAP_ZOOM: 4,
};

/* ============ PARÂMETROS DO MODELO ============ */
const MODELO = {
  VISIBILIDADE: 0.35,     // fator de visibilidade padrão
  RAIO: 150,              // raio de análise por comércio (m)
  K_REACH: 1.227,         // fator de alcance (calibrado na Rocinha)
  DIAS_PADRAO: 14,
  INVEST_PADRAO: 0,
};

/* Base de passantes/dia por categoria (âncora, score 100) + a qual rota pertence.
   Valores de r1 vêm da referência; r2/r3/r4 são estimados de forma coerente. */
const CATEGORIAS = {
  // ROTA 01
  'Mercado':          { base: 2782, rota: 'r1', kw: ['supermercado', 'mercado', 'minimercado'] },
  'Farmácia':         { base: 2576, rota: 'r1', kw: ['farmácia', 'drogaria'] },
  'Lotérica':         { base: 2370, rota: 'r1', kw: ['lotérica', 'loteria'] },
  'Padaria':          { base: 705,  rota: 'r1', kw: ['padaria'] },
  'Conveniência':     { base: 677,  rota: 'r1', kw: ['conveniência'] },
  'Loja de Roupas':   { base: 657,  rota: 'r1', kw: ['loja de roupas', 'roupas'] },
  'Comércio':         { base: 613,  rota: 'r1', kw: ['comércio', 'bazar', 'material de construção'] },
  'Banco':            { base: 525,  rota: 'r1', kw: ['banco', 'caixa econômica'] },
  'Banca':            { base: 500,  rota: 'r1', kw: ['banca de jornal', 'banca'] },
  // ROTA 02
  'Bar / Boteco':     { base: 1200, rota: 'r2', kw: ['bar', 'boteco'] },
  'Praça':            { base: 900,  rota: 'r2', kw: ['praça'] },
  'Campo / Quadra':   { base: 650,  rota: 'r2', kw: ['campo de futebol', 'quadra poliesportiva'] },
  'Esporte':          { base: 600,  rota: 'r2', kw: ['centro esportivo', 'academia'] },
  // ROTA 03
  'UBS / Saúde':      { base: 1600, rota: 'r3', kw: ['ubs', 'posto de saúde', 'clínica'] },
  'Igreja':           { base: 1100, rota: 'r3', kw: ['igreja'] },
  'Salão de Beleza':  { base: 520,  rota: 'r3', kw: ['salão de beleza'] },
  'Barbearia':        { base: 471,  rota: 'r3', kw: ['barbearia'] },
  // ROTA 04
  'Avenida / Fluxo':  { base: 3200, rota: 'r4', kw: ['avenida', 'terminal de ônibus', 'ponto de ônibus'] },
};

const ROTAS = [
  { id: 'r1', nome: 'ROTA 01', cor: '#38BDF8',
    desc: 'Bancas, lotéricas, bancos, farmácias e mercados', cats: 'Banca · Lotérica · Banco · Farmácia' },
  { id: 'r2', nome: 'ROTA 02', cor: '#4ADE80',
    desc: 'Campos de futebol, quadras, praças e bares/botecos', cats: 'Campo / Quadra · Praça · Bar / Boteco · Esporte' },
  { id: 'r3', nome: 'ROTA 03', cor: '#F472B6',
    desc: 'UBS, postos de saúde, barbearias, saúde/beleza e igrejas', cats: 'UBS / Saúde · Posto de Saúde · Barbearia · Salão de Beleza' },
  { id: 'r4', nome: 'ROTA 04', cor: '#FBBF24',
    desc: 'Principais avenidas, ruas e locais de alto fluxo na comunidade', cats: 'Avenidas · alto fluxo · score' },
];
// palavras-chave por rota (usadas na descoberta via Places)
ROTAS.forEach(r => { r.keywords = []; });
Object.entries(CATEGORIAS).forEach(([nome, c]) => {
  const r = ROTAS.find(x => x.id === c.rota);
  if (r) r.keywords.push({ categoria: nome, kw: c.kw[0] });
});

/* ============ FÓRMULAS ============ */
function impactosDe(passantes, dias, placas, visib) {
  return passantes * dias * visib * placas;
}
function alcanceDe(passantes, dias, visib) {
  return passantes * visib * dias * MODELO.K_REACH;
}
function frequenciaDe(impactos, alcance) {
  return alcance > 0 ? impactos / alcance : 0;
}
function cpmDe(investimento, impactos) {
  return impactos > 0 ? (investimento / impactos) * 1000 : 0;
}
// passantes/dia de um comércio a partir da categoria + sinais do Places
function passantesDoComercio(base, ratingCount, isTop) {
  if (isTop) return { passantes: base, score: 100 };
  const f = Math.max(0.15, Math.min(1, 0.15 + 0.85 * ((ratingCount || 0) / 300)));
  return { passantes: Math.round(base * f), score: Math.max(40, Math.round(f * 100)) };
}
function potencialLabel(mediaPass) {
  if (mediaPass >= 1500) return 'alto';
  if (mediaPass >= 700) return 'medio';
  return 'basico';
}

/* ============ ESTADO ============ */
const DADOS = window.PERIFA_DADOS || { base: [], prioritarias: [] };
const State = {
  plano: [],        // comunidades no plano: {key,comunidade,cidade,uf,...,marker,latlng,circle,comercios:[],placas,dias,invest}
  rotaAtiva: null,
  carrinho: [],     // escopos adicionados à proposta
  impLocais: [],    // (legado, não usado no simulador novo)
  onlyPriority: false,
  focusCircle: null,
};

let map = null, geocoder = null, placesService = null, mapsReady = false;
let searchMarker = null, booted = false;

/* ============ UTIL ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const nf = new Intl.NumberFormat('pt-BR');
const cf = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const normStr = s => (s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function keyOf(c) { return normStr(c.comunidade) + '|' + normStr(c.cidade) + '|' + normStr(c.uf); }
function parseMoney(v) { return parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0; }

const PRIOR_KEYS = new Set(DADOS.prioritarias.map(keyOf));
function comunidadesDisponiveis() {
  const m = new Map();
  DADOS.base.forEach(c => m.set(keyOf(c), { ...c, prioritaria: PRIOR_KEYS.has(keyOf(c)) }));
  DADOS.prioritarias.forEach(c => { const k = keyOf(c); if (!m.has(k)) m.set(k, { ...c, prioritaria: true }); });
  return Array.from(m.values());
}
const TODAS = comunidadesDisponiveis();
const UF_NOMES = { AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins' };

/* =========================================================================
   PORTÃO
   ========================================================================= */
(function initGate() {
  const form = $('#gate-form'), pass = $('#gate-pass'), err = $('#gate-err');
  $('#gate-eye').addEventListener('click', () => { pass.type = pass.type === 'password' ? 'text' : 'password'; });
  if (sessionStorage.getItem('perifa_ok') === '1') abrirApp();
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (pass.value === CONFIG.SENHA) { sessionStorage.setItem('perifa_ok', '1'); abrirApp(); }
    else { err.textContent = 'Senha incorreta. Tente novamente.'; pass.value = ''; pass.focus(); }
  });
})();
function abrirApp() { $('#gate').classList.add('hidden'); $('#app').classList.remove('hidden'); boot(); }

/* =========================================================================
   BOOT
   ========================================================================= */
function boot() {
  if (booted) return; booted = true;
  renderRoutes(); buildFilters(); bindTopbar(); bindProposta(); loadGoogleMaps();
}
function bindTopbar() {
  $('#btn-impactos').addEventListener('click', () => showView('impactos'));
  $('#btn-proposta').addEventListener('click', openDrawer);
  $('#btn-sair').addEventListener('click', () => { sessionStorage.removeItem('perifa_ok'); location.reload(); });
  $('#btn-clear').addEventListener('click', limparTudo);
}
function showView(which) {
  const isImp = which === 'impactos';
  $('#view-map').classList.toggle('hidden', isImp);
  $('#view-impactos').classList.toggle('hidden', !isImp);
  $('#btn-impactos').textContent = isImp ? '← Voltar ao mapa' : 'Impactos';
  $('#btn-impactos').onclick = () => showView(isImp ? 'map' : 'impactos');
  $('#topbar-hint').textContent = isImp ? 'Simulador de impacto OOH por favela' : 'Escolha comunidades e uma rota (ou endereço/CEP)';
  if (isImp) renderSimulador();
  if (!isImp && mapsReady && map) setTimeout(nudgeMap, 100);
}

/* =========================================================================
   ROTAS (sidebar)
   ========================================================================= */
function renderRoutes() {
  const wrap = $('#routes-list'); wrap.innerHTML = '';
  ROTAS.forEach(r => {
    const el = document.createElement('div');
    el.className = 'route-card locked'; el.style.setProperty('--rc', r.cor); el.dataset.rota = r.id;
    el.innerHTML = `<div class="rc-head"><span class="rc-name">${r.nome}</span><span class="rc-count" id="count-${r.id}">0</span></div>
      <div class="rc-desc">${r.desc}</div><div class="rc-cats">${r.cats}</div>`;
    el.addEventListener('click', () => ativarRota(r.id));
    wrap.appendChild(el);
  });
}
function unlockRoutes(unlock) {
  $('#routes-note').classList.toggle('hidden', unlock);
  $$('#routes-list .route-card').forEach(c => c.classList.toggle('locked', !unlock));
}
function ativarRota(id) {
  if (!State.plano.length) { highlightFiltro(); return; }
  State.rotaAtiva = id;
  $$('#routes-list .route-card').forEach(c => c.classList.toggle('active', c.dataset.rota === id));
  // foca visualmente os comércios dessa rota (já descobertos)
  fitComerciosDaRota(id);
}
function highlightFiltro() {
  const sel = $('#f-comm'); if (!sel) return;
  sel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  sel.classList.remove('pm-pulse'); void sel.offsetWidth; sel.classList.add('pm-pulse');
  setTimeout(() => sel.classList.remove('pm-pulse'), 2200);
}

/* =========================================================================
   FILTROS
   ========================================================================= */
function poolAtual() { return State.onlyPriority ? TODAS.filter(c => c.prioritaria) : TODAS; }
function buildFilters() {
  $('#only-priority').addEventListener('change', e => { State.onlyPriority = e.target.checked; fillUF(); fillCity(); fillComm(); });
  $('#f-uf').addEventListener('change', () => { fillCity(); fillComm(); });
  $('#f-city').addEventListener('change', fillComm);
  $('#f-comm').addEventListener('change', e => { const k = e.target.value; if (k) { adicionarComunidade(k); e.target.value = ''; } });
  fillUF(); fillCity(); fillComm();
}
function fillUF() {
  const ufs = Array.from(new Set(poolAtual().map(c => c.uf))).sort();
  $('#f-uf').innerHTML = '<option value="">Todos os estados</option>' + ufs.map(u => `<option value="${u}">${u} — ${UF_NOMES[u] || u}</option>`).join('');
}
function fillCity() {
  const uf = $('#f-uf').value; let pool = poolAtual(); if (uf) pool = pool.filter(c => c.uf === uf);
  const cities = Array.from(new Set(pool.map(c => c.cidade))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  $('#f-city').innerHTML = '<option value="">Todas as cidades</option>' + cities.map(c => `<option value="${c}">${c}</option>`).join('');
}
function fillComm() {
  const uf = $('#f-uf').value, city = $('#f-city').value; let pool = poolAtual();
  if (uf) pool = pool.filter(c => c.uf === uf); if (city) pool = pool.filter(c => c.cidade === city);
  pool = pool.slice().sort((a, b) => (b.prioritaria - a.prioritaria) || a.comunidade.localeCompare(b.comunidade, 'pt-BR'));
  $('#f-comm').innerHTML = '<option value="">Adicionar comunidade ao plano...</option>' +
    pool.map(c => `<option value="${keyOf(c)}">${c.prioritaria ? '★ ' : ''}${c.comunidade} · ${c.cidade}/${c.uf}</option>`).join('');
}
function findByKey(k) { return TODAS.find(c => keyOf(c) === k); }

/* =========================================================================
   PLANO DE COMUNIDADES
   ========================================================================= */
function adicionarComunidade(k) {
  if (State.plano.some(p => p.key === k)) return;
  const c = findByKey(k); if (!c) return;
  const item = { key: k, ...c, marker: null, latlng: null, circle: null, poly: null,
    comercios: [], descoberto: false, placas: 1, dias: MODELO.DIAS_PADRAO, invest: 0, visib: MODELO.VISIBILIDADE };
  State.plano.push(item);
  renderPlano(); unlockRoutes(true); hideMapHint();
  if (mapsReady) geocodeComunidade(item);
}
function removerComunidade(k) {
  const i = State.plano.findIndex(p => p.key === k); if (i < 0) return;
  const it = State.plano[i];
  if (it.marker) it.marker.setMap(null);
  if (it.circle) it.circle.setMap(null);
  it.comercios.forEach(cm => cm.marker && cm.marker.setMap(null));
  State.plano.splice(i, 1);
  renderPlano();
  if (!State.plano.length) { unlockRoutes(false); State.rotaAtiva = null; ROTAS.forEach(r => { const el = $('#count-' + r.id); if (el) el.textContent = '0'; }); }
}
function renderPlano() {
  const panel = $('#commerces-panel');
  if (!State.plano.length) { panel.innerHTML = '<div class="note">Adicione uma comunidade ao plano para listar e buscar todos os comércios salvos.</div>'; return; }
  let html = '<div class="chip-list">';
  State.plano.forEach(p => {
    const total = p.comercios.length, sel = p.comercios.filter(c => c.sel).length;
    html += `<div class="comm-chip">
      <div class="meta"><b>${p.prioritaria ? '★ ' : ''}${p.comunidade}</b>
        <span>${p.cidade}/${p.uf} · ${p.descoberto ? `${sel}/${total} comércios` : 'buscando comércios…'}</span></div>
      <button class="x" data-k="${p.key}" title="Remover">&times;</button></div>`;
  });
  html += '</div>';
  // resumo agregado + ação
  const totalSel = State.plano.reduce((a, p) => a + p.comercios.filter(c => c.sel).length, 0);
  if (totalSel) html += `<button class="btn-block" id="btn-sim" style="margin-top:10px;border-color:var(--accent);color:var(--accent)">Ver simulador de impacto (${totalSel} comércios)</button>`;
  panel.innerHTML = html;
  $$('.comm-chip .x', panel).forEach(b => b.addEventListener('click', () => removerComunidade(b.dataset.k)));
  const simBtn = $('#btn-sim', panel); if (simBtn) simBtn.addEventListener('click', () => showView('impactos'));
}

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
  $('#map').innerHTML = `<div class="map-missing"><div class="box"><h3>Configure o Google Maps</h3>
    <p>${msg || 'Para ativar o mapa e os comércios, cole sua chave da API do Google Maps em'} <code>CONFIG.GOOGLE_MAPS_API_KEY</code>${msg ? '' : ' no <code>app.js</code>.'}</p></div></div>`;
  const h = $('#map-hint'); if (h) h.classList.add('hidden');
}
function initMap() {
  map = new google.maps.Map($('#map'), {
    center: CONFIG.MAP_CENTER, zoom: CONFIG.MAP_ZOOM, mapTypeId: google.maps.MapTypeId.HYBRID,
    mapTypeControl: true, streetViewControl: true, fullscreenControl: true, zoomControl: true,
    mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_LEFT },
  });
  geocoder = new google.maps.Geocoder();
  placesService = new google.maps.places.PlacesService(map);
  mapsReady = true;
  State.plano.forEach(geocodeComunidade);
  setupAutocomplete();
  setTimeout(nudgeMap, 500);
  google.maps.event.addListenerOnce(map, 'idle', nudgeMap);
}
function nudgeMap() { if (!map) return; google.maps.event.trigger(map, 'resize'); map.panBy(0, 1); map.panBy(0, -1); }

function geocodeComunidade(item) {
  if (!geocoder || item.latlng) return;
  geocoder.geocode({ address: `${item.comunidade}, ${item.cidade}, ${item.uf}, Brasil` }, (res, status) => {
    if (status === 'OK' && res[0]) {
      const loc = res[0].geometry.location;
      item.latlng = loc;
      item.marker = new google.maps.Marker({
        map, position: loc, title: item.comunidade, zIndex: 999,
        icon: { path: 'M 0,-11 3,-3 11,-3 5,2 7,10 0,5 -7,10 -5,2 -11,-3 -3,-3 z', fillColor: '#FBBF24', fillOpacity: 1, strokeColor: '#000', strokeWeight: 1.5, scale: 1.1 },
      });
      // círculo da comunidade (área de análise)
      item.circle = new google.maps.Circle({
        map, center: loc, radius: 900, strokeColor: '#FBBF24', strokeOpacity: .7, strokeWeight: 1.5,
        fillColor: '#FBBF24', fillOpacity: .06, clickable: false,
      });
      fitPlano();
      descobrirComercios(item);
    }
  });
}
function fitPlano() {
  const pts = State.plano.filter(p => p.latlng); if (!pts.length || !map) return;
  if (pts.length === 1) { map.setCenter(pts[0].latlng); map.setZoom(15); setTimeout(nudgeMap, 150); return; }
  const b = new google.maps.LatLngBounds(); pts.forEach(p => b.extend(p.latlng)); map.fitBounds(b, 80); setTimeout(nudgeMap, 150);
}
function fitComerciosDaRota(rid) {
  const cms = [];
  State.plano.forEach(p => p.comercios.forEach(c => { if (c.rota === rid) cms.push(c); }));
  if (!cms.length || !map) return;
  const b = new google.maps.LatLngBounds(); cms.forEach(c => b.extend(c.latlng)); map.fitBounds(b, 60);
}

/* Descobre TODOS os comércios (todas as rotas) ao redor da comunidade. */
function descobrirComercios(comm) {
  if (!mapsReady || comm.descoberto) return;
  const buscas = [];
  Object.entries(CATEGORIAS).forEach(([nome, c]) => buscas.push({ categoria: nome, base: c.base, rota: c.rota, kw: c.kw[0] }));
  let pending = buscas.length; const seen = new Set();
  const found = [];
  buscas.forEach(b => {
    placesService.nearbySearch({ location: comm.latlng, radius: 1200, keyword: b.kw }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        results.slice(0, 18).forEach((pl, idx) => {
          if (seen.has(pl.place_id)) return; seen.add(pl.place_id);
          found.push({ pl, cat: b });
        });
      }
      if (--pending <= 0) finalizarDescoberta(comm, found);
    });
  });
}
let _cmId = 0;
function finalizarDescoberta(comm, found) {
  // ordena por rating count desc para definir "top" por categoria
  const porCat = {};
  found.forEach(f => (porCat[f.cat.categoria] = porCat[f.cat.categoria] || []).push(f));
  Object.values(porCat).forEach(list => list.sort((a, b) => (b.pl.user_ratings_total || 0) - (a.pl.user_ratings_total || 0)));
  comm.comercios = [];
  Object.entries(porCat).forEach(([cat, list]) => {
    const nTop = Math.max(1, Math.round(list.length * 0.3));
    list.forEach((f, i) => {
      const loc = f.pl.geometry && f.pl.geometry.location; if (!loc) return;
      const { passantes, score } = passantesDoComercio(f.cat.base, f.pl.user_ratings_total, i < nTop);
      const rota = ROTAS.find(r => r.id === f.cat.rota);
      const cm = { _id: _cmId++, commKey: comm.key, rota: f.cat.rota, cor: rota.cor, categoria: cat,
        nome: f.pl.name, endereco: f.pl.vicinity || '', latlng: loc, passantes, score, sel: true, marker: null };
      cm.marker = new google.maps.Marker({
        map, position: loc, title: f.pl.name,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: rota.cor, fillOpacity: 1, strokeColor: '#0b0b0c', strokeWeight: 1.5 },
      });
      cm.marker.addListener('click', () => toggleComercio(comm.key, cm._id));
      const iw = new google.maps.InfoWindow();
      cm.iw = iw;
      cm.marker.addListener('mouseover', () => { iw.setContent(`<div class="place-pop"><h4>${cm.nome}</h4><div class="addr">${cm.categoria} · ${nf.format(cm.passantes)} pass./dia · score ${cm.score}</div></div>`); iw.open(map, cm.marker); });
      cm.marker.addListener('mouseout', () => iw.close());
      comm.comercios.push(cm);
    });
  });
  comm.descoberto = true;
  atualizarContadoresRota();
  renderPlano();
}
function atualizarContadoresRota() {
  ROTAS.forEach(r => {
    let n = 0; State.plano.forEach(p => p.comercios.forEach(c => { if (c.rota === r.id && c.sel) n++; }));
    const el = $('#count-' + r.id); if (el) el.textContent = n;
  });
}
function toggleComercio(commKey, id) {
  const comm = State.plano.find(p => p.key === commKey); if (!comm) return;
  const cm = comm.comercios.find(c => c._id === id); if (!cm) return;
  cm.sel = !cm.sel;
  cm.marker.setOpacity(cm.sel ? 1 : 0.35);
  atualizarContadoresRota(); renderPlano();
}

/* Busca livre */
function setupAutocomplete() {
  const input = $('#place-search');
  const ac = new google.maps.places.Autocomplete(input, { fields: ['geometry', 'name', 'formatted_address'], componentRestrictions: { country: 'br' } });
  ac.addListener('place_changed', () => {
    const p = ac.getPlace(); if (!p.geometry) return;
    if (searchMarker) searchMarker.setMap(null);
    map.setCenter(p.geometry.location); map.setZoom(16);
    searchMarker = new google.maps.Marker({ map, position: p.geometry.location, title: p.name });
  });
}

/* =========================================================================
   SIMULADOR DE IMPACTO (view Impactos)
   ========================================================================= */
function escoposComSelecao() {
  return State.plano.filter(p => p.comercios.some(c => c.sel)).map(p => {
    const sel = p.comercios.filter(c => c.sel);
    const somaPass = sel.reduce((a, c) => a + c.passantes, 0);
    const scoreMed = sel.length ? Math.round(sel.reduce((a, c) => a + c.score, 0) / sel.length) : 0;
    return { comm: p, sel, somaPass, scoreMed };
  });
}
function metricasEscopo(e) {
  const p = e.comm;
  const impactos = impactosDe(e.somaPass, p.dias, p.placas, p.visib);
  const alcance = alcanceDe(e.somaPass, p.dias, p.visib);
  const freq = frequenciaDe(impactos, alcance);
  const cpm = cpmDe(p.invest, impactos);
  return { impactos, alcance, freq, cpm };
}
function renderSimulador() {
  const wrap = $('#view-impactos .container'); if (!wrap) return;
  const escopos = escoposComSelecao();
  if (!escopos.length) {
    wrap.innerHTML = `<h1 class="view-title">Simulador de Impacto OOH</h1>
      <p class="view-sub">Metodologia por comércios · raio de análise ${MODELO.RAIO} m.</p>
      <div class="card"><div class="note">Adicione uma comunidade no mapa e selecione comércios para simular. Volte ao mapa, escolha a favela em <b>Filtrar</b> e os comércios aparecem automaticamente.</div></div>`;
    return;
  }
  // KPIs agregados
  let totPass = 0, totImp = 0, totAlc = 0, totInv = 0, totCom = 0;
  const metr = escopos.map(e => { const m = metricasEscopo(e); totPass += e.somaPass; totImp += m.impactos; totAlc += m.alcance; totInv += e.comm.invest; totCom += e.sel.length; return m; });
  const cpmCons = cpmDe(totInv, totImp);
  const ponto = totPass / Math.max(1, escopos.reduce((a, e) => a + e.sel.length, 0));

  let html = `<h1 class="view-title">Simulador de Impacto OOH</h1>
    <p class="view-sub">Estimativas a partir de comércios selecionados · raio ${MODELO.RAIO} m · ${escopos.length} favela(s).</p>`;

  html += `<div class="card" style="border-color:rgba(74,222,128,.35);background:rgba(74,222,128,.05)">
     <div style="color:#4ade80;font-weight:700;font-size:13px">Ponto forte</div>
     <div style="color:var(--muted);font-size:12.5px;margin-top:4px">Circulação estimada de <b style="color:#fff">${nf.format(Math.round(ponto))} pass./dia</b> por ponto e densidade comercial no raio de ${MODELO.RAIO} m.</div></div>`;

  html += `<div class="results-grid">
    ${kpi('Passantes/dia (soma)', nf.format(Math.round(totPass)), 'todas as favelas')}
    ${kpi('Impactos (soma)', nf.format(Math.round(totImp)), 'escopos somados')}
    ${kpi('Alcance (soma)', nf.format(Math.round(totAlc)), 'pessoas alcançadas')}
    ${kpi('Investimento · CPM', cf.format(totInv) + ' · ' + cf.format(cpmCons), 'com investimento')}
  </div>`;

  html += `<div class="step" style="margin:10px 0 12px">Simulador OOH por favela</div>`;
  escopos.forEach((e, i) => {
    const p = e.comm, m = metr[i];
    html += `<div class="card" data-esc="${p.key}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div><b style="font-size:16px">${p.comunidade}</b>
          <div style="color:var(--muted);font-size:11.5px;margin-top:2px">${e.sel.length} comércios · ${nf.format(Math.round(e.somaPass))} pass./dia · score méd. ${e.scoreMed}</div></div>
        <span class="tb-badge" style="background:#222;color:var(--muted)">${potencialLabel(e.somaPass / Math.max(1, e.sel.length))}</span>
      </div>
      <div class="grid-2" style="grid-template-columns:1fr 1fr;margin-top:14px">
        <div><label class="lbl">Placas por ponto</label><input class="inp sim-in" data-f="placas" data-k="${p.key}" type="number" min="1" value="${p.placas}"></div>
        <div><label class="lbl">Dias de campanha</label><input class="inp sim-in" data-f="dias" data-k="${p.key}" type="number" min="1" value="${p.dias}"></div>
      </div>
      <label class="lbl" style="margin-top:12px">Investimento deste escopo (R$)</label>
      <input class="inp sim-in" data-f="invest" data-k="${p.key}" type="text" value="${p.invest ? cf.format(p.invest).replace('R$','').trim() : ''}" placeholder="0,00">
      <div class="results-grid" style="grid-template-columns:1fr 1fr;margin-top:14px">
        ${kpi('Impactos', nf.format(Math.round(m.impactos)))}
        ${kpi('Alcance', nf.format(Math.round(m.alcance)))}
        ${kpi('Frequência', m.freq.toFixed(2))}
        ${kpi('CPM', m.cpm ? cf.format(m.cpm) : '—')}
      </div>
      <label class="lbl" style="margin-top:14px">Fator visibilidade — ${p.visib.toFixed(2)}</label>
      <input type="range" class="sim-in" data-f="visib" data-k="${p.key}" min="0.1" max="0.9" step="0.01" value="${p.visib}" style="width:100%">
    </div>`;
  });

  html += `<button class="btn-accent" id="add-escopos" style="width:100%;margin-top:6px">Adicionar ${escopos.length} escopo(s) à proposta</button>
    <button class="btn-outline" id="ver-carrinho" style="width:100%;margin-top:10px">Ver carrinho / exportar PDF</button>`;

  wrap.innerHTML = html;

  // binds
  $$('.sim-in', wrap).forEach(inp => {
    const ev = inp.type === 'range' ? 'input' : 'change';
    inp.addEventListener(ev, () => {
      const p = State.plano.find(x => x.key === inp.dataset.k); if (!p) return;
      const f = inp.dataset.f;
      if (f === 'placas') p.placas = Math.max(1, parseInt(inp.value, 10) || 1);
      else if (f === 'dias') p.dias = Math.max(1, parseInt(inp.value, 10) || 1);
      else if (f === 'invest') p.invest = parseMoney(inp.value);
      else if (f === 'visib') p.visib = parseFloat(inp.value);
      renderSimulador();
    });
  });
  $('#add-escopos', wrap).addEventListener('click', () => {
    escopos.forEach(e => {
      const m = metricasEscopo(e), p = e.comm;
      const mix = {}; e.sel.forEach(c => mix[c.categoria] = (mix[c.categoria] || 0) + 1);
      State.carrinho.push({
        comunidade: p.comunidade, cidade: p.cidade, uf: p.uf, comercios: e.sel.length,
        passantes: Math.round(e.somaPass), impactos: Math.round(m.impactos), alcance: Math.round(m.alcance),
        freq: m.freq, cpm: m.cpm, placas: p.placas, dias: p.dias, invest: p.invest, visib: p.visib,
        scoreMed: e.scoreMed, mix, pontos: e.sel.map(c => ({ nome: c.nome, categoria: c.categoria, passantes: c.passantes, score: c.score, impactos: Math.round(impactosDe(c.passantes, p.dias, p.placas, p.visib)), latlng: { lat: c.latlng.lat(), lng: c.latlng.lng() } })),
      });
    });
    updateCart(); openDrawer();
  });
  $('#ver-carrinho', wrap).addEventListener('click', openDrawer);
}
function kpi(label, val, sub) {
  return `<div class="result-box"><div class="rl" style="text-transform:uppercase;letter-spacing:.5px">${label}</div>
    <div class="rv" style="font-size:22px;margin-top:4px">${val}</div>${sub ? `<div class="rl" style="margin-top:2px">${sub}</div>` : ''}</div>`;
}

/* =========================================================================
   PROPOSTA (carrinho) + PDF
   ========================================================================= */
function bindProposta() {
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#drawer-mask').addEventListener('click', closeDrawer);
  $('#cart-clear').addEventListener('click', () => { State.carrinho = []; updateCart(); });
  $('#cart-export').addEventListener('click', exportarPropostaPDF);
}
function openDrawer() { $('#drawer').classList.add('open'); $('#drawer-mask').classList.add('open'); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer-mask').classList.remove('open'); }
function updateCart() {
  const n = State.carrinho.length;
  $('#cart-badge').textContent = n; $('#cart-title').textContent = `Carrinho (${n})`;
  const body = $('#cart-body');
  if (!n) { body.innerHTML = '<div class="empty">Nenhuma seleção salva ainda. Faça as estimativas no simulador e clique em <b>Adicionar à proposta</b>.</div>'; }
  else {
    body.innerHTML = State.carrinho.map((it, idx) => `<div class="cart-item">
      <div class="ci-top"><div><b>${it.comunidade}</b><div class="ci-sub">${it.comercios} comércios · ${it.placas} placa(s) · ${it.dias} dia(s)</div></div>
        <button class="ci-x" data-i="${idx}">&times;</button></div>
      <div class="ci-stats"><div><span>Impactos</span><b>${nf.format(it.impactos)}</b></div>
        <div><span>Alcance</span><b>${nf.format(it.alcance)}</b></div>
        <div><span>Investimento</span><b>${it.invest ? cf.format(it.invest) : '—'}</b></div></div></div>`).join('');
    $$('.ci-x', body).forEach(b => b.addEventListener('click', () => { State.carrinho.splice(parseInt(b.dataset.i, 10), 1); updateCart(); }));
  }
  $('#cart-total-imp').textContent = nf.format(State.carrinho.reduce((a, it) => a + it.impactos, 0));
  $('#cart-total-val').textContent = cf.format(State.carrinho.reduce((a, it) => a + it.invest, 0));
}

function exportarPropostaPDF() {
  if (!State.carrinho.length) { alert('O carrinho está vazio.'); return; }
  const C = State.carrinho;
  const totCom = C.reduce((a, e) => a + e.comercios, 0);
  const totPass = C.reduce((a, e) => a + e.passantes, 0);
  const totImp = C.reduce((a, e) => a + e.impactos, 0);
  const totAlc = C.reduce((a, e) => a + e.alcance, 0);
  const totInv = C.reduce((a, e) => a + e.invest, 0);
  const cpmCons = totImp > 0 ? (totInv / totImp) * 1000 : 0;
  const dataStr = new Date().toLocaleString('pt-BR');
  const key = CONFIG.GOOGLE_MAPS_API_KEY;

  const capaKPIs = [
    ['COMÉRCIOS', nf.format(totCom)], ['ESCOPOS / FAVELAS', String(C.length)],
    ['PASSANTES/DIA', nf.format(totPass)], ['IMPACTOS (SOMA)', nf.format(totImp)],
    ['ALCANCE (SOMA)', nf.format(totAlc)], ['INVESTIMENTO / CPM', cf.format(totInv) + ' · ' + cf.format(cpmCons)],
  ].map(([k, v]) => `<div class="kpi"><div class="kl">${k}</div><div class="kv">${v}</div></div>`).join('');

  const escoposHTML = C.map((e, idx) => {
    const mix = Object.entries(e.mix).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<span class="mix">${c} <b>${n}</b></span>`).join(' ');
    const top = e.pontos.slice().sort((a, b) => b.impactos - a.impactos).slice(0, 6);
    const rows = top.map((p, i) => `<tr><td>${i + 1}</td><td><b>${p.nome}</b><br><small>${p.categoria}</small></td>
      <td class="r">${nf.format(p.passantes)}</td><td class="r">${p.score}</td><td class="r">${nf.format(p.impactos)}</td></tr>`).join('');
    const restantes = e.pontos.length - top.length;
    const marks = e.pontos.slice(0, 60).map(p => `markers=size:tiny%7Ccolor:0x38bdf8%7C${p.latlng.lat},${p.latlng.lng}`).join('&');
    const staticMap = key ? `https://maps.googleapis.com/maps/api/staticmap?size=640x300&scale=2&maptype=hybrid&${marks}&key=${key}` : '';
    return `<section class="page">
      <div class="tag">ESCOPO ${idx + 1}</div>
      <h2>${e.comunidade}</h2><div class="sub">${e.comercios} comércios · ${e.cidade}/${e.uf}</div>
      <div class="grid6">
        ${miniKpi('PASSANTES/DIA', nf.format(e.passantes))}${miniKpi('IMPACTOS', nf.format(e.impactos))}
        ${miniKpi('ALCANCE', nf.format(e.alcance))}${miniKpi('CPM', e.cpm ? cf.format(e.cpm) : '—')}
        ${miniKpi('PLACAS / PONTO', e.placas)}${miniKpi('DIAS', e.dias)}
        ${miniKpi('INVESTIMENTO', e.invest ? cf.format(e.invest) : '—')}${miniKpi('VISIBILIDADE', e.visib.toFixed(2))}${miniKpi('RAIO', MODELO.RAIO + ' m')}
      </div>
      <div class="mixbox"><div class="lbl2">Mix por categoria</div>${mix}</div>
      <div class="lbl2" style="margin-top:14px">Principais pontos do escopo</div>
      <div class="hint2">Ordenados por impacto estimado — visão executiva (não é o inventário completo).</div>
      <table><thead><tr><th>#</th><th>Ponto</th><th class="r">Pass./dia</th><th class="r">Score</th><th class="r">Impactos</th></tr></thead><tbody>${rows}</tbody></table>
      ${restantes > 0 ? `<div class="more">+ ${restantes} comércios adicionais neste escopo (detalhados no inventário ao final).</div>` : ''}
      ${staticMap ? `<div class="lbl2" style="margin-top:16px">Anexo visual — mapa do plano</div><img class="mapimg" src="${staticMap}" alt="Mapa">` : ''}
    </section>`;
  }).join('');

  // inventário por categoria
  const invHTML = C.map(e => {
    const porCat = {}; e.pontos.forEach(p => (porCat[p.categoria] = porCat[p.categoria] || []).push(p));
    const cats = Object.entries(porCat).map(([cat, list]) => {
      list.sort((a, b) => b.passantes - a.passantes);
      return `<div class="lbl2" style="margin-top:10px">${cat} (${list.length})</div>` +
        list.map(p => `<div class="invrow"><span>${p.nome}</span><b>${nf.format(p.passantes)} pass./dia</b></div>`).join('');
    }).join('');
    return `<section class="page"><div class="tag">INVENTÁRIO</div><h2>${e.comunidade} · ${e.pontos.length} pontos</h2>${cats}</section>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Proposta Executiva OOH — Perifa Mídia</title>
  <style>
   @page{margin:16mm}
   *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0}
   .brandbar{display:flex;align-items:center;gap:10px;margin-bottom:14px}
   .brandbar b{background:#FBBF24;padding:2px 8px;border-radius:5px;font-size:13px}
   .brandbar span{font-weight:800;letter-spacing:.5px;font-size:13px;text-transform:uppercase}
   .page{padding:6mm 0;page-break-after:always;border-top:2px solid #111}
   .page:first-of-type{border-top:none}
   h1{font-size:24px;margin:6px 0 4px} h2{font-size:20px;margin:4px 0} .sub{color:#666;margin-bottom:14px;font-size:13px}
   .tag{font-size:11px;letter-spacing:1.5px;color:#888;font-weight:700}
   .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
   .kpi{border:1px solid #ddd;border-radius:8px;padding:12px} .kl{font-size:10px;color:#888;letter-spacing:.5px;text-transform:uppercase} .kv{font-size:22px;font-weight:800;margin-top:4px}
   .grid6{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
   .mk{border:1px solid #eee;border-radius:7px;padding:8px} .mkl{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.4px} .mkv{font-size:15px;font-weight:700;margin-top:2px}
   .mixbox{margin-top:14px;border:1px solid #eee;border-radius:8px;padding:10px} .lbl2{font-size:11px;letter-spacing:.8px;text-transform:uppercase;color:#666;font-weight:700} .hint2{font-size:11px;color:#999;margin:2px 0 6px}
   .mix{display:inline-block;background:#f6f6f4;border-radius:20px;padding:3px 9px;font-size:12px;margin:3px 3px 0 0} .mix b{color:#111}
   table{width:100%;border-collapse:collapse;margin-top:6px} th,td{border-bottom:1px solid #eee;padding:7px 6px;font-size:12px;text-align:left} th{background:#faf3cf;font-size:10px;text-transform:uppercase} td.r,th.r{text-align:right} small{color:#999}
   .more{font-size:11px;color:#888;margin-top:8px}
   .mapimg{width:100%;border-radius:8px;margin-top:6px;border:1px solid #eee}
   .invrow{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid #f2f2f2} .invrow b{color:#333;white-space:nowrap;margin-left:10px}
   .foot{color:#999;font-size:10px;margin-top:14px}
   @media print{button{display:none}}
  </style></head><body>
  <section class="page">
    <div class="brandbar"><span>Perifa</span><b>Mídia</b><span style="color:#888">· Proposta Executiva OOH</span></div>
    <h1>Plano de mídia outdoor em comunidades</h1>
    <div class="sub">Estimativas de impacto a partir de comércios selecionados · análise com raio de ${MODELO.RAIO} m · ${C.map(e=>e.comunidade).join(' · ')} · gerado em ${dataStr}</div>
    <div class="kpis">${capaKPIs}</div>
    <div class="foot">Plataforma OOH · valores estimados para apoio à decisão de mídia. Não constitui medição auditada de audiência.</div>
  </section>
  ${escoposHTML}
  ${invHTML}
  <div style="padding:10mm 0"><button onclick="window.print()" style="padding:12px 22px;background:#FBBF24;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px">Imprimir / Salvar em PDF</button></div>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Permita pop-ups para exportar a proposta.'); return; }
  w.document.write(html); w.document.close();
}
function miniKpi(l, v) { return `<div class="mk"><div class="mkl">${l}</div><div class="mkv">${v}</div></div>`; }

/* =========================================================================
   LIMPAR
   ========================================================================= */
function limparTudo() {
  State.plano.forEach(p => { p.marker && p.marker.setMap(null); p.circle && p.circle.setMap(null); p.comercios.forEach(c => c.marker && c.marker.setMap(null)); });
  if (searchMarker) { searchMarker.setMap(null); searchMarker = null; }
  State.plano = []; State.rotaAtiva = null;
  renderPlano(); unlockRoutes(false);
  ROTAS.forEach(r => { const el = $('#count-' + r.id); if (el) el.textContent = '0'; });
  $('#f-uf').value = ''; fillCity(); fillComm();
  showMapHint();
  if (map) { map.setCenter(CONFIG.MAP_CENTER); map.setZoom(CONFIG.MAP_ZOOM); }
}
function hideMapHint() { const h = $('#map-hint'); if (h) h.style.display = 'none'; }
function showMapHint() { const h = $('#map-hint'); if (h && CONFIG.GOOGLE_MAPS_API_KEY) h.style.display = 'flex'; }
