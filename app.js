/* ============================================================================
   app.js — Prode Mundial 2026 (fase de grupos)
   ----------------------------------------------------------------------------
   Vanilla JS, sin frameworks ni dependencias. El estado en memoria manda; el
   localStorage es solo persistencia (envuelto en try/catch para que degrade
   sin romper si está bloqueado, p. ej. en un sandbox de vista previa).

   Estructura:
     - Estado + persistencia (loadResults / saveResults)
     - Lógica de resultado (effResult / isLive / verdict)
     - Cálculos (tracker / standings)
     - Render (tickets, tabla, secciones por fecha o por grupo)
     - Editor (carga manual de resultados con <dialog> nativo)
     - Sync opcional con TheSportsDB (beta, defensivo, solo rellena pendientes)
   ============================================================================ */
(function () {
  "use strict";

  /* ----------------------------- Datos ----------------------------------- */
  var DATA    = window.PRODE_DATA || { updated: "", groups: {}, matches: [] };
  var GROUPS  = DATA.groups;
  var MATCHES = DATA.matches;
  var STORAGE_KEY = "prode2026:results";

  // id estable por partido: "G-F-Local-Visita"
  MATCHES.forEach(function (m) { m.id = m.g + "-" + m.f + "-" + m.h + "-" + m.a; });

  /* --------------------------- Helpers DOM -------------------------------- */
  function byId(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ------------------------------ Estado ---------------------------------- */
  var view = "fecha";        // 'fecha' | 'grupo'
  var results = loadResults(); // mapa { matchId: [local, visita] }
  var editId = null;         // partido abierto en el editor

  function loadResults() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : {};
    } catch (e) { return {}; }
  }
  function saveResults() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(results)); }
    catch (e) { /* almacenamiento bloqueado: seguimos solo en memoria */ }
  }
  function hasUser(m) { return Object.prototype.hasOwnProperty.call(results, m.id); }

  /* -------------------------- Lógica resultado ---------------------------- */
  // Resultado efectivo: la carga del usuario pisa la semilla; si no, la semilla.
  function effResult(m) { return hasUser(m) ? results[m.id] : m.r; }
  // En vivo solo si la semilla lo marca y nadie cargó nada todavía.
  function isLive(m) { return !!m.live && !hasUser(m) && m.r == null; }

  function sign(a, b) { return a > b ? 1 : (a < b ? -1 : 0); }
  function verdict(m) {
    if (isLive(m)) return "live";
    var r = effResult(m);
    if (!r) return "pending";
    if (r[0] === m.p[0] && r[1] === m.p[1]) return "exact";
    if (sign(r[0], r[1]) === sign(m.p[0], m.p[1])) return "winner";
    return "miss";
  }

  /* ------------------------------ Tracker --------------------------------- */
  function tracker() {
    var played = 0, winners = 0, exacts = 0;
    MATCHES.forEach(function (m) {
      if (isLive(m)) return;
      var r = effResult(m);
      if (!r) return;
      played++;
      var v = verdict(m);
      if (v === "exact") { exacts++; winners++; }
      else if (v === "winner") { winners++; }
    });
    var pct = played ? Math.round((winners / played) * 100) : 0;
    return { played: played, winners: winners, exacts: exacts, pct: pct };
  }

  /* ----------------------------- Standings -------------------------------- */
  // 3-1-0. Desempate: Pts -> DG -> GF -> orden oficial del grupo (estable).
  function standings(group) {
    var teams = (GROUPS[group] || []).map(function (t, i) {
      return {
        name: t[0], rank: t[1], order: i,
        pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, dg: 0
      };
    });
    var byName = {};
    teams.forEach(function (t) { byName[t.name] = t; });

    MATCHES.forEach(function (m) {
      if (m.g !== group || isLive(m)) return;
      var r = effResult(m);
      if (!r) return;
      var H = byName[m.h], A = byName[m.a];
      if (!H || !A) return;
      H.pj++; A.pj++;
      H.gf += r[0]; H.gc += r[1];
      A.gf += r[1]; A.gc += r[0];
      if (r[0] > r[1]) { H.g++; A.p++; H.pts += 3; }
      else if (r[0] < r[1]) { A.g++; H.p++; A.pts += 3; }
      else { H.e++; A.e++; H.pts++; A.pts++; }
    });
    teams.forEach(function (t) { t.dg = t.gf - t.gc; });
    teams.sort(function (a, b) {
      return (b.pts - a.pts) || (b.dg - a.dg) || (b.gf - a.gf) || (a.order - b.order);
    });
    return teams;
  }

  /* ----------------------------- Formato ---------------------------------- */
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  function fmtDate(iso) {
    var p = String(iso).split("-"); // split manual: evita corrimientos por zona horaria
    if (p.length !== 3) return iso;
    var dia = parseInt(p[2], 10);
    var mes = parseInt(p[1], 10) - 1;
    return dia + " " + (MESES[mes] || "");
  }
  function scoreHTML(a, b, kind) {
    return '<span class="score ' + kind + '">' +
      esc(a) + '<span class="sep">:</span>' + esc(b) +
      '</span>';
  }
  function chipHTML(v) {
    switch (v) {
      case "exact":  return '<span class="chip exact">🎯 Exacto</span>';
      case "winner": return '<span class="chip winner">✅ Ganador</span>';
      case "miss":   return '<span class="chip miss">❌ Fallado</span>';
      case "live":   return '<span class="chip live"><span class="pulse"></span>En vivo</span>';
      default:       return '<span class="chip pending">⏳ Pendiente</span>';
    }
  }
  function ariaLabel(m) {
    var v = verdict(m);
    var vl = { exact: "pronóstico exacto", winner: "ganador acertado", miss: "fallado", live: "en vivo", pending: "pendiente" }[v];
    var r = effResult(m);
    var real = isLive(m) ? "en juego" : (r ? ("resultado " + r[0] + " a " + r[1]) : "sin resultado");
    return "Grupo " + m.g + ", fecha " + m.f + ". " + m.h + " contra " + m.a +
      ". Mi pronóstico " + m.p[0] + " a " + m.p[1] + ". " + real +
      ". Veredicto: " + vl + ". Tocá para cargar o editar el resultado.";
  }

  /* ------------------------------ Tickets --------------------------------- */
  function ticketHTML(m) {
    var v = effResult(m);
    var live = isLive(m);
    var vd = verdict(m);

    var realRead;
    if (live)       realRead = '<span class="live-now">En vivo</span>';
    else if (v)     realRead = scoreHTML(v[0], v[1], "ink");
    else            realRead = '<span class="pend">⏳</span>';

    var conf = (typeof m.c === "number") ? m.c : 0;
    var pct = Math.max(0, Math.min(100, conf * 10));

    return '' +
      '<button type="button" class="ticket v-' + vd + '" data-id="' + esc(m.id) + '" ' +
        'aria-label="' + esc(ariaLabel(m)) + '">' +
        '<div class="t-meta">' +
          '<div class="tags">' +
            '<span class="tag grp">Grupo ' + esc(m.g) + '</span>' +
            '<span class="tag">Fecha ' + esc(m.f) + '</span>' +
            '<span class="tag">' + esc(fmtDate(m.d)) + '</span>' +
          '</div>' +
          chipHTML(vd) +
        '</div>' +
        '<div class="t-perf"></div>' +
        '<div class="t-teams">' +
          '<span class="team home">' + esc(m.h) + '</span>' +
          '<span class="vs">vs</span>' +
          '<span class="team away">' + esc(m.a) + '</span>' +
        '</div>' +
        '<div class="t-board">' +
          '<div class="read">' +
            '<span class="rk">Mi prode</span>' +
            scoreHTML(m.p[0], m.p[1], "amber") +
          '</div>' +
          '<div class="bdiv"></div>' +
          '<div class="read">' +
            '<span class="rk">Real</span>' +
            realRead +
          '</div>' +
        '</div>' +
        '<div class="t-conf">' +
          '<span class="cl">Conf</span>' +
          '<span class="bar"><span class="fill" style="width:' + pct + '%"></span></span>' +
          '<span class="cv">' + conf.toFixed(1) + '</span>' +
        '</div>' +
      '</button>';
  }

  /* --------------------------- Tabla (HTML) ------------------------------- */
  function standingsHTML(group) {
    var rows = standings(group).map(function (t, i) {
      var cls = i < 2 ? "q" : (i === 2 ? "third" : "out");
      var dg = (t.dg > 0 ? "+" : "") + t.dg;
      var rec = t.pj + " PJ · " + t.g + "-" + t.e + "-" + t.p + " · " + t.gf + ":" + t.gc;
      return '' +
        '<div class="st-row ' + cls + '">' +
          '<span class="st-pos">' + (i + 1) + '</span>' +
          '<div class="st-team">' +
            '<span class="st-name">' + esc(t.name) + '</span>' +
            '<span class="st-rec">' + esc(rec) + '</span>' +
          '</div>' +
          '<span class="st-dg">' + dg + '</span>' +
          '<span class="st-pts">' + t.pts + '</span>' +
        '</div>';
    }).join("");

    return '' +
      '<div class="standings">' +
        '<div class="st-head">' +
          '<span class="r">#</span>' +
          '<span>Equipo · PJ · G-E-P · GF:GC</span>' +
          '<span class="r">DG</span>' +
          '<span class="r">Pts</span>' +
        '</div>' +
        rows +
      '</div>';
  }

  /* ------------------------------ Render ---------------------------------- */
  function byDateThenGroup(a, b) {
    return a.d < b.d ? -1 : (a.d > b.d ? 1 : (a.g < b.g ? -1 : (a.g > b.g ? 1 : 0)));
  }
  function playedCount(list) {
    var n = 0;
    list.forEach(function (m) { if (!isLive(m) && effResult(m)) n++; });
    return n;
  }

  function renderByFecha() {
    var host = byId("contenido");
    host.innerHTML = "";
    [1, 2, 3].forEach(function (f) {
      var list = MATCHES.filter(function (m) { return m.f === f; }).slice().sort(byDateThenGroup);
      var sec = el("section");
      sec.innerHTML =
        '<div class="sec-h">' +
          '<span class="tick"></span>' +
          '<h2>Fecha ' + f + '</h2>' +
          '<span class="sec-sub">' + playedCount(list) + " de " + list.length + ' jugados</span>' +
        '</div>' +
        '<div class="tickets">' + list.map(ticketHTML).join("") + '</div>';
      host.appendChild(sec);
    });
  }

  function renderByGroup() {
    var host = byId("contenido");
    host.innerHTML = "";
    Object.keys(GROUPS).forEach(function (g) {
      var list = MATCHES.filter(function (m) { return m.g === g; }).slice().sort(function (a, b) {
        return (a.f - b.f) || byDateThenGroup(a, b);
      });
      var sec = el("section");
      sec.innerHTML =
        '<div class="sec-h">' +
          '<span class="tick"></span>' +
          '<h2>Grupo ' + g + '</h2>' +
          '<span class="sec-sub">' + playedCount(list) + " de " + list.length + ' jugados</span>' +
        '</div>' +
        standingsHTML(g) +
        '<div class="tickets">' + list.map(ticketHTML).join("") + '</div>';
      host.appendChild(sec);
    });
  }

  function updateTracker() {
    var t = tracker();
    var w = qs("#tk-win .v");   if (w) w.innerHTML = t.winners + "<small>/" + t.played + "</small>";
    var x = qs("#tk-exact .v"); if (x) x.textContent = t.exacts;
    var p = qs("#tk-pct .v");   if (p) p.innerHTML = t.pct + "<small>%</small>";
  }

  function render() {
    var y = window.scrollY;
    updateTracker();
    if (view === "grupo") renderByGroup(); else renderByFecha();
    window.scrollTo(0, y); // preservamos la posición de scroll al reconstruir
  }

  /* ------------------------------ Editor ---------------------------------- */
  function openEditor(id) {
    var m = MATCHES.find(function (x) { return x.id === id; });
    if (!m) return;
    editId = id;

    byId("ed-title").textContent = m.h + " vs " + m.a;
    byId("ed-sub").textContent = "Grupo " + m.g + " · Fecha " + m.f + " · " + fmtDate(m.d);
    byId("ed-home-name").textContent = m.h;
    byId("ed-away-name").textContent = m.a;
    byId("ed-pred").innerHTML = "Tu pronóstico: <b>" + m.p[0] + ":" + m.p[1] + "</b>";

    var r = effResult(m);
    byId("ed-home").value = r ? r[0] : "";
    byId("ed-away").value = r ? r[1] : "";
    byId("ed-hint").textContent = "";

    // Etiqueta y estado del botón de reset según el origen del dato.
    var reset = byId("ed-reset");
    if (hasUser(m)) {
      reset.textContent = "Borrar mi carga";
      reset.disabled = false;
      reset.dataset.mode = "clear";
    } else if (m.r != null) {
      reset.textContent = "Restaurar dato del modelo";
      reset.disabled = false;
      reset.dataset.mode = "restore";
    } else {
      reset.textContent = "Sin dato cargado";
      reset.disabled = true;
      reset.dataset.mode = "none";
    }

    var dlg = byId("editor");
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    setTimeout(function () { byId("ed-home").focus(); byId("ed-home").select(); }, 30);
  }
  function closeEditor() {
    var dlg = byId("editor");
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
    editId = null;
  }

  function readScore() {
    var hs = byId("ed-home").value.trim();
    var as = byId("ed-away").value.trim();
    if (hs === "" || as === "") return null;
    if (!/^\d{1,2}$/.test(hs) || !/^\d{1,2}$/.test(as)) return null;
    var h = parseInt(hs, 10), a = parseInt(as, 10);
    if (h < 0 || a < 0 || h > 99 || a > 99) return null;
    return [h, a];
  }

  function onEditorSubmit(e) {
    e.preventDefault(); // controlamos nosotros el cierre para poder validar
    if (!editId) return;
    var sc = readScore();
    if (!sc) {
      byId("ed-hint").textContent = "Ingresá dos números válidos (0 o más) para guardar.";
      return;
    }
    results[editId] = sc;
    saveResults();
    closeEditor();
    render();
    toast("Resultado guardado");
  }

  function onEditorReset() {
    if (!editId) return;
    var mode = byId("ed-reset").dataset.mode;
    if (mode === "clear") {
      delete results[editId];
      saveResults();
      closeEditor();
      render();
      toast("Volvé al dato base del partido");
    } else if (mode === "restore") {
      var m = MATCHES.find(function (x) { return x.id === editId; });
      if (m && m.r) {
        byId("ed-home").value = m.r[0];
        byId("ed-away").value = m.r[1];
        byId("ed-hint").textContent = "";
      }
    }
  }

  function resetAll() {
    var ok = window.confirm("¿Borrar todos los resultados que cargaste y volver a los datos del modelo?");
    if (!ok) return;
    results = {};
    saveResults();
    render();
    toast("Todo reiniciado");
  }

  /* ------------------------------ Toast ----------------------------------- */
  var toastTimer = null;
  function toast(msg) {
    var t = byId("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* --------------------- Sync opcional: TheSportsDB ----------------------- */
  // Beta y defensivo: solo rellena partidos PENDIENTES (nunca pisa semillas ni
  // cargas del usuario), con timeout, y cae en silencio si algo falla.
  var NAME_ALIASES = {
    "mexico": "México", "south korea": "Corea del Sur", "korea republic": "Corea del Sur",
    "south africa": "Sudáfrica", "czechia": "Chequia", "czech republic": "Chequia",
    "switzerland": "Suiza", "canada": "Canadá", "qatar": "Qatar",
    "bosnia and herzegovina": "Bosnia", "bosnia herzegovina": "Bosnia", "bosnia": "Bosnia",
    "brazil": "Brasil", "morocco": "Marruecos", "scotland": "Escocia", "haiti": "Haití",
    "united states": "EE.UU.", "usa": "EE.UU.", "united states of america": "EE.UU.",
    "turkey": "Turquía", "turkiye": "Turquía", "australia": "Australia", "paraguay": "Paraguay",
    "germany": "Alemania", "ecuador": "Ecuador",
    "ivory coast": "Costa de Marfil", "cote divoire": "Costa de Marfil", "cote d ivoire": "Costa de Marfil",
    "curacao": "Curazao", "netherlands": "Países Bajos", "holland": "Países Bajos",
    "japan": "Japón", "sweden": "Suecia", "tunisia": "Túnez", "belgium": "Bélgica",
    "iran": "Irán", "ir iran": "Irán", "egypt": "Egipto", "new zealand": "Nueva Zelanda",
    "spain": "España", "uruguay": "Uruguay", "saudi arabia": "Arabia Saudita",
    "cape verde": "Cabo Verde", "cabo verde": "Cabo Verde", "france": "Francia",
    "senegal": "Senegal", "norway": "Noruega", "iraq": "Irak", "argentina": "Argentina",
    "austria": "Austria", "algeria": "Argelia", "jordan": "Jordania", "portugal": "Portugal",
    "colombia": "Colombia", "dr congo": "RD Congo", "congo dr": "RD Congo",
    "democratic republic of the congo": "RD Congo", "uzbekistan": "Uzbekistán",
    "england": "Inglaterra", "croatia": "Croacia", "panama": "Panamá", "ghana": "Ghana"
  };
  function norm(s) {
    return String(s).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // saca diacríticos
      .replace(/[^a-z0-9]/g, "");                       // saca todo lo no alfanumérico
  }
  // Mapa normalizado -> nombre canónico (incluye los propios nombres en español).
  var ALIAS = {};
  (function () {
    Object.keys(NAME_ALIASES).forEach(function (k) { ALIAS[norm(k)] = NAME_ALIASES[k]; });
    Object.keys(GROUPS).forEach(function (g) {
      GROUPS[g].forEach(function (t) { ALIAS[norm(t[0])] = t[0]; });
    });
  })();
  function mapName(s) { return ALIAS[norm(s)] || null; }

  function trySync(btn) {
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Buscando…";

    var done = function (msg) {
      btn.disabled = false;
      btn.textContent = label;
      render();
      if (msg) toast(msg);
    };

    var ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
    var url = "https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=4429&s=2026";

    fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error("HTTP " + res.status)); })
      .then(function (data) {
        clearTimeout(timer);
        var events = (data && data.events) || [];
        var filled = 0;

        // Solo partidos rellenables: sin semilla y sin carga del usuario.
        var pending = MATCHES.filter(function (m) { return effResult(m) == null; });

        events.forEach(function (ev) {
          var hs = ev.intHomeScore, as = ev.intAwayScore;
          if (hs == null || as == null || hs === "" || as === "") return;
          var h = mapName(ev.strHomeTeam), a = mapName(ev.strAwayTeam);
          if (!h || !a) return;
          var match = pending.find(function (m) { return m.h === h && m.a === a; });
          if (!match) return;
          results[match.id] = [parseInt(hs, 10), parseInt(as, 10)];
          filled++;
        });

        if (filled > 0) saveResults();
        done(filled > 0
          ? ("Se completaron " + filled + (filled === 1 ? " partido" : " partidos"))
          : "No encontré resultados nuevos");
      })
      .catch(function () {
        clearTimeout(timer);
        done("No pude conectarme a la API; segui con la carga manual");
      });
  }

  /* ------------------------------- Init ----------------------------------- */
  function setView(next) {
    if (next === view) return;
    view = next;
    qs('.seg button[data-view="fecha"]').setAttribute("aria-pressed", String(view === "fecha"));
    qs('.seg button[data-view="grupo"]').setAttribute("aria-pressed", String(view === "grupo"));
    render();
  }

  function init() {
    // Toggle de vista
    qsa('.seg button[data-view]').forEach(function (b) {
      b.addEventListener("click", function () { setView(b.dataset.view); });
    });

    // Delegación: tap en cualquier ticket abre el editor
    byId("contenido").addEventListener("click", function (e) {
      var t = e.target.closest(".ticket");
      if (t && t.dataset.id) openEditor(t.dataset.id);
    });

    // Editor
    byId("ed-form").addEventListener("submit", onEditorSubmit);
    byId("ed-reset").addEventListener("click", onEditorReset);
    byId("ed-cancel").addEventListener("click", closeEditor);
    var dlg = byId("editor");
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); closeEditor(); }); // tecla Esc
    byId("ed-home").addEventListener("input", function () { byId("ed-hint").textContent = ""; });
    byId("ed-away").addEventListener("input", function () { byId("ed-hint").textContent = ""; });

    // Acciones del pie
    byId("btn-sync").addEventListener("click", function () { trySync(this); });
    byId("btn-reset").addEventListener("click", resetAll);

    render();
  }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
