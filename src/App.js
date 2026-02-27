import { useState, useEffect, useMemo, useRef, useCallback } from "react";

// ── DATOS ─────────────────────────────────────────────────────────────────────
const TIPOS = [
  { id: "obra_nueva",      label: "Obra Nueva",       color: "#ef4444" },
  { id: "ampliacion",      label: "Ampliación",       color: "#f97316" },
  { id: "subsistencia",    label: "Subsistencia",     color: "#94a3b8" },
  { id: "conforme",        label: "Conforme a Obra",  color: "#64748b" },
  { id: "regularizacion",  label: "Regularización",   color: "#7c3aed" },
  { id: "demolicion",      label: "Demolición",       color: "#d97706" },
];

const FLOW = [
  { id: "plano",          label: "Plano municipal",        etapa: 1, icon: "✏️"  },
  { id: "aprobado_prof",  label: "Aprobado por mí",        etapa: 1, icon: "✅",  milestone: true },
  { id: "visado_barrio",  label: "Visado barrio cerrado",  etapa: 2, icon: "🏘️",  condicional: true },
  { id: "visado_colegio", label: "Visado Colegio de Arq.", etapa: 2, icon: "📋"  },
  { id: "ingreso_muni",   label: "Ingreso a municipio",    etapa: 2, icon: "🏛️",  needsDate: true },
  { id: "observaciones",  label: "Observaciones / Corr.",  etapa: 2, icon: "📝",  opcional: true },
  { id: "aprobado_muni",  label: "Aprobado por municipio", etapa: 2, icon: "🎉",  milestone: true, final: true },
];

const buildFlow = (tieneBarrio) =>
  FLOW.filter(s => !s.condicional || tieneBarrio)
    .map(s => ({ ...s, done: false, fecha: "", obs: "" }));

const MUNICIPIOS_DATA = {
  escobar: {
    id: "escobar", nombre: "Municipio de Escobar", provincia: "Buenos Aires",
    coef_ilum: "L/8", coef_vent: "L/3", semicubierto: "100%", altura_max: "12.00 m",
    esquema_estructural: true, matricula_muni: "7884",
    zonas: [
      { nombre: "R1A", fos: 0.60, fot: 1.20, desc: "Residencial Baja Densidad" },
      { nombre: "R2",  fos: 0.50, fot: 1.00, desc: "Residencial Media Densidad" },
      { nombre: "C1",  fos: 0.70, fot: 2.00, desc: "Comercial 1" },
    ],
    barrios: {
      puertos: {
        id: "puertos", nombre: "Puertos del Lago",
        fos_max: 0.35, fot_max: 0.50, retiro_frente: 6.0, retiro_fondo: 10.0, retiro_lateral: 3.0,
        nivel_00: "+4.00 IGN", altura_max: "10.00 m cumbrera / 8.00 m losa",
        doble_aprobacion: true, avp_label: "AVP — Asociación Vecinal Puertos",
        notas: "Nivel ±0.00 = +4.00m IGN. Aprobación previa AVP.",
      },
      riberas: {
        id: "riberas", nombre: "Riberas del Escobar",
        fos_max: 0.40, fot_max: 0.60, retiro_frente: 5.0, retiro_fondo: 8.0, retiro_lateral: 2.5,
        nivel_00: "Libre", altura_max: "9.00 m", doble_aprobacion: true, avp_label: "AVP — Riberas del Escobar",
        notas: "",
      },
    },
  },
  tigre: {
    id: "tigre", nombre: "Municipio de Tigre", provincia: "Buenos Aires",
    coef_ilum: "L/10", coef_vent: "L/3", semicubierto: "100%", altura_max: "Según zona",
    esquema_estructural: false, matricula_muni: "42013",
    zonas: [
      { nombre: "R1A", fos: 0.60, fot: 1.20, desc: "Residencial Unifamiliar" },
      { nombre: "R1B", fos: 0.55, fot: 1.00, desc: "Residencial Baja Densidad" },
      { nombre: "R2",  fos: 0.65, fot: 1.60, desc: "Residencial Media Densidad" },
    ],
    barrios: {
      valle_claro: {
        id: "valle_claro", nombre: "Valle Claro",
        fos_max: 0.40, fot_max: 0.65, retiro_frente: 5.0, retiro_fondo: 7.0, retiro_lateral: 2.5,
        nivel_00: "Libre", altura_max: "9.00 m", doble_aprobacion: true, avp_label: "Consorcio Valle Claro",
        notas: "Benavidez. Visado previo del barrio obligatorio.",
      },
    },
  },
};

const CATEGORIAS_LOCALES = [
  {
    cat: "Locales de 1° categoría", color: "#3b82f6",
    ilum: "L / 8", vent: "L / 3", altura: "2.60 m",
    ambientes: ["Dormitorio", "Estar", "Comedor", "Living", "Estudio", "Sala"],
    nota: "Requieren iluminación y ventilación natural obligatoria.",
  },
  {
    cat: "Locales de 2° categoría", color: "#8b5cf6",
    ilum: "L / 8", vent: "Conducto aceptado", altura: "2.40 m",
    ambientes: ["Cocina", "Baño", "Lavadero", "Vestidor", "Office"],
    nota: "Iluminación natural requerida. Ventilación puede ser por conducto.",
  },
  {
    cat: "Sin requerimiento de ilum. ni vent.", color: "#475569",
    ilum: "No requiere", vent: "No requiere", altura: "2.40 m",
    ambientes: ["Ante-baño", "Toilette", "Depósito", "Hall", "Circulación", "Paso"],
    nota: "Escobar: no se exige iluminación ni ventilación natural para estos ambientes.",
  },
];

const buildArchivos = () => ({
  dwg_original:  { nombre: "", url: "", descripcion: "" },
  dwg_municipal: { nombre: "", url: "", descripcion: "" },
  correcciones:  [],
});

// ── LOTE + AMBIENTES ──────────────────────────────────────────────────────────
const buildLote = () => ({
  sup_total: "", frente: "", fondo: "", lat_izq: "", lat_der: "",
  orientacion: "N", forma: "regular", nivel_terreno: "0.00",
  medianera_izq: false, medianera_der: false,
});

const AMBIENTES_TIPOS = [
  { id: "dormitorio",  label: "Dormitorio",        cat: 1, sup_min: 9  },
  { id: "dormPpal",   label: "Dormitorio principal",cat: 1, sup_min: 12 },
  { id: "estar",      label: "Estar / Living",      cat: 1, sup_min: 16 },
  { id: "comedor",    label: "Comedor",             cat: 1, sup_min: 10 },
  { id: "estudio",    label: "Estudio",             cat: 1, sup_min: 9  },
  { id: "cocina",     label: "Cocina",              cat: 2, sup_min: 6  },
  { id: "bano",       label: "Baño",                cat: 2, sup_min: 3  },
  { id: "lavadero",   label: "Lavadero",            cat: 2, sup_min: 3  },
  { id: "vestidor",   label: "Vestidor",            cat: 2, sup_min: 3  },
  { id: "garage",     label: "Garage",              cat: 2, sup_min: 18 },
  { id: "hall",       label: "Hall / Circulación",  cat: 3, sup_min: 0  },
  { id: "toilette",   label: "Toilette",            cat: 3, sup_min: 2  },
  { id: "deposito",   label: "Depósito",            cat: 3, sup_min: 0  },
  { id: "semicub",    label: "Semicubierto",        cat: 3, sup_min: 0  },
  { id: "pileta",     label: "Pileta",              cat: 3, sup_min: 0  },
];

// ── MOTOR DE VERIFICACIÓN NORMATIVA (B) ──────────────────────────────────────
const verificarNormativa = (proj, municipios) => {
  const alertas = [];
  const lote   = proj.lote      || buildLote();
  const ambArr = proj.ambientes || [];
  const muni   = municipios[proj.municipio];
  const barrio = proj.barrio ? muni?.barrios[proj.barrio] : null;
  const zona   = muni?.zonas?.find(z => z.nombre === proj.zona);

  const fosLim = barrio ? parseFloat(barrio.fos_max) : (zona ? parseFloat(zona.fos) : null);
  const fotLim = barrio ? parseFloat(barrio.fot_max) : (zona ? parseFloat(zona.fot) : null);
  const retFr  = barrio ? parseFloat(barrio.retiro_frente)  : null;
  const retFo  = barrio ? parseFloat(barrio.retiro_fondo)   : null;
  const retLat = barrio ? parseFloat(barrio.retiro_lateral) : null;

  const supLote = parseFloat(lote.sup_total) || 0;
  const frente  = parseFloat(lote.frente)    || 0;
  const fondo   = parseFloat(lote.fondo)     || 0;

  const supCub  = ambArr.filter(a => a.tipo_sup === "cubierta")    .reduce((s,a) => s + (parseFloat(a.superficie)||0), 0);
  const supSemi = ambArr.filter(a => a.tipo_sup === "semicubierta").reduce((s,a) => s + (parseFloat(a.superficie)||0), 0);
  const supDesc = ambArr.filter(a => a.tipo_sup === "descubierta") .reduce((s,a) => s + (parseFloat(a.superficie)||0), 0);

  // ── FOS ──
  if (supLote > 0 && fosLim !== null && supCub > 0) {
    const fosReal = supCub / supLote;
    const pct = ((fosReal / fosLim) * 100).toFixed(0);
    if (fosReal > fosLim) {
      alertas.push({ tipo: "error", campo: "FOS", texto: `FOS excedido: ${fosReal.toFixed(3)} > ${fosLim} permitido (${pct}%)` });
    } else {
      alertas.push({ tipo: "ok", campo: "FOS", texto: `FOS OK: ${fosReal.toFixed(3)} ≤ ${fosLim} (${pct}% del máximo)` });
    }
  }

  // ── FOT ──
  if (supLote > 0 && fotLim !== null && (supCub + supSemi) > 0) {
    const fotReal = (supCub + supSemi * 0.5) / supLote;
    const pct = ((fotReal / fotLim) * 100).toFixed(0);
    if (fotReal > fotLim) {
      alertas.push({ tipo: "error", campo: "FOT", texto: `FOT excedido: ${fotReal.toFixed(3)} > ${fotLim} permitido (semicubierto al 50%)` });
    } else {
      alertas.push({ tipo: "ok", campo: "FOT", texto: `FOT OK: ${fotReal.toFixed(3)} ≤ ${fotLim} (${pct}% del máximo)` });
    }
  }

  // ── RETIRO FRENTE ──
  if (retFr && frente > 0) {
    const ocup = frente - (retFr * 2);
    alertas.push({ tipo: ocup > 0 ? "info" : "warning", campo: "Retiro frente", texto: `Retiro frente: ${retFr}m mínimo. Ancho libre para construir: ${Math.max(0, ocup).toFixed(2)}m` });
  }

  // ── ILUMINACIÓN Y VENTILACIÓN por ambiente ──
  const coef_ilum_n = parseFloat(muni?.coef_ilum?.replace("L/","")) || 8;
  const coef_vent_n = parseFloat(muni?.coef_vent?.replace("L/","")) || 3;

  ambArr.forEach(amb => {
    const tipo = AMBIENTES_TIPOS.find(t => t.id === amb.tipo);
    if (!tipo) return;
    const sup = parseFloat(amb.superficie) || 0;
    if (sup <= 0) return;
    const label = amb.nombre || tipo.label;

    // Cat 1: iluminación y ventilación obligatorias
    if (tipo.cat === 1) {
      const ilumMin = +(sup / coef_ilum_n).toFixed(2);
      const ventMin = +(sup / coef_vent_n).toFixed(2);
      const ilumReal = parseFloat(amb.sup_ilum) || 0;
      const ventReal = parseFloat(amb.sup_vent) || 0;
      if (ilumReal > 0 && ilumReal < ilumMin) {
        alertas.push({ tipo: "error", campo: label, texto: `${label}: iluminación insuficiente (${ilumReal}m² < ${ilumMin}m² mín. L/${coef_ilum_n})` });
      } else if (ilumReal >= ilumMin) {
        alertas.push({ tipo: "ok", campo: label, texto: `${label}: iluminación ✓ (${ilumReal}m² ≥ ${ilumMin}m² requerido)` });
      } else {
        alertas.push({ tipo: "info", campo: label, texto: `${label}: completá superficie de iluminación. Mínimo: ${ilumMin}m² (L/${coef_ilum_n})` });
      }
      if (ventReal > 0 && ventReal < ventMin) {
        alertas.push({ tipo: "error", campo: label, texto: `${label}: ventilación insuficiente (${ventReal}m² < ${ventMin}m² mín. L/${coef_vent_n})` });
      }
    }

    // Superficie mínima
    if (tipo.sup_min > 0 && sup < tipo.sup_min) {
      alertas.push({ tipo: "warning", campo: label, texto: `${label}: superficie ${sup}m² < mínimo ${tipo.sup_min}m²` });
    }

    // Cat 2: altura mínima
    const alt = parseFloat(amb.altura) || 0;
    if (alt > 0 && alt < 2.40) {
      alertas.push({ tipo: "error", campo: label, texto: `${label}: altura ${alt}m < 2.40m mínimo` });
    }
  });

  return alertas;
};

const PROJECTS_INIT = [
  {
    id: 1,
    nombre: "Lote 238 — Riberas del Escobar",
    municipio: "escobar", barrio: "riberas",
    tipo: "obra_nueva", zona: "R1A",
    workflow: buildFlow(true).map((s, i) => ({
      ...s,
      done: i <= 4,
      fecha: i === 0 ? "12/02/2026" : i === 1 ? "20/02/2026" : i === 2 ? "28/02/2026" : i === 3 ? "05/03/2026" : i === 4 ? "12/03/2026" : "",
    })),
    fecha_inicio: "12/02/2026",
    estado_texto: "Ingresado municipio — esperando aprobación o correcciones + pago derechos de construcción",
    observaciones: [],
    archivos: buildArchivos(),
    obra: null,
  },
  {
    id: 2,
    nombre: "Lote 23 — Valle Claro, Benavidez",
    municipio: "tigre", barrio: "valle_claro",
    tipo: "subsistencia", zona: "R1A",
    workflow: buildFlow(true).map((s, i) => ({
      ...s, done: i < 3, fecha: i === 0 ? "05/01/2026" : i === 1 ? "15/01/2026" : i === 2 ? "28/01/2026" : "",
    })),
    fecha_inicio: "05/01/2026",
    estado_texto: "Visado Valle Claro ✓ — próximo: visar Colegio de Arquitectos",
    observaciones: ["Municipio solicitó ajuste en el cómputo del semicubierto."],
    archivos: buildArchivos(),
    obra: null,
  },
];

// ── DOCUMENTACIÓN TÉCNICA POR ETAPA ──────────────────────────────────────────
const DOCS_POR_ETAPA = {
  e0: [
    { id: "d_e0_1", nombre: "Permiso de inicio AVP" },
    { id: "d_e0_2", nombre: "Permiso municipal de inicio de obra" },
  ],
  e1: [
    { id: "d_e1_1", nombre: "Plano de tosca y movimiento de suelos" },
    { id: "d_e1_2", nombre: "Cómputo y planilla de hierros (fundaciones)" },
    { id: "d_e1_3", nombre: "Plano de columnas y vigas" },
    { id: "d_e1_4", nombre: "Cómputo de hierros (estructura)" },
    { id: "d_e1_5", nombre: "Plano de losas" },
    { id: "d_e1_6", nombre: "Plano instalación sanitaria PB y PP" },
    { id: "d_e1_7", nombre: "Plano instalación eléctrica PB y PP" },
  ],
  e2: [
    { id: "d_e2_1", nombre: "Plano de colocación de cerámicos / revestimientos" },
    { id: "d_e2_2", nombre: "Plano de calefacción" },
    { id: "d_e2_3", nombre: "Plano de pileta" },
  ],
  e3: [
    { id: "d_e3_1", nombre: "Conforme a obra final" },
    { id: "d_e3_2", nombre: "Certificado final AVP" },
    { id: "d_e3_3", nombre: "Certificado final municipio" },
  ],
};

// ── DIRECCIÓN DE OBRA — DATOS ────────────────────────────────────────────────
const OBRA_ETAPAS = [
  { id: "e0", nombre: "Etapa 0 — Gestiones previas", color: "#3b82f6", tareas: [
    { id: "e0t1", nombre: "Solicitud inicio AVP", hito: false },
    { id: "e0t2", nombre: "Aprobación AVP", hito: false },
    { id: "e0t3", nombre: "Solicitud inicio municipio", hito: false },
    { id: "e0t4", nombre: "Contratación empresa constructora", hito: false },
    { id: "e0t5", nombre: "Contratación herrería / aberturas", hito: false },
    { id: "e0t6", nombre: "Cerco de obra", hito: false },
    { id: "e0t7", nombre: "Planchada vehicular", hito: false },
    { id: "e0t8", nombre: "Inicio de obra — Canon de obra", hito: true },
  ]},
  { id: "e1", nombre: "Etapa 1 — Obra gris (9-10 meses)", color: "#f97316", tareas: [
    { id: "e1t1",  nombre: "Movimiento de suelos", hito: false },
    { id: "e1t2",  nombre: "Tosca y compactación", hito: false },
    { id: "e1t3",  nombre: "Platea hormigón", hito: true },
    { id: "e1t4",  nombre: "Mampostería PB", hito: false },
    { id: "e1t5",  nombre: "Instalación eléctrica PB", hito: false },
    { id: "e1t6",  nombre: "Instalación sanitaria PB", hito: false },
    { id: "e1t7",  nombre: "Columnas y vigas PB", hito: true },
    { id: "e1t8",  nombre: "Losa PB", hito: true },
    { id: "e1t9",  nombre: "Mampostería PP", hito: false },
    { id: "e1t10", nombre: "Instalación eléctrica PP", hito: false },
    { id: "e1t11", nombre: "Instalación sanitaria PP", hito: false },
    { id: "e1t12", nombre: "Columnas y vigas PP", hito: true },
    { id: "e1t13", nombre: "Losa techo", hito: true },
    { id: "e1t14", nombre: "Excavación y estructura pileta", hito: true },
    { id: "e1t15", nombre: "Contrapiso general", hito: false },
  ]},
  { id: "e2", nombre: "Etapa 2 — Terminaciones", color: "#22c55e", tareas: [
    { id: "e2t1",  nombre: "Hidrófugos y membranas", hito: false },
    { id: "e2t2",  nombre: "Revoques exteriores", hito: false },
    { id: "e2t3",  nombre: "Revoques interiores", hito: false },
    { id: "e2t4",  nombre: "Revestimientos", hito: false },
    { id: "e2t5",  nombre: "Pisos", hito: false },
    { id: "e2t6",  nombre: "Carpintería", hito: false },
    { id: "e2t7",  nombre: "Herrería y aberturas", hito: true },
    { id: "e2t8",  nombre: "Pintura exterior", hito: false },
    { id: "e2t9",  nombre: "Pintura interior", hito: false },
    { id: "e2t10", nombre: "Terminaciones pileta", hito: true },
    { id: "e2t11", nombre: "Instalaciones definitivas", hito: false },
    { id: "e2t12", nombre: "Limpieza final", hito: false },
  ]},
  { id: "e3", nombre: "Etapa 3 — Cierre", color: "#8b5cf6", tareas: [
    { id: "e3t1", nombre: "Inspección final AVP", hito: false },
    { id: "e3t2", nombre: "Aprobación AVP", hito: false },
    { id: "e3t3", nombre: "Conforme a obra", hito: true },
    { id: "e3t4", nombre: "Presentación conforme municipio", hito: false },
    { id: "e3t5", nombre: "Aprobación final municipio", hito: false },
    { id: "e3t6", nombre: "Fin de obra", hito: true },
  ]},
];

const buildObraData = () => {
  const tareas = {};
  OBRA_ETAPAS.forEach(et => {
    et.tareas.forEach(t => {
      tareas[t.id] = { estado: "pendiente", fecha_plan: "", fecha_real: "", responsable: "", hito: t.hito };
    });
  });
  const docs = {};
  Object.values(DOCS_POR_ETAPA).flat().forEach(d => {
    docs[d.id] = { estado: "pendiente", url: "" };
  });
  return {
    activo: false,
    tareas,
    docs,
    contratistas: [],
    costos: { presupuesto_usd: 0, presupuesto_ars: 0, tipo_cambio: 1200, sheets_url: "", rubros: [] },
    canon: { activo: false, monto_ars: 0, monto_usd: 0, fecha_inicio: "", pagos: [] },
    seguimiento: [],
  };
};

const OBRA_SAMPLE = {
  activo: true,
  tareas: (() => {
    const t = {};
    OBRA_ETAPAS.forEach(et => {
      et.tareas.forEach(ta => {
        t[ta.id] = { estado: "pendiente", fecha_plan: "", fecha_real: "", responsable: "", hito: ta.hito };
      });
    });
    t["e0t1"] = { ...t["e0t1"], estado: "completado", fecha_plan: "01/03/2026", fecha_real: "02/03/2026", responsable: "Arq. Vento" };
    t["e0t2"] = { ...t["e0t2"], estado: "completado", fecha_plan: "10/03/2026", fecha_real: "12/03/2026", responsable: "AVP Riberas" };
    t["e0t3"] = { ...t["e0t3"], estado: "completado", fecha_plan: "15/03/2026", fecha_real: "15/03/2026", responsable: "Arq. Vento" };
    t["e0t4"] = { ...t["e0t4"], estado: "completado", fecha_plan: "20/03/2026", fecha_real: "25/03/2026", responsable: "Arq. Vento" };
    t["e0t5"] = { ...t["e0t5"], estado: "pendiente", fecha_plan: "01/04/2026", fecha_real: "", responsable: "" };
    t["e0t6"] = { ...t["e0t6"], estado: "pendiente", fecha_plan: "07/04/2026", fecha_real: "", responsable: "" };
    t["e0t7"] = { ...t["e0t7"], estado: "pendiente", fecha_plan: "07/04/2026", fecha_real: "", responsable: "" };
    t["e0t8"] = { ...t["e0t8"], estado: "pendiente", fecha_plan: "14/04/2026", fecha_real: "", responsable: "Arq. Vento" };
    t["e1t1"] = { ...t["e1t1"], estado: "completado", fecha_plan: "07/04/2026", fecha_real: "08/04/2026", responsable: "Ramón Jara" };
    t["e1t2"] = { ...t["e1t2"], estado: "completado", fecha_plan: "14/04/2026", fecha_real: "15/04/2026", responsable: "Ramón Jara" };
    t["e1t3"] = { ...t["e1t3"], estado: "en_proceso", fecha_plan: "28/04/2026", fecha_real: "", responsable: "Ramón Jara" };
    t["e1t4"] = { ...t["e1t4"], estado: "pendiente", fecha_plan: "12/05/2026", fecha_real: "", responsable: "Ramón Jara" };
    return t;
  })(),
  docs: (() => {
    const d = {};
    Object.values(DOCS_POR_ETAPA).flat().forEach(doc => {
      d[doc.id] = { estado: "pendiente", url: "" };
    });
    d["d_e0_1"] = { estado: "entregado", url: "" };
    return d;
  })(),
  contratistas: [
    { id: 1, nombre: "Ramón Jara", empresa: "Constructora Jara", telefono: "", rubro: "Construcción general", monto_usd: 0, monto_ars: 0, activo: true },
    { id: 2, nombre: "Julieta Vento", empresa: "Arq. Julieta Vento", telefono: "", rubro: "Dirección de obra / Desarrolladora", monto_usd: 0, monto_ars: 0, activo: true },
  ],
  costos: {
    presupuesto_usd: 300000, presupuesto_ars: 0, tipo_cambio: 1200,
    sheets_url: "",
    rubros: [
      { id: 1, nombre: "Construcción general", presupuestado_usd: 0, presupuestado_ars: 0, ejecutado_usd: 0, ejecutado_ars: 0 },
    ],
  },
  canon: {
    activo: false,
    monto_ars: 0,
    monto_usd: 0,
    fecha_inicio: "",
    pagos: [],
  },
  seguimiento: [
    { id: 1, fecha: "08/04/2026", avance: 5, nota: "Inicio de movimiento de suelos. Sin inconvenientes.", problemas: "" },
    { id: 2, fecha: "15/04/2026", avance: 10, nota: "Tosca y compactación completada. Se avanza con encofrado de platea.", problemas: "Lluvia retrasó 2 días la compactación." },
    { id: 3, fecha: "22/04/2026", avance: 14, nota: "Armado de hierros de platea en proceso. Hormigón programado para próxima semana.", problemas: "" },
  ],
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const getTipo = (id) => TIPOS.find(t => t.id === id) || TIPOS[0];
const getMuni = (munis, id) => munis[id];
const getBarrio = (munis, muniId, barrioId) => barrioId ? munis[muniId]?.barrios[barrioId] : null;
const getZona = (munis, muniId, zonaNombre) => munis[muniId]?.zonas?.find(z => z.nombre === zonaNombre);

const parseDate = (d) => {
  if (!d) return null;
  const [dd, mm, yy] = d.split("/");
  if (!dd || !mm || !yy) return null;
  return new Date(+yy, +mm - 1, +dd);
};
const fmtDate = (date) => {
  if (!date) return "";
  return date.getDate().toString().padStart(2, "0") + "/" + (date.getMonth() + 1).toString().padStart(2, "0") + "/" + date.getFullYear();
};
const getMondayOf = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const isSameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
};

const Dot = ({ color, size = 9 }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
);
const Badge = ({ children, color = "#64748b" }) => (
  <span style={{
    background: color + "22", color, border: "1px solid " + color + "44",
    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
    display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
  }}>{children}</span>
);
const Card = ({ children, style }) => (
  <div style={{ background: "#111d2e", border: "1px solid #1a2640", borderRadius: 12, padding: 20, ...style }}>
    {children}
  </div>
);
const Label = ({ children }) => (
  <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
    {children}
  </div>
);
const Btn = ({ children, onClick, disabled, variant = "primary", size = "md" }) => {
  const bg = disabled ? "#1e2d42"
    : variant === "primary" ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
    : variant === "ghost"   ? "#1a2235"
    : variant === "green"   ? "linear-gradient(135deg,#22c55e,#16a34a)"
    : variant === "danger"  ? "#2d1a1a"
    : "#1a2235";
  const col = disabled ? "#334155" : variant === "danger" ? "#f87171" : "white";
  const border = variant === "ghost" ? "1px solid #2d3f5a" : variant === "danger" ? "1px solid #7f1d1d" : "none";
  const pad = size === "sm" ? "6px 12px" : "10px 22px";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: bg, color: col, border, borderRadius: 8, padding: pad, cursor: disabled ? "default" : "pointer",
      fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6,
    }}>{children}</button>
  );
};
const Inp = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{label}</div>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 8, padding: "9px 13px", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box", outline: "none" }} />
  </div>
);
const Toggle = ({ label, value, onChange }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
    <span style={{ color: "#94a3b8", fontSize: 13 }}>{label}</span>
    <div onClick={() => onChange(!value)} style={{ width: 42, height: 22, background: value ? "#3b82f6" : "#2d3f5a", borderRadius: 11, cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, background: "#fff", borderRadius: 8, position: "absolute", top: 3, left: value ? 23 : 3, transition: "left .2s" }} />
    </div>
  </div>
);
const Modal = ({ title, children, onClose, width = 500 }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
    <div style={{ background: "#1a2235", border: "1px solid #2d3f5a", borderRadius: 14, padding: 28, width, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.6)", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <span style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 800 }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

// ── WORKFLOW BAR ──────────────────────────────────────────────────────────────
const WorkflowBar = ({ workflow, compact }) => {
  const done = workflow.filter(s => s.done).length;
  const total = workflow.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const isFinal = workflow[workflow.length - 1]?.done;
  const current = workflow.find(s => !s.done);
  const barColor = isFinal ? "#22c55e" : pct > 60 ? "#3b82f6" : pct > 30 ? "#8b5cf6" : "#f59e0b";

  if (compact) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "#475569", fontSize: 10 }}>{isFinal ? "✅ Aprobado" : current?.label || ""}</span>
          <span style={{ color: barColor, fontSize: 10, fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ background: "#1e2d42", borderRadius: 4, height: 5, overflow: "hidden" }}>
          <div style={{ width: pct + "%", height: "100%", background: barColor, borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>
          {isFinal ? "✅ Aprobado por municipio" : "Próximo: " + (current?.label || "—")}
        </span>
        <span style={{ color: barColor, fontSize: 15, fontWeight: 800 }}>{pct}%</span>
      </div>
      <div style={{ background: "#1e2d42", borderRadius: 6, height: 8, marginBottom: 24, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: barColor, borderRadius: 6, transition: "width .4s" }} />
      </div>
      <div style={{ display: "flex", gap: 0 }}>
        {workflow.map((step, i) => {
          const isNext = !step.done && (i === 0 || workflow[i - 1]?.done);
          const circleColor = step.done ? (step.final ? "#22c55e" : "#3b82f6") : isNext ? "#1e3a5f" : "#1e2d42";
          const circleBorder = step.done ? (step.final ? "#22c55e" : "#3b82f6") : isNext ? "#3b82f6" : "#2d3f5a";
          return (
            <div key={step.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {i < workflow.length - 1 && (
                <div style={{ position: "absolute", top: 13, left: "50%", width: "100%", height: 2, background: workflow[i + 1]?.done ? "#3b82f6" : "#1e2d42", zIndex: 0 }} />
              )}
              <div style={{ width: step.milestone ? 28 : 24, height: step.milestone ? 28 : 24, borderRadius: "50%", background: circleColor, border: "2px solid " + circleBorder, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: step.done ? 13 : 11, boxShadow: isNext ? "0 0 0 4px #3b82f620" : "none" }}>
                {step.done ? "✓" : step.icon}
              </div>
              <div style={{ marginTop: 7, textAlign: "center", maxWidth: 76 }}>
                <div style={{ color: step.done ? "#93c5fd" : isNext ? "#e2e8f0" : "#475569", fontSize: 10, fontWeight: step.done || isNext ? 700 : 400, lineHeight: 1.3 }}>{step.label}</div>
                {step.fecha && <div style={{ color: "#334155", fontSize: 9, marginTop: 1 }}>{step.fecha}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── FILES CARD ────────────────────────────────────────────────────────────────
const FilesCard = ({ proj, setProjects }) => {
  const [tab, setTab] = useState("archivos");
  const [nuevaCorr, setNuevaCorr] = useState({ texto: "", fecha: "", estado: "pendiente" });
  const [showNuevaCorr, setShowNuevaCorr] = useState(false);
  const archivos = proj.archivos || buildArchivos();

  const updateArchivos = (patch) => {
    setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, archivos: { ...archivos, ...patch } } : p));
  };
  const updateFile = (key, field, val) => updateArchivos({ [key]: { ...archivos[key], [field]: val } });
  const addCorreccion = () => {
    const nueva = { id: Date.now(), ...nuevaCorr, fecha: nuevaCorr.fecha || new Date().toLocaleDateString("es-AR") };
    updateArchivos({ correcciones: [...archivos.correcciones, nueva] });
    setNuevaCorr({ texto: "", fecha: "", estado: "pendiente" });
    setShowNuevaCorr(false);
  };
  const toggleEstado = (id) => updateArchivos({ correcciones: archivos.correcciones.map(c => c.id === id ? { ...c, estado: c.estado === "pendiente" ? "resuelto" : "pendiente" } : c) });
  const deleteCorreccion = (id) => updateArchivos({ correcciones: archivos.correcciones.filter(c => c.id !== id) });

  const pendientes = archivos.correcciones.filter(c => c.estado === "pendiente").length;

  const TabBtn = ({ id, label, count }) => (
    <button onClick={() => setTab(id)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: tab === id ? "#1a2a40" : "none", color: tab === id ? "#93c5fd" : "#475569", cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 700 : 400, display: "flex", alignItems: "center", gap: 5 }}>
      {label}
      {count > 0 && <span style={{ background: tab === id ? "#3b82f6" : "#1a2640", color: tab === id ? "white" : "#64748b", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{count}</span>}
    </button>
  );

  const FileField = ({ label, fileKey, icon }) => {
    const f = archivos[fileKey] || { nombre: "", url: "", descripcion: "" };
    return (
      <div style={{ background: "#0d1624", border: "1px solid #1a2640", borderRadius: 10, padding: 16, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>{label}</span>
          {f.url && <span style={{ marginLeft: "auto" }}><Badge color="#22c55e">✓ Vinculado</Badge></span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Nombre del archivo</div>
            <input value={f.nombre} onChange={e => updateFile(fileKey, "nombre", e.target.value)} placeholder="Ej: Lote238_PB_municipal_v3.dwg"
              style={{ width: "100%", background: "#111d2e", border: "1px solid #2d3f5a", borderRadius: 7, padding: "8px 11px", color: "#e2e8f0", fontSize: 12, boxSizing: "border-box", outline: "none" }} />
          </div>
          <div>
            <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>URL / Link</div>
            <input value={f.url} onChange={e => updateFile(fileKey, "url", e.target.value)} placeholder="https://drive.google.com/..."
              style={{ width: "100%", background: "#111d2e", border: "1px solid #2d3f5a", borderRadius: 7, padding: "8px 11px", color: "#e2e8f0", fontSize: 12, boxSizing: "border-box", outline: "none" }} />
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Descripción / Versión</div>
          <input value={f.descripcion} onChange={e => updateFile(fileKey, "descripcion", e.target.value)} placeholder="Ej: Versión final con ajuste de retiros"
            style={{ width: "100%", background: "#111d2e", border: "1px solid #2d3f5a", borderRadius: 7, padding: "8px 11px", color: "#e2e8f0", fontSize: 12, boxSizing: "border-box", outline: "none" }} />
        </div>
        {f.url && <div style={{ marginTop: 10 }}><a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", fontSize: 12, textDecoration: "none" }}>🔗 Abrir archivo ↗</a></div>}
      </div>
    );
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        <TabBtn id="archivos" label="📁 Archivos" count={0} />
        <TabBtn id="correcciones" label="📝 Correcciones" count={pendientes} />
      </div>
      {tab === "archivos" && (
        <div>
          <FileField label="Plano original del proyecto (DWG con muebles)" fileKey="dwg_original" icon="🗂" />
          <FileField label="Plano municipal presentado (DWG / PDF)" fileKey="dwg_municipal" icon="🏛" />
        </div>
      )}
      {tab === "correcciones" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {pendientes > 0 && <Badge color="#f59e0b">{pendientes} pendiente{pendientes !== 1 ? "s" : ""}</Badge>}
              {archivos.correcciones.filter(c => c.estado === "resuelto").length > 0 && <Badge color="#22c55e">{archivos.correcciones.filter(c => c.estado === "resuelto").length} resuelto{archivos.correcciones.filter(c => c.estado === "resuelto").length !== 1 ? "s" : ""}</Badge>}
              {archivos.correcciones.length === 0 && <span style={{ color: "#475569", fontSize: 12 }}>Sin correcciones registradas</span>}
            </div>
            <Btn size="sm" variant="ghost" onClick={() => setShowNuevaCorr(true)}>+ Agregar</Btn>
          </div>
          {[...archivos.correcciones].reverse().map(c => (
            <div key={c.id} style={{ background: "#0d1624", border: "1px solid " + (c.estado === "pendiente" ? "#f59e0b44" : "#22c55e33"), borderRadius: 9, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <Badge color={c.estado === "pendiente" ? "#f59e0b" : "#22c55e"}>{c.estado === "pendiente" ? "⏳ Pendiente" : "✅ Resuelto"}</Badge>
                  <span style={{ color: "#475569", fontSize: 11 }}>{c.fecha}</span>
                </div>
                <p style={{ color: "#e2e8f0", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{c.texto}</p>
              </div>
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                <button onClick={() => toggleEstado(c.id)} style={{ background: "none", border: "1px solid #2d3f5a", borderRadius: 6, color: "#94a3b8", cursor: "pointer", padding: "4px 8px", fontSize: 12 }}>{c.estado === "pendiente" ? "✓" : "↩"}</button>
                <button onClick={() => deleteCorreccion(c.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13, padding: "4px 6px" }}>🗑</button>
              </div>
            </div>
          ))}
          {showNuevaCorr && (
            <div style={{ background: "#0d1624", border: "1px solid #2d3f5a", borderRadius: 10, padding: 16, marginTop: 10 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Nueva corrección</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
                <input value={nuevaCorr.fecha} onChange={e => setNuevaCorr(p => ({ ...p, fecha: e.target.value }))} placeholder={"Fecha — hoy: " + new Date().toLocaleDateString("es-AR")}
                  style={{ background: "#111d2e", border: "1px solid #2d3f5a", borderRadius: 7, padding: "8px 11px", color: "#e2e8f0", fontSize: 12, outline: "none" }} />
                <select value={nuevaCorr.estado} onChange={e => setNuevaCorr(p => ({ ...p, estado: e.target.value }))} style={{ background: "#111d2e", border: "1px solid #2d3f5a", borderRadius: 7, padding: "8px 11px", color: "#e2e8f0", fontSize: 12, outline: "none" }}>
                  <option value="pendiente">⏳ Pendiente</option>
                  <option value="resuelto">✅ Resuelto</option>
                </select>
              </div>
              <textarea value={nuevaCorr.texto} onChange={e => setNuevaCorr(p => ({ ...p, texto: e.target.value }))} placeholder="Descripción de la corrección u observación..." rows={3}
                style={{ width: "100%", background: "#111d2e", border: "1px solid #2d3f5a", borderRadius: 7, padding: "8px 11px", color: "#e2e8f0", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Btn variant="ghost" size="sm" onClick={() => setShowNuevaCorr(false)}>Cancelar</Btn>
                <Btn size="sm" variant="green" disabled={!nuevaCorr.texto.trim()} onClick={addCorreccion}>Guardar</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// ── LOTE CARD (A) ─────────────────────────────────────────────────────────────
const LoteCard = ({ proj, setProjects }) => {
  const lote = proj.lote || buildLote();
  const ambientes = proj.ambientes || [];
  const [tab, setTab] = useState("lote");
  const [editAmb, setEditAmb] = useState(null);
  const [newAmb, setNewAmb] = useState({ tipo: "dormitorio", nombre: "", superficie: "", sup_ilum: "", sup_vent: "", altura: "2.70", planta: "PB", tipo_sup: "cubierta" });
  const [showNewAmb, setShowNewAmb] = useState(false);

  const updateLote = (patch) => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, lote: { ...(p.lote || buildLote()), ...patch } } : p));
  const updateAmbientes = (arr) => setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, ambientes: arr } : p));

  const addAmb = () => {
    const tipo = AMBIENTES_TIPOS.find(t => t.id === newAmb.tipo);
    const amb = { ...newAmb, id: Date.now(), nombre: newAmb.nombre || tipo?.label || newAmb.tipo };
    updateAmbientes([...ambientes, amb]);
    setNewAmb({ tipo: "dormitorio", nombre: "", superficie: "", sup_ilum: "", sup_vent: "", altura: "2.70", planta: "PB", tipo_sup: "cubierta" });
    setShowNewAmb(false);
  };

  const saveEditAmb = () => {
    updateAmbientes(ambientes.map(a => a.id === editAmb.id ? editAmb : a));
    setEditAmb(null);
  };

  const supCub  = ambientes.filter(a => a.tipo_sup === "cubierta")    .reduce((s,a) => s + (parseFloat(a.superficie)||0), 0);
  const supSemi = ambientes.filter(a => a.tipo_sup === "semicubierta").reduce((s,a) => s + (parseFloat(a.superficie)||0), 0);
  const supDesc = ambientes.filter(a => a.tipo_sup === "descubierta") .reduce((s,a) => s + (parseFloat(a.superficie)||0), 0);
  const supTotal = supCub + supSemi + supDesc;

  const ORIENTACIONES = ["N","NE","E","SE","S","SO","O","NO"];
  const PLANTAS = ["PB","PP","2P","3P","SP"];
  const TIPO_SUP = [{ id:"cubierta", label:"Cubierta" },{ id:"semicubierta", label:"Semicubierta" },{ id:"descubierta", label:"Descubierta" }];
  const catColor = (cat) => cat === 1 ? "#3b82f6" : cat === 2 ? "#8b5cf6" : "#475569";
  const catLabel = (cat) => cat === 1 ? "1°" : cat === 2 ? "2°" : "3°";

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: tab === id ? "#1a2a40" : "none", color: tab === id ? "#93c5fd" : "#475569", cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 700 : 400 }}>{label}</button>
  );

  const FieldSmall = ({ label, value, onChange, type="text", placeholder="" }) => (
    <div>
      <div style={{ color: "#475569", fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 6, padding: "6px 8px", color: "#e2e8f0", fontSize: 12, boxSizing: "border-box", outline: "none" }} />
    </div>
  );

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        <TabBtn id="lote" label="📐 Lote" />
        <TabBtn id="ambientes" label={"🏠 Ambientes (" + ambientes.length + ")"} />
      </div>

      {tab === "lote" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <FieldSmall label="Sup. total m²" value={lote.sup_total} onChange={v => updateLote({ sup_total: v })} type="number" placeholder="500" />
            <FieldSmall label="Frente m" value={lote.frente} onChange={v => updateLote({ frente: v })} type="number" placeholder="15" />
            <FieldSmall label="Fondo m" value={lote.fondo} onChange={v => updateLote({ fondo: v })} type="number" placeholder="33" />
            <FieldSmall label="Lat. izq m" value={lote.lat_izq} onChange={v => updateLote({ lat_izq: v })} type="number" placeholder="33" />
            <FieldSmall label="Lat. der m" value={lote.lat_der} onChange={v => updateLote({ lat_der: v })} type="number" placeholder="33" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ color: "#475569", fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Orientación frente</div>
              <select value={lote.orientacion} onChange={e => updateLote({ orientacion: e.target.value })}
                style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 6, padding: "6px 8px", color: "#e2e8f0", fontSize: 12, outline: "none" }}>
                {ORIENTACIONES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <div style={{ color: "#475569", fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Forma</div>
              <select value={lote.forma} onChange={e => updateLote({ forma: e.target.value })}
                style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 6, padding: "6px 8px", color: "#e2e8f0", fontSize: 12, outline: "none" }}>
                <option value="regular">Regular</option>
                <option value="irregular">Irregular</option>
                <option value="esquina">Esquina</option>
              </select>
            </div>
            <FieldSmall label="Nivel terreno m" value={lote.nivel_terreno} onChange={v => updateLote({ nivel_terreno: v })} type="number" placeholder="0.00" />
            <div>
              <div style={{ color: "#475569", fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Medianeras</div>
              <div style={{ display: "flex", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                  <input type="checkbox" checked={lote.medianera_izq} onChange={e => updateLote({ medianera_izq: e.target.checked })} />
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>Izq.</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                  <input type="checkbox" checked={lote.medianera_der} onChange={e => updateLote({ medianera_der: e.target.checked })} />
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>Der.</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "ambientes" && (
        <div>
          {/* Totales */}
          {ambientes.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[["Cubierta", supCub, "#3b82f6"], ["Semicubierta", supSemi, "#f59e0b"], ["Descubierta", supDesc, "#22c55e"], ["Total", supTotal, "#e2e8f0"]].map(([l,v,c]) => (
                <div key={l} style={{ background: "#0d1624", borderRadius: 7, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", fontWeight: 700 }}>{l}</div>
                  <div style={{ color: c, fontSize: 15, fontWeight: 900, marginTop: 2 }}>{v.toFixed(1)} m²</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabla de ambientes */}
          {ambientes.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10, fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a2640" }}>
                  {["Cat.", "Ambiente", "Sup.", "Planta", "Tipo", ""].map((h,i) => (
                    <th key={i} style={{ padding: "5px 6px", color: "#334155", fontSize: 9, fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ambientes.map(amb => {
                  const tipo = AMBIENTES_TIPOS.find(t => t.id === amb.tipo);
                  return (
                    <tr key={amb.id} style={{ borderBottom: "1px solid #0f1724" }}>
                      <td style={{ padding: "6px 6px" }}><Badge color={catColor(tipo?.cat)}>{catLabel(tipo?.cat)}</Badge></td>
                      <td style={{ padding: "6px 6px", color: "#e2e8f0", fontWeight: 600 }}>{amb.nombre}</td>
                      <td style={{ padding: "6px 6px", color: "#94a3b8" }}>{amb.superficie} m²</td>
                      <td style={{ padding: "6px 6px", color: "#475569" }}>{amb.planta}</td>
                      <td style={{ padding: "6px 6px" }}><Badge color={amb.tipo_sup === "cubierta" ? "#3b82f6" : amb.tipo_sup === "semicubierta" ? "#f59e0b" : "#22c55e"}>{amb.tipo_sup === "cubierta" ? "Cub." : amb.tipo_sup === "semicubierta" ? "Semi." : "Desc."}</Badge></td>
                      <td style={{ padding: "6px 4px", display: "flex", gap: 4 }}>
                        <button onClick={() => setEditAmb({ ...amb })} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 11 }}>✏</button>
                        <button onClick={() => updateAmbientes(ambientes.filter(a => a.id !== amb.id))} style={{ background: "none", border: "none", color: "#7f1d1d", cursor: "pointer", fontSize: 11 }}>🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <Btn size="sm" variant="ghost" onClick={() => setShowNewAmb(true)}>+ Agregar ambiente</Btn>

          {showNewAmb && (
            <div style={{ background: "#0d1624", border: "1px solid #2d3f5a", borderRadius: 10, padding: 14, marginTop: 12 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Nuevo ambiente</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ color: "#475569", fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Tipo</div>
                  <select value={newAmb.tipo} onChange={e => { const t = AMBIENTES_TIPOS.find(x => x.id === e.target.value); setNewAmb(p => ({ ...p, tipo: e.target.value, nombre: t?.label || "" })); }}
                    style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 6, padding: "7px 8px", color: "#e2e8f0", fontSize: 12, outline: "none" }}>
                    {AMBIENTES_TIPOS.map(t => <option key={t.id} value={t.id}>{t.label} (Cat. {t.cat})</option>)}
                  </select>
                </div>
                <FieldSmall label="Nombre personalizado" value={newAmb.nombre} onChange={v => setNewAmb(p => ({ ...p, nombre: v }))} placeholder="Ej: Dormitorio 1" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <FieldSmall label="Sup. m²" value={newAmb.superficie} onChange={v => setNewAmb(p => ({ ...p, superficie: v }))} type="number" />
                <FieldSmall label="Ilum. m²" value={newAmb.sup_ilum} onChange={v => setNewAmb(p => ({ ...p, sup_ilum: v }))} type="number" />
                <FieldSmall label="Vent. m²" value={newAmb.sup_vent} onChange={v => setNewAmb(p => ({ ...p, sup_vent: v }))} type="number" />
                <FieldSmall label="Altura m" value={newAmb.altura} onChange={v => setNewAmb(p => ({ ...p, altura: v }))} type="number" />
                <div>
                  <div style={{ color: "#475569", fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Planta</div>
                  <select value={newAmb.planta} onChange={e => setNewAmb(p => ({ ...p, planta: e.target.value }))}
                    style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 6, padding: "7px 8px", color: "#e2e8f0", fontSize: 12, outline: "none" }}>
                    {PLANTAS.map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "#475569", fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Tipo de superficie</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {TIPO_SUP.map(ts => (
                    <button key={ts.id} onClick={() => setNewAmb(p => ({ ...p, tipo_sup: ts.id }))}
                      style={{ padding: "5px 12px", borderRadius: 6, border: "2px solid " + (newAmb.tipo_sup === ts.id ? "#3b82f6" : "#1a2640"), background: newAmb.tipo_sup === ts.id ? "#1a2a40" : "#111d2e", color: newAmb.tipo_sup === ts.id ? "#93c5fd" : "#475569", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                      {ts.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ghost" size="sm" onClick={() => setShowNewAmb(false)}>Cancelar</Btn>
                <Btn variant="green" size="sm" disabled={!newAmb.superficie} onClick={addAmb}>Agregar</Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {editAmb && (
        <Modal title={"Editar: " + editAmb.nombre} onClose={() => setEditAmb(null)} width={460}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Nombre" value={editAmb.nombre} onChange={v => setEditAmb(p => ({ ...p, nombre: v }))} />
            <Inp label="Superficie m²" type="number" value={editAmb.superficie} onChange={v => setEditAmb(p => ({ ...p, superficie: v }))} />
            <Inp label="Iluminación m²" type="number" value={editAmb.sup_ilum} onChange={v => setEditAmb(p => ({ ...p, sup_ilum: v }))} />
            <Inp label="Ventilación m²" type="number" value={editAmb.sup_vent} onChange={v => setEditAmb(p => ({ ...p, sup_vent: v }))} />
            <Inp label="Altura libre m" type="number" value={editAmb.altura} onChange={v => setEditAmb(p => ({ ...p, altura: v }))} />
            <div>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Planta</div>
              <select value={editAmb.planta} onChange={e => setEditAmb(p => ({ ...p, planta: e.target.value }))}
                style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 8, padding: "9px 13px", color: "#e2e8f0", fontSize: 13, outline: "none" }}>
                {["PB","PP","2P","3P","SP"].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 10, marginBottom: 14 }}>
            <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Tipo de superficie</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{id:"cubierta",label:"Cubierta"},{id:"semicubierta",label:"Semicubierta"},{id:"descubierta",label:"Descubierta"}].map(ts => (
                <button key={ts.id} onClick={() => setEditAmb(p => ({ ...p, tipo_sup: ts.id }))}
                  style={{ padding: "6px 14px", borderRadius: 6, border: "2px solid " + (editAmb.tipo_sup === ts.id ? "#3b82f6" : "#1a2640"), background: editAmb.tipo_sup === ts.id ? "#1a2a40" : "#111d2e", color: editAmb.tipo_sup === ts.id ? "#93c5fd" : "#475569", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  {ts.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setEditAmb(null)}>Cancelar</Btn>
            <Btn onClick={saveEditAmb}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </Card>
  );
};

// ── VERIFICACIÓN NORMATIVA CARD (B) ───────────────────────────────────────────
const VerificacionCard = ({ proj, municipios }) => {
  const [open, setOpen] = useState(true);
  const alertas = verificarNormativa(proj, municipios);
  const errores  = alertas.filter(a => a.tipo === "error").length;
  const warnings = alertas.filter(a => a.tipo === "warning").length;
  const oks      = alertas.filter(a => a.tipo === "ok").length;
  const infos    = alertas.filter(a => a.tipo === "info").length;

  const iconColor = (tipo) => tipo === "error" ? "#ef4444" : tipo === "warning" ? "#f59e0b" : tipo === "ok" ? "#22c55e" : "#3b82f6";
  const icon = (tipo) => tipo === "error" ? "✗" : tipo === "warning" ? "⚠" : tipo === "ok" ? "✓" : "ℹ";

  const lote = proj.lote || buildLote();
  const ambientes = proj.ambientes || [];

  if (!lote.sup_total && ambientes.length === 0) {
    return (
      <Card style={{ marginBottom: 16, border: "1px solid #1a2640" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <div>
            <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>Verificación normativa</div>
            <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>Completá los datos del lote y ambientes para verificar automáticamente.</div>
          </div>
        </div>
      </Card>
    );
  }

  const borderColor = errores > 0 ? "#ef444433" : warnings > 0 ? "#f59e0b33" : "#22c55e33";

  return (
    <Card style={{ marginBottom: 16, border: "1px solid " + borderColor }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <span style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 13 }}>Verificación normativa</span>
          <div style={{ display: "flex", gap: 6 }}>
            {errores > 0  && <Badge color="#ef4444">{errores} error{errores !== 1 ? "es" : ""}</Badge>}
            {warnings > 0 && <Badge color="#f59e0b">{warnings} alerta{warnings !== 1 ? "s" : ""}</Badge>}
            {oks > 0 && errores === 0 && warnings === 0 && <Badge color="#22c55e">✓ Todo OK</Badge>}
          </div>
        </div>
        <span style={{ color: "#334155", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          {alertas.length === 0 && (
            <div style={{ color: "#475569", fontSize: 12 }}>Completá más datos para ver la verificación completa.</div>
          )}
          {alertas.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "7px 10px", background: iconColor(a.tipo) + "11", borderRadius: 7, marginBottom: 5, border: "1px solid " + iconColor(a.tipo) + "33" }}>
              <span style={{ color: iconColor(a.tipo), fontWeight: 900, fontSize: 13, flexShrink: 0, marginTop: 1 }}>{icon(a.tipo)}</span>
              <span style={{ color: a.tipo === "ok" ? "#86efac" : a.tipo === "error" ? "#fca5a5" : a.tipo === "warning" ? "#fcd34d" : "#93c5fd", fontSize: 12, lineHeight: 1.4 }}>{a.texto}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ── PLANILLA DE LOCALES + CUADRO DE SUPERFICIES CARD (C) ─────────────────────
const PlanillaCard = ({ proj, municipios }) => {
  const ambientes = proj.ambientes || [];
  const lote = proj.lote || buildLote();
  const muni = municipios[proj.municipio];
  const barrio = proj.barrio ? muni?.barrios[proj.barrio] : null;
  const zona = muni?.zonas?.find(z => z.nombre === proj.zona);

  const supCub  = ambientes.filter(a => a.tipo_sup === "cubierta")    .reduce((s,a) => s + (parseFloat(a.superficie)||0), 0);
  const supSemi = ambientes.filter(a => a.tipo_sup === "semicubierta").reduce((s,a) => s + (parseFloat(a.superficie)||0), 0);
  const supDesc = ambientes.filter(a => a.tipo_sup === "descubierta") .reduce((s,a) => s + (parseFloat(a.superficie)||0), 0);
  const supLote = parseFloat(lote.sup_total) || 0;
  const fosLim = barrio ? barrio.fos_max : zona?.fos;
  const fotLim = barrio ? barrio.fot_max : zona?.fot;
  const fosReal = supLote > 0 ? (supCub / supLote).toFixed(3) : "—";
  const fotReal = supLote > 0 ? ((supCub + supSemi * 0.5) / supLote).toFixed(3) : "—";
  const coef_ilum_n = parseFloat(muni?.coef_ilum?.replace("L/","")) || 8;
  const coef_vent_n = parseFloat(muni?.coef_vent?.replace("L/","")) || 3;

  if (ambientes.length === 0) return null;

  const generarPDF = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Planilla de Locales — ${proj.nombre}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #111; padding: 20px; }
  h1 { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
  h2 { font-size: 11px; font-weight: bold; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 14px; border-bottom: 2px solid #000; padding-bottom: 10px; }
  .header-right { text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #1a1a2e; color: white; padding: 5px 7px; text-align: left; font-size: 9px; text-transform: uppercase; }
  td { padding: 5px 7px; border-bottom: 1px solid #e5e5e5; font-size: 10px; }
  tr:nth-child(even) { background: #f9f9f9; }
  .ok { color: #16a34a; font-weight: bold; }
  .error { color: #dc2626; font-weight: bold; }
  .warning { color: #d97706; font-weight: bold; }
  .totales { background: #1a1a2e; color: white; font-weight: bold; }
  .totales td { color: white; border-bottom: none; }
  .resumen { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }
  .resumen-box { border: 1px solid #ccc; padding: 10px; border-radius: 4px; }
  .resumen-box .valor { font-size: 18px; font-weight: bold; margin: 4px 0 2px; }
  .firma { margin-top: 40px; display: flex; justify-content: flex-end; }
  .firma-box { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 6px; font-size: 10px; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>${proj.nombre}</h1>
    <div>${proj.tipo?.replace("_"," ").toUpperCase()} · Zona ${proj.zona}</div>
    <div>${muni?.nombre}${barrio ? " — " + barrio.nombre : ""}</div>
    <div>Superficie del lote: ${lote.sup_total || "—"} m²  ·  Frente: ${lote.frente || "—"} m  ·  Fondo: ${lote.fondo || "—"} m</div>
  </div>
  <div class="header-right">
    <div><strong>Arq. Julieta Vento</strong></div>
    <div>MP 35670</div>
    <div>${muni?.matricula_muni ? "MM " + muni.matricula_muni : ""}</div>
    <div>${new Date().toLocaleDateString("es-AR")}</div>
  </div>
</div>

<div class="resumen">
  <div class="resumen-box">
    <div style="font-weight:bold;font-size:9px;text-transform:uppercase;color:#666">Cuadro de superficies</div>
    <table style="margin-top:8px">
      <tr><td>Sup. cubierta</td><td><strong>${supCub.toFixed(2)} m²</strong></td></tr>
      <tr><td>Sup. semicubierta</td><td><strong>${supSemi.toFixed(2)} m²</strong></td></tr>
      <tr><td>Sup. descubierta</td><td><strong>${supDesc.toFixed(2)} m²</strong></td></tr>
      <tr style="border-top:1px solid #ccc"><td><strong>Total computable</strong></td><td><strong>${(supCub + supSemi * 0.5).toFixed(2)} m²</strong></td></tr>
    </table>
  </div>
  <div class="resumen-box">
    <div style="font-weight:bold;font-size:9px;text-transform:uppercase;color:#666">Indicadores FOS / FOT</div>
    <table style="margin-top:8px">
      <tr><td>FOS calculado</td><td class="${fosReal !== "—" && fosLim && parseFloat(fosReal) > parseFloat(fosLim) ? "error" : "ok"}"><strong>${fosReal}</strong></td><td style="color:#666">(máx. ${fosLim || "—"})</td></tr>
      <tr><td>FOT calculado</td><td class="${fotReal !== "—" && fotLim && parseFloat(fotReal) > parseFloat(fotLim) ? "error" : "ok"}"><strong>${fotReal}</strong></td><td style="color:#666">(máx. ${fotLim || "—"})</td></tr>
      ${barrio?.retiro_frente ? `<tr><td>Retiro frente</td><td>${barrio.retiro_frente} m</td></tr>` : ""}
      ${barrio?.retiro_fondo ? `<tr><td>Retiro fondo</td><td>${barrio.retiro_fondo} m</td></tr>` : ""}
      ${barrio?.retiro_lateral ? `<tr><td>Retiro lateral</td><td>${barrio.retiro_lateral} m</td></tr>` : ""}
    </table>
  </div>
</div>

<h2>Planilla de locales</h2>
<table>
  <thead>
    <tr>
      <th>Local</th>
      <th>Cat.</th>
      <th>Planta</th>
      <th>Tipo</th>
      <th>Sup. m²</th>
      <th>Ilum. requerida</th>
      <th>Ilum. real</th>
      <th>Vent. requerida</th>
      <th>Vent. real</th>
      <th>Altura</th>
      <th>Estado</th>
    </tr>
  </thead>
  <tbody>
    ${ambientes.map(amb => {
      const tipo = AMBIENTES_TIPOS.find(t => t.id === amb.tipo);
      const sup = parseFloat(amb.superficie) || 0;
      const ilumMin = tipo?.cat === 1 ? (sup / coef_ilum_n).toFixed(2) : "—";
      const ventMin = tipo?.cat === 1 ? (sup / coef_vent_n).toFixed(2) : "—";
      const ilumReal = amb.sup_ilum || "—";
      const ventReal = amb.sup_vent || "—";
      const alt = parseFloat(amb.altura) || 0;
      const altMin = tipo?.cat <= 2 ? 2.40 : 2.40;
      const ilumOk = tipo?.cat === 1 && parseFloat(ilumReal) >= parseFloat(ilumMin);
      const ventOk = tipo?.cat === 1 && parseFloat(ventReal) >= parseFloat(ventMin);
      const altOk = alt >= altMin;
      const supMin = tipo?.sup_min || 0;
      const supOk = supMin === 0 || sup >= supMin;
      const estado = (tipo?.cat === 1 && (!ilumOk || !ventOk)) || !altOk || !supOk ? "⚠ Revisar" : "✓ OK";
      const estadoClass = estado.includes("⚠") ? "warning" : "ok";
      return `<tr>
        <td><strong>${amb.nombre}</strong></td>
        <td>${tipo?.cat || "—"}°</td>
        <td>${amb.planta}</td>
        <td>${amb.tipo_sup === "cubierta" ? "Cub." : amb.tipo_sup === "semicubierta" ? "Semi." : "Desc."}</td>
        <td>${sup.toFixed(2)}</td>
        <td>${ilumMin} m²</td>
        <td class="${tipo?.cat === 1 ? (ilumOk ? "ok" : "error") : ""}">${ilumReal !== "—" ? ilumReal + " m²" : "—"}</td>
        <td>${ventMin} m²</td>
        <td class="${tipo?.cat === 1 ? (ventOk ? "ok" : "error") : ""}">${ventReal !== "—" ? ventReal + " m²" : "—"}</td>
        <td class="${altOk ? "ok" : "error"}">${alt > 0 ? alt + " m" : "—"}</td>
        <td class="${estadoClass}">${estado}</td>
      </tr>`;
    }).join("")}
    <tr class="totales">
      <td colspan="4"><strong>TOTALES</strong></td>
      <td><strong>${(supCub + supSemi + supDesc).toFixed(2)} m²</strong></td>
      <td colspan="6"></td>
    </tr>
  </tbody>
</table>

<div class="firma">
  <div class="firma-box">
    Arq. Julieta Vento · MP 35670<br>
    ${muni?.matricula_muni ? "MM " + muni.matricula_muni : ""}
  </div>
</div>
</body>
</html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.print();
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>📋</span>
          <span style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 13 }}>Cuadro de superficies</span>
        </div>
        <Btn size="sm" variant="ghost" onClick={generarPDF}>🖨 Generar PDF / Imprimir</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          ["Cubierta", supCub.toFixed(2), "#3b82f6"],
          ["Semicubierta", supSemi.toFixed(2), "#f59e0b"],
          ["Descubierta", supDesc.toFixed(2), "#22c55e"],
          ["Total", (supCub + supSemi + supDesc).toFixed(2), "#e2e8f0"],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background: "#0d1624", border: "1px solid #1a2640", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", fontWeight: 700 }}>{l}</div>
            <div style={{ color: c, fontSize: 18, fontWeight: 900, marginTop: 3 }}>{v}</div>
            <div style={{ color: "#334155", fontSize: 9, marginTop: 1 }}>m²</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: "#0d1624", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: "#334155", fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>FOS calculado</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ color: fosReal !== "—" && fosLim && parseFloat(fosReal) > parseFloat(fosLim) ? "#ef4444" : "#22c55e", fontSize: 20, fontWeight: 900 }}>{fosReal}</span>
            <span style={{ color: "#475569", fontSize: 11 }}>/ {fosLim || "—"} máx.</span>
          </div>
        </div>
        <div style={{ background: "#0d1624", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: "#334155", fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>FOT calculado</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ color: fotReal !== "—" && fotLim && parseFloat(fotReal) > parseFloat(fotLim) ? "#ef4444" : "#22c55e", fontSize: 20, fontWeight: 900 }}>{fotReal}</span>
            <span style={{ color: "#475569", fontSize: 11 }}>/ {fotLim || "—"} máx.</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const Sidebar = ({ view, setView, onExport, onImport, isMobile, sidebarOpen, onCloseSidebar }) => {
  if (isMobile && !sidebarOpen) return null;
  const nav = (v) => { setView(v); if (isMobile && onCloseSidebar) onCloseSidebar(); };
  return (
  <>
    {isMobile && <div onClick={onCloseSidebar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 998 }} />}
    <div style={{ width: 218, background: "#0d1624", borderRight: "1px solid #1a2640", display: "flex", flexDirection: "column", flexShrink: 0, ...(isMobile ? { position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 999 } : {}) }}>
    {isMobile && <button onClick={onCloseSidebar} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer", zIndex: 1000 }}>✕</button>}
    <div style={{ padding: "26px 22px 18px", borderBottom: "1px solid #1a2640" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📐</div>
        <div>
          <div style={{ color: "#e2e8f0", fontWeight: 900, fontSize: 13, letterSpacing: "-0.03em" }}>PlanoMuni</div>
          <div style={{ color: "#334155", fontSize: 10 }}>v0.2 — beta</div>
        </div>
      </div>
    </div>
    <nav style={{ padding: "14px 10px", flex: 1 }}>
      {[
        { id: "home",      label: "Proyectos",    icon: "📁" },
        { id: "nuevo",     label: "Nuevo plano",  icon: "＋" },
        { id: "obras",     label: "Dir. de Obra", icon: "🏗" },
        { id: "normativa", label: "Normativa",    icon: "🗺️" },
      ].map(item => (
        <button key={item.id} onClick={() => nav(item.id)} style={{
          display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "10px 13px",
          background: view === item.id ? "#1a2a40" : "none", border: "none", borderRadius: 8,
          color: view === item.id ? "#93c5fd" : "#475569", cursor: "pointer", fontSize: 13,
          fontWeight: view === item.id ? 700 : 400, textAlign: "left", marginBottom: 2,
        }}>
          <span>{item.icon}</span>{item.label}
          {item.id === "nuevo" && <span style={{ marginLeft: "auto", background: "#3b82f6", color: "white", width: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900 }}>+</span>}
        </button>
      ))}
    </nav>
    <div style={{ padding: "10px 14px", borderTop: "1px solid #1a2640", display: "flex", gap: 6 }}>
      <button onClick={onExport} style={{ flex: 1, background: "#111d2e", border: "1px solid #1a2640", borderRadius: 7, padding: "7px 0", cursor: "pointer", color: "#94a3b8", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>📥 Exportar</button>
      <button onClick={onImport} style={{ flex: 1, background: "#111d2e", border: "1px solid #1a2640", borderRadius: 7, padding: "7px 0", cursor: "pointer", color: "#94a3b8", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>📤 Importar</button>
    </div>
    <div style={{ padding: "14px 20px", borderTop: "1px solid #1a2640" }}>
      <div style={{ color: "#334155", fontSize: 11, fontWeight: 600 }}>Profesional</div>
      <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginTop: 2 }}>Julieta Vento</div>
      <div style={{ color: "#3b82f6", fontSize: 11, marginTop: 1 }}>Arq. · MP 35670</div>
      <div style={{ color: "#334155", fontSize: 10, marginTop: 1 }}>Escobar MM 7884 · Tigre MM 42013</div>
    </div>
  </div>
  </>
  );
};

// ── HOME VIEW ─────────────────────────────────────────────────────────────────
const HomeView = ({ projects, setProjects, municipios, setView, onOpenObra, isMobile }) => {
  const [sel, setSel] = useState(null);
  const [tickModal, setTickModal] = useState(null);
  const [tickDate, setTickDate] = useState("");
  const [tickObs, setTickObs] = useState("");
  const [editingEstado, setEditingEstado] = useState(false);
  const [estadoDraft, setEstadoDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMuni, setFilterMuni] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const filtered = useMemo(() => projects.filter(p => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!p.nombre.toLowerCase().includes(q) && !(p.estado_texto || "").toLowerCase().includes(q) && !(p.propietario || "").toLowerCase().includes(q)) return false;
    }
    if (filterMuni && p.municipio !== filterMuni) return false;
    if (filterTipo && p.tipo !== filterTipo) return false;
    return true;
  }), [projects, searchTerm, filterMuni, filterTipo]);
  const proj = sel !== null ? projects.find(p => p.id === sel) : null;

  const doTick = () => {
    setProjects(prev => prev.map(p => {
      if (p.id !== tickModal.pid) return p;
      return { ...p, workflow: p.workflow.map(s => s.id === tickModal.sid ? { ...s, done: true, fecha: tickDate, obs: tickObs } : s), observaciones: tickObs ? [...p.observaciones, tickObs] : p.observaciones };
    }));
    setTickModal(null); setTickDate(""); setTickObs("");
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ width: isMobile ? "100%" : (proj ? 340 : "100%"), borderRight: !isMobile && proj ? "1px solid #1a2640" : "none", overflow: "auto", padding: isMobile ? 16 : 26, flexShrink: 0, display: isMobile && proj ? "none" : "block" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h1 style={{ color: "#e2e8f0", fontSize: 21, fontWeight: 900, margin: 0, letterSpacing: "-0.03em" }}>Proyectos</h1>
            <p style={{ color: "#334155", margin: "3px 0 0", fontSize: 12 }}>{filtered.length === projects.length ? projects.length + " planos activos" : filtered.length + " de " + projects.length + " planos"}</p>
          </div>
          <Btn onClick={() => setView("nuevo")} size="sm">＋ Nuevo</Btn>
        </div>
        <div style={{ marginBottom: 14 }}>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por nombre, estado o propietario..."
            style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 8, padding: "9px 13px", color: "#e2e8f0", fontSize: 12, boxSizing: "border-box", outline: "none", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <select value={filterMuni} onChange={e => setFilterMuni(e.target.value)} style={{ background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 7, padding: "6px 10px", color: "#94a3b8", fontSize: 11, outline: "none", cursor: "pointer" }}>
              <option value="">Todos los municipios</option>
              {Object.values(municipios).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{ background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 7, padding: "6px 10px", color: "#94a3b8", fontSize: 11, outline: "none", cursor: "pointer" }}>
              <option value="">Todos los tipos</option>
              {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            {(searchTerm || filterMuni || filterTipo) && (
              <button onClick={() => { setSearchTerm(""); setFilterMuni(""); setFilterTipo(""); }} style={{ background: "none", border: "1px solid #2d3f5a", borderRadius: 7, padding: "6px 10px", color: "#64748b", fontSize: 11, cursor: "pointer" }}>Limpiar filtros</button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(p => {
            const tipo = getTipo(p.tipo);
            const muni = getMuni(municipios, p.municipio);
            const barrio = getBarrio(municipios, p.municipio, p.barrio);
            const done = p.workflow.filter(s => s.done).length;
            const total = p.workflow.length;
            const isFinal = p.workflow[p.workflow.length - 1]?.done;
            const current = p.workflow.find(s => !s.done);
            const isSelected = sel === p.id;
            const estadoTexto = p.estado_texto || (isFinal ? "✅ Aprobado" : current ? "▶ " + current.label : "");
            return (
              <div key={p.id} onClick={() => setSel(isSelected ? null : p.id)} style={{ background: isSelected ? "#0f1e33" : "#111d2e", border: "1px solid " + (isSelected ? "#3b82f6" : "#1a2640"), borderRadius: 12, padding: 18, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Dot color={tipo.color} size={9} />
                    <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14 }}>{p.nombre}</span>
                  </div>
                  <Badge color={tipo.color}>{tipo.label}</Badge>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  <Badge color="#475569">{muni?.nombre}</Badge>
                  {barrio && <Badge color="#3b82f6">🏘 {barrio.nombre}</Badge>}
                  {barrio?.avp_label && <Badge color="#f59e0b">{barrio.avp_label}</Badge>}
                </div>
                <WorkflowBar workflow={p.workflow} compact={true} />
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#334155", fontSize: 10 }}>{done}/{total} pasos · inicio {p.fecha_inicio}</span>
                  <span style={{ color: isFinal ? "#22c55e" : "#64748b", fontSize: 10, fontWeight: 700 }}>{estadoTexto.length > 40 ? estadoTexto.slice(0, 38) + "…" : estadoTexto}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {proj && (() => {
        const tipo = getTipo(proj.tipo);
        const muni = getMuni(municipios, proj.municipio);
        const barrio = getBarrio(municipios, proj.municipio, proj.barrio);
        const zona = getZona(municipios, proj.municipio, proj.zona);
        const isFinal = proj.workflow[proj.workflow.length - 1]?.done;
        const nextStep = proj.workflow.find((s, i) => !s.done && (i === 0 || proj.workflow[i - 1]?.done));
        const estadoTexto = proj.estado_texto || (isFinal ? "✅ Aprobado por municipio" : nextStep ? "▶ " + nextStep.label : "—");
        const estadoColor = isFinal ? "#22c55e" : "#f59e0b";
        return (
          <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 16 : 28 }}>
            {isMobile && <button onClick={() => setSel(null)} style={{ background: "#1a2235", border: "1px solid #2d3f5a", borderRadius: 8, color: "#93c5fd", padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>← Volver a lista</button>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                  <Dot color={tipo.color} size={12} />
                  <h1 style={{ color: "#e2e8f0", fontSize: isMobile ? 16 : 19, fontWeight: 900, margin: 0 }}>{proj.nombre}</h1>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <Badge color={tipo.color}>{tipo.label}</Badge>
                  <Badge color="#475569">🏛 {muni?.nombre}</Badge>
                  {barrio && <Badge color="#3b82f6">🏘 {barrio.nombre}</Badge>}
                  <Badge color="#8b5cf6">Zona {proj.zona}</Badge>
                  {barrio?.avp_label && <Badge color="#f59e0b">{barrio.avp_label}</Badge>}
                  <Badge color="#334155">📅 {proj.fecha_inicio}</Badge>
                </div>
                {editingEstado ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input autoFocus value={estadoDraft} onChange={e => setEstadoDraft(e.target.value)}
                      onBlur={() => { setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, estado_texto: estadoDraft } : p)); setEditingEstado(false); }}
                      onKeyDown={e => { if (e.key === "Enter") { setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, estado_texto: estadoDraft } : p)); setEditingEstado(false); } if (e.key === "Escape") setEditingEstado(false); }}
                      placeholder="Estado del proyecto..."
                      style={{ background: "#0f1724", border: "1px solid " + estadoColor, borderRadius: 8, padding: "9px 16px", color: estadoColor, fontSize: 13, fontWeight: 700, outline: "none", minWidth: 300, boxSizing: "border-box" }} />
                  </div>
                ) : (
                  <div onClick={() => { setEstadoDraft(proj.estado_texto || ""); setEditingEstado(true); }} style={{ background: estadoColor + "15", border: "1px solid " + estadoColor + "44", borderRadius: 8, padding: "9px 16px", display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }} title="Click para editar estado">
                    <span style={{ color: estadoColor, fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{estadoTexto}</span>
                    <span style={{ color: estadoColor + "88", fontSize: 11 }}>✏</span>
                  </div>
                )}
              </div>
              <button onClick={() => setSel(null)} style={{ background: "#1a2235", border: "1px solid #2d3f5a", borderRadius: 8, color: "#64748b", padding: "7px 12px", cursor: "pointer", fontSize: 13, flexShrink: 0 }}>✕</button>
            </div>
            <Card style={{ marginBottom: 16 }}>
              <WorkflowBar workflow={proj.workflow} compact={false} />
              {nextStep && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #1a2640" }}>
                  <Btn variant="ghost" size="sm" onClick={() => setTickModal({ pid: proj.id, sid: nextStep.id, label: nextStep.label })}>
                    ✅ Marcar como completado: {nextStep.label}
                  </Btn>
                </div>
              )}
            </Card>
            <Card style={{ marginBottom: 16 }}>
              <Label>Indicadores urbanísticos</Label>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                {[
                  { label: "FOS municipio", value: zona ? zona.fos : "—", sub: "Zona " + proj.zona, hi: false },
                  { label: "FOT municipio", value: zona ? zona.fot : "—", sub: "Zona " + proj.zona, hi: false },
                  { label: "FOS barrio ★", value: barrio ? barrio.fos_max : "—", sub: barrio?.nombre || "Sin barrio", hi: true },
                  { label: "FOT barrio ★", value: barrio ? barrio.fot_max : "—", sub: "← usar este", hi: true },
                ].map(({ label, value, sub, hi }) => (
                  <div key={label} style={{ background: "#0d1624", border: "1px solid " + (hi ? "#3b82f644" : "#1a2640"), borderRadius: 8, padding: 14, textAlign: "center" }}>
                    <div style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>{label}</div>
                    <div style={{ color: hi ? "#93c5fd" : "#94a3b8", fontSize: 22, fontWeight: 900 }}>{value}</div>
                    <div style={{ color: hi ? "#3b82f6" : "#334155", fontSize: 10, fontWeight: hi ? 700 : 400, marginTop: 4 }}>{sub}</div>
                  </div>
                ))}
              </div>
              {barrio?.retiro_frente && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[["Retiro frente", barrio.retiro_frente + " m"], ["Retiro fondo", barrio.retiro_fondo + " m"], ["Retiro lateral", barrio.retiro_lateral + " m"]].map(([l, v]) => (
                    <div key={l} style={{ background: "#0d1624", borderRadius: 7, padding: "8px 12px", textAlign: "center" }}>
                      <div style={{ color: "#334155", fontSize: 10 }}>{l}</div>
                      <div style={{ color: "#94a3b8", fontWeight: 800, fontSize: 15, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <LoteCard proj={proj} setProjects={setProjects} />
            <VerificacionCard proj={proj} municipios={municipios} />
            <PlanillaCard proj={proj} municipios={municipios} />
            <FilesCard proj={proj} setProjects={setProjects} />
            {(proj.propietario || proj.cuil || proj.localidad || proj.lote_m2 || proj.partida) && (
              <Card style={{ marginBottom: 16 }}>
                <Label>Datos del propietario / lote</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {proj.propietario && <div><div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Propietario</div><div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{proj.propietario}</div></div>}
                  {proj.cuil && <div><div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>CUIL / CUIT</div><div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{proj.cuil}</div></div>}
                  {proj.localidad && <div><div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Localidad</div><div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{proj.localidad}</div></div>}
                  {proj.lote_m2 && <div><div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Superficie lote</div><div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{proj.lote_m2} m²</div></div>}
                  {proj.partida && <div><div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Partida territorial</div><div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{proj.partida}</div></div>}
                </div>
              </Card>
            )}
            {proj.observaciones.length > 0 && (
              <Card style={{ border: "1px solid #f59e0b33", marginBottom: 16 }}>
                <Label>⚠ Observaciones municipales</Label>
                {proj.observaciones.map((o, i) => (
                  <div key={i} style={{ color: "#fcd34d", fontSize: 13, padding: "8px 12px", background: "#f59e0b11", borderRadius: 6, marginBottom: 6 }}>{o}</div>
                ))}
              </Card>
            )}
            <Card>
              <Label>Dirección de obra</Label>
              <Toggle label="Activar dirección de obra para este proyecto" value={!!proj.obra?.activo}
                onChange={(v) => setProjects(prev => prev.map(p => {
                  if (p.id !== proj.id) return p;
                  if (v) return { ...p, obra: p.obra?.activo ? p.obra : { ...buildObraData(), activo: true } };
                  return { ...p, obra: { ...(p.obra || buildObraData()), activo: false } };
                }))}
              />
              {proj.obra?.activo && <Btn onClick={() => onOpenObra(proj.id)} size="sm">🏗 Dirección de Obra</Btn>}
            </Card>
          </div>
        );
      })()}

      {tickModal && (
        <Modal title={"Completar: " + tickModal.label} onClose={() => setTickModal(null)} width={420}>
          <Inp label="Fecha" placeholder="dd/mm/aaaa" value={tickDate} onChange={setTickDate} />
          <Inp label="Observaciones (opcional)" placeholder="Notas del municipio..." value={tickObs} onChange={setTickObs} />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setTickModal(null)}>Cancelar</Btn>
            <Btn variant="green" onClick={doTick}>✅ Confirmar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── NUEVO VIEW ────────────────────────────────────────────────────────────────
const NuevoView = ({ municipios, setView, setProjects, isMobile }) => {
  const [step, setStep] = useState(1);
  const [muniId, setMuniId] = useState(null);
  const [barrioId, setBarrioId] = useState(null);
  const [tipo, setTipo] = useState(null);
  const [zona, setZona] = useState(null);
  const [datos, setDatos] = useState({ calle: "", numero: "", localidad: "", lote_m2: "", propietario: "", cuil: "", partida: "" });
  const muni = muniId ? municipios[muniId] : null;
  const barrio = barrioId ? muni?.barrios[barrioId] : null;
  const STEPS = ["Municipio", "Barrio", "Tipo y zona", "Datos"];
  const crear = () => {
    const p = { id: Date.now(), nombre: datos.calle + " " + datos.numero + (barrioId ? " — " + barrio.nombre : ""), municipio: muniId, barrio: barrioId, tipo, zona, workflow: buildFlow(!!barrioId), fecha_inicio: new Date().toLocaleDateString("es-AR"), estado_texto: "", observaciones: [], archivos: buildArchivos(), localidad: datos.localidad, lote_m2: datos.lote_m2, propietario: datos.propietario, cuil: datos.cuil, partida: datos.partida };
    setProjects(prev => [...prev, p]);
    setView("home");
  };
  const StepDot = ({ n }) => <div style={{ width: 28, height: 28, borderRadius: 14, background: step > n ? "#22c55e" : step === n ? "#3b82f6" : "#1e2d42", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{step > n ? "✓" : n}</div>;
  return (
    <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 16 : 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 30 }}>
        <Btn variant="ghost" size="sm" onClick={() => setView("home")}>← Volver</Btn>
        <h1 style={{ color: "#e2e8f0", fontSize: isMobile ? 16 : 19, fontWeight: 900, margin: 0 }}>Nuevo plano municipal</h1>
      </div>
      <div style={{ display: "flex", gap: 0, marginBottom: 32, maxWidth: 480 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <StepDot n={i + 1} />
              <span style={{ color: step === i + 1 ? "#93c5fd" : "#334155", fontSize: 10, marginTop: 5, fontWeight: step === i + 1 ? 700 : 400 }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ height: 1, background: "#1e2d42", width: 28, flexShrink: 0, marginBottom: 14 }} />}
          </div>
        ))}
      </div>
      {step === 1 && (
        <div style={{ maxWidth: 540 }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Seleccioná el municipio</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 18 }}>
            {Object.values(municipios).map(m => (
              <button key={m.id} onClick={() => setMuniId(m.id)} style={{ background: muniId === m.id ? "#1a2a40" : "#111d2e", border: "2px solid " + (muniId === m.id ? "#3b82f6" : "#1a2640"), borderRadius: 12, padding: 18, cursor: "pointer", textAlign: "left" }}>
                <div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 14, marginBottom: 3 }}>{m.nombre}</div>
                <div style={{ color: "#334155", fontSize: 11 }}>{m.provincia}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 5 }}><Badge color="#475569">{Object.keys(m.barrios).length} barrios</Badge><Badge color="#334155">MM {m.matricula_muni}</Badge></div>
              </button>
            ))}
          </div>
          <Btn disabled={!muniId} onClick={() => setStep(2)}>Continuar →</Btn>
        </div>
      )}
      {step === 2 && muni && (
        <div style={{ maxWidth: 540 }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Barrio privado — {muni.nombre}</div>
          <p style={{ color: "#475569", fontSize: 12, marginBottom: 14 }}>Si la obra está en un barrio cerrado, seleccionalo.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            <button onClick={() => setBarrioId(null)} style={{ background: barrioId === null ? "#1a2a40" : "#111d2e", border: "2px solid " + (barrioId === null ? "#3b82f6" : "#1a2640"), borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "left" }}>
              <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>Sin barrio privado</div>
              <div style={{ color: "#334155", fontSize: 11, marginTop: 3 }}>Normativa municipal estándar</div>
            </button>
            {Object.values(muni.barrios).map(b => (
              <button key={b.id} onClick={() => setBarrioId(b.id)} style={{ background: barrioId === b.id ? "#1a2a40" : "#111d2e", border: "2px solid " + (barrioId === b.id ? "#3b82f6" : "#1a2640"), borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "left" }}>
                <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>{b.nombre}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>FOS {b.fos_max} · FOT {b.fot_max} · Frente {b.retiro_frente}m</div>
                {b.avp_label && <div style={{ marginTop: 6 }}><Badge color="#f59e0b">{b.avp_label}</Badge></div>}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}><Btn variant="ghost" onClick={() => setStep(1)}>← Atrás</Btn><Btn onClick={() => setStep(3)}>Continuar →</Btn></div>
        </div>
      )}
      {step === 3 && muni && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Tipo de plano</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
            {TIPOS.map(t => (
              <button key={t.id} onClick={() => setTipo(t.id)} style={{ background: tipo === t.id ? "#1a2a40" : "#111d2e", border: "2px solid " + (tipo === t.id ? t.color : "#1a2640"), borderRadius: 10, padding: "13px 14px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                <Dot color={t.color} size={9} /><span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 12 }}>{t.label}</span>
              </button>
            ))}
          </div>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Zona del lote</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {muni.zonas.map(z => (
              <button key={z.nombre} onClick={() => setZona(z.nombre)} style={{ background: zona === z.nombre ? "#1a2a40" : "#111d2e", border: "2px solid " + (zona === z.nombre ? "#3b82f6" : "#1a2640"), borderRadius: 8, padding: "9px 14px", cursor: "pointer", display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>{z.nombre}</span><span style={{ color: "#475569", fontSize: 11 }}>FOS {z.fos} · FOT {z.fot}</span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}><Btn variant="ghost" onClick={() => setStep(2)}>← Atrás</Btn><Btn disabled={!tipo || !zona} onClick={() => setStep(4)}>Continuar →</Btn></div>
        </div>
      )}
      {step === 4 && (
        <div style={{ maxWidth: 520 }}>
          <Card style={{ marginBottom: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Inp label="Calle" placeholder="Los Robles" value={datos.calle} onChange={v => setDatos(p => ({...p, calle: v}))} />
              <Inp label="Número / Lote" placeholder="238" value={datos.numero} onChange={v => setDatos(p => ({...p, numero: v}))} />
            </div>
            <Inp label="Localidad" value={datos.localidad} onChange={v => setDatos(p => ({...p, localidad: v}))} />
            <Inp label="Superficie del lote (m²)" type="number" value={datos.lote_m2} onChange={v => setDatos(p => ({...p, lote_m2: v}))} />
            <Inp label="Nombre del propietario" value={datos.propietario} onChange={v => setDatos(p => ({...p, propietario: v}))} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Inp label="CUIL / CUIT" value={datos.cuil} onChange={v => setDatos(p => ({...p, cuil: v}))} />
              <Inp label="N° Partida Territorial" value={datos.partida} onChange={v => setDatos(p => ({...p, partida: v}))} />
            </div>
          </Card>
          <div style={{ display: "flex", gap: 10 }}><Btn variant="ghost" onClick={() => setStep(3)}>← Atrás</Btn><Btn variant="green" onClick={crear}>✅ Crear proyecto</Btn></div>
        </div>
      )}
    </div>
  );
};

// ── NORMATIVA VIEW ────────────────────────────────────────────────────────────
const NormativaView = ({ municipios, setMunicipios, isMobile }) => {
  const [selMuni, setSelMuni] = useState("escobar");
  const [selBarrio, setSelBarrio] = useState(null);
  const [tab, setTab] = useState("general");
  const [showAddMuni, setShowAddMuni] = useState(false);
  const [showAddBarrio, setShowAddBarrio] = useState(false);
  const [showEditBarrio, setShowEditBarrio] = useState(false);
  const [editB, setEditB] = useState(null);
  const [newMuni, setNewMuni] = useState({ nombre: "", provincia: "Buenos Aires", coef_ilum: "L/8", coef_vent: "L/3", semicubierto: "100%", altura_max: "", esquema_estructural: true, matricula_muni: "" });
  const [newB, setNewB] = useState({ nombre: "", fos_max: "", fot_max: "", retiro_frente: "", retiro_fondo: "", retiro_lateral: "", nivel_00: "", altura_max: "", doble_aprobacion: false, avp_label: "", notas: "" });
  const muni = municipios[selMuni];
  const barrio = selBarrio ? muni?.barrios[selBarrio] : null;
  const addMuni = () => {
    const id = newMuni.nombre.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    setMunicipios(p => ({ ...p, [id]: { ...newMuni, id, barrios: {}, zonas: [] } }));
    setSelMuni(id); setShowAddMuni(false);
  };
  const addBarrio = () => {
    const id = newB.nombre.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    setMunicipios(p => ({ ...p, [selMuni]: { ...p[selMuni], barrios: { ...p[selMuni].barrios, [id]: { ...newB, id } } } }));
    setSelBarrio(id); setShowAddBarrio(false);
  };
  const saveEditBarrio = () => { setMunicipios(p => ({ ...p, [selMuni]: { ...p[selMuni], barrios: { ...p[selMuni].barrios, [selBarrio]: { ...editB } } } })); setShowEditBarrio(false); };
  const TabBtn = ({ id, label }) => <button onClick={() => setTab(id)} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: tab === id ? "#1a2a40" : "none", color: tab === id ? "#93c5fd" : "#475569", cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 700 : 400 }}>{label}</button>;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", overflow: "hidden" }}>
      {isMobile ? (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a2640", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={selMuni} onChange={e => { setSelMuni(e.target.value); setSelBarrio(null); setTab("general"); }} style={{ background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 7, padding: "8px 12px", color: "#93c5fd", fontSize: 12, fontWeight: 700, outline: "none", cursor: "pointer" }}>
            {Object.values(municipios).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <button onClick={() => setShowAddMuni(true)} style={{ background: "#1a2a40", border: "none", color: "#3b82f6", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>+ Nuevo municipio</button>
        </div>
      ) : (
      <div style={{ width: 196, borderRight: "1px solid #1a2640", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 14px 10px", borderBottom: "1px solid #1a2640", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#334155", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Municipios</span>
          <button onClick={() => setShowAddMuni(true)} style={{ background: "#1a2a40", border: "none", color: "#3b82f6", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>+ Nuevo</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {Object.values(municipios).map(m => (
            <button key={m.id} onClick={() => { setSelMuni(m.id); setSelBarrio(null); setTab("general"); }} style={{ width: "100%", padding: "9px 11px", background: selMuni === m.id ? "#1a2a40" : "none", border: "none", borderRadius: 7, cursor: "pointer", textAlign: "left", color: selMuni === m.id ? "#93c5fd" : "#94a3b8", fontSize: 12, fontWeight: selMuni === m.id ? 700 : 400, marginBottom: 2 }}>
              {m.nombre}<div style={{ color: "#334155", fontSize: 10, fontWeight: 400 }}>MM {m.matricula_muni} · {Object.keys(m.barrios).length} barrios</div>
            </button>
          ))}
        </div>
      </div>
      )}
      {muni && (
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 16 : 26 }}>
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ color: "#e2e8f0", fontSize: 19, fontWeight: 900, margin: 0 }}>{muni.nombre}</h1>
            <p style={{ color: "#334155", margin: "3px 0 0", fontSize: 12 }}>Matrícula municipal: {muni.matricula_muni} · {muni.provincia}</p>
          </div>
          <div style={{ display: "flex", gap: 4, background: "#111d2e", borderRadius: 8, padding: 4, marginBottom: 22, width: "fit-content" }}>
            <TabBtn id="general" label="Normativa general" />
            <TabBtn id="barrios" label={"Barrios (" + Object.keys(muni.barrios).length + ")"} />
            <TabBtn id="categorias" label="Categorías de locales" />
          </div>
          {tab === "general" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[{ label: "Coef. Iluminación", value: muni.coef_ilum, color: "#3b82f6" }, { label: "Coef. Ventilación", value: muni.coef_vent, color: "#8b5cf6" }, { label: "Semicubierto", value: muni.semicubierto, color: "#22c55e" }, { label: "Altura máxima", value: muni.altura_max || "Según zona", color: "#f59e0b" }, { label: "Esquema estructural", value: muni.esquema_estructural ? "✅ Requerido" : "No requerido", color: muni.esquema_estructural ? "#22c55e" : "#64748b" }, { label: "Matrícula Municipal", value: "MM " + muni.matricula_muni, color: "#64748b" }].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "#111d2e", border: "1px solid #1a2640", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 7 }}>{label}</div>
                    <div style={{ color, fontSize: 14, fontWeight: 800 }}>{value}</div>
                  </div>
                ))}
              </div>
              <Card>
                <Label>Zonas urbanísticas</Label>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ borderBottom: "1px solid #1a2640" }}>{["Zona", "FOS Muni", "FOT Muni", "Descripción"].map(h => <th key={h} style={{ padding: "7px 12px", color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>{h}</th>)}</tr></thead>
                  <tbody>{muni.zonas.map(z => <tr key={z.nombre} style={{ borderBottom: "1px solid #0f1724" }}><td style={{ padding: "9px 12px" }}><Badge color="#3b82f6">{z.nombre}</Badge></td><td style={{ padding: "9px 12px", color: "#94a3b8", fontWeight: 700 }}>{z.fos}</td><td style={{ padding: "9px 12px", color: "#94a3b8", fontWeight: 700 }}>{z.fot}</td><td style={{ padding: "9px 12px", color: "#475569", fontSize: 12 }}>{z.desc}</td></tr>)}</tbody>
                </table>
              </Card>
            </div>
          )}
          {tab === "barrios" && (
            <div style={{ display: "flex", gap: 18 }}>
              <div style={{ width: 190, flexShrink: 0 }}>
                <button onClick={() => setSelBarrio(null)} style={{ width: "100%", padding: "9px 11px", background: selBarrio === null ? "#1a2a40" : "#111d2e", border: "1px solid " + (selBarrio === null ? "#3b82f6" : "#1a2640"), borderRadius: 7, cursor: "pointer", textAlign: "left", color: selBarrio === null ? "#93c5fd" : "#94a3b8", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>General (sin barrio)<div style={{ color: "#334155", fontSize: 10, fontWeight: 400 }}>Normativa base</div></button>
                {Object.values(muni.barrios).map(b => (
                  <button key={b.id} onClick={() => setSelBarrio(b.id)} style={{ width: "100%", padding: "9px 11px", background: selBarrio === b.id ? "#1a2a40" : "#111d2e", border: "1px solid " + (selBarrio === b.id ? "#3b82f6" : "#1a2640"), borderRadius: 7, cursor: "pointer", textAlign: "left", color: selBarrio === b.id ? "#93c5fd" : "#94a3b8", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
                    {b.nombre}<div style={{ color: "#334155", fontSize: 10, fontWeight: 400 }}>FOS {b.fos_max} · FOT {b.fot_max}</div>
                    {b.avp_label && <div style={{ marginTop: 4 }}><Badge color="#f59e0b">{b.avp_label}</Badge></div>}
                  </button>
                ))}
                <button onClick={() => setShowAddBarrio(true)} style={{ width: "100%", padding: "9px 11px", background: "none", border: "2px dashed #1a2640", borderRadius: 7, cursor: "pointer", color: "#334155", fontSize: 12, display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>+ Agregar barrio</button>
              </div>
              <div style={{ flex: 1 }}>
                {!selBarrio && <p style={{ color: "#475569", fontSize: 13 }}>Seleccioná un barrio para ver sus parámetros.</p>}
                {selBarrio && barrio && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                      <div>
                        <h2 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 900, margin: 0 }}>{barrio.nombre}</h2>
                        {barrio.avp_label && <p style={{ color: "#f59e0b", fontSize: 12, margin: "5px 0 0" }}>⚠ {barrio.avp_label}</p>}
                      </div>
                      <div style={{ display: "flex", gap: 7 }}>
                        <Btn size="sm" variant="ghost" onClick={() => { setEditB({...barrio}); setShowEditBarrio(true); }}>✏ Editar</Btn>
                        <Btn size="sm" variant="danger" onClick={() => { const n = {...municipios}; delete n[selMuni].barrios[selBarrio]; setMunicipios(n); setSelBarrio(null); }}>🗑</Btn>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                      {[{ label: "FOS", value: barrio.fos_max, color: "#3b82f6" }, { label: "FOT", value: barrio.fot_max, color: "#8b5cf6" }, { label: "Nivel ±0.00", value: barrio.nivel_00 || "Libre", color: "#22c55e" }, { label: "Altura máx.", value: barrio.altura_max || "—", color: "#f59e0b" }].map(({ label, value, color }) => (
                        <div key={label} style={{ background: "#0d1624", border: "1px solid " + color + "33", borderRadius: 8, padding: 12, textAlign: "center" }}>
                          <div style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>{label}</div>
                          <div style={{ color, fontSize: 20, fontWeight: 900 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <Card style={{ marginBottom: 12 }}>
                      <Label>Retiros mínimos</Label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
                        {[["Frente", barrio.retiro_frente + " m"], ["Fondo", barrio.retiro_fondo + " m"], ["Lateral c/u", barrio.retiro_lateral + " m"]].map(([l, v]) => (
                          <div key={l}><div style={{ color: "#334155", fontSize: 10 }}>{l}</div><div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 17, marginTop: 3 }}>{v}</div></div>
                        ))}
                      </div>
                    </Card>
                    {barrio.notas && <div style={{ background: "#1a2a1a", border: "1px solid #22c55e33", borderRadius: 8, padding: "11px 14px" }}><div style={{ color: "#4ade80", fontSize: 10, fontWeight: 700, marginBottom: 3 }}>NOTAS</div><div style={{ color: "#86efac", fontSize: 12 }}>{barrio.notas}</div></div>}
                  </div>
                )}
              </div>
            </div>
          )}
          {tab === "categorias" && (
            <div>
              {CATEGORIAS_LOCALES.map(cat => (
                <Card key={cat.cat} style={{ marginBottom: 12, border: "1px solid " + cat.color + "33" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                    <Dot color={cat.color} size={10} />
                    <span style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 14 }}>{cat.cat}</span>
                    <span style={{ color: cat.color, fontSize: 11, fontWeight: 700, marginLeft: "auto" }}>Alt. mín. {cat.altura}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div><Label>Iluminación</Label><span style={{ color: "#94a3b8", fontSize: 13 }}>{cat.ilum}</span></div>
                    <div><Label>Ventilación</Label><span style={{ color: "#94a3b8", fontSize: 13 }}>{cat.vent}</span></div>
                    <div><Label>Ambientes</Label><span style={{ color: "#94a3b8", fontSize: 12 }}>{cat.ambientes.join(", ")}</span></div>
                  </div>
                  <div style={{ color: "#475569", fontSize: 11, borderTop: "1px solid #1a2640", paddingTop: 9 }}>{cat.nota}</div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      {showAddMuni && (
        <Modal title="Agregar municipio" onClose={() => setShowAddMuni(false)} width={460}>
          <Inp label="Nombre" value={newMuni.nombre} onChange={v => setNewMuni(p => ({...p, nombre: v}))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Provincia" value={newMuni.provincia} onChange={v => setNewMuni(p => ({...p, provincia: v}))} />
            <Inp label="Matrícula Municipal" value={newMuni.matricula_muni} onChange={v => setNewMuni(p => ({...p, matricula_muni: v}))} />
            <Inp label="Coef. Iluminación" value={newMuni.coef_ilum} onChange={v => setNewMuni(p => ({...p, coef_ilum: v}))} />
            <Inp label="Coef. Ventilación" value={newMuni.coef_vent} onChange={v => setNewMuni(p => ({...p, coef_vent: v}))} />
          </div>
          <Inp label="Altura máxima" value={newMuni.altura_max} onChange={v => setNewMuni(p => ({...p, altura_max: v}))} />
          <Toggle label="Esquema estructural requerido" value={newMuni.esquema_estructural} onChange={v => setNewMuni(p => ({...p, esquema_estructural: v}))} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}><Btn variant="ghost" onClick={() => setShowAddMuni(false)}>Cancelar</Btn><Btn disabled={!newMuni.nombre} onClick={addMuni}>Guardar</Btn></div>
        </Modal>
      )}
      {showAddBarrio && (
        <Modal title={"Agregar barrio — " + muni?.nombre} onClose={() => setShowAddBarrio(false)}>
          <Inp label="Nombre del barrio" value={newB.nombre} onChange={v => setNewB(p => ({...p, nombre: v}))} />
          <Inp label="Nombre AVP / Consorcio" value={newB.avp_label} onChange={v => setNewB(p => ({...p, avp_label: v}))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="FOS máximo" type="number" value={newB.fos_max} onChange={v => setNewB(p => ({...p, fos_max: v}))} />
            <Inp label="FOT máximo" type="number" value={newB.fot_max} onChange={v => setNewB(p => ({...p, fot_max: v}))} />
            <Inp label="Retiro frente (m)" type="number" value={newB.retiro_frente} onChange={v => setNewB(p => ({...p, retiro_frente: v}))} />
            <Inp label="Retiro fondo (m)" type="number" value={newB.retiro_fondo} onChange={v => setNewB(p => ({...p, retiro_fondo: v}))} />
            <Inp label="Retiro lateral (m)" type="number" value={newB.retiro_lateral} onChange={v => setNewB(p => ({...p, retiro_lateral: v}))} />
            <Inp label="Nivel ±0.00" value={newB.nivel_00} onChange={v => setNewB(p => ({...p, nivel_00: v}))} />
          </div>
          <Inp label="Altura máxima" value={newB.altura_max} onChange={v => setNewB(p => ({...p, altura_max: v}))} />
          <Toggle label="Doble aprobación" value={newB.doble_aprobacion} onChange={v => setNewB(p => ({...p, doble_aprobacion: v}))} />
          <Inp label="Notas" value={newB.notas} onChange={v => setNewB(p => ({...p, notas: v}))} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}><Btn variant="ghost" onClick={() => setShowAddBarrio(false)}>Cancelar</Btn><Btn disabled={!newB.nombre} onClick={addBarrio}>Guardar barrio</Btn></div>
        </Modal>
      )}
      {showEditBarrio && editB && (
        <Modal title={"Editar — " + editB.nombre} onClose={() => setShowEditBarrio(false)}>
          <Inp label="Nombre" value={editB.nombre} onChange={v => setEditB(p => ({...p, nombre: v}))} />
          <Inp label="Nombre AVP / Consorcio" value={editB.avp_label || ""} onChange={v => setEditB(p => ({...p, avp_label: v}))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="FOS máximo" type="number" value={editB.fos_max} onChange={v => setEditB(p => ({...p, fos_max: v}))} />
            <Inp label="FOT máximo" type="number" value={editB.fot_max} onChange={v => setEditB(p => ({...p, fot_max: v}))} />
            <Inp label="Retiro frente" type="number" value={editB.retiro_frente} onChange={v => setEditB(p => ({...p, retiro_frente: v}))} />
            <Inp label="Retiro fondo" type="number" value={editB.retiro_fondo} onChange={v => setEditB(p => ({...p, retiro_fondo: v}))} />
            <Inp label="Retiro lateral" type="number" value={editB.retiro_lateral} onChange={v => setEditB(p => ({...p, retiro_lateral: v}))} />
            <Inp label="Nivel ±0.00" value={editB.nivel_00} onChange={v => setEditB(p => ({...p, nivel_00: v}))} />
          </div>
          <Inp label="Altura máxima" value={editB.altura_max} onChange={v => setEditB(p => ({...p, altura_max: v}))} />
          <Toggle label="Doble aprobación" value={editB.doble_aprobacion} onChange={v => setEditB(p => ({...p, doble_aprobacion: v}))} />
          <Inp label="Notas" value={editB.notas} onChange={v => setEditB(p => ({...p, notas: v}))} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}><Btn variant="ghost" onClick={() => setShowEditBarrio(false)}>Cancelar</Btn><Btn onClick={saveEditBarrio}>Guardar cambios</Btn></div>
        </Modal>
      )}
    </div>
  );
};

// ── CALENDARIO (componente) ───────────────────────────────────────────────────
const CalendarioTab = ({ obra, onEditTarea }) => {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));
  const [viewMode, setViewMode] = useState("semana");

  const allTareas = useMemo(() => OBRA_ETAPAS.flatMap(et => et.tareas.map(t => ({ ...t, etapaColor: et.color, etapaNombre: et.nombre }))), []);
  const DIAS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const MESES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = fmtDate(weekStart) + " — " + fmtDate(weekDays[6]);

  const getTasksForDay = (day) => {
    const results = [];
    allTareas.forEach(t => {
      const td = obra.tareas[t.id];
      const dPlan = parseDate(td?.fecha_plan);
      const dReal = parseDate(td?.fecha_real);
      if (isSameDay(dPlan, day) || isSameDay(dReal, day)) {
        results.push({ ...t, td, isPlan: isSameDay(dPlan, day), isReal: isSameDay(dReal, day) });
      }
    });
    obra.seguimiento.forEach(s => {
      if (isSameDay(parseDate(s.fecha), day)) results.push({ _isSeg: true, ...s });
    });
    return results;
  };

  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthName = MESES_ES[monthDate.getMonth()] + " " + monthDate.getFullYear();
  const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const startCalendar = getMondayOf(firstDayOfMonth);
  const totalWeeks = Math.ceil(((lastDayOfMonth - startCalendar) / 86400000 + 1) / 7);
  const calDays = Array.from({ length: totalWeeks * 7 }, (_, i) => addDays(startCalendar, i));

  const estadoColor = (e) => e === "completado" ? "#22c55e" : e === "en_proceso" ? "#f59e0b" : "#475569";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => viewMode === "semana" ? setWeekStart(addDays(weekStart, -7)) : setMonthOffset(m => m - 1)}
            style={{ background: "#1a2235", border: "1px solid #2d3f5a", borderRadius: 7, color: "#94a3b8", padding: "6px 12px", cursor: "pointer", fontSize: 14 }}>‹</button>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14, minWidth: 200, textAlign: "center" }}>
            {viewMode === "semana" ? weekLabel : monthName}
          </span>
          <button onClick={() => viewMode === "semana" ? setWeekStart(addDays(weekStart, 7)) : setMonthOffset(m => m + 1)}
            style={{ background: "#1a2235", border: "1px solid #2d3f5a", borderRadius: 7, color: "#94a3b8", padding: "6px 12px", cursor: "pointer", fontSize: 14 }}>›</button>
          <button onClick={() => { setWeekStart(getMondayOf(new Date())); setMonthOffset(0); }}
            style={{ background: "#1a2640", border: "1px solid #2d3f5a", borderRadius: 7, color: "#3b82f6", padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Hoy</button>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#111d2e", borderRadius: 7, padding: 3 }}>
          {["semana", "mes"].map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={{ padding: "5px 14px", borderRadius: 5, border: "none", background: viewMode === m ? "#1a2a40" : "none", color: viewMode === m ? "#93c5fd" : "#475569", cursor: "pointer", fontSize: 12, fontWeight: viewMode === m ? 700 : 400, textTransform: "capitalize" }}>{m}</button>
          ))}
        </div>
      </div>

      {viewMode === "semana" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {weekDays.map((day, di) => {
            const tasks = getTasksForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div key={di} style={{ background: isToday ? "#0f1e33" : "#111d2e", border: "1px solid " + (isToday ? "#3b82f644" : "#1a2640"), borderRadius: 10, minHeight: 200, overflow: "hidden" }}>
                <div style={{ padding: "8px 10px", borderBottom: "1px solid #1a2640", display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ color: "#475569", fontSize: 10, fontWeight: 700 }}>{DIAS_ES[di]}</span>
                  <span style={{ color: isToday ? "#3b82f6" : "#94a3b8", fontSize: 15, fontWeight: 900 }}>{day.getDate()}</span>
                  {isToday && <span style={{ color: "#3b82f6", fontSize: 9, fontWeight: 700, background: "#3b82f620", borderRadius: 4, padding: "1px 5px" }}>HOY</span>}
                </div>
                <div style={{ padding: "6px 6px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {tasks.length === 0 && <span style={{ color: "#1e2d42", fontSize: 10, padding: "4px 0" }}>—</span>}
                  {tasks.map((task, ti) => {
                    if (task._isSeg) {
                      return (
                        <div key={"seg-" + ti} style={{ background: "#3b82f611", border: "1px solid #3b82f633", borderRadius: 5, padding: "4px 6px" }}>
                          <div style={{ color: "#3b82f6", fontSize: 9, fontWeight: 700 }}>📊 {task.avance}% avance</div>
                          <div style={{ color: "#94a3b8", fontSize: 9, lineHeight: 1.3, marginTop: 1 }}>{task.nota?.slice(0, 40)}{task.nota?.length > 40 ? "…" : ""}</div>
                        </div>
                      );
                    }
                    return (
                      <div key={ti} onClick={() => onEditTarea({ id: task.id, nombre: task.nombre, ...task.td })}
                        style={{ background: task.etapaColor + "18", border: "1px solid " + task.etapaColor + "44", borderRadius: 5, padding: "4px 6px", cursor: "pointer" }}>
                        {task.hito && <span style={{ color: "#f59e0b", fontSize: 9 }}>♦ </span>}
                        <span style={{ color: task.etapaColor, fontSize: 9, fontWeight: 700 }}>{task.nombre.length > 22 ? task.nombre.slice(0, 20) + "…" : task.nombre}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: estadoColor(task.td?.estado), display: "inline-block", flexShrink: 0 }} />
                          <span style={{ color: "#475569", fontSize: 8 }}>{task.isPlan && !task.isReal ? "planificado" : "real"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "mes" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {DIAS_ES.map(d => <div key={d} style={{ textAlign: "center", color: "#334155", fontSize: 10, fontWeight: 700, padding: "4px 0" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {calDays.map((day, i) => {
              const tasks = getTasksForDay(day);
              const isThisMonth = day.getMonth() === monthDate.getMonth();
              const isToday = isSameDay(day, new Date());
              return (
                <div key={i} style={{ background: isToday ? "#0f1e33" : isThisMonth ? "#111d2e" : "#0a1420", border: "1px solid " + (isToday ? "#3b82f644" : "#1a2640"), borderRadius: 7, minHeight: 70, padding: "5px 6px" }}>
                  <div style={{ color: isToday ? "#3b82f6" : isThisMonth ? "#94a3b8" : "#2d3f5a", fontSize: 11, fontWeight: isToday ? 900 : 600, marginBottom: 3 }}>{day.getDate()}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {tasks.slice(0, 3).map((task, ti) => {
                      if (task._isSeg) return <div key={ti} style={{ background: "#3b82f620", borderRadius: 3, padding: "2px 4px", color: "#3b82f6", fontSize: 8, fontWeight: 700 }}>📊 {task.avance}%</div>;
                      return (
                        <div key={ti} onClick={() => onEditTarea({ id: task.id, nombre: task.nombre, ...task.td })}
                          style={{ background: task.etapaColor + "30", borderRadius: 3, padding: "2px 4px", cursor: "pointer" }}>
                          <span style={{ color: task.etapaColor, fontSize: 8, fontWeight: 700 }}>{task.hito ? "♦ " : ""}{task.nombre.slice(0, 14)}{task.nombre.length > 14 ? "…" : ""}</span>
                        </div>
                      );
                    })}
                    {tasks.length > 3 && <div style={{ color: "#475569", fontSize: 8 }}>+{tasks.length - 3} más</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        {OBRA_ETAPAS.map(et => (
          <div key={et.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Dot color={et.color} size={7} />
            <span style={{ color: "#475569", fontSize: 10 }}>{et.nombre.split(" — ")[0]}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 9 }}>♦</span><span style={{ color: "#475569", fontSize: 10 }}>Hito</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Dot color="#3b82f6" size={7} /><span style={{ color: "#475569", fontSize: 10 }}>Seguimiento</span></div>
      </div>
    </div>
  );
};

// ── OBRA VIEW ────────────────────────────────────────────────────────────────
const ObraView = ({ project, setProjects, onBack, isMobile }) => {
  const [tab, setTab] = useState("resumen");
  const obra = project.obra;
  const tareas = obra.tareas;
  const docs = obra.docs || {};

  const allTareas = OBRA_ETAPAS.flatMap(et => et.tareas);
  const totalTareas = allTareas.length;
  const completadas = allTareas.filter(t => tareas[t.id]?.estado === "completado").length;
  const pctAvance = totalTareas ? Math.round((completadas / totalTareas) * 100) : 0;

  const updateObra = (fn) => setProjects(prev => prev.map(p => p.id === project.id ? { ...p, obra: fn(p.obra) } : p));
  const updateTarea = (tid, patch) => updateObra(o => ({ ...o, tareas: { ...o.tareas, [tid]: { ...o.tareas[tid], ...patch } } }));
  const updateDoc = (did, patch) => updateObra(o => ({ ...o, docs: { ...o.docs, [did]: { ...(o.docs?.[did] || { estado: "pendiente", url: "" }), ...patch } } }));
  const updateCanon = (patch) => updateObra(o => ({ ...o, canon: { ...(o.canon || { activo: false, monto_ars: 0, monto_usd: 0, fecha_inicio: "", pagos: [] }), ...patch } }));

  const [editTarea, setEditTarea] = useState(null);
  const [contratistaModal, setContratistaModal] = useState(null);
  const [rubroModal, setRubroModal] = useState(null);
  const [seguimientoModal, setSeguimientoModal] = useState(false);
  const [newSeg, setNewSeg] = useState({ fecha: "", avance: "", nota: "", problemas: "" });
  const [pagoModal, setPagoModal] = useState(false);
  const [newPago, setNewPago] = useState({ fecha: "", monto_ars: 0, monto_usd: 0, nota: "" });
  const [docsOpen, setDocsOpen] = useState({});

  const canon = obra.canon || { activo: false, monto_ars: 0, monto_usd: 0, fecha_inicio: "", pagos: [] };
  const totalEjecutadoUsd = obra.costos.rubros.reduce((s, r) => s + (r.ejecutado_usd || 0), 0);
  const totalEjecutadoArs = obra.costos.rubros.reduce((s, r) => s + (r.ejecutado_ars || 0), 0);
  const totalPresupUsd = obra.costos.presupuesto_usd || 0;
  const totalPresupArs = obra.costos.presupuesto_ars || 0;
  const totalCanonPagado = canon.pagos?.reduce((s, p) => s + (p.monto_ars || 0), 0) || 0;

  const proximoHito = allTareas.find(t => t.hito && tareas[t.id]?.estado !== "completado");
  const ultimoHitoAlcanzado = [...allTareas].reverse().find(t => t.hito && tareas[t.id]?.estado === "completado");

  const estadoColor = (e) => e === "completado" ? "#22c55e" : e === "en_proceso" ? "#f59e0b" : "#475569";
  const estadoLabel = (e) => e === "completado" ? "Completado" : e === "en_proceso" ? "En proceso" : "Pendiente";
  const fmt = (n) => n ? Number(n).toLocaleString("es-AR") : "0";

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{ padding: "8px 14px", borderRadius: 7, border: "none", background: tab === id ? "#1a2a40" : "none", color: tab === id ? "#93c5fd" : "#475569", cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 700 : 400, whiteSpace: "nowrap" }}>{label}</button>
  );

  const ganttData = useMemo(() => {
    let minDate = null, maxDate = null;
    const rows = [];
    OBRA_ETAPAS.forEach(et => {
      const etRows = [];
      et.tareas.forEach(t => {
        const td = tareas[t.id];
        const start = parseDate(td?.fecha_plan) || parseDate(td?.fecha_real);
        const end = parseDate(td?.fecha_real) || (start ? new Date(start.getTime() + 7*86400000) : null);
        if (start) { if (!minDate || start < minDate) minDate = start; }
        if (end) { if (!maxDate || end > maxDate) maxDate = end; }
        etRows.push({ ...t, start, end, estado: td?.estado });
      });
      rows.push({ etapa: et, tareas: etRows });
    });
    if (!minDate) minDate = new Date();
    if (!maxDate) maxDate = new Date(minDate.getTime() + 52*7*86400000);
    minDate = new Date(minDate.getTime() - 14*86400000);
    maxDate = new Date(maxDate.getTime() + 14*86400000);
    const totalMs = maxDate - minDate;
    const weeks = Math.ceil(totalMs / (7*86400000));
    return { rows, minDate, maxDate, totalMs, weeks };
  }, [tareas]);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 16 : 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}>← Volver</Btn>
        <h1 style={{ color: "#e2e8f0", fontSize: isMobile ? 16 : 19, fontWeight: 900, margin: 0 }}>🏗 Dirección de Obra</h1>
      </div>
      <p style={{ color: "#475569", fontSize: 13, margin: "0 0 22px" }}>{project.nombre}</p>

      <div style={{ display: "flex", gap: 4, background: "#111d2e", borderRadius: 8, padding: 4, marginBottom: 22, overflowX: "auto" }}>
        <TabBtn id="resumen" label="Resumen" />
        <TabBtn id="etapas" label="Etapas y Tareas" />
        <TabBtn id="calendario" label="📅 Calendario" />
        <TabBtn id="gantt" label="Gantt" />
        <TabBtn id="contratistas" label="Contratistas" />
        <TabBtn id="costos" label="Costos" />
        <TabBtn id="seguimiento" label="Seguimiento" />
      </div>

      {tab === "resumen" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Avance total</div>
              <div style={{ color: "#3b82f6", fontSize: 36, fontWeight: 900 }}>{pctAvance}%</div>
              <div style={{ background: "#1e2d42", borderRadius: 4, height: 6, marginTop: 8, overflow: "hidden" }}><div style={{ width: pctAvance + "%", height: "100%", background: "#3b82f6", borderRadius: 4 }} /></div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 6 }}>{completadas}/{totalTareas} tareas</div>
            </Card>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Presupuesto USD</div>
              <div style={{ color: "#22c55e", fontSize: 22, fontWeight: 900 }}>U$D {fmt(totalEjecutadoUsd)}</div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>de U$D {fmt(totalPresupUsd)}</div>
              <div style={{ background: "#1e2d42", borderRadius: 4, height: 4, marginTop: 6, overflow: "hidden" }}><div style={{ width: (totalPresupUsd ? Math.min(100, Math.round(totalEjecutadoUsd/totalPresupUsd*100)) : 0) + "%", height: "100%", background: "#22c55e", borderRadius: 4 }} /></div>
            </Card>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Canon pagado</div>
              <div style={{ color: "#8b5cf6", fontSize: 22, fontWeight: 900 }}>$ {fmt(totalCanonPagado)}</div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>{canon.pagos?.length || 0} cuota{canon.pagos?.length !== 1 ? "s" : ""} abonada{canon.pagos?.length !== 1 ? "s" : ""}</div>
              {canon.activo && canon.monto_ars > 0 && <div style={{ color: "#8b5cf620", fontSize: 10, marginTop: 4 }}>$ {fmt(canon.monto_ars)} / mes</div>}
            </Card>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Hitos</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, marginBottom: 2 }}>Próximo</div>
                <div style={{ color: "#f59e0b", fontSize: 13, fontWeight: 700 }}>{proximoHito ? "♦ " + proximoHito.nombre : "—"}</div>
              </div>
              <div>
                <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, marginBottom: 2 }}>Último alcanzado</div>
                <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>{ultimoHitoAlcanzado ? "♦ " + ultimoHitoAlcanzado.nombre : "—"}</div>
              </div>
            </Card>
          </div>
          <Card>
            <Label>Avance por etapa</Label>
            {OBRA_ETAPAS.map(et => {
              const total = et.tareas.length;
              const done = et.tareas.filter(t => tareas[t.id]?.estado === "completado").length;
              const pct = total ? Math.round(done/total*100) : 0;
              return (
                <div key={et.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ color: et.color, fontSize: 12, fontWeight: 700 }}>{et.nombre}</span><span style={{ color: "#94a3b8", fontSize: 11 }}>{done}/{total} — {pct}%</span></div>
                  <div style={{ background: "#1e2d42", borderRadius: 4, height: 6, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: et.color, borderRadius: 4 }} /></div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {tab === "etapas" && (
        <div>
          {OBRA_ETAPAS.map(et => {
            const etapaDocs = DOCS_POR_ETAPA[et.id] || [];
            const docsEntregados = etapaDocs.filter(d => docs[d.id]?.estado === "entregado").length;
            const isDocsOpen = docsOpen[et.id];
            return (
              <Card key={et.id} style={{ marginBottom: 16, border: "1px solid " + et.color + "33" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Dot color={et.color} size={10} />
                  <span style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 14 }}>{et.nombre}</span>
                  <span style={{ color: "#475569", fontSize: 11, marginLeft: "auto" }}>
                    {et.tareas.filter(t => tareas[t.id]?.estado === "completado").length}/{et.tareas.length} tareas
                  </span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a2640" }}>
                      {["", "Tarea", "Planificada", "Real", "Responsable", "Estado", ""].map((h, i) => <th key={i} style={{ padding: "6px 8px", color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {et.tareas.map(t => {
                      const td = tareas[t.id] || {};
                      return (
                        <tr key={t.id} style={{ borderBottom: "1px solid #0f1724" }}>
                          <td style={{ padding: "8px 6px", width: 20, color: "#f59e0b", fontSize: 14 }}>{t.hito ? "♦" : ""}</td>
                          <td style={{ padding: "8px 6px", color: "#e2e8f0", fontSize: 12, fontWeight: t.hito ? 700 : 400 }}>{t.nombre}</td>
                          <td style={{ padding: "8px 6px", color: "#475569", fontSize: 11 }}>{td.fecha_plan || "—"}</td>
                          <td style={{ padding: "8px 6px", color: "#94a3b8", fontSize: 11 }}>{td.fecha_real || "—"}</td>
                          <td style={{ padding: "8px 6px", color: "#94a3b8", fontSize: 11 }}>{td.responsable || "—"}</td>
                          <td style={{ padding: "8px 6px" }}><Badge color={estadoColor(td.estado)}>{estadoLabel(td.estado)}</Badge></td>
                          <td style={{ padding: "8px 6px", width: 30 }}><button onClick={() => setEditTarea({ id: t.id, nombre: t.nombre, ...td })} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 12 }}>✏</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {etapaDocs.length > 0 && (
                  <div style={{ borderTop: "1px solid #1a2640", paddingTop: 12 }}>
                    <button onClick={() => setDocsOpen(p => ({ ...p, [et.id]: !p[et.id] }))}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, marginBottom: isDocsOpen ? 10 : 0, width: "100%", textAlign: "left" }}>
                      <span style={{ color: "#334155", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>📄 Documentación técnica</span>
                      <Badge color={docsEntregados === etapaDocs.length ? "#22c55e" : "#f59e0b"}>{docsEntregados}/{etapaDocs.length}</Badge>
                      <span style={{ color: "#334155", fontSize: 12, marginLeft: "auto" }}>{isDocsOpen ? "▲" : "▼"}</span>
                    </button>
                    {isDocsOpen && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {etapaDocs.map(doc => {
                          const d = docs[doc.id] || { estado: "pendiente", url: "" };
                          const isEntregado = d.estado === "entregado";
                          return (
                            <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#0d1624", borderRadius: 7, padding: "8px 12px", border: "1px solid " + (isEntregado ? "#22c55e33" : "#1a2640") }}>
                              <button onClick={() => updateDoc(doc.id, { estado: isEntregado ? "pendiente" : "entregado" })}
                                style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid " + (isEntregado ? "#22c55e" : "#2d3f5a"), background: isEntregado ? "#22c55e" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white", fontSize: 11 }}>
                                {isEntregado ? "✓" : ""}
                              </button>
                              <span style={{ color: isEntregado ? "#94a3b8" : "#e2e8f0", fontSize: 12, flex: 1, textDecoration: isEntregado ? "line-through" : "none" }}>{doc.nombre}</span>
                              <input value={d.url || ""} onChange={e => updateDoc(doc.id, { url: e.target.value })} placeholder="Link al archivo..."
                                style={{ background: "#111d2e", border: "1px solid #1a2640", borderRadius: 5, padding: "4px 8px", color: "#94a3b8", fontSize: 11, width: 180, outline: "none" }} />
                              {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", fontSize: 12, textDecoration: "none" }}>↗</a>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === "calendario" && (
        <Card>
          <CalendarioTab obra={obra} onEditTarea={setEditTarea} />
        </Card>
      )}

      {tab === "gantt" && (
        <Card style={{ overflowX: "auto" }}>
          <Label>Diagrama de Gantt</Label>
          <div style={{ minWidth: Math.max(800, ganttData.weeks * 32 + 220) }}>
            <div style={{ display: "flex", marginLeft: 200, marginBottom: 4 }}>
              {Array.from({ length: ganttData.weeks }, (_, i) => {
                const d = new Date(ganttData.minDate.getTime() + i * 7 * 86400000);
                return <div key={i} style={{ width: 32, flexShrink: 0, textAlign: "center", color: "#334155", fontSize: 8, borderLeft: "1px solid #1a264040" }}>{d.getDate() + "/" + (d.getMonth()+1)}</div>;
              })}
            </div>
            {ganttData.rows.map(({ etapa, tareas: trs }) => (
              <div key={etapa.id}>
                <div style={{ color: etapa.color, fontSize: 11, fontWeight: 800, padding: "6px 0", borderTop: "1px solid #1a2640" }}>{etapa.nombre}</div>
                {trs.map(t => {
                  const left = t.start ? ((t.start - ganttData.minDate) / ganttData.totalMs * 100) : 0;
                  const width = t.start && t.end ? Math.max(1, (t.end - t.start) / ganttData.totalMs * 100) : 0;
                  const barColor = t.estado === "completado" ? etapa.color : t.estado === "en_proceso" ? etapa.color + "88" : "#1e2d42";
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", height: 22, marginBottom: 2 }}>
                      <div style={{ width: 200, flexShrink: 0, color: "#94a3b8", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{t.hito ? <span style={{ color: "#f59e0b" }}>♦ </span> : ""}{t.nombre}</div>
                      <div style={{ flex: 1, position: "relative", height: "100%", background: "#0d162440" }}>
                        {width > 0 && <div style={{ position: "absolute", left: left + "%", width: width + "%", height: t.hito ? 14 : 10, top: t.hito ? 4 : 6, background: barColor, borderRadius: t.hito ? 2 : 5, border: t.hito ? "1px solid " + etapa.color : "none" }} />}
                        {t.hito && t.start && <div style={{ position: "absolute", left: `calc(${left}% - 5px)`, top: 0, color: "#f59e0b", fontSize: 14, lineHeight: "22px" }}>♦</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "contratistas" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Label>Contratistas ({obra.contratistas.length})</Label>
            <Btn size="sm" onClick={() => setContratistaModal({ id: Date.now(), nombre: "", empresa: "", telefono: "", rubro: "", monto_usd: 0, monto_ars: 0, activo: true, _new: true })}>+ Agregar</Btn>
          </div>
          {obra.contratistas.map(c => (
            <Card key={c.id} style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14 }}>{c.nombre}</span>
                  <Badge color={c.activo ? "#22c55e" : "#64748b"}>{c.activo ? "Activo" : "Finalizado"}</Badge>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>{c.empresa} · {c.rubro}</div>
                {c.telefono && <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>Tel: {c.telefono}</div>}
                {(c.monto_usd > 0 || c.monto_ars > 0) && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>U$D {fmt(c.monto_usd)} · $ {fmt(c.monto_ars)}</div>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn size="sm" variant="ghost" onClick={() => setContratistaModal({ ...c })}>✏</Btn>
                <Btn size="sm" variant="danger" onClick={() => updateObra(o => ({ ...o, contratistas: o.contratistas.filter(x => x.id !== c.id) }))}>🗑</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "costos" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Presupuesto total USD</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>U$D</span>
                <input type="number" value={obra.costos.presupuesto_usd} onChange={e => updateObra(o => ({ ...o, costos: { ...o.costos, presupuesto_usd: +e.target.value } }))} style={{ background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 6, padding: "6px 10px", color: "#22c55e", fontSize: 18, fontWeight: 900, width: "100%", boxSizing: "border-box", outline: "none" }} />
              </div>
            </Card>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Presupuesto total ARS</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>$</span>
                <input type="number" value={obra.costos.presupuesto_ars} onChange={e => updateObra(o => ({ ...o, costos: { ...o.costos, presupuesto_ars: +e.target.value } }))} style={{ background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 6, padding: "6px 10px", color: "#f59e0b", fontSize: 18, fontWeight: 900, width: "100%", boxSizing: "border-box", outline: "none" }} />
              </div>
            </Card>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Tipo de cambio</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>1 USD =</span>
                <input type="number" value={obra.costos.tipo_cambio} onChange={e => updateObra(o => ({ ...o, costos: { ...o.costos, tipo_cambio: +e.target.value } }))} style={{ background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 6, padding: "6px 10px", color: "#e2e8f0", fontSize: 18, fontWeight: 900, width: 120, outline: "none" }} />
                <span style={{ color: "#94a3b8", fontSize: 12 }}>ARS</span>
              </div>
            </Card>
          </div>

          <Card style={{ marginBottom: 16, border: "1px solid #8b5cf633" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#8b5cf6", fontSize: 16 }}>⚖️</span>
                <span style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 14 }}>Canon de obra</span>
                {canon.activo && <Badge color="#8b5cf6">Activo</Badge>}
              </div>
              <Toggle label="" value={canon.activo} onChange={v => updateCanon({ activo: v })} />
            </div>
            {canon.activo && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Monto mensual ARS</div>
                    <input type="number" value={canon.monto_ars} onChange={e => updateCanon({ monto_ars: +e.target.value })} placeholder="0"
                      style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 7, padding: "8px 11px", color: "#8b5cf6", fontSize: 16, fontWeight: 800, boxSizing: "border-box", outline: "none" }} />
                  </div>
                  <div>
                    <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Monto mensual USD</div>
                    <input type="number" value={canon.monto_usd} onChange={e => updateCanon({ monto_usd: +e.target.value })} placeholder="0"
                      style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 7, padding: "8px 11px", color: "#8b5cf6", fontSize: 16, fontWeight: 800, boxSizing: "border-box", outline: "none" }} />
                  </div>
                  <div>
                    <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Fecha inicio canon</div>
                    <input type="text" value={canon.fecha_inicio} onChange={e => updateCanon({ fecha_inicio: e.target.value })} placeholder="dd/mm/aaaa"
                      style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 7, padding: "8px 11px", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box", outline: "none" }} />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>Total pagado: </span>
                    <span style={{ color: "#8b5cf6", fontWeight: 800, fontSize: 14 }}>$ {fmt(totalCanonPagado)}</span>
                    <span style={{ color: "#475569", fontSize: 11 }}> · {canon.pagos?.length || 0} cuota{canon.pagos?.length !== 1 ? "s" : ""}</span>
                  </div>
                  <Btn size="sm" onClick={() => { setNewPago({ fecha: new Date().toLocaleDateString("es-AR"), monto_ars: canon.monto_ars, monto_usd: canon.monto_usd, nota: "" }); setPagoModal(true); }}>+ Registrar pago</Btn>
                </div>
                {canon.pagos?.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ borderBottom: "1px solid #1a2640" }}>{["Fecha", "Monto ARS", "Monto USD", "Nota", ""].map((h, i) => <th key={i} style={{ padding: "6px 8px", color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {[...canon.pagos].reverse().map(p => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #0f1724" }}>
                          <td style={{ padding: "8px 8px", color: "#94a3b8", fontSize: 12 }}>{p.fecha}</td>
                          <td style={{ padding: "8px 8px", color: "#8b5cf6", fontSize: 12, fontWeight: 700 }}>$ {fmt(p.monto_ars)}</td>
                          <td style={{ padding: "8px 8px", color: "#8b5cf6", fontSize: 12, fontWeight: 700 }}>U$D {fmt(p.monto_usd)}</td>
                          <td style={{ padding: "8px 8px", color: "#475569", fontSize: 11 }}>{p.nota || "—"}</td>
                          <td style={{ padding: "8px 8px" }}><button onClick={() => updateCanon({ pagos: canon.pagos.filter(x => x.id !== p.id) })} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 12 }}>🗑</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Label>Rubros de costo</Label>
              <Btn size="sm" onClick={() => setRubroModal({ id: Date.now(), nombre: "", presupuestado_usd: 0, presupuestado_ars: 0, ejecutado_usd: 0, ejecutado_ars: 0, _new: true })}>+ Agregar rubro</Btn>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "1px solid #1a2640" }}>{["Rubro", "Presup. USD", "Ejec. USD", "Presup. ARS", "Ejec. ARS", ""].map((h, i) => <th key={i} style={{ padding: "7px 8px", color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>{h}</th>)}</tr></thead>
              <tbody>
                {obra.costos.rubros.map(r => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #0f1724" }}>
                    <td style={{ padding: "9px 8px", color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{r.nombre}</td>
                    <td style={{ padding: "9px 8px", color: "#94a3b8", fontSize: 12 }}>U$D {fmt(r.presupuestado_usd)}</td>
                    <td style={{ padding: "9px 8px", color: "#22c55e", fontSize: 12, fontWeight: 700 }}>U$D {fmt(r.ejecutado_usd)}</td>
                    <td style={{ padding: "9px 8px", color: "#94a3b8", fontSize: 12 }}>$ {fmt(r.presupuestado_ars)}</td>
                    <td style={{ padding: "9px 8px", color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>$ {fmt(r.ejecutado_ars)}</td>
                    <td style={{ padding: "9px 8px", display: "flex", gap: 4 }}>
                      <button onClick={() => setRubroModal({ ...r })} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 12 }}>✏</button>
                      <button onClick={() => updateObra(o => ({ ...o, costos: { ...o.costos, rubros: o.costos.rubros.filter(x => x.id !== r.id) } }))} style={{ background: "none", border: "none", color: "#7f1d1d", cursor: "pointer", fontSize: 12 }}>🗑</button>
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #1a2640" }}>
                  <td style={{ padding: "9px 8px", color: "#e2e8f0", fontSize: 12, fontWeight: 800 }}>TOTAL</td>
                  <td style={{ padding: "9px 8px", color: "#94a3b8", fontSize: 12, fontWeight: 700 }}>U$D {fmt(obra.costos.rubros.reduce((s,r) => s + r.presupuestado_usd, 0))}</td>
                  <td style={{ padding: "9px 8px", color: "#22c55e", fontSize: 12, fontWeight: 800 }}>U$D {fmt(totalEjecutadoUsd)}</td>
                  <td style={{ padding: "9px 8px", color: "#94a3b8", fontSize: 12, fontWeight: 700 }}>$ {fmt(obra.costos.rubros.reduce((s,r) => s + r.presupuestado_ars, 0))}</td>
                  <td style={{ padding: "9px 8px", color: "#f59e0b", fontSize: 12, fontWeight: 800 }}>$ {fmt(totalEjecutadoArs)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </Card>
          <Card>
            <Label>URL Google Sheets</Label>
            <input value={obra.costos.sheets_url} onChange={e => updateObra(o => ({ ...o, costos: { ...o.costos, sheets_url: e.target.value } }))} placeholder="https://docs.google.com/spreadsheets/..."
              style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 8, padding: "9px 13px", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box", outline: "none" }} />
          </Card>
        </div>
      )}

      {tab === "seguimiento" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Label>Seguimiento semanal ({obra.seguimiento.length} entradas)</Label>
            <Btn size="sm" onClick={() => { setNewSeg({ fecha: new Date().toLocaleDateString("es-AR"), avance: pctAvance, nota: "", problemas: "" }); setSeguimientoModal(true); }}>+ Nueva entrada</Btn>
          </div>
          {obra.seguimiento.length === 0 && <p style={{ color: "#475569", fontSize: 13 }}>No hay entradas de seguimiento aún.</p>}
          {[...obra.seguimiento].reverse().map(s => (
            <Card key={s.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Badge color="#3b82f6">{s.fecha}</Badge>
                <span style={{ color: "#3b82f6", fontSize: 16, fontWeight: 900 }}>{s.avance}%</span>
              </div>
              <p style={{ color: "#e2e8f0", fontSize: 13, margin: "0 0 4px" }}>{s.nota}</p>
              {s.problemas && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>⚠ {s.problemas}</p>}
            </Card>
          ))}
        </div>
      )}

      {editTarea && (
        <Modal title={"Editar: " + editTarea.nombre} onClose={() => setEditTarea(null)} width={440}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Estado</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["pendiente", "en_proceso", "completado"].map(e => (
                <button key={e} onClick={() => setEditTarea(p => ({ ...p, estado: e }))} style={{ padding: "6px 14px", borderRadius: 6, border: "2px solid " + (editTarea.estado === e ? estadoColor(e) : "#1a2640"), background: editTarea.estado === e ? estadoColor(e) + "22" : "#111d2e", color: editTarea.estado === e ? estadoColor(e) : "#475569", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{estadoLabel(e)}</button>
              ))}
            </div>
          </div>
          <Inp label="Fecha planificada" placeholder="dd/mm/aaaa" value={editTarea.fecha_plan || ""} onChange={v => setEditTarea(p => ({ ...p, fecha_plan: v }))} />
          <Inp label="Fecha real" placeholder="dd/mm/aaaa" value={editTarea.fecha_real || ""} onChange={v => setEditTarea(p => ({ ...p, fecha_real: v }))} />
          <Inp label="Responsable" placeholder="Nombre o empresa" value={editTarea.responsable || ""} onChange={v => setEditTarea(p => ({ ...p, responsable: v }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Btn variant="ghost" onClick={() => setEditTarea(null)}>Cancelar</Btn>
            <Btn onClick={() => { updateTarea(editTarea.id, { estado: editTarea.estado, fecha_plan: editTarea.fecha_plan, fecha_real: editTarea.fecha_real, responsable: editTarea.responsable }); setEditTarea(null); }}>Guardar</Btn>
          </div>
        </Modal>
      )}
      {contratistaModal && (
        <Modal title={contratistaModal._new ? "Agregar contratista" : "Editar contratista"} onClose={() => setContratistaModal(null)} width={480}>
          <Inp label="Nombre" value={contratistaModal.nombre} onChange={v => setContratistaModal(p => ({ ...p, nombre: v }))} />
          <Inp label="Empresa" value={contratistaModal.empresa} onChange={v => setContratistaModal(p => ({ ...p, empresa: v }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Teléfono" value={contratistaModal.telefono} onChange={v => setContratistaModal(p => ({ ...p, telefono: v }))} />
            <Inp label="Rubro" value={contratistaModal.rubro} onChange={v => setContratistaModal(p => ({ ...p, rubro: v }))} />
            <Inp label="Monto USD" type="number" value={contratistaModal.monto_usd} onChange={v => setContratistaModal(p => ({ ...p, monto_usd: +v }))} />
            <Inp label="Monto ARS" type="number" value={contratistaModal.monto_ars} onChange={v => setContratistaModal(p => ({ ...p, monto_ars: +v }))} />
          </div>
          <Toggle label="Activo" value={contratistaModal.activo} onChange={v => setContratistaModal(p => ({ ...p, activo: v }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Btn variant="ghost" onClick={() => setContratistaModal(null)}>Cancelar</Btn>
            <Btn onClick={() => {
              const c = { ...contratistaModal }; delete c._new;
              contratistaModal._new ? updateObra(o => ({ ...o, contratistas: [...o.contratistas, c] })) : updateObra(o => ({ ...o, contratistas: o.contratistas.map(x => x.id === c.id ? c : x) }));
              setContratistaModal(null);
            }}>Guardar</Btn>
          </div>
        </Modal>
      )}
      {rubroModal && (
        <Modal title={rubroModal._new ? "Agregar rubro" : "Editar rubro"} onClose={() => setRubroModal(null)} width={460}>
          <Inp label="Nombre del rubro" value={rubroModal.nombre} onChange={v => setRubroModal(p => ({ ...p, nombre: v }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Presupuestado USD" type="number" value={rubroModal.presupuestado_usd} onChange={v => setRubroModal(p => ({ ...p, presupuestado_usd: +v }))} />
            <Inp label="Ejecutado USD" type="number" value={rubroModal.ejecutado_usd} onChange={v => setRubroModal(p => ({ ...p, ejecutado_usd: +v }))} />
            <Inp label="Presupuestado ARS" type="number" value={rubroModal.presupuestado_ars} onChange={v => setRubroModal(p => ({ ...p, presupuestado_ars: +v }))} />
            <Inp label="Ejecutado ARS" type="number" value={rubroModal.ejecutado_ars} onChange={v => setRubroModal(p => ({ ...p, ejecutado_ars: +v }))} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Btn variant="ghost" onClick={() => setRubroModal(null)}>Cancelar</Btn>
            <Btn onClick={() => {
              const r = { ...rubroModal }; delete r._new;
              rubroModal._new ? updateObra(o => ({ ...o, costos: { ...o.costos, rubros: [...o.costos.rubros, r] } })) : updateObra(o => ({ ...o, costos: { ...o.costos, rubros: o.costos.rubros.map(x => x.id === r.id ? r : x) } }));
              setRubroModal(null);
            }}>Guardar</Btn>
          </div>
        </Modal>
      )}
      {seguimientoModal && (
        <Modal title="Nueva entrada de seguimiento" onClose={() => setSeguimientoModal(false)} width={460}>
          <Inp label="Fecha" value={newSeg.fecha} onChange={v => setNewSeg(p => ({ ...p, fecha: v }))} />
          <Inp label="% Avance" type="number" value={newSeg.avance} onChange={v => setNewSeg(p => ({ ...p, avance: +v }))} />
          <Inp label="Nota de avance" value={newSeg.nota} onChange={v => setNewSeg(p => ({ ...p, nota: v }))} />
          <Inp label="Problemas observados" value={newSeg.problemas} onChange={v => setNewSeg(p => ({ ...p, problemas: v }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Btn variant="ghost" onClick={() => setSeguimientoModal(false)}>Cancelar</Btn>
            <Btn onClick={() => { updateObra(o => ({ ...o, seguimiento: [...o.seguimiento, { ...newSeg, id: Date.now() }] })); setSeguimientoModal(false); }}>Guardar entrada</Btn>
          </div>
        </Modal>
      )}
      {pagoModal && (
        <Modal title="Registrar pago de canon" onClose={() => setPagoModal(false)} width={420}>
          <Inp label="Fecha" placeholder="dd/mm/aaaa" value={newPago.fecha} onChange={v => setNewPago(p => ({ ...p, fecha: v }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Monto ARS" type="number" value={newPago.monto_ars} onChange={v => setNewPago(p => ({ ...p, monto_ars: +v }))} />
            <Inp label="Monto USD" type="number" value={newPago.monto_usd} onChange={v => setNewPago(p => ({ ...p, monto_usd: +v }))} />
          </div>
          <Inp label="Nota" placeholder="Ej: Cuota marzo 2026" value={newPago.nota} onChange={v => setNewPago(p => ({ ...p, nota: v }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Btn variant="ghost" onClick={() => setPagoModal(false)}>Cancelar</Btn>
            <Btn variant="green" onClick={() => { updateCanon({ pagos: [...(canon.pagos || []), { ...newPago, id: Date.now() }] }); setPagoModal(false); }}>✅ Guardar pago</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── OBRAS LIST VIEW ──────────────────────────────────────────────────────────
const ObrasListView = ({ projects, setProjects, onOpenObra, isMobile }) => {
  const obrasProjects = projects.filter(p => p.obra?.activo);
  return (
    <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 16 : 28 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: isMobile ? 18 : 21, fontWeight: 900, margin: 0, letterSpacing: "-0.03em" }}>🏗 Dirección de Obra</h1>
        <p style={{ color: "#334155", margin: "3px 0 0", fontSize: 12 }}>{obrasProjects.length} proyecto{obrasProjects.length !== 1 ? "s" : ""} con dirección de obra activa</p>
      </div>
      {obrasProjects.length === 0 && <Card><p style={{ color: "#475569", fontSize: 13, margin: 0 }}>No hay proyectos con dirección de obra activada.</p></Card>}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
        {obrasProjects.map(p => {
          const tipo = getTipo(p.tipo);
          const allT = OBRA_ETAPAS.flatMap(et => et.tareas);
          const totalT = allT.length;
          const doneT = allT.filter(t => p.obra.tareas[t.id]?.estado === "completado").length;
          const pct = totalT ? Math.round(doneT / totalT * 100) : 0;
          const barColor = pct === 100 ? "#22c55e" : pct > 50 ? "#3b82f6" : pct > 20 ? "#f59e0b" : "#64748b";
          const proximoHito = allT.find(t => t.hito && p.obra.tareas[t.id]?.estado !== "completado");
          const totalEjUsd = p.obra.costos.rubros.reduce((s, r) => s + (r.ejecutado_usd || 0), 0);
          const totalPresUsd = p.obra.costos.presupuesto_usd || 0;
          const currentEtapa = OBRA_ETAPAS.find(et => et.tareas.some(t => p.obra.tareas[t.id]?.estado !== "completado"));
          return (
            <div key={p.id} onClick={() => onOpenObra(p.id)}
              style={{ background: "#111d2e", border: "1px solid #1a2640", borderRadius: 12, padding: 20, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#3b82f6"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#1a2640"}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Dot color={tipo.color} size={9} />
                <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14, flex: 1 }}>{p.nombre}</span>
                <Badge color={tipo.color}>{tipo.label}</Badge>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: "#475569", fontSize: 10 }}>{currentEtapa ? currentEtapa.nombre : "Completado"}</span>
                <span style={{ color: barColor, fontSize: 12, fontWeight: 800 }}>{pct}%</span>
              </div>
              <div style={{ background: "#1e2d42", borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 12 }}><div style={{ width: pct + "%", height: "100%", background: barColor, borderRadius: 4 }} /></div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ background: "#0d1624", borderRadius: 6, padding: "6px 10px", flex: 1, minWidth: 80 }}><div style={{ color: "#334155", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Tareas</div><div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 800 }}>{doneT}/{totalT}</div></div>
                <div style={{ background: "#0d1624", borderRadius: 6, padding: "6px 10px", flex: 1, minWidth: 80 }}><div style={{ color: "#334155", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Presup.</div><div style={{ color: "#22c55e", fontSize: 13, fontWeight: 800 }}>U$D {totalEjUsd.toLocaleString("es-AR")}<span style={{ color: "#475569", fontWeight: 400 }}> / {totalPresUsd.toLocaleString("es-AR")}</span></div></div>
                <div style={{ background: "#0d1624", borderRadius: 6, padding: "6px 10px", flex: 1, minWidth: 80 }}><div style={{ color: "#334155", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Próx. hito</div><div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700 }}>{proximoHito ? "♦ " + proximoHito.nombre : "—"}</div></div>
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                <Badge color="#3b82f6">{p.obra.contratistas.filter(c => c.activo).length} contratistas</Badge>
                <Badge color="#475569">{p.obra.seguimiento.length} seguimientos</Badge>
                {p.obra.canon?.activo && <Badge color="#8b5cf6">Canon activo</Badge>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState("home");
  const [obraProjectId, setObraProjectId] = useState(null);
  const [municipios, setMunicipios] = useState(() => {
    const saved = localStorage.getItem("planomuni_municipios");
    return saved ? JSON.parse(saved) : MUNICIPIOS_DATA;
  });
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem("planomuni_projects");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map(p => ({
        ...p,
        estado_texto: p.estado_texto || "",
        archivos: p.archivos || buildArchivos(),
        obra: p.obra ? {
          ...p.obra,
          docs: p.obra.docs || (() => { const d = {}; Object.values(DOCS_POR_ETAPA).flat().forEach(doc => { d[doc.id] = { estado: "pendiente", url: "" }; }); return d; })(),
          canon: p.obra.canon || { activo: false, monto_ars: 0, monto_usd: 0, fecha_inicio: "", pagos: [] },
        } : (p.id === 1 ? OBRA_SAMPLE : null),
      }));
    }
    return PROJECTS_INIT.map(p => p.id === 1 ? { ...p, obra: OBRA_SAMPLE } : p);
  });

  useEffect(() => { localStorage.setItem("planomuni_municipios", JSON.stringify(municipios)); }, [municipios]);
  useEffect(() => { localStorage.setItem("planomuni_projects", JSON.stringify(projects)); }, [projects]);

  const fileInputRef = useRef(null);
  const exportData = useCallback(() => {
    const data = JSON.stringify({ municipios, projects }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    a.href = url;
    a.download = "planomuni_backup_" + d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }, [municipios, projects]);
  const importData = useCallback(() => { fileInputRef.current?.click(); }, []);
  const handleImportFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.municipios) setMunicipios(data.municipios);
        if (data.projects) setProjects(data.projects);
        alert("Datos importados correctamente");
      } catch { alert("Error: archivo JSON inválido"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const obraProject = obraProjectId ? projects.find(p => p.id === obraProjectId) : null;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d1624", fontFamily: "'DM Sans','Inter',system-ui,sans-serif", overflow: "hidden", position: "relative" }}>
      <input type="file" ref={fileInputRef} accept=".json" style={{ display: "none" }} onChange={handleImportFile} />
      {isMobile && (
        <button onClick={() => setSidebarOpen(true)} style={{ position: "fixed", top: 12, left: 12, zIndex: 900, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", border: "none", borderRadius: 8, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "white", boxShadow: "0 2px 10px rgba(0,0,0,.4)" }}>☰</button>
      )}
      <Sidebar view={view} setView={(v) => { setView(v); setObraProjectId(null); }} onExport={exportData} onImport={importData} isMobile={isMobile} sidebarOpen={sidebarOpen} onCloseSidebar={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", ...(isMobile ? { paddingTop: 50 } : {}) }}>
        {view === "home" && !obraProject && <HomeView projects={projects} setProjects={setProjects} municipios={municipios} setView={setView} onOpenObra={(pid) => setObraProjectId(pid)} isMobile={isMobile} />}
        {view === "home" && obraProject && obraProject.obra?.activo && <ObraView project={obraProject} setProjects={setProjects} onBack={() => setObraProjectId(null)} isMobile={isMobile} />}
        {view === "obras" && !obraProject && <ObrasListView projects={projects} setProjects={setProjects} onOpenObra={(pid) => setObraProjectId(pid)} isMobile={isMobile} />}
        {view === "obras" && obraProject && obraProject.obra?.activo && <ObraView project={obraProject} setProjects={setProjects} onBack={() => setObraProjectId(null)} isMobile={isMobile} />}
        {view === "nuevo" && <NuevoView municipios={municipios} setView={setView} setProjects={setProjects} isMobile={isMobile} />}
        {view === "normativa" && <NormativaView municipios={municipios} setMunicipios={setMunicipios} isMobile={isMobile} />}
      </div>
    </div>
  );
}
