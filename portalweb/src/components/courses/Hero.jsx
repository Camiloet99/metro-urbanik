import PropTypes from "prop-types";
import bgDefault from "@/assets/courses/hero.jpg";
import { MdArrowForward, MdMap } from "react-icons/md";

export default function Hero({
  title = "Test de inicio",
  subtitle = "Conoce a ti mismo",
  ctaLabel = "Empezar",
  onCtaClick = () => {},
  bgImage = bgDefault,
  badge,
  className = "",
  reminder = null,
  mapCtaLabel,
  onMapClick = () => {},
}) {
  return (
    <section
      className={[
        "relative w-full max-w-full overflow-hidden rounded-[28px] ring-1 ring-white/10",
        "shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]",
        "transition-shadow duration-200 hover:shadow-[0_22px_55px_-20px_rgba(0,0,0,0.6)]",
        className,
      ].join(" ")}
      aria-label={title}
    >
      <img
        src={bgImage}
        alt=""
        aria-hidden
        className="
          w-full select-none object-cover
          h-[200px] sm:h-[220px] md:h-[280px] lg:h-[320px]
        "
        draggable={false}
      />

      {/* overlay sutil */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/0" />

      {/* contenedor de texto anclado abajo */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full space-y-2 px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-7">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold leading-tight drop-shadow">
            {title}
          </h2>
          <p className="text-sm sm:text-base text-white/85 drop-shadow-sm">
            {subtitle}
          </p>

          {/* Reminder primera vez */}
          {reminder && (
            <div
              className="
                mt-2 inline-flex max-w-[90%] flex-wrap items-center gap-3
                rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur
                px-3 py-2 sm:px-3.5 sm:py-2
                shadow-[0_8px_20px_-10px_rgba(0,0,0,0.55)]
              "
              role="note"
              aria-live="polite"
            >
              <span className="text-xs sm:text-sm text-white/90">
                {reminder.text}
              </span>
              <button
                onClick={reminder.onAction}
                className="
                  inline-flex items-center rounded-full bg-white/20
                  hover:bg-white/25 active:bg-white/30
                  transition px-3 py-1.5 text-xs font-medium
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60
                "
              >
                {reminder.actionLabel}
              </button>
            </div>
          )}

          {/* Botones CTA */}
          <div className="mt-3 flex w-full flex-wrap gap-2 sm:gap-3">
            {/* Botón de mapa – va primero */}
            {mapCtaLabel && (
              <button
                onClick={onMapClick}
                className="
                  inline-flex w-full sm:w-auto items-center justify-center gap-2
                  rounded-full bg-white/15
                  px-4 sm:px-5 py-2.5 text-sm font-medium
                  transition-transform duration-150
                  hover:bg-white/20 active:scale-[0.98]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60
                  shadow-[0_6px_18px_-10px_rgba(0,0,0,0.8)]
                  cursor-pointer
                "
                aria-label={mapCtaLabel}
                title={mapCtaLabel}
              >
                <MdMap className="text-base" />
                {mapCtaLabel}
              </button>
            )}

            {/* Botón experiencia / test */}
            <button
              onClick={onCtaClick}
              className="
                inline-flex w-full sm:w-auto items-center justify-center gap-2
                rounded-full bg-[#6C4CFF]
                px-4 sm:px-5 py-2.5 text-sm font-medium
                transition-transform duration-150
                hover:bg-[#5944F9] active:scale-[0.98]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60
                shadow-[0_6px_18px_-8px_rgba(108,76,255,0.9)]
                hover:shadow-[0_8px_22px_-8px_rgba(108,76,255,1)]
                cursor-pointer
              "
              aria-label={ctaLabel}
              title={ctaLabel}
            >
              {ctaLabel} <MdArrowForward className="text-base" />
            </button>
          </div>
        </div>
      </div>

      {badge && (
        <span
          className="
            absolute right-3 sm:right-4 top-3 sm:top-4
            rounded-full bg-white/12 px-3 py-1 text-[10px] sm:text-xs
            ring-1 ring-white/15 backdrop-blur-[1px]
            shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)]
          "
        >
          {badge}
        </span>
      )}
    </section>
  );
}

Hero.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  ctaLabel: PropTypes.string,
  onCtaClick: PropTypes.func,
  bgImage: PropTypes.string,
  badge: PropTypes.string,
  className: PropTypes.string,
  reminder: PropTypes.shape({
    text: PropTypes.string.isRequired,
    actionLabel: PropTypes.string.isRequired,
    onAction: PropTypes.func.isRequired,
  }),
  mapCtaLabel: PropTypes.string,
  onMapClick: PropTypes.func,
};
