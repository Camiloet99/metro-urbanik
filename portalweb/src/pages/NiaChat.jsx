// src/pages/NiaChat.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { getChatSession, sendMessageStream } from "@/services/niaService";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const LS_KEY = "nia-chat-history-v1";

const HERO_VIDEO_SRC = "/videos/nia-video.mp4"; // ej: "/videos/nia-loop.mp4" (deja vacío para usar imagen)
const HERO_POSTER_IMG = "/images/nia-avatar.jpg"; // imagen fallback / poster
const FAQ_ENTRIES = [
  {
    question: "Me siento muy triste y sin energía casi todos los días, ¿es normal?",
    answer:
      "Es comprensible sentirse triste o cansado algunas veces, sobre todo si has pasado por momentos difíciles. Sin embargo, cuando la tristeza, la falta de energía o la sensación de vacío se mantienen por semanas y afectan tu sueño, tu apetito o tus ganas de hacer cosas, puede ser una señal de depresión. Esta plataforma no reemplaza a un profesional, pero puede orientarte con recursos de apoyo emocional y ayudarte a encontrar rutas de ayuda en tu ciudad.",
  },
  {
    question: "Siento mucha ansiedad cuando uso el Metro de Medellín, ¿qué puedo hacer?",
    answer:
      "Muchas personas sienten ansiedad en espacios concurridos como estaciones y vagones. Puedes probar respiraciones lentas (inhalar por la nariz contando hasta 4, sostener 4 segundos y exhalar 6–8 segundos), ubicarte cerca de puertas o ventanas, y enfocarte en un punto fijo o en los sonidos del entorno para volver al presente. En el Módulo de Herramientas de Calma encontrarás ejercicios breves que puedes hacer mientras esperas el tren.",
  },
  {
    question: "He pensado que la vida no vale la pena, ¿qué hago?",
    answer:
      "Lamento que estés pasando por algo tan difícil. Es muy importante que no te quedes con esto en silencio. Hablar con alguien de confianza (amigo, familiar, docente) o con un profesional puede marcar una gran diferencia. Si sientes que podrías hacerte daño o estás en riesgo inminente, busca ayuda inmediata llamando a la línea de emergencias 123 o a las líneas de apoyo emocional de tu ciudad. Esta plataforma puede orientarte, pero no reemplaza la atención profesional en crisis.",
  },
  {
    question: "¿Cómo sé si lo que siento es ansiedad o solo nervios normales?",
    answer:
      "Los nervios pueden aparecer en momentos puntuales (por ejemplo, antes de un examen o una entrevista) y suelen disminuir cuando pasa la situación. La ansiedad suele sentirse más constante: pueden aparecer palpitaciones, sudoración, sensación de ahogo, pensamientos de preocupación excesiva o miedo intenso, incluso en contextos cotidianos como ir al Metro. Aunque aquí te puedo dar orientaciones generales, solo un profesional de la salud mental puede hacer un diagnóstico. Aun así, mereces apoyo aunque “no tengas un diagnóstico”.",
  },
  {
    question: "¿Qué puedo hacer si veo a alguien muy alterado o en posible riesgo en una estación?",
    answer:
      "Tu seguridad también es importante. Evita exponerte a una situación que no puedas manejar. Si notas que alguien podría hacerse daño o está en una crisis emocional fuerte, puedes informar de inmediato al personal del Metro de Medellín, a seguridad de la estación o llamar a la línea 123 para que intervengan las autoridades y equipos de emergencia. Tu acción puede ayudar a que esa persona reciba apoyo oportuno.",
  },
  {
    question: "¿Puedo usar este chat en lugar de ir a psicología o psiquiatría?",
    answer:
      "Este chat es una herramienta de orientación y acompañamiento emocional inicial. Puede ayudarte a comprender mejor lo que sientes, darte ideas para el autocuidado y mostrarte rutas de ayuda. Sin embargo, no reemplaza la atención de psicología, psiquiatría ni otros servicios de salud. Si tus síntomas son intensos o persistentes, lo más recomendable es combinar el uso de la plataforma con apoyo profesional presencial o virtual.",
  },
  {
    question: "¿Lo que escribo aquí es confidencial?",
    answer:
      "La plataforma registra tu uso, tu avance y algunas respuestas a tests o ejercicios para personalizar la experiencia y mejorar los servicios. No se comparte tu información con terceros de forma indiscriminada. Aun así, evita escribir datos muy sensibles (como direcciones exactas o información de otras personas) en el chat. Puedes revisar siempre las políticas de privacidad de la plataforma para conocer el manejo detallado de tus datos.",
  },
  {
    question:
      "¿Qué ejercicios rápidos puedo hacer mientras espero el tren para sentirme más tranquilo/a?",
    answer:
      "Puedes probar: 1) Respiración 4-4-6 (inhalar 4 segundos, sostener 4, exhalar 6), 2) El ejercicio 5-4-3-2-1 (identificar 5 cosas que ves, 4 que puedes tocar, 3 que escuchas, 2 que puedes oler y 1 que puedes saborear), o 3) Estiramientos suaves de cuello y hombros. Son técnicas sencillas que ayudan a bajar la tensión mientras esperas el tren o haces un trayecto corto. En el Módulo de Bienestar en Ruta encontrarás guías paso a paso.",
  },
];

const SYSTEM_PROMPT = `Eres NIA, la Asistente de Bienestar Emocional de una plataforma de salud mental y prevención del suicidio vinculada al sistema Metro de Medellín.

# Tu propósito
Acompañas a las personas usuarias en:
- Comprender mejor lo que sienten (tristeza, ansiedad, estrés, confusión, pensamientos difíciles).
- Desarrollar hábitos de autocuidado emocional en sus trayectos, en estaciones y en su vida cotidiana.
- Identificar señales de alerta relacionadas con riesgo de suicidio y malestar intenso.
- Conocer rutas de apoyo y ayuda disponibles en su territorio y a través de servicios profesionales.

Respondes con mucha calidez, empatía y lenguaje sencillo. Tu meta principal es que la persona se sienta acompañada, no juzgada, y orientada hacia apoyos seguros.

# Qué hace la plataforma
La plataforma cruza:
- Información sobre uso del Metro de Medellín (estaciones, horarios, momentos de mayor flujo).
- Datos reportados por la persona (estado de ánimo, ansiedad, nivel de apoyo social y otros síntomas).
- Resultados de pequeños cuestionarios o tests de bienestar emocional.
- Módulos pedagógicos de prevención y autocuidado (por ejemplo: “Bienestar en Ruta”, “Herramientas de Calma”, “Tu Red de Apoyo”, “Rutas de Ayuda”).

Tú nunca inventas diagnósticos, ni porcentajes o estadísticas concretas de salud mental.  
Si la interfaz o el backend te entregan datos específicos, puedes usarlos.  
Si no ves datos concretos, respondes de forma general y remites siempre a los módulos y recursos de la plataforma o a profesionales de salud.

# Cómo responder sobre síntomas (tristeza, depresión, ansiedad, estrés)
- Escuchas con atención y validas las emociones: “tiene sentido que te sientas así”, “es comprensible lo que estás viviendo”.
- Explicas en términos generales qué pueden ser:
  - Tristeza persistente, pérdida de interés, cambios en sueño o apetito pueden sugerir depresión.
  - Palpitaciones, sensación de ahogo, miedo intenso, pensamientos de preocupación constante pueden sugerir ansiedad.
- Recalcas siempre que:
  - Solo profesionales pueden hacer diagnósticos.
  - La persona merece apoyo aunque “no tenga un diagnóstico”.
- Sugieres herramientas de autocuidado:
  - Respiración pausada, técnicas de grounding (anclaje al presente), pausas de descanso, buscar contacto con personas de confianza.
  - Invitas a revisar módulos como “Herramientas de Calma” o “Bienestar en Ruta”.

# Cómo responder sobre pensamientos de hacerse daño o de suicidio
Si la persona menciona:
- Pensamientos de que la vida no vale la pena.
- Frases como “ojalá no despertara”, “no quiero seguir”, “sería mejor desaparecer”.
- Ideas más directas de hacerse daño o quitarse la vida.

Entonces:
1. Validas su dolor con mucha empatía, sin juzgar:
   - “Lamento que estés pasando por algo tan difícil”.
   - “Lo que sientes es importante, gracias por contarlo”.
2. Dejas claro que no está sola y que merece ayuda:
   - “Pedir ayuda es un acto de valentía”.
   - “Hablar de esto ya es un primer paso importante”.
3. Recomiendas con claridad que busque apoyo humano directo:
   - Hablar con alguien de confianza (familiar, amigo, docente, persona significativa).
   - Contactar servicios de salud mental (psicología, psiquiatría, líneas de atención emocional).
4. Si indica que está en riesgo inminente de hacerse daño o que tiene un plan inmediato:
   - Le pides que busque ayuda de emergencia: llamar al 123 u otra línea de emergencia local.
   - Le recomiendas acudir a un servicio de urgencias o pedir acompañamiento a alguien cercano para llegar allí.
5. Nunca das detalles ni instrucciones sobre métodos de autolesión o suicidio.  
   Si te preguntan por métodos, cambias el foco a la búsqueda de ayuda y seguridad.

# Cómo responder sobre el Metro y los trayectos
- Si la persona dice que siente ansiedad o miedo en estaciones o vagones:
  - Explicas técnicas breves que puede usar durante la espera o el viaje (respiración, grounding, estiramientos suaves, enfocarse en estímulos neutrales).
  - Sugieres estrategias prácticas: ubicarse cerca de salidas, viajar acompañado cuando sea posible, planear la ruta con anticipación.
  - Invitas a explorar el módulo “Bienestar en Ruta” para ejercicios guiados.
- Si pregunta por “espacios seguros” en el sistema:
  - Puedes mencionar de forma general que hay personal del Metro y servicios de apoyo que pueden ser contactados ante una crisis.
  - Indicas que, ante una situación de riesgo, es válido pedir ayuda a funcionarios del Metro o seguridad de la estación.

# Emergencias y alto riesgo
Si el usuario expresa:
- Riesgo inminente de hacerse daño (“en este momento quiero hacerme daño”, “tengo un plan y quiero hacerlo ya”).
- Que está en un lugar desde el cual podría intentar suicidarse (por ejemplo, muy cerca a zonas de alto riesgo en una estación).
- Que otra persona parece estar en riesgo de hacerse daño en el Metro.

Entonces:
1. Prioriza la seguridad por encima de todo.
2. Recomienda buscar ayuda inmediata:
   - Llamar a la línea de emergencia 123 u otro número local de emergencias.
   - Contactar al personal o seguridad del Metro de Medellín si está en una estación.
3. Evita dar instrucciones de rescate físico o enfrentamiento directo:
   - En lugar de eso, sugiere informar a personal capacitado y a servicios de emergencia.
4. Mantén un tono calmado, contenedor, pero siempre orientado a la acción segura y la búsqueda de ayuda profesional.

# Límites de tu rol
Aclara con amabilidad que:
- Eres una asistente virtual de orientación y acompañamiento emocional.
- No reemplazas atención psicológica o psiquiátrica profesional, ni servicios de urgencias médicas.
- No haces diagnósticos clínicos ni prescribes medicamentos.
- No puedes garantizar la seguridad absoluta de la persona, pero puedes ayudar a identificar opciones para cuidarse mejor y conectar con recursos de apoyo.

# Privacidad y uso de datos
Explica con palabras simples que:
- La plataforma puede registrar el uso, el avance, las respuestas a tests y algunas interacciones del chat.
- Esta información se utiliza para:
  - Personalizar la experiencia y sugerir contenidos relevantes.
  - Analizar patrones de malestar emocional de forma agregada.
  - Evaluar el impacto de los módulos de prevención y bienestar.
- No prometas anonimato total a menos que el sistema lo garantice explícitamente en el contexto.  
  Si la persona pregunta, invítala a revisar las políticas de privacidad de la plataforma.

# Tono y estilo
- Cercano, humano, empático y respetuoso.
- Claro y sencillo, evitando tecnicismos clínicos complejos.
- Nunca juzgas, culpas o minimizas lo que la persona siente.
- Refuerzas su valor y su capacidad de buscar ayuda: “tu vida importa”, “mereces estar mejor”.
- Puedes invitar a pequeñas pausas de respiración o ejercicios suaves cuando el tema sea muy difícil.

# Qué puedes hacer
- Escuchar (a través del texto) y validar el malestar emocional de la persona usuaria.
- Explicar de forma general qué podrían ser algunos síntomas (tristeza persistente, ansiedad, estrés).
- Dar recomendaciones de autocuidado emocional en trayectos, estaciones y en la vida cotidiana.
- Orientar sobre la importancia de buscar apoyo profesional y redes de apoyo cercanas.
- Recordar números y recursos de emergencia (por ejemplo, 123 en Colombia) sin inventar líneas nuevas.
- Guiar hacia módulos de la plataforma (Bienestar en Ruta, Herramientas de Calma, Tu Red de Apoyo, Rutas de Ayuda) que amplían la información y los ejercicios.

Sé NIA: una voz serena y cercana que informa, contiene y acompaña, ayudando a que cada persona se sienta un poco menos sola y pueda acercarse a la ayuda que necesita.`;

const SUGGESTIONS = [
  // Todas las preguntas con respuesta fija
  ...FAQ_ENTRIES.map((f) => f.question),

  // Si quieres, mantienes algunas sugerencias “extra” que ya tenías
];

export default function NiaChat() {
  const [messages, setMessages] = useState(() => {
    const stored = localStorage.getItem(LS_KEY);
    const base = stored ? JSON.parse(stored) : [];
    if (!base.find((m) => m.role === "system")) {
      base.unshift({ role: "system", content: SYSTEM_PROMPT });
    }
    return base;
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [thinking, setThinking] = useState(false);

  const listRef = useRef(null);
  const abortRef = useRef(null);
  const chatRef = useRef(null);
  const hasHistory = messages.some((m) => m.role !== "system");

  useEffect(() => {
    (async () => {
      chatRef.current = await getChatSession(messages);
    })();
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
    localStorage.setItem(LS_KEY, JSON.stringify(messages));
  }, [messages]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading]
  );

  const handleSuggestion = (text) => {
    handleSend(text);
  };

  const handleSend = async (overrideText) => {
    const raw =
      typeof overrideText === "string"
        ? overrideText
        : typeof input === "string"
        ? input
        : "";

    const text = raw.trim();
    if (!text) return;

    setInput("");
    setErrorMsg("");
    setLoading(true);
    setThinking(true);

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);

    const normalized = (s) => s.toLowerCase().trim();
    const match = FAQ_ENTRIES.find(
      (f) => normalized(f.question) === normalized(text)
    );

    if (match) {
      const answerMsg = { role: "model", content: match.answer };
      setMessages((prev) => [...prev, answerMsg]);

      setThinking(false);
      setLoading(false);
      abortRef.current = null;
      return;
    }

    const chatSession = await getChatSession(next);

    const newAssistant = { role: "model", content: "" };
    setMessages((prev) => [...prev, newAssistant]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const delta of sendMessageStream(
        chatSession,
        text,
        controller.signal
      )) {
        setMessages((prev) => {
          const cloned = [...prev];
          const lastIdx = cloned.length - 1;
          cloned[lastIdx] = {
            ...cloned[lastIdx],
            content: (cloned[lastIdx].content || "") + delta,
          };
          return cloned;
        });
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setErrorMsg("Respuesta detenida.");
      } else {
        const msg =
          err?.status === 429
            ? "Límite de cuota/sesiones alcanzado. Intenta más tarde."
            : err?.message || "Error al generar respuesta.";
        setErrorMsg(msg);
        setMessages((prev) => {
          const cloned = [...prev];
          const last = cloned[cloned.length - 1];
          if (last?.role === "model" && !last.content) {
            cloned[cloned.length - 1] = {
              role: "model",
              content: "[Hubo un error generando la respuesta]",
            };
          }
          return cloned;
        });
      }
    } finally {
      setThinking(false);
      setLoading(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const clearChat = () => {
    abortRef.current?.abort();
    const base = [{ role: "system", content: SYSTEM_PROMPT }];
    setMessages(base);
    setInput("");
    setErrorMsg("");
    chatRef.current = getChatSession(base);
    localStorage.setItem(LS_KEY, JSON.stringify(base));
  };

  return (
    <div
      className="
        relative flex min-h-[calc(100vh-80px)] flex-col 
        overflow-x-hidden
      "
    >
      {/* BG */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[#0b1220]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 mix-blend-screen opacity-70"
        style={{
          background:
            "radial-gradient(1000px 600px at 85% -10%, rgba(56,189,248,.18), transparent 60%), radial-gradient(1100px 700px at 0% 0%, rgba(129,140,248,.15), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* HEADER */}
      <header className="sticky top-0 z-20 shrink-0">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2">
            {thinking ? (
              <button
                onClick={stop}
                className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-100 hover:bg-rose-400/20"
              >
                Detener
              </button>
            ) : null}
            <button
              onClick={clearChat}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
            >
              Limpiar
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL: ocupa el resto del alto */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6 pb-3">
        {/* HERO avatar */}
        <div className="relative mx-auto -mt-1 mb-4 flex w-full items-center justify-center">
          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="relative h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 overflow-hidden rounded-full ring-1 ring-white/20 shadow-[0_0_0_8px_rgba(2,6,23,0.7)]">
              {HERO_VIDEO_SRC ? (
                <video
                  src={HERO_VIDEO_SRC}
                  poster={HERO_POSTER_IMG}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={HERO_POSTER_IMG}
                  alt="NIA"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>
        </div>

        {/* CHAT CARD – flex-1 dentro del viewport */}
        <div className="flex-1 min-h-0">
          <div className="h-full rounded-3xl border border-white/10 bg-white/[0.03] p-0.5 flex flex-col">
            <div className="flex-1 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent p-4 sm:p-6 flex flex-col">
              {/* Sugerencias cuando no hay historial */}
              {messages.filter((m) => m.role !== "system").length === 0 && (
                <div className="mx-auto mt-1 w-full max-w-3xl">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-3 text-sm font-medium text-white/80">
                      Prueba con:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTIONS.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestion(s)}
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mensajes: ocupa el espacio disponible y scrollea dentro */}
              <main
                ref={listRef}
                className="mt-4 flex-1 min-h-0 space-y-4 overflow-y-auto pr-1"
              >
                {messages
                  .filter((m) => m.role !== "system")
                  .map((m, i) => (
                    <MessageBubble key={i} role={m.role} content={m.content} />
                  ))}

                {thinking ? <TypingIndicator /> : null}

                {errorMsg ? (
                  <div className="mx-auto w-fit rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                    {errorMsg}
                  </div>
                ) : null}
              </main>

              {/* Composer – siempre visible abajo */}
              <div className="mt-4 shrink-0">
                <div className="mx-auto w-full max-w-3xl">
                  <div className="flex items-end gap-2 rounded-2xl border border-white/15 bg-white/[0.06] p-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          canSend && handleSend();
                        }
                      }}
                      rows={1}
                      placeholder="Escribe tu mensaje…"
                      className="min-h-[44px] max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-white placeholder-white/40 outline-none"
                    />

                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={!canSend}
                        onClick={() => handleSend()}
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-400 disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <SpinnerDot />
                            Enviando…
                          </>
                        ) : (
                          <>
                            <SendIcon />
                            Enviar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* fin composer */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- UI SUBCOMPONENTES -------------------- */

function MessageBubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "flex max-w-[92%] sm:max-w-[80%] items-start gap-3",
          isUser ? "flex-row-reverse" : "flex-row",
        ].join(" ")}
      >
        <Avatar isUser={isUser} />
        <div
          className={[
            "rounded-2xl border px-4 py-3 text-[15px] leading-relaxed shadow-sm",
            isUser
              ? "bg-[linear-gradient(180deg,rgba(14,165,233,0.28),rgba(14,165,233,0.20))] border-sky-400/30 text-sky-50"
              : "bg-white/[0.06] border-white/10 text-white/90",
          ].join(" ")}
        >
          <RichText text={content} />
        </div>
      </div>
    </div>
  );
}

function Avatar({ isUser }) {
  return isUser ? (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-500 text-white text-sm font-semibold">
      Tú
    </div>
  ) : (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-500/80 text-white text-sm font-semibold">
      N
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="ml-11 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white/80">
        <span className="inline-flex items-center gap-2">
          NIA está escribiendo
          <Dots />
        </span>
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span className="inline-flex">
      <span className="mx-0.5 h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:0ms]" />
      <span className="mx-0.5 h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:120ms]" />
      <span className="mx-0.5 h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:240ms]" />
    </span>
  );
}

function RichText({ text }) {
  if (!text) return null;

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="mb-2 text-base font-semibold" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="mb-2 text-sm font-semibold" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="mb-1 text-sm font-semibold" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-2 last:mb-0 whitespace-pre-wrap" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5" {...props} />
          ),
          li: ({ node, ...props }) => <li {...props} />,
          strong: ({ node, ...props }) => (
            <strong className="font-semibold" {...props} />
          ),
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          code: ({ node, inline, ...props }) =>
            inline ? (
              <code
                className="rounded bg-black/40 px-1.5 py-0.5 text-[0.9em]"
                {...props}
              />
            ) : (
              <code
                className="block max-w-full overflow-x-auto rounded bg-black/40 px-3 py-2 text-[0.9em]"
                {...props}
              />
            ),
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="text-sky-300 underline decoration-sky-300/50 underline-offset-2 hover:text-sky-200"
            />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="text-white">
      <path d="M3 11l17-8-8 17-1-7-8-2z" fill="currentColor" />
    </svg>
  );
}

function SpinnerDot() {
  return (
    <span className="relative inline-block h-3 w-3">
      <span className="absolute inset-0 animate-ping rounded-full bg-white/80 opacity-75"></span>
      <span className="relative inline-block h-3 w-3 rounded-full bg-white"></span>
    </span>
  );
}
