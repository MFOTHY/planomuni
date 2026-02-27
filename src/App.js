import { useState, useEffect, useMemo } from "react";

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
        doble_aprobacion: true, notas: "Nivel ±0.00 = +4.00m IGN. Aprobación previa AVP.",
      },
      riberas: {
        id: "riberas", nombre: "Riberas del Escobar",
        fos_max: 0.40, fot_max: 0.60, retiro_frente: 5.0, retiro_fondo: 8.0, retiro_lateral: 2.5,
        nivel_00: "Libre", altura_max: "9.00 m", doble_aprobacion: true, notas: "",
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
        nivel_00: "Libre", altura_max: "9.00 m", doble_aprobacion: true,
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

const PROJECTS_INIT = [
  {
    id: 1,
    nombre: "Lote 238 — Riberas del Escobar",
    municipio: "escobar", barrio: "riberas",
    tipo: "obra_nueva", zona: "R1A",
    workflow: buildFlow(true).map((s, i) => ({
      ...s, done: i === 0, fecha: i === 0 ? "12/02/2026" : "",
    })),
    fecha_inicio: "12/02/2026",
    observaciones: [],
    obra: null, // se llena con OBRA_SAMPLE al hidratar
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
    observaciones: ["Municipio solicitó ajuste en el cómputo del semicubierto."],
    obra: null,
  },
];

// ── DIRECCIÓN DE OBRA — DATOS ────────────────────────────────────────────────
const OBRA_ETAPAS = [
  { id: "e0", nombre: "Etapa 0 — Gestiones previas", color: "#3b82f6", tareas: [
    { id: "e0t1", nombre: "Solicitud inicio AVP", hito: false },
    { id: "e0t2", nombre: "Aprobación AVP", hito: false },
    { id: "e0t3", nombre: "Solicitud inicio municipio", hito: false },
    { id: "e0t4", nombre: "Contratación empresa constructora", hito: false },
    { id: "e0t5", nombre: "Contratación herrería", hito: false },
    { id: "e0t6", nombre: "Cerco de obra", hito: false },
    { id: "e0t7", nombre: "Planchada vehicular", hito: false },
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
  return {
    activo: false,
    tareas,
    contratistas: [],
    costos: { presupuesto_usd: 0, presupuesto_ars: 0, tipo_cambio: 1200, sheets_url: "", rubros: [] },
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
    // Sample data: some tasks completed/in progress
    t["e0t1"] = { ...t["e0t1"], estado: "completado", fecha_plan: "01/03/2026", fecha_real: "02/03/2026", responsable: "Arq. Vento" };
    t["e0t2"] = { ...t["e0t2"], estado: "completado", fecha_plan: "10/03/2026", fecha_real: "12/03/2026", responsable: "AVP Riberas" };
    t["e0t3"] = { ...t["e0t3"], estado: "completado", fecha_plan: "15/03/2026", fecha_real: "15/03/2026", responsable: "Arq. Vento" };
    t["e0t4"] = { ...t["e0t4"], estado: "completado", fecha_plan: "20/03/2026", fecha_real: "25/03/2026", responsable: "Arq. Vento" };
    t["e0t5"] = { ...t["e0t5"], estado: "completado", fecha_plan: "22/03/2026", fecha_real: "28/03/2026", responsable: "Arq. Vento" };
    t["e0t6"] = { ...t["e0t6"], estado: "completado", fecha_plan: "01/04/2026", fecha_real: "01/04/2026", responsable: "López Const." };
    t["e0t7"] = { ...t["e0t7"], estado: "completado", fecha_plan: "03/04/2026", fecha_real: "05/04/2026", responsable: "López Const." };
    t["e1t1"] = { ...t["e1t1"], estado: "completado", fecha_plan: "07/04/2026", fecha_real: "08/04/2026", responsable: "López Const." };
    t["e1t2"] = { ...t["e1t2"], estado: "completado", fecha_plan: "14/04/2026", fecha_real: "15/04/2026", responsable: "López Const." };
    t["e1t3"] = { ...t["e1t3"], estado: "en_proceso", fecha_plan: "28/04/2026", fecha_real: "", responsable: "López Const." };
    t["e1t4"] = { ...t["e1t4"], estado: "pendiente", fecha_plan: "12/05/2026", fecha_real: "", responsable: "López Const." };
    t["e1t5"] = { ...t["e1t5"], estado: "pendiente", fecha_plan: "26/05/2026", fecha_real: "", responsable: "Elec. Gómez" };
    return t;
  })(),
  contratistas: [
    { id: 1, nombre: "Carlos López", empresa: "López Construcciones SRL", telefono: "11-4567-8901", rubro: "Construcción general", monto_usd: 85000, monto_ars: 12000000, activo: true },
    { id: 2, nombre: "Mario Gómez", empresa: "Gómez Electricidad", telefono: "11-2345-6789", rubro: "Electricidad", monto_usd: 8500, monto_ars: 1500000, activo: true },
    { id: 3, nombre: "Roberto Herrera", empresa: "Herrería Herrera", telefono: "11-6789-0123", rubro: "Herrería", monto_usd: 12000, monto_ars: 2400000, activo: true },
  ],
  costos: {
    presupuesto_usd: 120000, presupuesto_ars: 18000000, tipo_cambio: 1200,
    sheets_url: "",
    rubros: [
      { id: 1, nombre: "Construcción general", presupuestado_usd: 85000, presupuestado_ars: 12000000, ejecutado_usd: 28000, ejecutado_ars: 4200000 },
      { id: 2, nombre: "Electricidad", presupuestado_usd: 8500, presupuestado_ars: 1500000, ejecutado_usd: 0, ejecutado_ars: 0 },
      { id: 3, nombre: "Herrería y aberturas", presupuestado_usd: 12000, presupuestado_ars: 2400000, ejecutado_usd: 0, ejecutado_ars: 0 },
      { id: 4, nombre: "Sanitaria", presupuestado_usd: 7500, presupuestado_ars: 1200000, ejecutado_usd: 0, ejecutado_ars: 0 },
      { id: 5, nombre: "Pileta", presupuestado_usd: 7000, presupuestado_ars: 900000, ejecutado_usd: 0, ejecutado_ars: 0 },
    ],
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
    }}>
      {children}
    </button>
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
          {isFinal ? "✅ Trabajo 100% completado — aprobado por municipio" : "Etapa actual: " + (current?.label || "—")}
        </span>
        <span style={{ color: barColor, fontSize: 15, fontWeight: 800 }}>{pct}%</span>
      </div>
      <div style={{ background: "#1e2d42", borderRadius: 6, height: 8, marginBottom: 24, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: barColor, borderRadius: 6, transition: "width .4s" }} />
      </div>
      <div style={{ position: "relative" }}>
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
    </div>
  );
};

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const Sidebar = ({ view, setView }) => (
  <div style={{ width: 218, background: "#0d1624", borderRight: "1px solid #1a2640", display: "flex", flexDirection: "column", flexShrink: 0 }}>
    <div style={{ padding: "26px 22px 18px", borderBottom: "1px solid #1a2640" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📐</div>
        <div>
          <div style={{ color: "#e2e8f0", fontWeight: 900, fontSize: 13, letterSpacing: "-0.03em" }}>PlanoMuni</div>
          <div style={{ color: "#334155", fontSize: 10 }}>v0.1 — beta</div>
        </div>
      </div>
    </div>
    <nav style={{ padding: "14px 10px", flex: 1 }}>
      {[
        { id: "home",      label: "Proyectos",   icon: "📁" },
        { id: "nuevo",     label: "Nuevo plano", icon: "＋" },
        { id: "normativa", label: "Normativa",   icon: "🗺️" },
      ].map(item => (
        <button key={item.id} onClick={() => setView(item.id)} style={{
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
    <div style={{ padding: "14px 20px", borderTop: "1px solid #1a2640" }}>
      <div style={{ color: "#334155", fontSize: 11, fontWeight: 600 }}>Profesional</div>
      <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginTop: 2 }}>Julieta Vento</div>
      <div style={{ color: "#3b82f6", fontSize: 11, marginTop: 1 }}>Arq. · MP 35670</div>
      <div style={{ color: "#334155", fontSize: 10, marginTop: 1 }}>Escobar MM 7884 · Tigre MM 42013</div>
    </div>
  </div>
);

// ── HOME VIEW ─────────────────────────────────────────────────────────────────
const HomeView = ({ projects, setProjects, municipios, setView, onOpenObra }) => {
  const [sel, setSel] = useState(null);
  const [tickModal, setTickModal] = useState(null);
  const [tickDate, setTickDate] = useState("");
  const [tickObs, setTickObs]   = useState("");

  const proj = sel !== null ? projects.find(p => p.id === sel) : null;

  const doTick = () => {
    setProjects(prev => prev.map(p => {
      if (p.id !== tickModal.pid) return p;
      return {
        ...p,
        workflow: p.workflow.map(s => s.id === tickModal.sid ? { ...s, done: true, fecha: tickDate, obs: tickObs } : s),
        observaciones: tickObs ? [...p.observaciones, tickObs] : p.observaciones,
      };
    }));
    setTickModal(null); setTickDate(""); setTickObs("");
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ width: proj ? 340 : "100%", borderRight: proj ? "1px solid #1a2640" : "none", overflow: "auto", padding: 26, flexShrink: 0, transition: "width .2s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <h1 style={{ color: "#e2e8f0", fontSize: 21, fontWeight: 900, margin: 0, letterSpacing: "-0.03em" }}>Proyectos</h1>
            <p style={{ color: "#334155", margin: "3px 0 0", fontSize: 12 }}>{projects.length} planos activos</p>
          </div>
          <Btn onClick={() => setView("nuevo")} size="sm">＋ Nuevo</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {projects.map(p => {
            const tipo = getTipo(p.tipo);
            const muni = getMuni(municipios, p.municipio);
            const barrio = getBarrio(municipios, p.municipio, p.barrio);
            const done = p.workflow.filter(s => s.done).length;
            const total = p.workflow.length;
            const isFinal = p.workflow[p.workflow.length - 1]?.done;
            const current = p.workflow.find(s => !s.done);
            const isSelected = sel === p.id;
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
                  {barrio?.doble_aprobacion && <Badge color="#f59e0b">⚠ Doble aprob.</Badge>}
                </div>
                <WorkflowBar workflow={p.workflow} compact={true} />
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#334155", fontSize: 10 }}>{done}/{total} pasos · inicio {p.fecha_inicio}</span>
                  <span style={{ color: isFinal ? "#22c55e" : "#64748b", fontSize: 10, fontWeight: 700 }}>
                    {isFinal ? "✅ Aprobado" : current ? "▶ " + current.label : ""}
                  </span>
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
        const etapa1 = proj.workflow.filter(s => s.etapa === 1);
        const etapa2 = proj.workflow.filter(s => s.etapa === 2);
        const nextStep = proj.workflow.find((s, i) => !s.done && (i === 0 || proj.workflow[i - 1]?.done));
        return (
          <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                  <Dot color={tipo.color} size={12} />
                  <h1 style={{ color: "#e2e8f0", fontSize: 19, fontWeight: 900, margin: 0 }}>{proj.nombre}</h1>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge color={tipo.color}>{tipo.label}</Badge>
                  <Badge color="#475569">{muni?.nombre}</Badge>
                  {barrio && <Badge color="#3b82f6">🏘 {barrio.nombre}</Badge>}
                  <Badge color="#8b5cf6">Zona {proj.zona}</Badge>
                </div>
              </div>
              <button onClick={() => setSel(null)} style={{ background: "#1a2235", border: "1px solid #2d3f5a", borderRadius: 8, color: "#64748b", padding: "7px 12px", cursor: "pointer", fontSize: 13 }}>✕</button>
            </div>
            <Card style={{ marginBottom: 16 }}>
              <Label>Etapa 1 — Diseño y aprobación profesional</Label>
              <WorkflowBar workflow={etapa1} compact={false} />
              <div style={{ height: 1, background: "#1a2640", margin: "20px 0" }} />
              <Label>Etapa 2 — Visados y aprobación municipal</Label>
              <WorkflowBar workflow={etapa2} compact={false} />
              {nextStep && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #1a2640" }}>
                  <Label>Actualizar estado</Label>
                  <Btn variant="ghost" onClick={() => setTickModal({ pid: proj.id, sid: nextStep.id, label: nextStep.label })}>
                    ✅ Marcar como completado: {nextStep.label}
                  </Btn>
                </div>
              )}
            </Card>
            <Card style={{ marginBottom: 16 }}>
              <Label>Indicadores urbanísticos aplicables</Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
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
              {barrio && <p style={{ color: "#475569", fontSize: 11, marginTop: 10, marginBottom: 0 }}>ℹ El FOS/FOT del barrio cerrado siempre prevalece sobre el municipal cuando es más restrictivo.</p>}
            </Card>
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
                onChange={(v) => {
                  setProjects(prev => prev.map(p => {
                    if (p.id !== proj.id) return p;
                    if (v) return { ...p, obra: p.obra?.activo ? p.obra : { ...buildObraData(), activo: true } };
                    return { ...p, obra: { ...(p.obra || buildObraData()), activo: false } };
                  }));
                }}
              />
              {proj.obra?.activo && (
                <Btn onClick={() => onOpenObra(proj.id)} size="sm">
                  🏗 Dirección de Obra
                </Btn>
              )}
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
const NuevoView = ({ municipios, setView, setProjects }) => {
  const [step, setStep]         = useState(1);
  const [muniId, setMuniId]     = useState(null);
  const [barrioId, setBarrioId] = useState(null);
  const [tipo, setTipo]         = useState(null);
  const [zona, setZona]         = useState(null);
  const [datos, setDatos]       = useState({ calle: "", numero: "", localidad: "", lote_m2: "", propietario: "", cuil: "", partida: "" });

  const muni   = muniId   ? municipios[muniId]          : null;
  const barrio = barrioId ? muni?.barrios[barrioId]     : null;

  const STEPS = ["Municipio", "Barrio", "Tipo y zona", "Datos"];

  const crear = () => {
    const p = {
      id: Date.now(),
      nombre: datos.calle + " " + datos.numero + (barrioId ? " — " + barrio.nombre : ""),
      municipio: muniId, barrio: barrioId, tipo, zona,
      workflow: buildFlow(!!barrioId),
      fecha_inicio: new Date().toLocaleDateString("es-AR"),
      observaciones: [],
    };
    setProjects(prev => [...prev, p]);
    setView("home");
  };

  const StepDot = ({ n }) => (
    <div style={{ width: 28, height: 28, borderRadius: 14, background: step > n ? "#22c55e" : step === n ? "#3b82f6" : "#1e2d42", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
      {step > n ? "✓" : n}
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 30 }}>
        <Btn variant="ghost" size="sm" onClick={() => setView("home")}>← Volver</Btn>
        <h1 style={{ color: "#e2e8f0", fontSize: 19, fontWeight: 900, margin: 0 }}>Nuevo plano municipal</h1>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            {Object.values(municipios).map(m => (
              <button key={m.id} onClick={() => setMuniId(m.id)} style={{ background: muniId === m.id ? "#1a2a40" : "#111d2e", border: "2px solid " + (muniId === m.id ? "#3b82f6" : "#1a2640"), borderRadius: 12, padding: 18, cursor: "pointer", textAlign: "left" }}>
                <div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 14, marginBottom: 3 }}>{m.nombre}</div>
                <div style={{ color: "#334155", fontSize: 11 }}>{m.provincia}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 5 }}>
                  <Badge color="#475569">{Object.keys(m.barrios).length} barrios</Badge>
                  <Badge color="#334155">MM {m.matricula_muni}</Badge>
                </div>
              </button>
            ))}
          </div>
          <Btn disabled={!muniId} onClick={() => setStep(2)}>Continuar →</Btn>
        </div>
      )}

      {step === 2 && muni && (
        <div style={{ maxWidth: 540 }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Barrio privado — {muni.nombre}</div>
          <p style={{ color: "#475569", fontSize: 12, marginBottom: 14 }}>Si la obra está en un barrio cerrado, seleccionalo. Si no, continuá sin barrio.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            <button onClick={() => setBarrioId(null)} style={{ background: barrioId === null ? "#1a2a40" : "#111d2e", border: "2px solid " + (barrioId === null ? "#3b82f6" : "#1a2640"), borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "left" }}>
              <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>Sin barrio privado</div>
              <div style={{ color: "#334155", fontSize: 11, marginTop: 3 }}>Normativa municipal estándar</div>
            </button>
            {Object.values(muni.barrios).map(b => (
              <button key={b.id} onClick={() => setBarrioId(b.id)} style={{ background: barrioId === b.id ? "#1a2a40" : "#111d2e", border: "2px solid " + (barrioId === b.id ? "#3b82f6" : "#1a2640"), borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "left" }}>
                <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>{b.nombre}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>FOS {b.fos_max} · FOT {b.fot_max} · Frente {b.retiro_frente}m</div>
                {b.doble_aprobacion && <div style={{ marginTop: 6 }}><Badge color="#f59e0b">⚠ Doble aprobación</Badge></div>}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setStep(1)}>← Atrás</Btn>
            <Btn onClick={() => setStep(3)}>Continuar →</Btn>
          </div>
        </div>
      )}

      {step === 3 && muni && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Tipo de plano</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
            {TIPOS.map(t => (
              <button key={t.id} onClick={() => setTipo(t.id)} style={{ background: tipo === t.id ? "#1a2a40" : "#111d2e", border: "2px solid " + (tipo === t.id ? t.color : "#1a2640"), borderRadius: 10, padding: "13px 14px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                <Dot color={t.color} size={9} />
                <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 12 }}>{t.label}</span>
              </button>
            ))}
          </div>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Zona del lote</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {muni.zonas.map(z => (
              <button key={z.nombre} onClick={() => setZona(z.nombre)} style={{ background: zona === z.nombre ? "#1a2a40" : "#111d2e", border: "2px solid " + (zona === z.nombre ? "#3b82f6" : "#1a2640"), borderRadius: 8, padding: "9px 14px", cursor: "pointer", display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>{z.nombre}</span>
                <span style={{ color: "#475569", fontSize: 11 }}>FOS {z.fos} · FOT {z.fot}</span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setStep(2)}>← Atrás</Btn>
            <Btn disabled={!tipo || !zona} onClick={() => setStep(4)}>Continuar →</Btn>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ maxWidth: 520 }}>
          <Card style={{ marginBottom: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Inp label="Calle" placeholder="Los Robles" value={datos.calle} onChange={v => setDatos(p => ({...p, calle: v}))} />
              <Inp label="Número / Lote" placeholder="238" value={datos.numero} onChange={v => setDatos(p => ({...p, numero: v}))} />
            </div>
            <Inp label="Localidad" placeholder="Puertos del Lago" value={datos.localidad} onChange={v => setDatos(p => ({...p, localidad: v}))} />
            <Inp label="Superficie del lote (m²)" type="number" placeholder="650.00" value={datos.lote_m2} onChange={v => setDatos(p => ({...p, lote_m2: v}))} />
            <Inp label="Nombre del propietario" placeholder="Juan García" value={datos.propietario} onChange={v => setDatos(p => ({...p, propietario: v}))} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Inp label="CUIL / CUIT" placeholder="20-12345678-9" value={datos.cuil} onChange={v => setDatos(p => ({...p, cuil: v}))} />
              <Inp label="N° Partida Territorial" placeholder="118-..." value={datos.partida} onChange={v => setDatos(p => ({...p, partida: v}))} />
            </div>
          </Card>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setStep(3)}>← Atrás</Btn>
            <Btn variant="green" onClick={crear}>✅ Crear proyecto</Btn>
          </div>
        </div>
      )}
    </div>
  );
};

// ── NORMATIVA VIEW ────────────────────────────────────────────────────────────
const NormativaView = ({ municipios, setMunicipios }) => {
  const [selMuni,   setSelMuni]   = useState("escobar");
  const [selBarrio, setSelBarrio] = useState(null);
  const [tab, setTab]             = useState("general");
  const [showAddMuni,    setShowAddMuni]    = useState(false);
  const [showAddBarrio,  setShowAddBarrio]  = useState(false);
  const [showEditBarrio, setShowEditBarrio] = useState(false);
  const [editB,   setEditB]   = useState(null);
  const [newMuni, setNewMuni] = useState({ nombre: "", provincia: "Buenos Aires", coef_ilum: "L/8", coef_vent: "L/3", semicubierto: "100%", altura_max: "", esquema_estructural: true, matricula_muni: "" });
  const [newB,    setNewB]    = useState({ nombre: "", fos_max: "", fot_max: "", retiro_frente: "", retiro_fondo: "", retiro_lateral: "", nivel_00: "", altura_max: "", doble_aprobacion: false, notas: "" });

  const muni   = municipios[selMuni];
  const barrio = selBarrio ? muni?.barrios[selBarrio] : null;

  const addMuni = () => {
    const id = newMuni.nombre.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    setMunicipios(p => ({ ...p, [id]: { ...newMuni, id, barrios: {}, zonas: [] } }));
    setSelMuni(id); setShowAddMuni(false);
    setNewMuni({ nombre: "", provincia: "Buenos Aires", coef_ilum: "L/8", coef_vent: "L/3", semicubierto: "100%", altura_max: "", esquema_estructural: true, matricula_muni: "" });
  };

  const addBarrio = () => {
    const id = newB.nombre.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    setMunicipios(p => ({ ...p, [selMuni]: { ...p[selMuni], barrios: { ...p[selMuni].barrios, [id]: { ...newB, id } } } }));
    setSelBarrio(id); setShowAddBarrio(false);
    setNewB({ nombre: "", fos_max: "", fot_max: "", retiro_frente: "", retiro_fondo: "", retiro_lateral: "", nivel_00: "", altura_max: "", doble_aprobacion: false, notas: "" });
  };

  const saveEditBarrio = () => {
    setMunicipios(p => ({ ...p, [selMuni]: { ...p[selMuni], barrios: { ...p[selMuni].barrios, [selBarrio]: { ...editB } } } }));
    setShowEditBarrio(false);
  };

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: tab === id ? "#1a2a40" : "none", color: tab === id ? "#93c5fd" : "#475569", cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 700 : 400 }}>{label}</button>
  );

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ width: 196, borderRight: "1px solid #1a2640", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 14px 10px", borderBottom: "1px solid #1a2640", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#334155", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Municipios</span>
          <button onClick={() => setShowAddMuni(true)} style={{ background: "#1a2a40", border: "none", color: "#3b82f6", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>+ Nuevo</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {Object.values(municipios).map(m => (
            <button key={m.id} onClick={() => { setSelMuni(m.id); setSelBarrio(null); setTab("general"); }} style={{ width: "100%", padding: "9px 11px", background: selMuni === m.id ? "#1a2a40" : "none", border: "none", borderRadius: 7, cursor: "pointer", textAlign: "left", color: selMuni === m.id ? "#93c5fd" : "#94a3b8", fontSize: 12, fontWeight: selMuni === m.id ? 700 : 400, marginBottom: 2 }}>
              {m.nombre}
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 400 }}>MM {m.matricula_muni} · {Object.keys(m.barrios).length} barrios</div>
            </button>
          ))}
        </div>
      </div>

      {muni && (
        <div style={{ flex: 1, overflow: "auto", padding: 26 }}>
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ color: "#e2e8f0", fontSize: 19, fontWeight: 900, margin: 0 }}>{muni.nombre}</h1>
            <p style={{ color: "#334155", margin: "3px 0 0", fontSize: 12 }}>Matrícula municipal: {muni.matricula_muni} · {muni.provincia}</p>
          </div>
          <div style={{ display: "flex", gap: 4, background: "#111d2e", borderRadius: 8, padding: 4, marginBottom: 22, width: "fit-content" }}>
            <TabBtn id="general"    label="Normativa general" />
            <TabBtn id="barrios"    label={"Barrios (" + Object.keys(muni.barrios).length + ")"} />
            <TabBtn id="categorias" label="Categorías de locales" />
          </div>

          {tab === "general" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Coef. Iluminación", value: muni.coef_ilum, color: "#3b82f6" },
                  { label: "Coef. Ventilación", value: muni.coef_vent, color: "#8b5cf6" },
                  { label: "Semicubierto", value: muni.semicubierto, color: "#22c55e" },
                  { label: "Altura máxima", value: muni.altura_max || "Según zona", color: "#f59e0b" },
                  { label: "Esquema estructural", value: muni.esquema_estructural ? "✅ Requerido" : "No requerido", color: muni.esquema_estructural ? "#22c55e" : "#64748b" },
                  { label: "Matrícula Municipal", value: "MM " + muni.matricula_muni, color: "#64748b" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "#111d2e", border: "1px solid #1a2640", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 7 }}>{label}</div>
                    <div style={{ color, fontSize: 14, fontWeight: 800 }}>{value}</div>
                  </div>
                ))}
              </div>
              <Card>
                <Label>Zonas urbanísticas — FOS y FOT municipales</Label>
                <p style={{ color: "#475569", fontSize: 11, marginTop: 0, marginBottom: 12 }}>⚠ Valores de referencia. <strong style={{ color: "#f59e0b" }}>Siempre prevalece la normativa del barrio cerrado.</strong></p>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a2640" }}>
                      {["Zona", "FOS Muni", "FOT Muni", "Descripción"].map(h => (
                        <th key={h} style={{ padding: "7px 12px", color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {muni.zonas.map(z => (
                      <tr key={z.nombre} style={{ borderBottom: "1px solid #0f1724" }}>
                        <td style={{ padding: "9px 12px" }}><Badge color="#3b82f6">{z.nombre}</Badge></td>
                        <td style={{ padding: "9px 12px", color: "#94a3b8", fontWeight: 700 }}>{z.fos}</td>
                        <td style={{ padding: "9px 12px", color: "#94a3b8", fontWeight: 700 }}>{z.fot}</td>
                        <td style={{ padding: "9px 12px", color: "#475569", fontSize: 12 }}>{z.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {tab === "barrios" && (
            <div style={{ display: "flex", gap: 18 }}>
              <div style={{ width: 190, flexShrink: 0 }}>
                <button onClick={() => setSelBarrio(null)} style={{ width: "100%", padding: "9px 11px", background: selBarrio === null ? "#1a2a40" : "#111d2e", border: "1px solid " + (selBarrio === null ? "#3b82f6" : "#1a2640"), borderRadius: 7, cursor: "pointer", textAlign: "left", color: selBarrio === null ? "#93c5fd" : "#94a3b8", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
                  General (sin barrio)
                  <div style={{ color: "#334155", fontSize: 10, fontWeight: 400 }}>Normativa base</div>
                </button>
                {Object.values(muni.barrios).map(b => (
                  <button key={b.id} onClick={() => setSelBarrio(b.id)} style={{ width: "100%", padding: "9px 11px", background: selBarrio === b.id ? "#1a2a40" : "#111d2e", border: "1px solid " + (selBarrio === b.id ? "#3b82f6" : "#1a2640"), borderRadius: 7, cursor: "pointer", textAlign: "left", color: selBarrio === b.id ? "#93c5fd" : "#94a3b8", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
                    {b.nombre}
                    <div style={{ color: "#334155", fontSize: 10, fontWeight: 400 }}>FOS {b.fos_max} · FOT {b.fot_max}</div>
                    {b.doble_aprobacion && <div style={{ marginTop: 4 }}><Badge color="#f59e0b">AVP</Badge></div>}
                  </button>
                ))}
                <button onClick={() => setShowAddBarrio(true)} style={{ width: "100%", padding: "9px 11px", background: "none", border: "2px dashed #1a2640", borderRadius: 7, cursor: "pointer", color: "#334155", fontSize: 12, display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                  + Agregar barrio
                </button>
              </div>
              <div style={{ flex: 1 }}>
                {!selBarrio && <p style={{ color: "#475569", fontSize: 13 }}>Seleccioná un barrio para ver sus parámetros específicos.</p>}
                {selBarrio && barrio && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                      <div>
                        <h2 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 900, margin: 0 }}>{barrio.nombre}</h2>
                        {barrio.doble_aprobacion && <p style={{ color: "#f59e0b", fontSize: 12, margin: "5px 0 0" }}>⚠ Visado barrio + aprobación municipal</p>}
                      </div>
                      <div style={{ display: "flex", gap: 7 }}>
                        <Btn size="sm" variant="ghost" onClick={() => { setEditB({...barrio}); setShowEditBarrio(true); }}>✏ Editar</Btn>
                        <Btn size="sm" variant="danger" onClick={() => { const n = {...municipios}; delete n[selMuni].barrios[selBarrio]; setMunicipios(n); setSelBarrio(null); }}>🗑</Btn>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                      {[
                        { label: "FOS barrio", value: barrio.fos_max, color: "#3b82f6" },
                        { label: "FOT barrio", value: barrio.fot_max, color: "#8b5cf6" },
                        { label: "Nivel ±0.00", value: barrio.nivel_00 || "Libre", color: "#22c55e" },
                        { label: "Altura máx.", value: barrio.altura_max || "—", color: "#f59e0b" },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ background: "#0d1624", border: "1px solid " + color + "33", borderRadius: 8, padding: "12px", textAlign: "center" }}>
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
              <p style={{ color: "#475569", fontSize: 13, marginBottom: 18 }}>Clasificación de ambientes según el código de edificación. Define qué locales requieren iluminación y ventilación natural.</p>
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
          <Inp label="Nombre" placeholder="Municipio de Zárate" value={newMuni.nombre} onChange={v => setNewMuni(p => ({...p, nombre: v}))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Provincia" value={newMuni.provincia} onChange={v => setNewMuni(p => ({...p, provincia: v}))} />
            <Inp label="Matrícula Municipal" placeholder="12345" value={newMuni.matricula_muni} onChange={v => setNewMuni(p => ({...p, matricula_muni: v}))} />
            <Inp label="Coef. Iluminación" value={newMuni.coef_ilum} onChange={v => setNewMuni(p => ({...p, coef_ilum: v}))} />
            <Inp label="Coef. Ventilación" value={newMuni.coef_vent} onChange={v => setNewMuni(p => ({...p, coef_vent: v}))} />
          </div>
          <Inp label="Altura máxima" placeholder="12.00 m" value={newMuni.altura_max} onChange={v => setNewMuni(p => ({...p, altura_max: v}))} />
          <Toggle label="Esquema estructural requerido" value={newMuni.esquema_estructural} onChange={v => setNewMuni(p => ({...p, esquema_estructural: v}))} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Btn variant="ghost" onClick={() => setShowAddMuni(false)}>Cancelar</Btn>
            <Btn disabled={!newMuni.nombre} onClick={addMuni}>Guardar municipio</Btn>
          </div>
        </Modal>
      )}
      {showAddBarrio && (
        <Modal title={"Agregar barrio — " + muni?.nombre} onClose={() => setShowAddBarrio(false)}>
          <Inp label="Nombre del barrio" value={newB.nombre} onChange={v => setNewB(p => ({...p, nombre: v}))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="FOS máximo" type="number" placeholder="0.35" value={newB.fos_max} onChange={v => setNewB(p => ({...p, fos_max: v}))} />
            <Inp label="FOT máximo" type="number" placeholder="0.50" value={newB.fot_max} onChange={v => setNewB(p => ({...p, fot_max: v}))} />
            <Inp label="Retiro frente (m)" type="number" value={newB.retiro_frente} onChange={v => setNewB(p => ({...p, retiro_frente: v}))} />
            <Inp label="Retiro fondo (m)" type="number" value={newB.retiro_fondo} onChange={v => setNewB(p => ({...p, retiro_fondo: v}))} />
            <Inp label="Retiro lateral (m)" type="number" value={newB.retiro_lateral} onChange={v => setNewB(p => ({...p, retiro_lateral: v}))} />
            <Inp label="Nivel ±0.00" placeholder="+4.00 IGN" value={newB.nivel_00} onChange={v => setNewB(p => ({...p, nivel_00: v}))} />
          </div>
          <Inp label="Altura máxima" value={newB.altura_max} onChange={v => setNewB(p => ({...p, altura_max: v}))} />
          <Toggle label="Doble aprobación (AVP + Municipio)" value={newB.doble_aprobacion} onChange={v => setNewB(p => ({...p, doble_aprobacion: v}))} />
          <Inp label="Notas" value={newB.notas} onChange={v => setNewB(p => ({...p, notas: v}))} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Btn variant="ghost" onClick={() => setShowAddBarrio(false)}>Cancelar</Btn>
            <Btn disabled={!newB.nombre} onClick={addBarrio}>Guardar barrio</Btn>
          </div>
        </Modal>
      )}
      {showEditBarrio && editB && (
        <Modal title={"Editar — " + editB.nombre} onClose={() => setShowEditBarrio(false)}>
          <Inp label="Nombre" value={editB.nombre} onChange={v => setEditB(p => ({...p, nombre: v}))} />
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
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Btn variant="ghost" onClick={() => setShowEditBarrio(false)}>Cancelar</Btn>
            <Btn onClick={saveEditBarrio}>Guardar cambios</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── OBRA VIEW ────────────────────────────────────────────────────────────────
const ObraView = ({ project, setProjects, onBack }) => {
  const [tab, setTab] = useState("resumen");
  const obra = project.obra;
  const tareas = obra.tareas;

  // ── helpers
  const allTareas = OBRA_ETAPAS.flatMap(et => et.tareas);
  const totalTareas = allTareas.length;
  const completadas = allTareas.filter(t => tareas[t.id]?.estado === "completado").length;
  const pctAvance = totalTareas ? Math.round((completadas / totalTareas) * 100) : 0;

  const updateObra = (fn) => {
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, obra: fn(p.obra) } : p));
  };
  const updateTarea = (tid, patch) => {
    updateObra(o => ({ ...o, tareas: { ...o.tareas, [tid]: { ...o.tareas[tid], ...patch } } }));
  };

  // ── modals state
  const [editTarea, setEditTarea] = useState(null);
  const [contratistaModal, setContratistaModal] = useState(null);
  const [rubroModal, setRubroModal] = useState(null);
  const [seguimientoModal, setSeguimientoModal] = useState(false);
  const [newSeg, setNewSeg] = useState({ fecha: "", avance: "", nota: "", problemas: "" });

  // costos totals
  const totalEjecutadoUsd = obra.costos.rubros.reduce((s, r) => s + (r.ejecutado_usd || 0), 0);
  const totalEjecutadoArs = obra.costos.rubros.reduce((s, r) => s + (r.ejecutado_ars || 0), 0);
  const totalPresupUsd = obra.costos.presupuesto_usd || 0;
  const totalPresupArs = obra.costos.presupuesto_ars || 0;

  // next critical task (next hito not completed)
  const proximoHito = allTareas.find(t => t.hito && tareas[t.id]?.estado !== "completado");
  const ultimoHitoAlcanzado = [...allTareas].reverse().find(t => t.hito && tareas[t.id]?.estado === "completado");

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{
      padding: "8px 16px", borderRadius: 7, border: "none",
      background: tab === id ? "#1a2a40" : "none",
      color: tab === id ? "#93c5fd" : "#475569",
      cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 700 : 400, whiteSpace: "nowrap",
    }}>{label}</button>
  );

  const estadoColor = (e) => e === "completado" ? "#22c55e" : e === "en_proceso" ? "#f59e0b" : "#475569";
  const estadoLabel = (e) => e === "completado" ? "Completado" : e === "en_proceso" ? "En proceso" : "Pendiente";

  const fmt = (n) => n ? n.toLocaleString("es-AR") : "0";

  // ── GANTT helpers
  const ganttData = useMemo(() => {
    // Parse dd/mm/yyyy to Date
    const parse = (d) => { if (!d) return null; const [dd,mm,yy] = d.split("/"); return new Date(+yy, +mm-1, +dd); };
    let minDate = null, maxDate = null;
    const rows = [];
    OBRA_ETAPAS.forEach(et => {
      const etRows = [];
      et.tareas.forEach(t => {
        const td = tareas[t.id];
        const start = parse(td?.fecha_plan) || parse(td?.fecha_real);
        const end = parse(td?.fecha_real) || (start ? new Date(start.getTime() + 7*24*60*60*1000) : null);
        if (start) { if (!minDate || start < minDate) minDate = start; }
        if (end) { if (!maxDate || end > maxDate) maxDate = end; }
        etRows.push({ ...t, start, end, estado: td?.estado });
      });
      rows.push({ etapa: et, tareas: etRows });
    });
    if (!minDate) minDate = new Date();
    if (!maxDate) maxDate = new Date(minDate.getTime() + 52*7*24*60*60*1000);
    // add 2-week padding
    minDate = new Date(minDate.getTime() - 14*24*60*60*1000);
    maxDate = new Date(maxDate.getTime() + 14*24*60*60*1000);
    const totalMs = maxDate - minDate;
    const weeks = Math.ceil(totalMs / (7*24*60*60*1000));
    return { rows, minDate, maxDate, totalMs, weeks };
  }, [tareas]);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}>← Volver</Btn>
        <h1 style={{ color: "#e2e8f0", fontSize: 19, fontWeight: 900, margin: 0 }}>🏗 Dirección de Obra</h1>
      </div>
      <p style={{ color: "#475569", fontSize: 13, margin: "0 0 22px" }}>{project.nombre}</p>

      {/* tabs */}
      <div style={{ display: "flex", gap: 4, background: "#111d2e", borderRadius: 8, padding: 4, marginBottom: 22, overflowX: "auto" }}>
        <TabBtn id="resumen" label="Resumen" />
        <TabBtn id="etapas" label="Etapas y Tareas" />
        <TabBtn id="gantt" label="Gantt" />
        <TabBtn id="contratistas" label="Contratistas" />
        <TabBtn id="costos" label="Costos" />
        <TabBtn id="seguimiento" label="Seguimiento" />
      </div>

      {/* ──────── TAB 1: RESUMEN ──────── */}
      {tab === "resumen" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Avance total</div>
              <div style={{ color: "#3b82f6", fontSize: 36, fontWeight: 900 }}>{pctAvance}%</div>
              <div style={{ background: "#1e2d42", borderRadius: 4, height: 6, marginTop: 8, overflow: "hidden" }}>
                <div style={{ width: pctAvance + "%", height: "100%", background: "#3b82f6", borderRadius: 4 }} />
              </div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 6 }}>{completadas}/{totalTareas} tareas</div>
            </Card>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Presupuesto USD</div>
              <div style={{ color: "#22c55e", fontSize: 22, fontWeight: 900 }}>U$D {fmt(totalEjecutadoUsd)}</div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>de U$D {fmt(totalPresupUsd)}</div>
              <div style={{ background: "#1e2d42", borderRadius: 4, height: 4, marginTop: 6, overflow: "hidden" }}>
                <div style={{ width: (totalPresupUsd ? Math.min(100, Math.round(totalEjecutadoUsd/totalPresupUsd*100)) : 0) + "%", height: "100%", background: "#22c55e", borderRadius: 4 }} />
              </div>
            </Card>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Presupuesto ARS</div>
              <div style={{ color: "#f59e0b", fontSize: 22, fontWeight: 900 }}>$ {fmt(totalEjecutadoArs)}</div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>de $ {fmt(totalPresupArs)}</div>
              <div style={{ background: "#1e2d42", borderRadius: 4, height: 4, marginTop: 6, overflow: "hidden" }}>
                <div style={{ width: (totalPresupArs ? Math.min(100, Math.round(totalEjecutadoArs/totalPresupArs*100)) : 0) + "%", height: "100%", background: "#f59e0b", borderRadius: 4 }} />
              </div>
            </Card>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Hitos</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, marginBottom: 2 }}>Próximo hito</div>
                <div style={{ color: "#f59e0b", fontSize: 13, fontWeight: 700 }}>{proximoHito ? "♦ " + proximoHito.nombre : "—"}</div>
              </div>
              <div>
                <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, marginBottom: 2 }}>Último alcanzado</div>
                <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>{ultimoHitoAlcanzado ? "♦ " + ultimoHitoAlcanzado.nombre : "—"}</div>
              </div>
            </Card>
          </div>
          {/* etapas summary */}
          <Card>
            <Label>Avance por etapa</Label>
            {OBRA_ETAPAS.map(et => {
              const total = et.tareas.length;
              const done = et.tareas.filter(t => tareas[t.id]?.estado === "completado").length;
              const pct = total ? Math.round(done/total*100) : 0;
              return (
                <div key={et.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: et.color, fontSize: 12, fontWeight: 700 }}>{et.nombre}</span>
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>{done}/{total} — {pct}%</span>
                  </div>
                  <div style={{ background: "#1e2d42", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ width: pct + "%", height: "100%", background: et.color, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* ──────── TAB 2: ETAPAS Y TAREAS ──────── */}
      {tab === "etapas" && (
        <div>
          {OBRA_ETAPAS.map(et => (
            <Card key={et.id} style={{ marginBottom: 16, border: "1px solid " + et.color + "33" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Dot color={et.color} size={10} />
                <span style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 14 }}>{et.nombre}</span>
                <span style={{ color: "#475569", fontSize: 11, marginLeft: "auto" }}>
                  {et.tareas.filter(t => tareas[t.id]?.estado === "completado").length}/{et.tareas.length}
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a2640" }}>
                    {["", "Tarea", "Planificada", "Real", "Responsable", "Estado", ""].map((h, i) => (
                      <th key={i} style={{ padding: "6px 8px", color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                    ))}
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
                        <td style={{ padding: "8px 6px" }}>
                          <Badge color={estadoColor(td.estado)}>{estadoLabel(td.estado)}</Badge>
                        </td>
                        <td style={{ padding: "8px 6px", width: 30 }}>
                          <button onClick={() => setEditTarea({ id: t.id, nombre: t.nombre, ...td })} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 12 }}>✏</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}

      {/* ──────── TAB 3: GANTT ──────── */}
      {tab === "gantt" && (
        <Card style={{ overflowX: "auto" }}>
          <Label>Diagrama de Gantt</Label>
          <div style={{ minWidth: Math.max(800, ganttData.weeks * 32 + 220) }}>
            {/* header weeks */}
            <div style={{ display: "flex", marginLeft: 200, marginBottom: 4 }}>
              {Array.from({ length: ganttData.weeks }, (_, i) => {
                const d = new Date(ganttData.minDate.getTime() + i * 7 * 24*60*60*1000);
                const label = d.getDate() + "/" + (d.getMonth()+1);
                return (
                  <div key={i} style={{ width: 32, flexShrink: 0, textAlign: "center", color: "#334155", fontSize: 8, borderLeft: "1px solid #1a264040" }}>{label}</div>
                );
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
                      <div style={{ width: 200, flexShrink: 0, color: "#94a3b8", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                        {t.hito ? <span style={{ color: "#f59e0b" }}>♦ </span> : ""}{t.nombre}
                      </div>
                      <div style={{ flex: 1, position: "relative", height: "100%", background: "#0d162440" }}>
                        {width > 0 && (
                          <div style={{
                            position: "absolute", left: left + "%", width: width + "%",
                            height: t.hito ? 14 : 10, top: t.hito ? 4 : 6,
                            background: barColor, borderRadius: t.hito ? 2 : 5,
                            border: t.hito ? "1px solid " + etapa.color : "none",
                          }} />
                        )}
                        {t.hito && t.start && (
                          <div style={{ position: "absolute", left: `calc(${left}% - 5px)`, top: 0, color: "#f59e0b", fontSize: 14, lineHeight: "22px" }}>♦</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ──────── TAB 4: CONTRATISTAS ──────── */}
      {tab === "contratistas" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Label>Contratistas ({obra.contratistas.length})</Label>
            <Btn size="sm" onClick={() => setContratistaModal({ id: Date.now(), nombre: "", empresa: "", telefono: "", rubro: "", monto_usd: 0, monto_ars: 0, activo: true, _new: true })}>
              + Agregar
            </Btn>
          </div>
          {obra.contratistas.map(c => (
            <Card key={c.id} style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14 }}>{c.nombre}</span>
                  <Badge color={c.activo ? "#22c55e" : "#64748b"}>{c.activo ? "Activo" : "Finalizado"}</Badge>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>{c.empresa} · {c.rubro}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>Tel: {c.telefono}</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                  U$D {fmt(c.monto_usd)} · $ {fmt(c.monto_ars)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn size="sm" variant="ghost" onClick={() => setContratistaModal({ ...c })}>✏</Btn>
                <Btn size="sm" variant="danger" onClick={() => updateObra(o => ({ ...o, contratistas: o.contratistas.filter(x => x.id !== c.id) }))}>🗑</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ──────── TAB 5: COSTOS ──────── */}
      {tab === "costos" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Presupuesto total USD</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>U$D</span>
                <input type="number" value={obra.costos.presupuesto_usd} onChange={e => updateObra(o => ({ ...o, costos: { ...o.costos, presupuesto_usd: +e.target.value } }))}
                  style={{ background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 6, padding: "6px 10px", color: "#22c55e", fontSize: 18, fontWeight: 900, width: "100%", boxSizing: "border-box", outline: "none" }} />
              </div>
            </Card>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Presupuesto total ARS</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>$</span>
                <input type="number" value={obra.costos.presupuesto_ars} onChange={e => updateObra(o => ({ ...o, costos: { ...o.costos, presupuesto_ars: +e.target.value } }))}
                  style={{ background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 6, padding: "6px 10px", color: "#f59e0b", fontSize: 18, fontWeight: 900, width: "100%", boxSizing: "border-box", outline: "none" }} />
              </div>
            </Card>
            <Card>
              <div style={{ color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Tipo de cambio USD/ARS</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>1 USD =</span>
                <input type="number" value={obra.costos.tipo_cambio} onChange={e => updateObra(o => ({ ...o, costos: { ...o.costos, tipo_cambio: +e.target.value } }))}
                  style={{ background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 6, padding: "6px 10px", color: "#e2e8f0", fontSize: 18, fontWeight: 900, width: 120, outline: "none" }} />
                <span style={{ color: "#94a3b8", fontSize: 12 }}>ARS</span>
              </div>
            </Card>
          </div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Label>Rubros de costo</Label>
              <Btn size="sm" onClick={() => setRubroModal({ id: Date.now(), nombre: "", presupuestado_usd: 0, presupuestado_ars: 0, ejecutado_usd: 0, ejecutado_ars: 0, _new: true })}>+ Agregar rubro</Btn>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a2640" }}>
                  {["Rubro", "Presup. USD", "Ejecutado USD", "Presup. ARS", "Ejecutado ARS", ""].map((h, i) => (
                    <th key={i} style={{ padding: "7px 8px", color: "#334155", fontSize: 10, fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
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
            <input value={obra.costos.sheets_url} onChange={e => updateObra(o => ({ ...o, costos: { ...o.costos, sheets_url: e.target.value } }))}
              placeholder="https://docs.google.com/spreadsheets/..."
              style={{ width: "100%", background: "#0f1724", border: "1px solid #2d3f5a", borderRadius: 8, padding: "9px 13px", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box", outline: "none" }} />
          </Card>
        </div>
      )}

      {/* ──────── TAB 6: SEGUIMIENTO SEMANAL ──────── */}
      {tab === "seguimiento" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Label>Seguimiento semanal ({obra.seguimiento.length} entradas)</Label>
            <Btn size="sm" onClick={() => { setNewSeg({ fecha: new Date().toLocaleDateString("es-AR"), avance: pctAvance, nota: "", problemas: "" }); setSeguimientoModal(true); }}>+ Nueva entrada</Btn>
          </div>
          {obra.seguimiento.length === 0 && <p style={{ color: "#475569", fontSize: 13 }}>No hay entradas de seguimiento aún.</p>}
          {[...obra.seguimiento].reverse().map(s => (
            <Card key={s.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge color="#3b82f6">{s.fecha}</Badge>
                  <span style={{ color: "#3b82f6", fontSize: 16, fontWeight: 900 }}>{s.avance}%</span>
                </div>
              </div>
              <p style={{ color: "#e2e8f0", fontSize: 13, margin: "0 0 4px" }}>{s.nota}</p>
              {s.problemas && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>⚠ {s.problemas}</p>}
            </Card>
          ))}
        </div>
      )}

      {/* ──────── MODALES ──────── */}
      {editTarea && (
        <Modal title={"Editar: " + editTarea.nombre} onClose={() => setEditTarea(null)} width={440}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Estado</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["pendiente", "en_proceso", "completado"].map(e => (
                <button key={e} onClick={() => setEditTarea(p => ({ ...p, estado: e }))} style={{
                  padding: "6px 14px", borderRadius: 6, border: "2px solid " + (editTarea.estado === e ? estadoColor(e) : "#1a2640"),
                  background: editTarea.estado === e ? estadoColor(e) + "22" : "#111d2e",
                  color: editTarea.estado === e ? estadoColor(e) : "#475569", cursor: "pointer", fontSize: 12, fontWeight: 700,
                }}>{estadoLabel(e)}</button>
              ))}
            </div>
          </div>
          <Inp label="Fecha planificada" placeholder="dd/mm/aaaa" value={editTarea.fecha_plan} onChange={v => setEditTarea(p => ({ ...p, fecha_plan: v }))} />
          <Inp label="Fecha real" placeholder="dd/mm/aaaa" value={editTarea.fecha_real} onChange={v => setEditTarea(p => ({ ...p, fecha_real: v }))} />
          <Inp label="Responsable" placeholder="Nombre o empresa" value={editTarea.responsable} onChange={v => setEditTarea(p => ({ ...p, responsable: v }))} />
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
              const c = { ...contratistaModal };
              delete c._new;
              if (contratistaModal._new) {
                updateObra(o => ({ ...o, contratistas: [...o.contratistas, c] }));
              } else {
                updateObra(o => ({ ...o, contratistas: o.contratistas.map(x => x.id === c.id ? c : x) }));
              }
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
              const r = { ...rubroModal };
              delete r._new;
              if (rubroModal._new) {
                updateObra(o => ({ ...o, costos: { ...o.costos, rubros: [...o.costos.rubros, r] } }));
              } else {
                updateObra(o => ({ ...o, costos: { ...o.costos, rubros: o.costos.rubros.map(x => x.id === r.id ? r : x) } }));
              }
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
            <Btn onClick={() => {
              updateObra(o => ({ ...o, seguimiento: [...o.seguimiento, { ...newSeg, id: Date.now() }] }));
              setSeguimientoModal(false);
            }}>Guardar entrada</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,       setView]       = useState("home");
  const [obraProjectId, setObraProjectId] = useState(null);
  const [municipios, setMunicipios] = useState(() => {
    const saved = localStorage.getItem("planomuni_municipios");
    return saved ? JSON.parse(saved) : MUNICIPIOS_DATA;
  });
  const [projects,   setProjects]   = useState(() => {
    const saved = localStorage.getItem("planomuni_projects");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Hydrate: ensure all projects have obra field; give project 1 sample data if missing
      return parsed.map(p => ({
        ...p,
        obra: p.obra || (p.id === 1 ? OBRA_SAMPLE : null),
      }));
    }
    // First run: give project 1 the sample obra data
    return PROJECTS_INIT.map(p => p.id === 1 ? { ...p, obra: OBRA_SAMPLE } : p);
  });

  useEffect(() => {
    localStorage.setItem("planomuni_municipios", JSON.stringify(municipios));
  }, [municipios]);

  useEffect(() => {
    localStorage.setItem("planomuni_projects", JSON.stringify(projects));
  }, [projects]);

  const obraProject = obraProjectId ? projects.find(p => p.id === obraProjectId) : null;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d1624", fontFamily: "'DM Sans','Inter',system-ui,sans-serif", overflow: "hidden" }}>
      <Sidebar view={view} setView={(v) => { setView(v); setObraProjectId(null); }} />
      {view === "home" && !obraProject && <HomeView projects={projects} setProjects={setProjects} municipios={municipios} setView={setView} onOpenObra={(pid) => setObraProjectId(pid)} />}
      {view === "home" && obraProject && obraProject.obra?.activo && <ObraView project={obraProject} setProjects={setProjects} onBack={() => setObraProjectId(null)} />}
      {view === "nuevo"     && <NuevoView     municipios={municipios} setView={setView} setProjects={setProjects} />}
      {view === "normativa" && <NormativaView municipios={municipios} setMunicipios={setMunicipios} />}
    </div>
  );
}
