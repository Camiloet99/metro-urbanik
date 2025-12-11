import { useEffect, useMemo, useRef, useState } from "react";
import { submitInitialTest } from "@/services/testsService";
import { useNavigate } from "react-router-dom";

// Nueva estructura de preguntas: salud mental y prevención del suicidio
const QUESTIONS = [
  {
    id: 1,
    text: "Estado de ánimo reciente",
    helper:
      "En las últimas dos semanas, ¿cómo ha sido tu estado de ánimo en general?",
    type: "scale_1_5", // 1 = muy bajo / muy triste, 5 = muy bueno / estable
  },
  {
    id: 2,
    text: "Ansiedad en el Metro de Medellín",
    helper:
      "Cuando te desplazas en el Metro de Medellín o estás en sus estaciones, ¿con qué frecuencia sientes nerviosismo, tensión o ansiedad?",
    type: "options",
    options: [
      { value: "nunca_casi_nunca", label: "Casi nunca" },
      { value: "algunas_veces", label: "Algunas veces" },
      { value: "frecuente", label: "Con frecuencia" },
      { value: "casi_siempre", label: "Casi siempre" },
    ],
  },
  {
    id: 3,
    text: "Pensamientos de hacerse daño",
    helper:
      "En las últimas dos semanas, ¿con qué frecuencia has tenido pensamientos de que la vida no vale la pena o deseos de hacerte daño?",
    type: "options",
    options: [
      { value: "nunca", label: "Nunca" },
      { value: "rara_vez", label: "Rara vez" },
      { value: "a_veces", label: "A veces" },
      { value: "con_frecuencia", label: "Con frecuencia" },
    ],
  },
  {
    id: 4,
    text: "Red de apoyo emocional",
    helper:
      "Si te sientes muy triste, ansioso/a o abrumado/a, ¿sientes que cuentas con personas de confianza con quienes puedes hablar?",
    type: "options",
    options: [
      { value: "si_varias_personas", label: "Sí, con varias personas" },
      { value: "si_una_persona", label: "Sí, con una persona" },
      { value: "pocas_personas", label: "Solo en algunas ocasiones" },
      { value: "no_casi_nadie", label: "No / casi nadie" },
    ],
  },
  {
    id: 5,
    text: "Búsqueda de ayuda profesional",
    helper:
      "En los últimos 12 meses, ¿has buscado o recibido apoyo de profesionales (psicología, psiquiatría, líneas de ayuda) por tu salud mental?",
    type: "options",
    options: [
      { value: "si_actualmente", label: "Sí, actualmente estoy en proceso" },
      {
        value: "si_en_el_pasado",
        label: "Sí, lo he buscado en algún momento",
      },
      { value: "no_pero_me_interesa", label: "No, pero me interesaría" },
      { value: "no_no_me_interesa", label: "No y no me interesa" },
    ],
  },
];

function Chip({ selected, children, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        "h-8 min-w-8 px-3 grid place-items-center rounded-full text-sm transition",
        "ring-1 ring-white/15",
        selected
          ? "bg-[#5944F9] text-white shadow-[0_8px_20px_rgba(89,68,249,0.35)]"
          : "bg-white/5 text-white/80 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function QuestionRow({ index, question, value, onChange }) {
  const { text, helper, type, options } = question;

  return (
    <div className="rounded-xl px-4 py-3 ring-1 ring-white/10 bg-white/3 hover:bg-white/[0.07] transition">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="md:max-w-[70%]">
          <p className="text-[15px] font-medium">
            {index + 1}. {text}
          </p>
          {helper && <p className="mt-1 text-xs text-white/70">{helper}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preguntas de opciones (frecuencia, sí/no, red de apoyo, etc.) */}
          {type === "options" &&
            options?.map((opt) => (
              <Chip
                key={opt.value}
                selected={value === opt.value}
                onClick={() => onChange(opt.value)}
                ariaLabel={`Pregunta ${index + 1} opción ${opt.label}`}
              >
                {opt.label}
              </Chip>
            ))}

          {/* Escala 1–5 de estado de ánimo / bienestar */}
          {type === "scale_1_5" &&
            [1, 2, 3, 4, 5].map((n) => (
              <Chip
                key={n}
                selected={value === n}
                onClick={() => onChange(n)}
                ariaLabel={`Pregunta ${index + 1} opción ${n}`}
              >
                {n}
              </Chip>
            ))}
        </div>
      </div>
    </div>
  );
}

function ProgressMini({ percent }) {
  const size = 84;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (percent / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#74E0E6" />
          <stop offset="50%" stopColor="#7B6CFF" />
          <stop offset="100%" stopColor="#5B7CFF" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.15)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#g)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/** Barra inferior que aparece solo cuando el botón principal no es visible */
function StickyActionBar({ visible, onSubmit, disabled, sending, progress }) {
  return (
    <div
      aria-hidden={!visible}
      className={[
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
      ].join(" ")}
    >
      <div className="mx-auto max-w-6xl px-4 pb-4">
        <div className="pointer-events-auto rounded-2xl bg-[#0B0B11]/70 backdrop-blur-md ring-1 ring-white/10 shadow-[0_20px_40px_rgba(0,0,0,.35)] p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/5 ring-1 ring-white/10 grid place-items-center text-xs">
              {progress}%
            </div>
            <p className="text-sm text-white/80 hidden sm:block">
              {progress === 100
                ? "Listo para enviar"
                : "Responde todas las preguntas para habilitar el envío"}
            </p>
          </div>
          <button
            onClick={onSubmit}
            disabled={disabled}
            className={[
              "rounded-xl px-5 py-2.5 font-medium transition",
              !disabled
                ? "bg-[#5944F9] hover:brightness-110 shadow-[0_10px_24px_rgba(89,68,249,0.35)]"
                : "bg-white/10 text-white/60 cursor-not-allowed",
            ].join(" ")}
          >
            {sending ? "Enviando..." : "Enviar respuestas"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TestInitial() {
  const navigate = useNavigate();

  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem("test-inicial");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === QUESTIONS.length) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return Array(QUESTIONS.length).fill(null);
  });

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // visibilidad del botón principal (aside)
  const asideBtnRef = useRef(null);
  const [actionBarVisible, setActionBarVisible] = useState(false);

  useEffect(() => {
    localStorage.setItem("test-inicial", JSON.stringify(answers));
  }, [answers]);

  const progress = useMemo(() => {
    const filled = answers.filter((v) => v !== null).length;
    return Math.round((filled / QUESTIONS.length) * 100);
  }, [answers]);

  const allDone = answers.every((v) => v !== null);

  const handleChange = (idx, val) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleSubmit = async () => {
    setError("");
    if (!allDone) {
      setError("Por favor responde todas las preguntas.");
      return;
    }
    setSending(true);
    try {
      const payload = {
        kind: "test-inicial", // podrías cambiar a "tamizaje-salud-mental-metro" si actualizas el backend
        answers,
        submittedAt: new Date().toISOString(),
      };
      const resp = await submitInitialTest(payload);
      if (!resp?.ok) {
        setError("No se pudo enviar. Intenta nuevamente.");
        return;
      }
      localStorage.removeItem("test-inicial");
      navigate("/experience", { replace: true });
    } catch (err) {
      setError(err?.message || "Ocurrió un error al enviar.");
    } finally {
      setSending(false);
    }
  };

  // IntersectionObserver: muestra la barra inferior cuando el botón principal NO está visible
  useEffect(() => {
    const el = asideBtnRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        setActionBarVisible(!entry.isIntersecting);
      },
      { root: null, threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-[calc(80vh-80px)]">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        {/* Intro / explicación */}
        <section className="rounded-[22px] ring-1 ring-white/10 bg-white/5 backdrop-blur-md p-6">
          <h2 className="text-center text-xl font-semibold mb-4">
            🧠 Bienestar emocional en el Metro de Medellín
          </h2>
          <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10 text-white/85 text-[14px] leading-relaxed">
            <p className="mb-2">
              Este breve cuestionario busca comprender cómo te sientes a nivel
              emocional mientras te mueves por la ciudad y utilizas el Metro de
              Medellín, incluyendo tu estado de ánimo, la ansiedad que puedas
              experimentar y el apoyo con el que cuentas.
            </p>
            <p className="mb-2">
              Tus respuestas ayudan a identificar señales tempranas de malestar
              emocional y a ajustar las experiencias y mensajes de la
              plataforma, como parte de las acciones de prevención del suicidio
              en las estaciones y entornos del sistema metro.
            </p>
            <p className="mb-2">
              Este cuestionario no reemplaza una atención profesional, pero
              puede ser una puerta de entrada para que recibas información y
              apoyo. No hay respuestas “correctas” o “incorrectas”; responde con
              sinceridad.
            </p>
            <p className="mt-2 text-xs text-white/60">
              Si en este momento sientes que estás en riesgo o tienes intención
              de hacerte daño, busca ayuda inmediata con los servicios de
              emergencia de tu ciudad o las líneas de atención en crisis.
            </p>
          </div>
        </section>

        {/* Aside con progreso y botón de envío */}
        <aside className="rounded-[22px] ring-1 ring-white/10 bg-white/5 backdrop-blur-md p-6">
          <div className="flex items-center gap-5">
            <ProgressMini percent={progress} />
            <div>
              <div className="text-2xl font-semibold">{progress}%</div>
              <div className="text-white/70 text-sm -mt-1">Completado</div>
            </div>
          </div>

          <div className="mt-4 text-sm text-white/80">
            Responde las 5 preguntas para habilitar el envío.
          </div>

          {error && (
            <div className="mt-3 rounded-lg bg-red-500/10 text-red-200 text-sm px-3 py-2 ring-1 ring-red-400/30">
              {error}
            </div>
          )}

          <button
            ref={asideBtnRef}
            onClick={handleSubmit}
            disabled={!allDone || sending}
            className={[
              "mt-5 w-full rounded-xl py-3 font-medium transition",
              allDone && !sending
                ? "bg-[#5944F9] hover:brightness-110 shadow-[0_10px_24px_rgba(89,68,249,0.35)]"
                : "bg-white/10 text-white/60 cursor-not-allowed",
            ].join(" ")}
          >
            {sending ? "Enviando..." : "Enviar respuestas"}
          </button>
        </aside>
      </div>

      {/* Lista de preguntas */}
      <div className="mt-6 rounded-[22px] ring-1 ring-white/10 bg-white/5 backdrop-blur-md p-4 md:p-6">
        <div className="grid gap-3">
          {QUESTIONS.map((q, i) => (
            <QuestionRow
              key={q.id}
              index={i}
              question={q}
              value={answers[i]}
              onChange={(val) => handleChange(i, val)}
            />
          ))}
        </div>
      </div>

      {/* Sticky action bar */}
      <StickyActionBar
        visible={actionBarVisible}
        onSubmit={handleSubmit}
        disabled={!allDone || sending}
        sending={sending}
        progress={progress}
      />
    </div>
  );
}
