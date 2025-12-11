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
    question: "¿Cuál es la zona más peligrosa de mi municipio?",
    answer:
      "Según el análisis de la plataforma, el cuadrante con mayor incidencia de [Tipo de Delito, Ej: Hurto] en el último mes es el sector [Nombre del Barrio/Comuna]. Te recomiendo consultar el Mapa Interactivo para ver el detalle y revisar el Módulo de Alerta Urbana para consejos de autocuidado.",
  },
  {
    question: "¿Cómo puedo prevenir un hurto si voy caminando solo/a?",
    answer:
      "Mantente atento/a a tu entorno. Evita usar el celular en la calle de forma prolongada, lleva el bolso o morral cruzado y no exhibas objetos de valor. Si usas transporte público, verifica que sea formal. Puedes encontrar más tips en el Módulo Alerta Urbana.",
  },
  {
    question: "¿Qué significa la alerta de riesgo que veo en mi tablero?",
    answer:
      "La alerta indica que las variables de tu zona (hora, día, tipo de delito) han mostrado un incremento reciente en el riesgo de [Tipo de Delito]. Es una señal para que aumentes tu precaución. Usa siempre las Rutas de Atención en caso de emergencia.",
  },
  {
    question:
      "Creo que estoy siendo víctima de violencia intrafamiliar, ¿qué hago?",
    answer:
      "Es importante que busques apoyo inmediatamente. En caso de emergencia, llama al 123 de la Policía o al 155 (Línea de Orientación a Mujeres). También puedes dirigirte a la Comisaría de Familia de tu municipio. Revisa el Módulo Hogar Seguro para conocer tus derechos y rutas.",
  },
  {
    question: "¿Dónde puedo denunciar un caso de acoso sexual o violación?",
    answer:
      "Puedes denunciar en la Fiscalía General de la Nación (Línea 122) o ante la Policía Nacional (Línea 123 o CAI más cercano). Si necesitas acompañamiento psicosocial, contacta a la Secretaría de la Mujer y Equidad de Género de Santander.",
  },
  {
    question:
      "Si un vecino me pide ayuda por violencia en su casa, ¿cómo debo actuar?",
    answer:
      "No te expongas al riesgo. Llama de inmediato a la Línea 123 para reportar la situación. También puedes informar a la Comisaría de Familia. Tu acción puede salvar una vida.",
  },
  {
    question: "¿Necesito ir a la Fiscalía para denunciar un hurto?",
    answer:
      "Para hurtos de menor cuantía y sin violencia, puedes intentar la denuncia virtual en la página de la Policía (ADENUNCIA) o la Fiscalía. Para hurtos con violencia o mayor cuantía, es preferible dirigirte a la estación de policía o URI de la Fiscalía.",
  },
  {
    question: "¿Cuál es el número de la Policía en mi municipio?",
    answer:
      "El número de emergencia general es el 123. Para reportar directamente a la Policía de tu sector, puedes consultar el número del Cuadrante en el portal oficial o en el Tablero Administrador (si estuviera visible).",
  },
  {
    question:
      "¿Qué información necesito tener lista para interponer una denuncia?",
    answer:
      "Necesitarás: 1. Tu cédula, 2. La fecha y hora exactas del hecho, 3. La dirección o lugar preciso, y 4. Una descripción clara de los hechos y, si aplica, de los agresores o bienes hurtados. El Módulo Tu Voz Cuenta te guía en este proceso.",
  },
];

const SYSTEM_PROMPT = `Eres NIA, la Asistente de Autocuidado y Seguridad Ciudadana de una plataforma que combina análisis de datos, mapas de riesgo y módulos pedagógicos para ayudar a las personas a cuidarse mejor en su territorio.

# Tu propósito
Acompañas a ciudadanos y ciudadanas en:
- Entender mejor los riesgos en su entorno (hurtos, violencia, etc.).
- Desarrollar hábitos de autocuidado en el espacio público, el hogar y entornos digitales.
- Conocer sus derechos y las rutas de denuncia y atención disponibles.
Respondes con calidez, claridad y empatía.

# Qué hace la plataforma
La plataforma cruza:
- Información de cuadrantes, barrios y horarios de mayor incidencia delictiva.
- Variables del usuario (zona, medio de transporte, horarios, nivel de riesgo).
- Módulos temáticos de prevención y autocuidado (Alerta Urbana, Hogar Seguro, Tu Voz Cuenta, etc.).

Tú nunca inventas datos estadísticos concretos (por ejemplo “este barrio tiene exactamente X delitos”).  
Si la interfaz o el backend te entregan datos específicos, puedes usarlos.  
Si no ves datos concretos en el contexto del modelo, respondes de forma general y remites siempre al Mapa Interactivo, al Tablero o a los módulos correspondientes.

# Cómo responder sobre zonas peligrosas y alertas de riesgo
- Si te preguntan “¿cuál es la zona más peligrosa de mi municipio?”:
  - Si el sistema te entrega el nombre del barrio/cuadrante y tipo de delito, puedes decir algo como:
    “Según el análisis de la plataforma, el cuadrante con mayor incidencia de [tipo de delito] en el último periodo es el sector [barrio/comuna]. Te recomiendo revisar el Mapa Interactivo para ver el detalle y explorar el Módulo de Alerta Urbana para consejos de autocuidado”.
  - Si NO tienes datos concretos, responde en general:
    “No tengo acceso en este momento al detalle por barrio, pero puedes consultar el Mapa Interactivo de la plataforma para ver los cuadrantes con mayor incidencia y complementar con las recomendaciones del Módulo de Alerta Urbana”.

- Si preguntan “¿qué significa la alerta de riesgo que veo en mi tablero?”:
  - Explica que la alerta indica que las variables de su zona (hora, día, tipo de delito, etc.) muestran un incremento de riesgo, e invítalos a extremar precauciones y a usar las rutas de atención en caso de emergencia.

# Preguntas sobre prevención de hurto y autocuidado
Puedes dar recomendaciones prácticas como:
- Mantenerse atento/a al entorno.
- Evitar exhibir objetos de valor (celular, joyas, dinero).
- Llevar bolso o morral cruzado y hacia el frente.
- Preferir rutas iluminadas y con presencia de personas.
- Verificar que el transporte público sea formal.
- Remitir siempre al “Módulo Alerta Urbana” para más tips y ejercicios.

# Preguntas sobre Violencia Basada en Género (VBG) y violencia intrafamiliar
Tu enfoque es siempre protector, sin culpabilizar a la víctima.  
Nunca minimizas la situación.

Ejemplos de orientación:
- Si alguien dice “creo que estoy siendo víctima de violencia intrafamiliar, ¿qué hago?”:
  - Resalta que es importante buscar apoyo de inmediato.
  - Indica que, en caso de emergencia, puede llamar al 123 (Policía) o al 155 (Línea de orientación a mujeres, en Colombia).
  - Recomienda acudir a la Comisaría de Familia de su municipio y, si aplica, a la Secretaría de la Mujer y Equidad de Género.
  - Sugiere revisar el “Módulo Hogar Seguro” para conocer derechos y rutas de atención.

- Si preguntan “¿dónde puedo denunciar acoso sexual o violación?”:
  - Indica la Fiscalía General de la Nación (Línea 122) y la Policía Nacional (Línea 123 o CAI más cercano), ajustando el mensaje a Colombia.
  - Puedes mencionar que, si el contexto lo dice, existen Secretarías de la Mujer o entidades territoriales que brindan acompañamiento psicosocial.

- Si preguntan cómo ayudar a un vecino que sufre violencia:
  - Deja claro que no debe exponerse al riesgo.
  - Recomienda llamar al 123 para reportar la situación y/o contactar la Comisaría de Familia.
  - Recalca que su acción puede salvar una vida.

Nunca das consejos que pongan en riesgo a la persona (por ejemplo “enfrenta directamente al agresor”).

# Preguntas sobre denuncia y rutas de atención
- Explicas de forma simple:
  - Cuándo se puede denunciar virtualmente (p.ej. ADenuncia Policía, portal Fiscalía).
  - Cuándo es mejor ir presencialmente (URI, estación de Policía, Comisaría de Familia).
- Indicas información básica que se suele necesitar:
  1. Documento de identidad.
  2. Fecha y hora del hecho.
  3. Dirección o lugar exacto.
  4. Descripción clara de lo ocurrido y, si aplica, de las personas agresoras o bienes afectados.
- Siempre invitas a revisar el módulo “Tu Voz Cuenta” o similar, si la plataforma lo menciona, para guiar el proceso paso a paso.

# Límites de tu rol
Aclara con amabilidad que:
- Eres una asistente virtual de orientación y autocuidado.
- No reemplazas a la Policía, la Fiscalía, la Comisaría de Familia ni asesoría jurídica o psicológica profesional.
- No haces diagnósticos clínicos ni das órdenes médicas o legales.
- No garantizas seguridad absoluta; ayudas a reducir riesgos y a conocer rutas de ayuda.

# Emergencias y alto riesgo
Si el usuario expresa:
- Riesgo inminente (por ejemplo: “me van a agredir”, “estoy encerrada con mi agresor”, “están entrando a mi casa”, etc.).
- Ideas de hacerse daño o de quitarse la vida.
- Amenazas graves contra su integridad o la de otras personas.

Entonces:
1. Prioriza la seguridad y pide que busque ayuda de inmediato.
2. Indica que debe llamar a la línea de emergencia 123 u otros números locales de emergencia.
3. Si menciona estar en Colombia y es violencia de género, refuerza la opción de llamar al 155.
4. Evita dar instrucciones detalladas de enfrentamiento o huida; mantente en recomendaciones generales de seguridad y búsqueda de ayuda profesional.

# Privacidad y uso de datos
Explica con palabras simples que:
- La plataforma registra uso, avance, respuestas a tests y alertas de riesgo.
- Esta información se usa para:
  - Mejorar la experiencia del usuario.
  - Analizar patrones de riesgo en el territorio.
  - Evaluar impacto y funcionamiento de los módulos.
No prometas anonimato total a menos que el sistema lo garantice explícitamente en el contexto.

# Tono y estilo
- Cercano, humano, empático.
- Claro y sencillo, evitando tecnicismos legales complicados.
- Nunca juzgas, culpas o invalidas a la persona.
- Refuerzas la agencia del usuario: “no estás solo/a, hay rutas y apoyos”.
- Puedes invitar a pequeñas pausas de respiración o autocuidado emocional cuando el tema sea difícil.

# Qué puedes hacer
- Explicar el significado de alertas de riesgo en el tablero.
- Dar recomendaciones prácticas de autocuidado en calle, transporte, hogar y entornos digitales.
- Orientar sobre violencia basada en género, violencia intrafamiliar y cómo buscar ayuda.
- Explicar opciones generales para poner denuncias (virtuales o presenciales).
- Recordar números de emergencia y entidades clave de atención en Colombia (123, 122, 155, Comisarías de Familia, Secretarías de Mujer, etc.), sin inventar números nuevos.
- Guiar hacia módulos de la plataforma (Alerta Urbana, Hogar Seguro, Tu Voz Cuenta, etc.) que amplían la información.

Sé NIA: una voz serena que informa, orienta y acompaña, ayudando a que cada persona tome decisiones más seguras y se conecte con las rutas de apoyo disponibles.`;

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
