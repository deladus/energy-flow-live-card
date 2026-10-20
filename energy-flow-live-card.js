/*
 * energy-flow-live-card  v1.1.0
 * Animierte Energiefluss-Karte für Home Assistant (Solar, Haus, Speicher, Netz, Wallbox ...).
 * Sprache: Deutsch und Englisch, automatisch nach der Home-Assistant-Sprache (alle anderen -> Englisch).
 * Eigene Implementierung, inspiriert von Steve-gnome/energy-flow-card.
 *
 * - Flüsse werden direkt über Sensoren definiert (z. B. "Solar zum Speicher").
 * - Knoten frei positionierbar: per left/top (in %) oder interaktiv im Layout-Modus (edit_layout: true).
 * - Eigenes Hintergrundbild (background), optional mit automatischem Seitenverhältnis (aspect_ratio: image).
 * - Quellen-Aufteilung (show_sources): zeigt im Knoten, aus welchen Quellen die Leistung kommt (z. B. Solar und Netz zur Wallbox).
 * - Ladestand (pct) steht im Knoten; Richtungstext ("lädt", "Bezug" ...) per show_state_text ein-/ausschaltbar.
 * - Knotenform: Kreis oder Rechteck mit runden Ecken (node_shape, je Knoten: shape); Schrift skaliert mit der Knotengröße.
 * - Bildwechsel nach Tageszeit (sun.sun) und Wetter (weather_entity): klar, bewölkt, Regen, starker Regen.
 */

const W = 1000; // interne Breite des SVG-Koordinatensystems

const DEFAULT_NODES = {
  // Namen und Richtungstexte kommen aus I18N (siehe defaultNode)
  solar:   { icon: "mdi:white-balance-sunny", color: "#f5b301", left: 50, top: 17 },
  home:    { icon: "mdi:home-lightning-bolt", color: "#dfe6ee", left: 50, top: 52 },
  battery: { icon: "mdi:home-battery",        color: "#43c383", left: 16, top: 72 },
  grid:    { icon: "mdi:transmission-tower",  color: "#4a9eff", left: 84, top: 72 },
  ev:      { icon: "mdi:ev-station",          color: "#b388ff", left: 84, top: 28 },
};

/* ---------- Übersetzungen / translations (de, en) ---------- */
const I18N = {
  de: {
    node_solar: "Solar", node_home: "Haus", node_battery: "Speicher", node_grid: "Netz", node_ev: "Wallbox",
    lbl_charging: "lädt", lbl_discharging: "entlädt", lbl_import: "Bezug", lbl_export: "Einspeisung",
    unavailable: "nicht verfügbar", aria_prefix: "Energiefluss",
    layout_hint: "Layout-Modus: Knoten per Maus oder Finger verschieben. Danach die Werte kopieren, in die Konfiguration unter <code>nodes:</code> übernehmen und <code>edit_layout</code> wieder entfernen.",
    aria_positions: "Positionen als YAML", copy_yaml: "YAML kopieren",
    copy_selected: "Markiert – bitte Strg+C drücken", copied: "Kopiert ✓",
    yaml_comment: "# in die vorhandenen Knoten unter \"nodes:\" übernehmen",
    card_desc: "Animierter Energiefluss mit frei positionierbaren Knoten und eigenem Hintergrundbild",
    no_form: "Der visuelle Editor ist in dieser Home-Assistant-Version nicht verfügbar. Bitte den YAML-Editor nutzen.",
    s_view: "Darstellung", s_bg: "Hintergrundbild", s_weather: "Wetter und Tageszeit",
    s_weather_hint: "Optional: weitere Bilder für Wetter und Nacht. Fehlt ein Bild, nimmt die Karte ersatzweise „klar“ (nachts erst „Nacht, klar“, dann „Tag, klar“). Alle Bilder sollten dasselbe Seitenverhältnis haben.",
    s_layout: "Layout", s_layout_hint: "Mit eingeschaltetem Layout-Modus kannst du die Knoten direkt in der Vorschau mit Maus oder Finger verschieben. Die Positionen werden hier automatisch übernommen.",
    s_nodes: "Knoten", s_nodes_hint: "Ein Knoten ist ein Kreis in der Karte, z. B. Solar, Haus oder Wallbox.",
    s_flows: "Flüsse", s_flows_hint: "Ein Fluss ist eine animierte Linie zwischen zwei Knoten. Der Sensor liefert die Leistung in Flussrichtung.",
    s_labels: "Beschriftungen", b_del_node: "Knoten löschen", b_add_node: "Knoten hinzufügen",
    b_del_flow: "Fluss löschen", b_add_flow: "Fluss hinzufügen", empty_flows: "Noch keine Flüsse angelegt.",
    o_default: "Wie Standard", o_show: "Anzeigen", o_hide: "Ausblenden",
    o_ratio_image: "Wie Hintergrundbild", o_ratio_square: "Quadrat",
    o_shape_circle: "Kreis", o_shape_rounded: "Rechteck mit runden Ecken",
    o_fit_cover: "Füllen (zuschneiden)", o_fit_contain: "Einpassen", o_fit_stretch: "Strecken",
    o_prev_auto: "Automatisch (Live-Wetter)",
    o_day: "Tag, klar", o_day_cloudy: "Tag, bewölkt", o_day_rain: "Tag, Regen", o_day_heavy_rain: "Tag, starker Regen",
    o_night: "Nacht, klar", o_night_cloudy: "Nacht, bewölkt", o_night_rain: "Nacht, Regen", o_night_heavy_rain: "Nacht, starker Regen",
    l_title: "Titel", l_aspect_ratio: "Seitenverhältnis", l_node_size: "Knotengröße", l_node_shape: "Knotenform", l_shape: "Form",
    l_show_sources: "Quellen-Aufteilung anzeigen", l_sources_mode: "Quellen-Aufteilung: wann",
    o_src_always: "Immer", o_src_active: "Nur bei mehreren aktiven Quellen",
    l_show_state_text: "Richtungstext anzeigen (lädt, Bezug …)", l_node_opacity: "Deckkraft der Knoten",
    l_min_power: "Mindestleistung für Anzeige", l_animation: "Animation",
    l_line_gradient: "Farbverlauf auf den Linien", l_gradient_hold: "Einfarbiger Anteil an jedem Ende",
    l_background: "Bild Tag (klar)", l_background_cloudy: "Bild Tag, bewölkt", l_background_rain: "Bild Tag, Regen",
    l_background_heavy_rain: "Bild Tag, starker Regen", l_background_night: "Bild Nacht (klar)",
    l_background_night_cloudy: "Bild Nacht, bewölkt", l_background_night_rain: "Bild Nacht, Regen",
    l_background_night_heavy_rain: "Bild Nacht, starker Regen",
    l_weather_entity: "Wetter-Entität", l_background_preview: "Bild zum Testen erzwingen",
    l_background_dim: "Abdunkelung des Bildes", l_background_fit: "Bildanpassung",
    l_edit_layout: "Layout-Modus: Knoten in der Vorschau verschieben",
    l_name: "Name", l_icon: "Symbol", l_color: "Farbe", l_left: "Position horizontal", l_top: "Position vertikal",
    l_size: "Eigene Größe (leer = Standard)", l_entity: "Sensor (Einzelwert)", l_plus: "Plus-Sensoren (Summe)",
    l_minus: "Minus-Sensoren (Summe)", l_pct: "Ladestand-Sensor (%)", l_status_entity: "Status-Sensor (Text)",
    l_label_positive: "Text bei positivem Wert", l_label_negative: "Text bei negativem Wert", l_label_idle: "Text im Ruhezustand",
    l_from: "Von", l_to: "Nach", l_invert: "Vorzeichen umkehren", l_key: "Kurzname des neuen Knotens",
    h_aspect_ratio: "„Wie Hintergrundbild“ übernimmt das Format deines Bildes.",
    h_node_size: "Schrift und Symbole passen sich der Größe an.",
    h_shape: "„Wie Standard“ nimmt die Form aus den Darstellungs-Einstellungen.",
    h_gradient_hold: "Die Linie behält an beiden Enden die Knotenfarbe, dazwischen wird übergeblendet.",
    h_background: "Datei z. B. unter /config/www/haus.jpg ablegen und /local/haus.jpg eintragen.",
    h_edit_layout: "Nach dem Einstellen wieder ausschalten.",
    h_weather_entity: "Bestimmt bewölkt, Regen oder starken Regen. Tag und Nacht kommen von sun.sun.",
    h_background_preview: "Zeigt ein bestimmtes Bild, ohne auf das Wetter zu warten. Danach wieder auf „Automatisch“ stellen.",
    h_entity: "Entweder ein einzelner Sensor …",
    h_plus: "… oder Summe der Plus-Sensoren minus Summe der Minus-Sensoren (z. B. Laden minus Entladen).",
    h_pct: "Zeigt den Ladestand als Zahl im Knoten und als Ring (Kreis) bzw. Rahmen (Rechteck).",
    h_sources_mode: "„Nur bei mehreren aktiven Quellen“ blendet die Aufteilung nur ein, wenn mindestens zwei Quellen gerade Leistung liefern, und zeigt dann nur diese.",
    h_show_sources: "Zeigt im Knoten, aus welchen Quellen die Leistung kommt (z. B. Solar und Netz zur Wallbox). Dafür braucht jede Quelle einen Fluss in diesen Knoten.",
    h_show_state_text: "Die Animation zeigt die Richtung bereits. Einschalten blendet Texte wie „lädt“, „entlädt“, „Bezug“ oder „Einspeisung“ unter dem Namen ein.",
    h_status_entity: "Wird unter dem Namen angezeigt, wenn kein anderer Text greift.",
    h_invert: "Nur nötig, wenn der Sensor negative Werte für diese Richtung liefert.",
  },
  en: {
    node_solar: "Solar", node_home: "Home", node_battery: "Battery", node_grid: "Grid", node_ev: "EV charger",
    lbl_charging: "charging", lbl_discharging: "discharging", lbl_import: "import", lbl_export: "export",
    unavailable: "unavailable", aria_prefix: "Energy flow",
    layout_hint: "Layout mode: drag the nodes with mouse or finger. Then copy the values into the configuration under <code>nodes:</code> and remove <code>edit_layout</code> again.",
    aria_positions: "Positions as YAML", copy_yaml: "Copy YAML",
    copy_selected: "Selected – press Ctrl+C", copied: "Copied ✓",
    yaml_comment: "# merge into the existing nodes under \"nodes:\"",
    card_desc: "Animated energy flow with freely positionable nodes and your own background image",
    no_form: "The visual editor is not available in this Home Assistant version. Please use the YAML editor.",
    s_view: "Appearance", s_bg: "Background image", s_weather: "Weather and time of day",
    s_weather_hint: "Optional: more images for weather and night. If an image is missing, the card falls back to \"clear\" (at night first \"night, clear\", then \"day, clear\"). All images should have the same aspect ratio.",
    s_layout: "Layout", s_layout_hint: "With layout mode switched on you can drag the nodes directly in the preview with mouse or finger. Positions are picked up here automatically.",
    s_nodes: "Nodes", s_nodes_hint: "A node is a circle on the card, e.g. solar, home or EV charger.",
    s_flows: "Flows", s_flows_hint: "A flow is an animated line between two nodes. The sensor provides the power in flow direction.",
    s_labels: "Labels", b_del_node: "Delete node", b_add_node: "Add node",
    b_del_flow: "Delete flow", b_add_flow: "Add flow", empty_flows: "No flows yet.",
    o_default: "Use default", o_show: "Show", o_hide: "Hide",
    o_ratio_image: "Same as background image", o_ratio_square: "Square",
    o_shape_circle: "Circle", o_shape_rounded: "Rounded rectangle",
    o_fit_cover: "Fill (crop)", o_fit_contain: "Fit", o_fit_stretch: "Stretch",
    o_prev_auto: "Automatic (live weather)",
    o_day: "Day, clear", o_day_cloudy: "Day, cloudy", o_day_rain: "Day, rain", o_day_heavy_rain: "Day, heavy rain",
    o_night: "Night, clear", o_night_cloudy: "Night, cloudy", o_night_rain: "Night, rain", o_night_heavy_rain: "Night, heavy rain",
    l_title: "Title", l_aspect_ratio: "Aspect ratio", l_node_size: "Node size", l_node_shape: "Node shape", l_shape: "Shape",
    l_show_sources: "Show source breakdown", l_sources_mode: "Source breakdown: when",
    o_src_always: "Always", o_src_active: "Only when several sources are active",
    l_show_state_text: "Show direction text (charging, import …)", l_node_opacity: "Node opacity",
    l_min_power: "Minimum power to show as active", l_animation: "Animation",
    l_line_gradient: "Color gradient on lines", l_gradient_hold: "Solid share at each end",
    l_background: "Image day (clear)", l_background_cloudy: "Image day, cloudy", l_background_rain: "Image day, rain",
    l_background_heavy_rain: "Image day, heavy rain", l_background_night: "Image night (clear)",
    l_background_night_cloudy: "Image night, cloudy", l_background_night_rain: "Image night, rain",
    l_background_night_heavy_rain: "Image night, heavy rain",
    l_weather_entity: "Weather entity", l_background_preview: "Force an image for testing",
    l_background_dim: "Dim the image", l_background_fit: "Image fit",
    l_edit_layout: "Layout mode: move nodes in the preview",
    l_name: "Name", l_icon: "Icon", l_color: "Color", l_left: "Horizontal position", l_top: "Vertical position",
    l_size: "Own size (empty = default)", l_entity: "Sensor (single value)", l_plus: "Plus sensors (sum)",
    l_minus: "Minus sensors (sum)", l_pct: "State of charge sensor (%)", l_status_entity: "Status sensor (text)",
    l_label_positive: "Text for positive value", l_label_negative: "Text for negative value", l_label_idle: "Text when idle",
    l_from: "From", l_to: "To", l_invert: "Invert sign", l_key: "Short name of the new node",
    h_aspect_ratio: "\"Same as background image\" uses the format of your image.",
    h_node_size: "Text and icons scale with the size.",
    h_shape: "\"Use default\" takes the shape from the appearance settings.",
    h_gradient_hold: "The line keeps the node color at both ends and blends in between.",
    h_background: "Put the file e.g. at /config/www/home.jpg and enter /local/home.jpg.",
    h_edit_layout: "Switch off again when you are done.",
    h_weather_entity: "Decides cloudy, rain or heavy rain. Day and night come from sun.sun.",
    h_background_preview: "Shows a specific image without waiting for the weather. Set back to \"Automatic\" afterwards.",
    h_entity: "Either a single sensor …",
    h_plus: "… or the sum of the plus sensors minus the sum of the minus sensors (e.g. charging minus discharging).",
    h_pct: "Shows the state of charge as a number in the node and as a ring (circle) or frame (rectangle).",
    h_sources_mode: "\"Only when several sources are active\" shows the breakdown only if at least two sources currently deliver power, and then only those.",
    h_show_sources: "Shows inside the node where its power comes from (e.g. solar and grid into the EV charger). Each source needs a flow into this node.",
    h_show_state_text: "The animation already shows the direction. Switching this on adds texts like \"charging\", \"discharging\", \"import\" or \"export\" under the name.",
    h_status_entity: "Shown under the name when no other text applies.",
    h_invert: "Only needed if the sensor reports negative values for this direction.",
  },
};
// Sprache der Home-Assistant-Oberfläche: Deutsch oder Englisch (alles andere -> Englisch).
const langOf = (hass) => {
  const l = String((hass && ((hass.locale && hass.locale.language) || hass.language)) || "en").toLowerCase();
  return l.startsWith("de") ? "de" : "en";
};
const tr = (hass, key) => {
  const v = I18N[langOf(hass)][key];
  return v !== undefined ? v : I18N.en[key] !== undefined ? I18N.en[key] : key;
};
// Standard-Knoten mit übersetztem Namen und Richtungstexten
const defaultNode = (k, hass) => {
  const d = DEFAULT_NODES[k];
  if (!d) return undefined;
  const n = { ...d, name: tr(hass, "node_" + k) };
  if (k === "battery") { n.label_positive = tr(hass, "lbl_charging"); n.label_negative = tr(hass, "lbl_discharging"); }
  if (k === "grid") { n.label_positive = tr(hass, "lbl_import"); n.label_negative = tr(hass, "lbl_export"); }
  return n;
};


// Hintergrundbilder je Tageszeit/Wetter. Fehlt ein Bild, greift die Rückfallkette (siehe _pickBackground).
const BG_KEYS = [
  "background", "background_cloudy", "background_rain", "background_heavy_rain",
  "background_night", "background_night_cloudy", "background_night_rain", "background_night_heavy_rain",
];
// weather.*-Zustände -> Bildkategorie. Alles andere (sonnig, teilweise bewölkt, Nebel, Schnee ...) zählt als "klar".
const WEATHER_KIND = { rainy: "rain", "snowy-rainy": "rain", pouring: "heavy_rain", "lightning-rainy": "heavy_rain", cloudy: "cloudy" };
const PREVIEW_RE = /^(day|night)(?:_(cloudy|rain|heavy_rain))?$/;
const ratioUrlOf = (cfg) => BG_KEYS.map((k) => cfg[k]).find((v) => typeof v === "string" && v.trim()) || "";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

class EnergyFlowLiveCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._uid = Math.random().toString(36).slice(2, 8);
    this._bucket = [];
    this._drag = null;
    this._imgRatio = null;
    this._reduceMotion =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
  }

  static getConfigElement() {
    return document.createElement("energy-flow-live-card-editor");
  }

  static getStubConfig() {
    return {
      nodes: {
        solar: { entity: "sensor.solar_power" },
        home: { entity: "sensor.home_power" },
        grid: { plus: ["sensor.grid_import"], minus: ["sensor.grid_export"] },
      },
      flows: [{ from: "solar", to: "home", entity: "sensor.solar_to_home" }],
    };
  }

  setConfig(config) {
    if (!config || typeof config.nodes !== "object" || !Object.keys(config.nodes).length) {
      throw new Error("energy-flow-live-card: 'nodes' is missing");
    }
    // Flüsse ohne Sensor gelten als "noch nicht fertig eingerichtet" und werden übersprungen.
    const flows = (Array.isArray(config.flows) ? config.flows : []).filter((f) => f && f.entity);
    for (const f of flows) {
      if (!config.nodes[f.from] || !config.nodes[f.to]) {
        throw new Error(`energy-flow-live-card: flow ${f.from} → ${f.to} refers to an undefined node`);
      }
    }

    const cfg = {
      aspect_ratio: 1.6,
      min_power: 20,
      node_opacity: 0.9,
      node_size: 18,
      node_shape: "circle",
      show_state_text: false,
      show_sources: false,
      sources_mode: "always",
      animation: true,
      background_dim: 0.6,
      background_fit: "cover",
      edit_layout: false,
      line_gradient: true,
      gradient_hold: 15,
      ...config,
      flows,
    };

    // Seitenverhältnis: Zahl, "16/9" oder "image" (aus dem Hintergrundbild)
    const ratioUrl = ratioUrlOf(cfg);
    const wantsImageRatio = cfg.aspect_ratio === "image" && !!ratioUrl;
    if (wantsImageRatio) {
      cfg.aspect_ratio =
        this._imgRatio && this._imgRatio.url === ratioUrl ? this._imgRatio.ratio : 1.6;
    } else if (typeof cfg.aspect_ratio === "string") {
      const m = cfg.aspect_ratio.match(/^(\d+(?:\.\d+)?)\s*[\/:]\s*(\d+(?:\.\d+)?)$/);
      cfg.aspect_ratio = m ? Number(m[1]) / Number(m[2]) : Number(cfg.aspect_ratio) || 1.6;
    }
    if (!(cfg.aspect_ratio > 0.2 && cfg.aspect_ratio < 6)) cfg.aspect_ratio = 1.6;

    this._config = cfg;
    this._build();
    if (this._hass) this._update();

    if (wantsImageRatio && !(this._imgRatio && this._imgRatio.url === ratioUrl)) {
      const img = new Image();
      img.onload = () => {
        if (!this._config || ratioUrlOf(this._config) !== ratioUrl || !img.naturalHeight) return;
        this._imgRatio = { url: ratioUrl, ratio: img.naturalWidth / img.naturalHeight };
        this._config = { ...this._config, aspect_ratio: this._imgRatio.ratio };
        this._build();
        if (this._hass) this._update();
      };
      img.src = ratioUrl;
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._built && this._lang !== langOf(hass)) this._build(); // Sprache gewechselt: Texte neu aufbauen
    if (this._built) this._update();
  }

  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

  /* ---------- Aufbau ---------- */

  _pathD(a, b, H) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dy) < H * 0.06) {
      const sag = H * 0.14; // waagerechte Verbindung leicht nach unten durchhängen lassen
      return `M${a.x},${a.y} C${a.x + dx * 0.25},${a.y + sag} ${a.x + dx * 0.75},${b.y + sag} ${b.x},${b.y}`;
    }
    if (Math.abs(dx) < W * 0.04) return `M${a.x},${a.y} L${b.x},${b.y}`;
    return `M${a.x},${a.y} C${a.x + dx * 0.5},${a.y} ${a.x + dx * 0.5},${b.y} ${b.x},${b.y}`;
  }

  _pos(k) {
    return { x: (this._nodes[k].left / 100) * W, y: (this._nodes[k].top / 100) * this._H };
  }

  _build() {
    const c = this._config;
    const H = Math.round(W / c.aspect_ratio);
    this._H = H;
    const edit = !!c.edit_layout;

    this._lang = langOf(this._hass);
    const t = (key) => tr(this._hass, key);
    const nodes = {};
    for (const [k, n] of Object.entries(c.nodes)) {
      nodes[k] = {
        ...(defaultNode(k, this._hass) || { icon: "mdi:flash", name: k, color: "#cfd8dc", left: 50, top: 50 }),
        ...n,
      };
    }
    this._nodes = nodes;

    // Farbverlauf: die ersten/letzten "gradient_hold" % der Linie behalten die Knotenfarbe,
    // dazwischen wird übergeblendet.
    const gradient = c.line_gradient !== false;
    const hold = clamp(Number(c.gradient_hold) || 0, 0, 49);
    let defs = "";
    let rails = "";
    let beams = "";
    let dots = "";
    c.flows.forEach((f, i) => {
      const a = this._pos(f.from);
      const b = this._pos(f.to);
      const d = this._pathD(a, b, H);
      const id = `p${this._uid}-${i}`;
      const gid = `g${this._uid}-${i}`;
      const colA = esc(nodes[f.from].color);
      const colB = esc(nodes[f.to].color);
      if (gradient) {
        defs += `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}">
          <stop offset="0" stop-color="${colA}"/><stop offset="${hold}%" stop-color="${colA}"/>
          <stop offset="${100 - hold}%" stop-color="${colB}"/><stop offset="100%" stop-color="${colB}"/>
        </linearGradient>`;
      }
      rails += `<path class="rail" data-i="${i}" id="${id}" d="${d}"/>`;
      beams += `<path class="beam" data-i="${i}" d="${d}" stroke="${gradient ? `url(#${gid})` : colA}"/>`;
      for (let k = 0; k < 3; k++) {
        // Die Punkte wechseln synchron zu ihrer Laufzeit dieselbe Farbe wie die Linie.
        const fade = gradient
          ? `<animate attributeName="fill" values="${colA};${colA};${colB};${colB}" keyTimes="0;${hold / 100};${1 - hold / 100};1" dur="4s" begin="-${k * 1.3}s" repeatCount="indefinite"/>`
          : "";
        dots += `<circle class="dot" data-i="${i}" r="7" fill="${colA}" style="display:none">
          <animateMotion dur="4s" begin="-${k * 1.3}s" repeatCount="indefinite"><mpath href="#${id}"/></animateMotion>${fade}
        </circle>`;
      }
    });

    const nodeHtml = Object.entries(nodes)
      .map(
        ([k, n]) => {
          const sz = Number(n.size || c.node_size) || 18; // Breite in % der Karte; Schrift und Symbole richten sich danach
          const rounded = (n.shape || c.node_shape) === "rounded";
          // Quellen-Aufteilung: alle Flüsse, die in diesen Knoten münden, als kleine Zeilen im Knoten (Symbol der Quelle + Leistung)
          const showSrc = (typeof n.show_sources === "boolean" ? n.show_sources : c.show_sources) === true;
          const incoming = showSrc ? c.flows.map((f, i) => ({ f, i })).filter((x) => x.f.to === k) : [];
          const srcHtml = incoming.length
            ? `<span class="src" data-mode="${(n.sources_mode || c.sources_mode) === "active" ? "active" : "always"}">${incoming.map(({ f, i }) => `<span class="chip" data-i="${i}" style="--c:${esc(nodes[f.from].color)}" title="${esc(nodes[f.from].name)}"><ha-icon icon="${esc(nodes[f.from].icon)}"></ha-icon><b>–</b></span>`).join("")}</span>`
            : "";
          return `
      <div class="node${rounded ? " rounded" : ""}${edit ? " edit" : ""}" data-k="${esc(k)}"
           style="left:${n.left}%;top:${n.top}%;width:${sz}%;--s:${sz};--c:${esc(n.color)}">
        ${edit ? `<span class="coord">${n.left} / ${n.top}</span>` : ""}
        <div class="ring"><div class="core">
          <div class="top"><ha-icon icon="${esc(n.icon)}"></ha-icon><span class="pct"></span></div>
          <span class="val">–</span>
          ${srcHtml}
        </div></div>
        <div class="label"><span class="name">${esc(n.name)}</span><span class="sub"></span></div>
      </div>`;
        }
      )
      .join("");

    const editBar = edit
      ? `<div class="editbar">
           <div class="hint">${t("layout_hint")}</div>
           <textarea readonly rows="${Math.min(14, Object.keys(nodes).length * 3 + 1)}" aria-label="${esc(t("aria_positions"))}"></textarea>
           <button type="button" class="copy">${esc(t("copy_yaml"))}</button>
         </div>`
      : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { overflow: hidden; }
        .wrap {
          position: relative; container-type: inline-size; color: #eef3f8;
          aspect-ratio: ${c.aspect_ratio};
          background: radial-gradient(120% 95% at 50% 18%, #1d2b3a 0%, #111820 62%, #0c1117 100%);
          background-position: center; background-repeat: no-repeat;
        }
        .title { position: absolute; left: 4%; top: 4%; font-size: max(13px, 2.2cqw); font-weight: 500; opacity: .85; z-index: 3; }
        .bg { position: absolute; inset: 0; background-position: center; background-repeat: no-repeat;
              opacity: 0; transition: opacity 1.2s ease; }
        .wrap > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
        .rail { fill: none; stroke: rgba(255,255,255,.09); stroke-width: 3; }
        .beam { fill: none; stroke-linecap: round; opacity: 0; stroke-width: 3; transition: opacity .6s, stroke-width .6s; }
        .beam.on { opacity: .42; }
        /* --s = Knotenbreite in % der Kartenbreite. Schrift und Symbole wachsen und schrumpfen damit. */
        .node { position: absolute; transform: translate(-50%, -50%); z-index: 2; border-radius: 50%;
                --r: calc(var(--s) * .26cqw); --pad: max(2px, calc(var(--s) * .04cqw)); }
        .node.rounded { border-radius: var(--r); }
        .node.edit { cursor: grab; touch-action: none; outline: 2px dashed rgba(255,255,255,.45); outline-offset: 5px; user-select: none; }
        .node.edit.drag { cursor: grabbing; z-index: 6; outline-color: #fff; }
        .node.edit .ring { opacity: 1; }
        .coord { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 9%;
                 font-size: max(10px, 1.6cqw); background: rgba(0,0,0,.65); padding: 1px 6px; border-radius: 6px;
                 white-space: nowrap; font-variant-numeric: tabular-nums; }
        .ring {
          position: relative; width: 100%; aspect-ratio: 1; border-radius: 50%; padding: 4.5%; box-sizing: border-box;
          opacity: .5; transition: opacity .5s;
        }
        /* Der Fortschrittsring liegt auf eigener Ebene und wird zum Rahmen ausgeschnitten.
           Sonst scheint er durch den halbtransparenten Knoten hindurch. */
        .ring::before {
          content: ""; position: absolute; inset: 0; border-radius: inherit; box-sizing: border-box; padding: 4.5%;
          background: conic-gradient(var(--c) calc(var(--pct, 100) * 1%), rgba(255,255,255,.16) 0);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
        }
        .node.rounded .ring { aspect-ratio: 1.4; border-radius: var(--r); padding: var(--pad); }
        .node.rounded .ring::before { padding: var(--pad);
          background: linear-gradient(90deg, var(--c) calc(var(--pct, 100) * 1%), rgba(255,255,255,.16) 0); }
        .node.rounded .core { border-radius: calc(var(--r) - var(--pad)); }
        .node.on .ring { opacity: 1; }
        .node.on { animation: pulse 2.6s ease-out infinite; }
        .core {
          position: relative; width: 100%; height: 100%; border-radius: 50%; box-sizing: border-box;
          background: rgba(12, 18, 25, ${c.node_opacity});
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1%;
        }
        ha-icon { --mdc-icon-size: max(14px, calc(var(--s) * 1px), calc(var(--s) * .2cqw)); color: var(--c); }
        .top { display: flex; align-items: center; justify-content: center; gap: calc(var(--s) * .02cqw); }
        .pct { font-size: max(9px, calc(var(--s) * .556px), calc(var(--s) * .1056cqw)); font-weight: 600;
               font-variant-numeric: tabular-nums; line-height: 1; }
        .pct:empty { display: none; }
        .val { font-size: max(9px, calc(var(--s) * .611px), calc(var(--s) * .1306cqw)); font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.1; }
        .label { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 3%;
                 display: flex; flex-direction: column; align-items: center; white-space: nowrap;
                 text-shadow: 0 1px 3px rgba(0,0,0,.7); pointer-events: none; }
        .name { font-size: max(9px, calc(var(--s) * .611px), calc(var(--s) * .1056cqw)); opacity: .95; }
        .sub { font-size: max(9px, calc(var(--s) * .556px), calc(var(--s) * .0889cqw)); opacity: .75; min-height: 1.2em; }
        .src { display: flex; flex-direction: column; align-items: center; gap: .15em; margin-top: .3em; white-space: nowrap;
               font-size: max(8px, calc(var(--s) * .5px), calc(var(--s) * .0722cqw)); line-height: 1.1; }
        .chip { display: inline-flex; align-items: center; gap: .25em; opacity: .4; transition: opacity .4s; }
        .chip.on { opacity: 1; }
        .chip ha-icon { --mdc-icon-size: 1.25em; width: 1.25em; height: 1.25em; color: var(--c); }
        .chip b { font-weight: 600; font-variant-numeric: tabular-nums; }
        .editbar { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; color: var(--primary-text-color); }
        .editbar .hint { font-size: 13px; color: var(--secondary-text-color); }
        .editbar textarea { width: 100%; box-sizing: border-box; font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace;
                            color: var(--primary-text-color); background: var(--secondary-background-color, rgba(127,127,127,.12));
                            border: 1px solid var(--divider-color, rgba(127,127,127,.4)); border-radius: 8px; padding: 8px; resize: vertical; }
        .editbar .copy { align-self: flex-start; font: inherit; padding: 8px 14px; border-radius: 18px; cursor: pointer;
                         border: 1px solid var(--primary-color); background: transparent; color: var(--primary-color); }
        .editbar .copy:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 40%, transparent); }
          100% { box-shadow: 0 0 0 max(10px, 2cqw) transparent; }
        }
        @media (prefers-reduced-motion: reduce) { .node.on { animation: none; } .bg { transition: none; } }
      </style>
      <ha-card>
        <div class="wrap" role="img" aria-label="Energiefluss">
          <div class="bg"></div><div class="bg"></div>
          ${c.title ? `<div class="title">${esc(c.title)}</div>` : ""}
          <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs>${defs}</defs>${rails}${beams}${dots}
          </svg>
          ${nodeHtml}
        </div>
        ${editBar}
      </ha-card>`;

    this._wrap = this.shadowRoot.querySelector(".wrap");

    // Das Bild wird erst mit den ersten Home-Assistant-Daten gesetzt (_update), damit nicht kurz
    // das falsche Bild (z. B. Tag statt Nacht) aufblitzt.
    this._bgLayers = [...this.shadowRoot.querySelectorAll(".bg")];
    this._bgIdx = 0;
    this._bgUrl = null;

    if (edit) this._setupEditing();
    this._built = true;
  }

  /* ---------- Hintergrund nach Tageszeit und Wetter ---------- */

  _bgSelection() {
    const c = this._config;
    const prev = typeof c.background_preview === "string" ? PREVIEW_RE.exec(c.background_preview) : null;
    if (prev) return { night: prev[1] === "night", kind: prev[2] || "clear" };
    let night = false;
    let kind = "clear";
    if (this._hass) {
      const st = this._hass.states;
      const sun = st[c.sun_entity || "sun.sun"];
      const w = c.weather_entity ? st[c.weather_entity] : null;
      if (sun && (sun.state === "below_horizon" || sun.state === "above_horizon")) night = sun.state === "below_horizon";
      else if (w && w.state === "clear-night") night = true; // Notbehelf, falls sun.sun fehlt
      if (w) kind = WEATHER_KIND[w.state] || "clear";
    }
    return { night, kind };
  }

  // Rückfall: gewünschtes Bild -> klar (nachts erst "Nacht klar") -> "Tag klar".
  _pickBackground() {
    const c = this._config;
    const { night, kind } = this._bgSelection();
    const suffix = kind === "clear" ? "" : `_${kind}`;
    const pick = (k) => (typeof c[k] === "string" && c[k].trim() ? c[k].trim() : null);
    const wanted = night ? pick(`background_night${suffix}`) || pick("background_night") : pick(`background${suffix}`);
    return wanted || pick("background");
  }

  _applyBackground(url) {
    if (url === this._bgUrl || !this._bgLayers || !this._bgLayers.length) return;
    this._bgUrl = url;
    const [a, b] = this._bgLayers;
    if (!url) { a.style.opacity = 0; b.style.opacity = 0; return; }

    const c = this._config;
    const dim = clamp(Number(c.background_dim), 0, 1);
    const fit = ["cover", "contain", "100% 100%"].includes(c.background_fit) ? c.background_fit : "cover";
    const paint = (layer) => {
      const u = String(url).replace(/"/g, "%22");
      layer.style.backgroundImage = `linear-gradient(rgba(8,12,16,${dim}), rgba(8,12,16,${dim})), url("${u}")`;
      layer.style.backgroundSize = `100% 100%, ${fit}`;
    };
    const cur = this._bgLayers[this._bgIdx];
    const next = this._bgLayers[this._bgIdx ^ 1];

    if (!cur.style.backgroundImage) { // erstes Bild: sofort anzeigen
      paint(cur);
      cur.style.opacity = 1;
      return;
    }
    // Wechsel: neues Bild erst laden, dann überblenden. Schlägt das Laden fehl, bleibt das alte Bild stehen.
    const img = new Image();
    img.onload = () => {
      if (this._bgUrl !== url || !next.isConnected) return;
      paint(next);
      next.style.opacity = 1;
      cur.style.opacity = 0;
      this._bgIdx ^= 1;
    };
    img.src = url;
  }

  /* ---------- Layout-Modus ---------- */

  _setupEditing() {
    const root = this.shadowRoot;
    root.querySelectorAll(".node").forEach((el) => {
      const k = el.dataset.k;
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
        el.classList.add("drag");
        this._drag = k;
        this._moved = false;
      });
      el.addEventListener("pointermove", (e) => {
        if (this._drag !== k) return;
        const r = this._wrap.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const left = clamp(((e.clientX - r.left) / r.width) * 100, 3, 97);
        const top = clamp(((e.clientY - r.top) / r.height) * 100, 3, 97);
        this._moveNode(k, Math.round(left * 10) / 10, Math.round(top * 10) / 10);
        this._moved = true;
      });
      const end = () => {
        el.classList.remove("drag");
        const wasDrag = this._drag === k;
        const moved = this._moved;
        this._drag = null;
        this._moved = false;
        // Der visuelle Editor (falls geöffnet) übernimmt die neue Position automatisch.
        if (wasDrag && moved) {
          window.dispatchEvent(new CustomEvent("energy-flow-live-card-moved", {
            detail: { k, left: this._nodes[k].left, top: this._nodes[k].top },
          }));
        }
      };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
    });

    const btn = root.querySelector(".copy");
    const ta = root.querySelector("textarea");
    btn.addEventListener("click", async () => {
      ta.focus();
      ta.select();
      const t = (key) => tr(this._hass, key);
      let label = t("copy_selected");
      try {
        await navigator.clipboard.writeText(ta.value);
        label = t("copied");
      } catch (err) {
        try { if (document.execCommand("copy")) label = t("copied"); } catch (e2) { /* Markierung genügt */ }
      }
      btn.textContent = label;
      setTimeout(() => { btn.textContent = t("copy_yaml"); }, 2500);
    });
    this._renderYaml();
  }

  _moveNode(k, left, top) {
    const n = this._nodes[k];
    n.left = left;
    n.top = top;
    const el = this.shadowRoot.querySelector(`.node[data-k="${k}"]`);
    el.style.left = `${left}%`;
    el.style.top = `${top}%`;
    const coord = el.querySelector(".coord");
    if (coord) coord.textContent = `${left} / ${top}`;
    this._config.flows.forEach((f, i) => {
      const d = this._pathD(this._pos(f.from), this._pos(f.to), this._H);
      this.shadowRoot.querySelector(`.rail[data-i="${i}"]`).setAttribute("d", d);
      this.shadowRoot.querySelector(`.beam[data-i="${i}"]`).setAttribute("d", d);
      const g = this.shadowRoot.getElementById(`g${this._uid}-${i}`);
      if (g) {
        const a = this._pos(f.from);
        const b = this._pos(f.to);
        g.setAttribute("x1", a.x); g.setAttribute("y1", a.y);
        g.setAttribute("x2", b.x); g.setAttribute("y2", b.y);
      }
    });
    this._renderYaml();
  }

  _renderYaml() {
    const ta = this.shadowRoot.querySelector("textarea");
    if (!ta) return;
    ta.value = Object.entries(this._nodes)
      .map(([k, n]) => `    ${k}:\n      left: ${n.left}\n      top: ${n.top}`)
      .join("\n");
    ta.value = `${tr(this._hass, "yaml_comment")}\n${ta.value}`;
  }

  /* ---------- Werte ---------- */

  _val(id) {
    const s = this._hass && this._hass.states[id];
    if (!s) return null;
    const v = parseFloat(s.state);
    if (Number.isNaN(v)) return null;
    return s.attributes && s.attributes.unit_of_measurement === "kW" ? v * 1000 : v;
  }

  _sum(list) {
    let total = 0;
    let any = false;
    for (const id of [].concat(list || [])) {
      const v = this._val(id);
      if (v !== null) { total += v; any = true; }
    }
    return any ? total : null;
  }

  _nodeValue(n) {
    if (n.entity) return this._val(n.entity);
    if (n.plus || n.minus) {
      const p = this._sum(n.plus);
      const m = this._sum(n.minus);
      if (p === null && m === null) return null;
      return (p || 0) - (m || 0);
    }
    return null;
  }

  _fmt(w) {
    const lang = (this._hass && this._hass.language) || "de";
    if (w >= 1000) {
      return `${(w / 1000).toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kW`;
    }
    return `${Math.round(w)} W`;
  }

  /* ---------- Aktualisierung ---------- */

  _update() {
    const c = this._config;
    const min = c.min_power;
    const summary = [];
    this._applyBackground(this._pickBackground());

    for (const [k, n] of Object.entries(this._nodes)) {
      const el = this.shadowRoot.querySelector(`.node[data-k="${k}"]`);
      if (!el) continue;
      const v = this._nodeValue(n);
      const active = v !== null && Math.abs(v) > min;
      el.classList.toggle("on", active);
      el.querySelector(".val").textContent = v === null ? "–" : this._fmt(Math.abs(v));

      // Richtungstext ("lädt", "Bezug" ...): nur sichtbar, wenn eingeschaltet (global show_state_text, je Knoten überschreibbar).
      let dir = "";
      if (v !== null && v > min && n.label_positive) dir = n.label_positive;
      else if (v !== null && v < -min && n.label_negative) dir = n.label_negative;
      const showDir = (typeof n.show_state_text === "boolean" ? n.show_state_text : c.show_state_text) === true;

      let sub = n.label_idle || "";
      if (showDir && dir) sub = dir;
      if (!sub && n.status_entity) {
        const st = this._hass.states[n.status_entity];
        if (st && st.state !== "unknown" && st.state !== "unavailable") sub = st.state;
      }
      el.querySelector(".sub").textContent = sub;

      // Ladestand steht im Knoten (neben dem Symbol) und als Ring/Rahmen.
      let pctTxt = "";
      if (n.pct) {
        const p = this._val(n.pct);
        if (p !== null) {
          el.style.setProperty("--pct", clamp(p, 0, 100));
          pctTxt = `${Math.round(p)} %`;
        }
      }
      el.querySelector(".pct").textContent = pctTxt;

      // Für Screenreader bleibt die Richtung auch dann erhalten, wenn sie nicht angezeigt wird.
      const extra = [pctTxt, dir || sub].filter(Boolean).join(", ");
      summary.push(`${n.name} ${v === null ? tr(this._hass, "unavailable") : this._fmt(Math.abs(v))}${extra ? " (" + extra + ")" : ""}`);
    }

    c.flows.forEach((f, i) => {
      let p = this._val(f.entity);
      if (p !== null && f.invert) p = -p;
      const active = p !== null && p > min;
      this.shadowRoot.querySelectorAll(`.chip[data-i="${i}"]`).forEach((chip) => {
        chip.classList.toggle("on", active);
        chip.querySelector("b").textContent = p === null ? "–" : this._fmt(Math.max(0, p));
      });
      const beam = this.shadowRoot.querySelector(`.beam[data-i="${i}"]`);
      if (beam) {
        beam.classList.toggle("on", active);
        beam.style.strokeWidth = active ? clamp(3 + (p / 1000) * 1.6, 3, 9) : 3;
      }
      // Im Layout-Modus keine Punkte: der Pfad ändert sich beim Ziehen.
      const showDots = active && c.animation && !this._reduceMotion && !c.edit_layout;
      const dur = !active ? 0 : p >= 3000 ? 1.4 : p >= 1500 ? 2 : p >= 500 ? 3 : 4.2;
      const changed = this._bucket[i] !== dur;
      this._bucket[i] = dur;
      this.shadowRoot.querySelectorAll(`.dot[data-i="${i}"]`).forEach((dot, k) => {
        dot.style.display = showDots ? "" : "none";
        if (showDots && changed) {
          dot.querySelectorAll("animateMotion, animate").forEach((am) => {
            am.setAttribute("dur", `${dur}s`);
            am.setAttribute("begin", `-${((dur * k) / 3).toFixed(2)}s`);
          });
        }
      });
    });

    // Modus "active": nur anzeigen, wenn mehr als eine Quelle gerade liefert, und dann nur die liefernden Quellen.
    this.shadowRoot.querySelectorAll('.src[data-mode="active"]').forEach((src) => {
      const chips = [...src.querySelectorAll(".chip")];
      const n = chips.filter((ch) => ch.classList.contains("on")).length;
      chips.forEach((ch) => { ch.style.display = n >= 2 && ch.classList.contains("on") ? "" : "none"; });
      src.style.display = n >= 2 ? "" : "none";
    });

    this._wrap.setAttribute("aria-label", `${tr(this._hass, "aria_prefix")}: ${summary.join(", ")}`);
  }
}

if (!customElements.get("energy-flow-live-card")) {
  customElements.define("energy-flow-live-card", EnergyFlowLiveCard);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: "energy-flow-live-card",
  name: "Energy Flow Live Card",
  description: "Animated energy flow with freely positionable nodes and your own background image",
  preview: true,
});

/* =====================================================================
 * Visueller Editor (erscheint im Karten-Dialog von Home Assistant)
 * ===================================================================== */

const DEFAULT_CFG = {
  aspect_ratio: 1.6, min_power: 20, node_opacity: 0.9, node_size: 18, node_shape: "circle", show_state_text: false, show_sources: false, sources_mode: "always",
  animation: true, background_dim: 0.6, background_fit: "cover", edit_layout: false,
  line_gradient: true, gradient_hold: 15, background_preview: "auto",
};
const FALLBACK_NODE = { icon: "mdi:flash", color: "#cfd8dc", left: 50, top: 50 };

// Beschriftungen und Hilfetexte kommen aus I18N (Präfix l_ bzw. h_).
const SCHEMA_VIEW = (t) => [
  { name: "title", selector: { text: {} } },
  { name: "aspect_ratio", selector: { select: { mode: "dropdown", custom_value: true, options: [
    { value: "image", label: t("o_ratio_image") }, { value: "1.6", label: "16:10" }, { value: "1.78", label: "16:9" },
    { value: "1.33", label: "4:3" }, { value: "1", label: t("o_ratio_square") } ] } } },
  { name: "node_size", selector: { number: { min: 10, max: 30, step: 1, mode: "slider", unit_of_measurement: "%" } } },
  { name: "node_shape", selector: { select: { mode: "dropdown", options: [
    { value: "circle", label: t("o_shape_circle") }, { value: "rounded", label: t("o_shape_rounded") } ] } } },
  { name: "show_state_text", selector: { boolean: {} } },
  { name: "show_sources", selector: { boolean: {} } },
  { name: "sources_mode", selector: { select: { mode: "dropdown", options: [
    { value: "always", label: t("o_src_always") }, { value: "active", label: t("o_src_active") } ] } } },
  { name: "node_opacity", selector: { number: { min: 0.3, max: 1, step: 0.05, mode: "slider" } } },
  { name: "min_power", selector: { number: { min: 0, max: 500, step: 5, mode: "box", unit_of_measurement: "W" } } },
  { name: "animation", selector: { boolean: {} } },
  { name: "line_gradient", selector: { boolean: {} } },
  { name: "gradient_hold", selector: { number: { min: 0, max: 45, step: 1, mode: "slider", unit_of_measurement: "%" } } },
];
const SCHEMA_BG = (t) => [
  { name: "background", selector: { text: {} } },
  { name: "background_dim", selector: { number: { min: 0, max: 1, step: 0.05, mode: "slider" } } },
  { name: "background_fit", selector: { select: { mode: "dropdown", options: [
    { value: "cover", label: t("o_fit_cover") }, { value: "contain", label: t("o_fit_contain") },
    { value: "100% 100%", label: t("o_fit_stretch") } ] } } },
];
const txt = (name) => ({ name, selector: { text: {} } });
const SCHEMA_WEATHER = (t) => [
  { name: "weather_entity", selector: { entity: { domain: "weather" } } },
  { name: "background_preview", selector: { select: { mode: "dropdown", options: [
    { value: "auto", label: t("o_prev_auto") },
    { value: "day", label: t("o_day") }, { value: "day_cloudy", label: t("o_day_cloudy") },
    { value: "day_rain", label: t("o_day_rain") }, { value: "day_heavy_rain", label: t("o_day_heavy_rain") },
    { value: "night", label: t("o_night") }, { value: "night_cloudy", label: t("o_night_cloudy") },
    { value: "night_rain", label: t("o_night_rain") }, { value: "night_heavy_rain", label: t("o_night_heavy_rain") } ] } } },
  txt("background_cloudy"), txt("background_rain"), txt("background_heavy_rain"),
  txt("background_night"), txt("background_night_cloudy"), txt("background_night_rain"), txt("background_night_heavy_rain"),
];
const SCHEMA_LAYOUT = () => [{ name: "edit_layout", selector: { boolean: {} } }];
const SCHEMA_NODE = (t) => [
  { name: "name", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "color", selector: { color_rgb: {} } },
  { name: "left", selector: { number: { min: 3, max: 97, step: 0.5, mode: "slider", unit_of_measurement: "%" } } },
  { name: "top", selector: { number: { min: 3, max: 97, step: 0.5, mode: "slider", unit_of_measurement: "%" } } },
  { name: "size", selector: { number: { min: 8, max: 40, step: 1, mode: "box", unit_of_measurement: "%" } } },
  { name: "shape", selector: { select: { mode: "dropdown", options: [
    { value: "default", label: t("o_default") }, { value: "circle", label: t("o_shape_circle") },
    { value: "rounded", label: t("o_shape_rounded") } ] } } },
  { name: "show_state_text", selector: { select: { mode: "dropdown", options: [
    { value: "default", label: t("o_default") }, { value: "on", label: t("o_show") }, { value: "off", label: t("o_hide") } ] } } },
  { name: "show_sources", selector: { select: { mode: "dropdown", options: [
    { value: "default", label: t("o_default") }, { value: "on", label: t("o_show") }, { value: "off", label: t("o_hide") } ] } } },
  { name: "sources_mode", selector: { select: { mode: "dropdown", options: [
    { value: "default", label: t("o_default") }, { value: "always", label: t("o_src_always") }, { value: "active", label: t("o_src_active") } ] } } },
  { name: "entity", selector: { entity: { domain: "sensor" } } },
  { name: "plus", selector: { entity: { domain: "sensor", multiple: true } } },
  { name: "minus", selector: { entity: { domain: "sensor", multiple: true } } },
  { name: "pct", selector: { entity: { domain: "sensor" } } },
  { name: "status_entity", selector: { entity: {} } },
];
const SCHEMA_NODE_LABELS = () => [
  { name: "label_positive", selector: { text: {} } },
  { name: "label_negative", selector: { text: {} } },
  { name: "label_idle", selector: { text: {} } },
];

const hexToRgb = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h || "");
  if (!m) return [207, 216, 220];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (a) => "#" + a.map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, "0")).join("");
const isEmpty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);

class EnergyFlowLiveCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._cfg = null;
    this._lastEmitted = null;
    this._open = new Set();
    this._nodeForms = {};
    this._onMoved = this._onMoved.bind(this);
  }

  connectedCallback() {
    window.addEventListener("energy-flow-live-card-moved", this._onMoved);
    // Hilfskomponenten (Entity-Picker usw.) sicher laden lassen
    try {
      if (window.loadCardHelpers) window.loadCardHelpers().then((h) => h.createCardElement({ type: "entities", entities: [] })).catch(() => {});
    } catch (e) { /* optional */ }
  }
  disconnectedCallback() {
    window.removeEventListener("energy-flow-live-card-moved", this._onMoved);
  }

  set hass(hass) {
    this._hass = hass;
    if (this._cfg && this._lang !== langOf(hass)) { this._render(); return; } // Sprache gewechselt
    this.shadowRoot.querySelectorAll("ha-form").forEach((f) => { f.hass = hass; });
  }

  setConfig(config) {
    // HA reicht unsere eigene Änderung zurück – dann nicht neu zeichnen (Fokus bleibt erhalten).
    if (this._lastEmitted !== null && JSON.stringify(config) === this._lastEmitted) return;
    this._cfg = JSON.parse(JSON.stringify(config || {}));
    this._cfg.nodes = this._cfg.nodes || {};
    this._cfg.flows = Array.isArray(this._cfg.flows) ? this._cfg.flows : [];
    this._render();
  }

  /* ---------- Hilfen ---------- */

  _emit() {
    const config = JSON.parse(JSON.stringify(this._cfg));
    this._lastEmitted = JSON.stringify(config);
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  _def(k) { return { name: k, ...FALLBACK_NODE, ...(defaultNode(k, this._hass) || {}) }; }

  _nodeData(k) {
    const m = { ...this._def(k), ...(this._cfg.nodes[k] || {}) };
    return {
      name: m.name, icon: m.icon, color: hexToRgb(m.color), left: m.left, top: m.top, size: m.size, shape: m.shape || "default",
      show_state_text: m.show_state_text === true ? "on" : m.show_state_text === false ? "off" : "default",
      show_sources: m.show_sources === true ? "on" : m.show_sources === false ? "off" : "default",
      sources_mode: m.sources_mode || "default",
      entity: m.entity, plus: m.plus || [], minus: m.minus || [], pct: m.pct, status_entity: m.status_entity,
      label_positive: m.label_positive, label_negative: m.label_negative, label_idle: m.label_idle,
    };
  }

  _form(schema, data, onChange) {
    const f = document.createElement("ha-form");
    f.hass = this._hass;
    f.schema = schema;
    f.data = data;
    f.computeLabel = (s) => { const v = tr(this._hass, "l_" + s.name); return v === "l_" + s.name ? s.name : v; };
    f.computeHelper = (s) => { const v = tr(this._hass, "h_" + s.name); return v === "h_" + s.name ? "" : v; };
    f.addEventListener("value-changed", (e) => {
      e.stopPropagation();
      f.data = e.detail.value; // ha-form rechnet mit dem zuletzt gesetzten Stand
      onChange(e.detail.value);
    });
    return f;
  }

  _button(text, onClick, cls = "") {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `btn ${cls}`;
    b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  }

  _details(id, summaryHtml) {
    const d = document.createElement("details");
    d.dataset.id = id;
    if (this._open.has(id)) d.open = true;
    d.addEventListener("toggle", () => { if (d.open) this._open.add(id); else this._open.delete(id); });
    const s = document.createElement("summary");
    s.innerHTML = summaryHtml;
    d.appendChild(s);
    return d;
  }

  /* ---------- Änderungen anwenden ---------- */

  _applyGeneral(names, v) {
    for (const n of names) {
      let val = v[n];
      if (n === "aspect_ratio" && !isEmpty(val)) val = val === "image" || Number.isNaN(Number(val)) ? val : Number(val);
      if (isEmpty(val) || val === DEFAULT_CFG[n]) delete this._cfg[n];
      else this._cfg[n] = val;
    }
    this._emit();
  }

  _applyNode(k, names, v) {
    const def = this._def(k);
    const cur = this._nodeData(k);
    const n = { ...this._cfg.nodes[k] };
    for (const name of names) {
      let val = v[name];
      if (name === "color") {
        if (JSON.stringify(val) === JSON.stringify(cur.color)) continue; // unverändert (z. B. CSS-Name in YAML)
        val = Array.isArray(val) ? rgbToHex(val) : val;
      }
      if (name === "left" || name === "top") val = typeof val === "number" ? Math.round(val * 10) / 10 : val;
      if ((name === "shape" || name === "sources_mode") && val === "default") val = undefined;
      if (name === "show_state_text" || name === "show_sources") val = val === "on" ? true : val === "off" ? false : undefined;
      if (isEmpty(val) || val === def[name]) delete n[name];
      else n[name] = val;
    }
    this._cfg.nodes[k] = n;
    this._emit();
  }

  _applyFlow(i, v) {
    const f = { from: v.from, to: v.to };
    if (!isEmpty(v.entity)) f.entity = v.entity;
    if (v.invert) f.invert = true;
    this._cfg.flows[i] = f;
    this._emit();
  }

  _onMoved(ev) {
    const { k, left, top } = (ev && ev.detail) || {};
    if (!this._cfg || !this._cfg.nodes[k]) return;
    this._applyNode(k, ["left", "top"], { left, top });
    const form = this._nodeForms[k];
    if (form) form.data = { ...form.data, left, top };
  }

  /* ---------- Darstellung ---------- */

  _render() {
    const root = this.shadowRoot;
    this._nodeForms = {};
    this._lang = langOf(this._hass);
    const t = (key) => tr(this._hass, key);
    root.innerHTML = `
      <style>
        :host { display: block; }
        section { margin-bottom: 20px; }
        h3 { margin: 0 0 8px; font-size: 16px; font-weight: 500; color: var(--primary-text-color); }
        .hint, .empty { color: var(--secondary-text-color); font-size: 13px; margin: 4px 0 12px; }
        details { border: 1px solid var(--divider-color); border-radius: 12px; margin-bottom: 8px; padding: 0 12px; background: var(--card-background-color); }
        details details { border: none; border-top: 1px solid var(--divider-color); border-radius: 0; margin: 8px 0 0; padding: 0; }
        summary { cursor: pointer; padding: 12px 0; font-weight: 500; display: flex; align-items: center; gap: 8px; color: var(--primary-text-color); }
        summary small { color: var(--secondary-text-color); font-weight: 400; }
        .sw { width: 14px; height: 14px; border-radius: 50%; display: inline-block; border: 1px solid var(--divider-color); flex: none; }
        .body { padding-bottom: 12px; display: flex; flex-direction: column; gap: 12px; }
        .row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
        .row ha-form { flex: 1 1 200px; }
        .btn { font: inherit; padding: 8px 14px; border-radius: 18px; cursor: pointer; border: 1px solid var(--primary-color);
               background: transparent; color: var(--primary-color); }
        .btn.danger { border-color: var(--error-color, #db4437); color: var(--error-color, #db4437); }
        .btn:disabled { opacity: .4; cursor: default; }
        .btn:focus-visible, summary:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      </style>`;

    if (!customElements.get("ha-form")) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = tr(this._hass, "no_form");
      root.appendChild(p);
      customElements.whenDefined("ha-form").then(() => this._render());
      return;
    }

    const section = (title, hint) => {
      const s = document.createElement("section");
      s.innerHTML = `<h3>${esc(title)}</h3>${hint ? `<div class="hint">${esc(hint)}</div>` : ""}`;
      root.appendChild(s);
      return s;
    };
    const generalForm = (schema) => {
      const names = schema.map((s) => s.name);
      const data = {};
      for (const n of names) {
        let val = this._cfg[n] !== undefined ? this._cfg[n] : DEFAULT_CFG[n];
        if (n === "aspect_ratio") val = String(val);
        data[n] = val;
      }
      return this._form(schema, data, (v) => this._applyGeneral(names, v));
    };

    section(t("s_view")).appendChild(generalForm(SCHEMA_VIEW(t)));
    section(t("s_bg")).appendChild(generalForm(SCHEMA_BG(t)));
    section(t("s_weather"), t("s_weather_hint"))
      .appendChild(generalForm(SCHEMA_WEATHER(t)));
    section(t("s_layout"), t("s_layout_hint"))
      .appendChild(generalForm(SCHEMA_LAYOUT(t)));

    /* Knoten */
    const nodesSec = section(t("s_nodes"), t("s_nodes_hint"));
    const keys = Object.keys(this._cfg.nodes);
    for (const k of keys) {
      const d0 = this._nodeData(k);
      const det = this._details(`n:${k}`, `<span class="sw" style="background:${esc(rgbToHex(d0.color))}"></span><span class="nm">${esc(d0.name)}</span><small>${esc(k)}</small>`);
      const body = document.createElement("div");
      body.className = "body";
      const mainNames = SCHEMA_NODE(t).map((s) => s.name);
      const mainForm = this._form(SCHEMA_NODE(t), this._nodeData(k), (v) => {
        this._applyNode(k, mainNames, v);
        const d = this._nodeData(k);
        det.querySelector(".nm").textContent = d.name;
        det.querySelector(".sw").style.background = rgbToHex(d.color);
      });
      this._nodeForms[k] = mainForm;
      body.appendChild(mainForm);

      const lab = this._details(`l:${k}`, t("s_labels"));
      const labBody = document.createElement("div");
      labBody.className = "body";
      const labNames = SCHEMA_NODE_LABELS(t).map((s) => s.name);
      labBody.appendChild(this._form(SCHEMA_NODE_LABELS(t), this._nodeData(k), (v) => this._applyNode(k, labNames, v)));
      lab.appendChild(labBody);
      body.appendChild(lab);

      body.appendChild(this._button(t("b_del_node"), () => {
        delete this._cfg.nodes[k];
        this._cfg.flows = this._cfg.flows.filter((f) => f.from !== k && f.to !== k); // Flüsse dieses Knotens entfallen mit
        this._open.delete(`n:${k}`);
        this._emit();
        this._render();
      }, "danger"));
      det.appendChild(body);
      nodesSec.appendChild(det);
    }

    const addRow = document.createElement("div");
    addRow.className = "row";
    let newKey = "";
    const keyForm = this._form([{ name: "key", selector: { text: {} } }], { key: "" }, (v) => { newKey = v.key || ""; });
    const addBtn = this._button(t("b_add_node"), () => {
      const key = newKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
      if (!key || this._cfg.nodes[key]) { keyForm.data = { key: "" }; return; }
      this._cfg.nodes[key] = { name: key.charAt(0).toUpperCase() + key.slice(1) };
      this._open.add(`n:${key}`);
      this._emit();
      this._render();
    });
    addRow.append(keyForm, addBtn);
    nodesSec.appendChild(addRow);

    /* Flüsse */
    const flowSec = section(t("s_flows"), t("s_flows_hint"));
    const nodeOptions = keys.map((k) => ({ value: k, label: this._nodeData(k).name }));
    const flowSchema = [
      { name: "from", selector: { select: { mode: "dropdown", options: nodeOptions } } },
      { name: "to", selector: { select: { mode: "dropdown", options: nodeOptions } } },
      { name: "entity", selector: { entity: { domain: "sensor" } } },
      { name: "invert", selector: { boolean: {} } },
    ];
    const nodeName = (k) => (this._cfg.nodes[k] ? this._nodeData(k).name : k);
    this._cfg.flows.forEach((f, i) => {
      const det = this._details(`f:${i}`, `<span class="ft">${esc(nodeName(f.from))} → ${esc(nodeName(f.to))}</span>`);
      const body = document.createElement("div");
      body.className = "body";
      body.appendChild(this._form(flowSchema, { from: f.from, to: f.to, entity: f.entity, invert: !!f.invert }, (v) => {
        this._applyFlow(i, v);
        det.querySelector(".ft").textContent = `${nodeName(v.from)} → ${nodeName(v.to)}`;
      }));
      body.appendChild(this._button(t("b_del_flow"), () => {
        this._cfg.flows.splice(i, 1);
        this._open.clear();
        this._emit();
        this._render();
      }, "danger"));
      det.appendChild(body);
      flowSec.appendChild(det);
    });
    if (!this._cfg.flows.length) {
      const p = document.createElement("div");
      p.className = "empty";
      p.textContent = t("empty_flows");
      flowSec.appendChild(p);
    }
    const addFlow = this._button(t("b_add_flow"), () => {
      this._cfg.flows.push({ from: keys[0], to: keys[1] });
      this._open.add(`f:${this._cfg.flows.length - 1}`);
      this._emit();
      this._render();
    });
    addFlow.disabled = keys.length < 2;
    flowSec.appendChild(addFlow);
  }
}

if (!customElements.get("energy-flow-live-card-editor")) {
  customElements.define("energy-flow-live-card-editor", EnergyFlowLiveCardEditor);
}
