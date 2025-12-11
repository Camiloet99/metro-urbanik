import { useEffect, useMemo, useRef } from "react";
import { ArcwareInit } from "@arcware-cloud/pixelstreaming-websdk";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation, useRevalidator } from "react-router-dom";
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

  const shareId = "share-92440f1f-492e-46f0-8367-9f37731e2e00";
  const containerRef = useRef(null);

  const appRef = useRef(null);
  const streamRef = useRef(null);
  const initedRef = useRef(false);

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
        app.emitUIInteraction({ id_avatar: avatarId });
      }, 1000);
      setTimeout(() => {
        app.emitUIInteraction({ id_estudiante: studentId });
      }, 10000);
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

          if (!emittedOnStreamRef.current) {
            emittedOnStreamRef.current = true;
            emitPair("stream-on");
          }

          if (!emittedAfter1sRef.current) {
            emittedAfter1sRef.current = true;
            after1sTimerRef.current = setTimeout(() => {
              emitPair("after-1s");
            }, 500);
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

        if (!emittedOnStreamRef.current) {
          emittedOnStreamRef.current = true;
          emitPair("stream-on(re)");
        }
        if (!emittedAfter1sRef.current) {
          emittedAfter1sRef.current = true;
          after1sTimerRef.current = setTimeout(() => {
            emitPair("after-1s(re)");
          }, 1000);
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
    <section className="w-full overflow-x-hidden">
      <div className="mx-auto max-w-[1600px]">
        <div className="relative w-full h-[90vh] bg-black rounded-2xl shadow-2xl overflow-hidden">
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-50 p-3 sm:p-4">
            <div className="flex">
              <button
                type="button"
                aria-label="Volver al inicio"
                onClick={hardRedirectHome}
                className={[
                  "pointer-events-auto inline-flex items-center gap-2",
                  "rounded-full px-4 py-2 sm:px-5 sm:py-2.5 font-medium",
                  "bg-[#0B0B11]/65 backdrop-blur-md ring-1 ring-white/15",
                  "text-white hover:bg-[#0B0B11]/80 transition",
                  "shadow-[0_10px_24px_rgba(0,0,0,.35)]",
                ].join(" ")}
              >
                <MdHome className="text-lg sm:text-xl opacity-90" />
                <span className="text-sm sm:text-base">Volver al inicio</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
