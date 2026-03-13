// src/components/admin/ParticipationSliderCard.jsx
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ── Paletas ────────────────────────────────────────────────────────────────────
const COLORS_MUN = [
  "#f97316", "#29C6F8", "#A855F7", "#facc15",
  "#22c55e", "#ef4444", "#38bdf8", "#ec4899",
  "#a3e635", "#0ea5e9", "#fb923c", "#818cf8",
];
const COLORS_GENERO  = ["#38bdf8", "#f472b6", "#a855f7", "#9ca3af"];
const COLORS_EDAD    = ["#a3e635", "#f97316", "#ef4444", "#29C6F8", "#facc15"];
const COLORS_RIESGO  = ["#ef4444", "#f97316", "#22c55e"];
const COLORS_MOTIVO  = ["#29C6F8", "#A855F7", "#f97316", "#ef4444", "#facc15", "#22c55e", "#ec4899"];
const COLORS_ENFOQUE = ["#22c55e", "#eab308", "#8b5cf6", "#ec4899", "#0ea5e9", "#f97316", "#9ca3af"];

// ── Helpers ────────────────────────────────────────────────────────────────────
function buildSeries(counts) {
  const total = Object.values(counts).reduce((a, v) => a + v, 0) || 1;
  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

const toLabel = (slug) =>
  slug
    ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Sin dato";

const GENERO_MAP = {
  male:             "Masculino",
  female:           "Femenino",
  "non-binary":     "No binario/a",
  "prefer-not-say": "Prefiero no decirlo",
};

const AGE_LABEL = {
  "16-25": "16 – 25 años",
  "16-24": "16 – 24 años",
  "25-34": "25 – 34 años",
  "35-59": "35 – 59 años",
  "60+":   "60+ años",
};

const FOCUS_MAP = {
  lgbtiq:           "Población LGBTIQ+",
  ethnic:           "Población étnica",
  "armed-conflict": "Víctima del conflicto",
  disability:       "Persona con discapacidad",
  "female-head":    "Mujer cabeza de hogar",
  none:             "Ninguno",
  "prefer-not-say": "Prefiero no decirlo",
};

// ── Donut cónico ───────────────────────────────────────────────────────────────
function buildDonut(series, colors) {
  if (!series.length) return "conic-gradient(from -90deg, #4f46e5 0 100%)";
  const total = series.reduce((a, s) => a + s.count, 0) || 1;
  let acc = 0;
  const segs = series.map((s, i) => {
    const start = acc;
    acc += (s.count / total) * 100;
    const color = colors[i] || colors[colors.length - 1] || "#64748b";
    return `${color} ${start}% ${acc}%`;
  });
  return `conic-gradient(from -90deg, ${segs.join(",")})`;
}

// ── Animación ──────────────────────────────────────────────────────────────────
const variants = {
  enter:  (d) => ({ opacity: 0, x: d > 0 ?  32 : -32 }),
  center:      ({ opacity: 1, x: 0 }),
  exit:   (d) => ({ opacity: 0, x: d > 0 ? -32 :  32 }),
};

// ══════════════════════════════════════════════════════════════════════════════
export default function ParticipationSliderCard({ users }) {
  const [index,     setIndex]     = useState(0);
  const [direction, setDirection] = useState(1);

  const slides = useMemo(() => {
    // ── Municipio ────────────────────────────────────────────────────────────
    const munCounts = users.reduce((acc, u) => {
      const key = toLabel(u.municipality ?? u.municipio);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const munSeries = buildSeries(munCounts);

    // ── Género ───────────────────────────────────────────────────────────────
    const genCounts = users.reduce((acc, u) => {
      const raw = (u.genero || "").toLowerCase().trim();
      const key = GENERO_MAP[raw] || toLabel(raw) || "Sin dato";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const genSeries = buildSeries(genCounts);

    // ── Rango de edad ────────────────────────────────────────────────────────
    const edadCounts = users.reduce((acc, u) => {
      const raw = (u.ageRange ?? u.edad ?? "").toString().trim();
      const key = AGE_LABEL[raw] || raw || "Sin dato";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const edadSeries = buildSeries(edadCounts);

    // ── Enfoque diferencial ────────────────────────────────────────────────────────────────
    const enfoqueCounts = users.reduce((acc, u) => {
      const raw = (u.differentialFocus ?? u.enfoqueDiferencial ?? "").toLowerCase().trim();
      const key = FOCUS_MAP[raw] || toLabel(raw) || "Sin dato";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const enfoqueSeries = buildSeries(enfoqueCounts);

    // ── Nivel de riesgo ───────────────────────────────────────────────────
    const riesgoOrder  = ["ALTO", "MEDIO", "BAJO"];
    const riesgoLabels = { ALTO: "Riesgo Alto", MEDIO: "Riesgo Medio", BAJO: "Riesgo Bajo" };
    const riesgoCounts = {};
    users.forEach((u) => {
      const key = u.riskProfile;
      if (key) riesgoCounts[key] = (riesgoCounts[key] || 0) + 1;
    });
    const riesgoTotal  = users.length || 1;
    const riesgoSeries = riesgoOrder
      .filter((k) => riesgoCounts[k])
      .map((k) => ({
        label:   riesgoLabels[k] || k,
        count:   riesgoCounts[k],
        percent: Math.round((riesgoCounts[k] / riesgoTotal) * 100),
      }));

    // ── Motivo de consulta ────────────────────────────────────────────────
    const motivoCounts = users.reduce((acc, u) => {
      const key = u.motivoConsulta || "Sin dato";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const motivoSeries = buildSeries(motivoCounts);

    return [
      { key: "municipio", title: "Participación por municipio",           series: munSeries,     colors: COLORS_MUN     },
      { key: "genero",    title: "Participación por género",               series: genSeries,     colors: COLORS_GENERO  },
      { key: "edad",      title: "Participación por rango de edad",        series: edadSeries,    colors: COLORS_EDAD    },
      { key: "riesgo",    title: "Distribución del nivel de riesgo",       series: riesgoSeries,  colors: COLORS_RIESGO  },
      { key: "motivo",    title: "Motivo de consulta principal",           series: motivoSeries,  colors: COLORS_MOTIVO  },
      { key: "enfoque",   title: "Participación por enfoque diferencial",  series: enfoqueSeries, colors: COLORS_ENFOQUE },
    ];
  }, [users]);

  const total   = slides.length;
  const current = slides[index] ?? slides[0];

  const prev = () => { setDirection(-1); setIndex((i) => (i - 1 + total) % total); };
  const next = () => { setDirection( 1); setIndex((i) => (i + 1)         % total); };

  if (!current) return null;

  const donut = buildDonut(current.series, current.colors);

  return (
    <div className="rounded-[32px] bg-[#2a2e40] border border-black/20 px-5 py-4 md:px-6 shadow-[0_16px_36px_rgba(0,0,0,0.45)] overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button" onClick={prev}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 transition"
        >
          <span className="sr-only">Anterior</span>
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <h3 className="text-sm md:text-base font-semibold text-white text-center">
          {current.title}
        </h3>

        <button
          type="button" onClick={next}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 transition"
        >
          <span className="sr-only">Siguiente</span>
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M7.5 4.5L13 10l-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── Slide ──────────────────────────────────────────────────────────── */}
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={current.key}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex flex-row gap-4 items-center min-h-[160px]"
        >
          {/* Donut – tamaño reducido para dar espacio a la leyenda */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1  }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative h-36 w-36 md:h-40 md:w-40"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/30 to-sky-400/20 blur-xl" />
              <div className="relative flex h-full w-full items-center justify-center">
                <div className="relative h-[84%] w-[84%] rounded-full bg-[#24293F] border border-white/10 overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-90"
                    style={{ background: donut }}
                  />
                  {/* hueco interior */}
                  <div className="absolute inset-[26%] rounded-full bg-[#1F2336]" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Leyenda – ocupa el espacio restante, sin truncar */}
          <div className="flex-1 min-w-0">
            {current.series.length === 0 ? (
              <p className="text-xs text-white/50">Sin datos suficientes.</p>
            ) : (
              <div className={`grid gap-x-5 gap-y-[7px] ${
                current.series.length > 5 ? "grid-cols-2" : "grid-cols-1"
              }`}>
                {current.series.map((item, idx) => {
                  const color =
                    current.colors[idx] ||
                    current.colors[current.colors.length - 1] ||
                    "#64748b";
                  return (
                    <div key={item.label} className="flex items-start gap-1.5 min-w-0">
                      <span
                        className="mt-[3px] h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 min-w-0 text-[11px] text-white/85 leading-snug">
                        {item.label}
                      </span>
                      <span className="flex-shrink-0 ml-1 text-[10px] text-white/50 tabular-nums whitespace-nowrap leading-snug">
                        {item.count}&nbsp;·&nbsp;{item.percent}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Contador ───────────────────────────────────────────────────────── */}
      <div className="mt-2 flex justify-end">
        <span className="text-xs text-white/50">{index + 1}/{total}</span>
      </div>
    </div>
  );
}