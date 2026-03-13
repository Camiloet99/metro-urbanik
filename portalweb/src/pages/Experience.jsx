import { useEffect, useMemo, useRef, useState } from "react";
import { ArcwareInit } from "@arcware-cloud/pixelstreaming-websdk";
import { useAuth } from "@/context/AuthContext";
import { MdHome } from "react-icons/md";

export default function Experience() {
  const { session, loadingAuth } = useAuth();
  const user = session?.user;

  const studentId = useMemo(
    () => (user?.dni ? String(user.dni) : null),
    [user?.dni]
  );
  const avatarId = useMemo(
    () =>
      typeof user?.avatarId === "number" ? String(user.avatarId + 1) : null,
    [user?.avatarId]
  );

  const shareId = "share-658d10c5-cdbd-4a26-9477-e60f9768a2f2";
  const containerRef = useRef(null);

  const appRef = useRef(null);
  const streamRef = useRef(null);
  const initedRef = useRef(false);

  const [streaming, setStreaming] = useState(false);

  const emittedOnStreamRef = useRef(false);
  const emittedAfter1sRef = useRef(false);
  const emittedOnVideoRef = useRef(false);

  const videoElRef = useRef(null);
  const videoObserverRef = useRef(null);
  const after1sTimerRef = useRef(null);

  const hardRedirectHome = () => {
    try {
      streamRef.current?.onStreamingStateChange?.(() => {});
      streamRef.current?.disconnect?.();
      streamRef.current?.stop?.();
      appRef.current?.destroy?.();
    } catch (_) {}
    try {
      if (containerRef.current) containerRef.current.innerHTML = "";
    } catch (_) {}
    window.location.replace("/");
  };

  const emitPair = (tag) => {
    try {
      console.log("enviado", studentId);
      const app = appRef.current;
      if (!app?.emitUIInteraction || !studentId || !avatarId) return;
      setTimeout(() => {
        app.emitUIInteraction({ id_estudiante: studentId });
        app.emitUIInteraction({ id_estudiante: studentId });
        app.emitUIInteraction({ id_avatar: avatarId });
      }, 1000);
    } catch (e) {
      console.error("[Arcware] emit error:", e);
    }
  };

  const attachVideoListenersOnce = () => {
    const root = appRef.current?.rootElement;
    if (!root) return;

    const tryBind = (video) => {
      if (!video || emittedOnVideoRef.current) return;
      videoElRef.current = video;

      const onPlayable = () => {
        if (!emittedOnVideoRef.current) {
          emittedOnVideoRef.current = true;
          emitPair("video-playing");
        }
      };

      video.addEventListener("playing", onPlayable, { once: true });
      video.addEventListener("canplay", onPlayable, { once: true });

      if (
        (video.readyState ?? 0) >= 3 || // HAVE_FUTURE_DATA
        (!video.paused && !video.ended)
      ) {
        onPlayable();
      }
    };

    const existing = root.querySelector("video");
    if (existing) {
      tryBind(existing);
      return;
    }

    const mo = new MutationObserver(() => {
      const v = root.querySelector("video");
      if (v) {
        tryBind(v);
        if (videoObserverRef.current) {
          videoObserverRef.current.disconnect();
          videoObserverRef.current = null;
        }
      }
    });
    mo.observe(root, { childList: true, subtree: true });
    videoObserverRef.current = mo;
  };

  useEffect(() => {
    if (loadingAuth || !studentId || !avatarId) return;

    if (!initedRef.current) {
      try {
        const { Application, PixelStreaming } = ArcwareInit(
          { shareId },
          {
            initialSettings: {
              StartVideoMuted: false,
              AutoConnect: true,
              AutoPlayVideo: true,
            },
            settings: {
              infoButton: false,
              micButton: false,
              audioButton: true,
              fullscreenButton: true,
              settingsButton: false,
              connectionStrengthIcon: true,
            },
          }
        );

        if (containerRef.current && Application?.rootElement) {
          containerRef.current.innerHTML = "";
          containerRef.current.appendChild(Application.rootElement);
        }

        appRef.current = Application;
        streamRef.current = PixelStreaming;
        initedRef.current = true;

        PixelStreaming.onStreamingStateChange((isOn) => {
          if (!isOn) return;
          setStreaming(true);

          if (!emittedOnStreamRef.current) {
            emittedOnStreamRef.current = true;
            emitPair("stream-on");
          }

          if (!emittedOnVideoRef.current) {
            attachVideoListenersOnce();
          }
        });

        Application.getApplicationResponse?.((resp) =>
          console.log("[UE ApplicationResponse]", resp)
        );
      } catch (e) {
        console.error("[Arcware] init error:", e);
      }
      return;
    }

    if (streamRef.current) {
      streamRef.current.onStreamingStateChange((isOn) => {
        if (!isOn) return;
        setStreaming(true);

        if (!emittedOnStreamRef.current) {
          emittedOnStreamRef.current = true;
          emitPair("stream-on(re)");
        }

        if (!emittedOnVideoRef.current) {
          attachVideoListenersOnce();
        }
      });
    }
  }, [loadingAuth, studentId, avatarId, shareId]);

  useEffect(() => {
    emittedOnStreamRef.current = false;
    emittedAfter1sRef.current = false;
    emittedOnVideoRef.current = false;
  }, [studentId, avatarId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" || e.key.toLowerCase() === "h") {
        hardRedirectHome();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    return () => {
      if (after1sTimerRef.current) clearTimeout(after1sTimerRef.current);
      if (videoObserverRef.current) {
        videoObserverRef.current.disconnect();
        videoObserverRef.current = null;
      }
      const v = videoElRef.current;
      if (v) {
        try {
          v.removeEventListener("playing", () => {});
          v.removeEventListener("canplay", () => {});
        } catch {}
      }
    };
  }, []);

  return (
    <section className="mt-4 sm:mt-6 flex flex-col gap-3 pb-4">

      {/* Barra superior */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          <span className="text-base font-semibold text-white/90">Experiencia inmersiva</span>
          <span className="text-xs text-white/40">Entorno 3D interactivo · Metro de Medellín</span>
        </div>

        <button
          type="button"
          aria-label="Volver al inicio"
          onClick={hardRedirectHome}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm text-white/70 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 hover:text-white transition"
        >
          <MdHome className="text-base" />
          Inicio
        </button>
      </div>

      {/* Contenedor del stream */}
      <div
        className="relative w-full rounded-2xl overflow-hidden ring-1 ring-white/10 bg-[#0c0f18]"
        style={{ height: "calc(100vh - 200px)", minHeight: 420 }}
      >
        {/* Player Arcware */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* Overlay de carga */}
        {!streaming && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-[#0c0f18]">
            <svg
              className="h-10 w-10 animate-spin text-white/20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="40 20" strokeLinecap="round" />
            </svg>
            <span className="text-sm text-white/30 tracking-wide">Conectando…</span>
          </div>
        )}

        {/* Indicador en vivo */}
        {streaming && (
          <div className="pointer-events-none absolute top-3 right-3 z-50 flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-black/50 backdrop-blur-sm ring-1 ring-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-white/50">En vivo</span>
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-white/20">
        Presiona <kbd className="font-mono bg-white/5 rounded px-1 text-white/30">Esc</kbd> para salir
      </p>

    </section>
  );
}
