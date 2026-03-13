// src/components/admin/SummaryTableCard.jsx
import { useMemo, useState } from "react";
import Spinner from "@/components/ui/Spinner";


const GENERO_MAP = {
  male:              "Masculino",
  female:            "Femenino",
  "non-binary":      "No binario/a",
  "prefer-not-say":  "Prefiero no decirlo",
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

const AGE_MAP = {
  "16-25": "16 – 25",
  "16-24": "16 – 24",
  "25-34": "25 – 34",
  "35-59": "35 – 59",
  "60+":   "60+",
};

// Capitalize first letter of each word (for raw municipality slugs like "rionegro" → "Rionegro")
const toLabel = (slug) =>
  slug
    ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

function RiskPill({ profile }) {
  if (!profile) return <span className="text-white/30 text-[11px]">–</span>;
  const cfg = {
    BAJO:  { text: "text-emerald-300", iconCls: "text-emerald-400" },
    MEDIO: { text: "text-amber-300",   iconCls: "text-amber-400"   },
    ALTO:  { text: "text-red-300",     iconCls: "text-red-400"     },
  }[profile] ?? { text: "text-white/50", iconCls: "text-white/40" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${cfg.text}`}>
      <svg viewBox="0 0 20 20" className={`h-3.5 w-3.5 flex-shrink-0 ${cfg.iconCls}`} aria-hidden="true" fill="currentColor">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
      {profile.charAt(0) + profile.slice(1).toLowerCase()}
    </span>
  );
}

/** 6 coloured dots showing per-module completion */
function ModuleDots({ modulosDone }) {
  const dots = Array.isArray(modulosDone) ? modulosDone : Array(6).fill(false);
  // Pad to 6 just in case
  while (dots.length < 6) dots.push(false);
  return (
    <div className="flex items-center gap-[5px]">
      {dots.slice(0, 6).map((done, i) => (
        <span
          key={i}
          title={`Módulo ${i + 1}: ${done ? "Completado" : "Pendiente"}`}
          className={[
            "h-[10px] w-[10px] rounded-full flex-shrink-0 transition-colors",
            done
              ? "bg-[#29C6F8] shadow-[0_0_6px_rgba(41,198,248,0.65)]"
              : "bg-white/15",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function getProgressFromStatus(rawStatus) {
  // Caso nuevo: número directo (0-100)
  if (typeof rawStatus === "number" && !Number.isNaN(rawStatus)) {
    return Math.min(Math.max(rawStatus, 0), 100);
  }

  // Caso string numérica: "80"
  if (typeof rawStatus === "string") {
    const parsed = parseInt(rawStatus, 10);
    if (!Number.isNaN(parsed)) {
      return Math.min(Math.max(parsed, 0), 100);
    }
  }

  // Compatibilidad hacia atrás: antes enviábamos "complete" / "progress"
  if (rawStatus === "complete") return 100;
  if (rawStatus === "progress") return 60;

  // Por defecto, nada hecho
  return 0;
}

/** Header con icono de orden y estado activo */
function SortableHeader({ label, field, sortConfig, onSort }) {
  const isActive = sortConfig.field === field;
  const isAsc = sortConfig.direction === "asc";

  return (
    <th className="py-2 px-4 text-left font-medium">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 text-[11px] md:text-xs text-white/60 hover:text-white/90 transition-colors"
      >
        <span>{label}</span>
        <span className="inline-flex flex-col leading-none">
          {/* flecha arriba */}
          <svg
            className={`h-2.5 w-2.5 ${
              isActive && isAsc ? "opacity-100" : "opacity-40"
            }`}
            viewBox="0 0 12 12"
            aria-hidden="true"
          >
            <path d="M6 3L3.5 6h5L6 3z" fill="currentColor" />
          </svg>
          {/* flecha abajo */}
          <svg
            className={`h-2.5 w-2.5 -mt-[2px] ${
              isActive && !isAsc ? "opacity-100" : "opacity-40"
            }`}
            viewBox="0 0 12 12"
            aria-hidden="true"
          >
            <path d="M6 9l2.5-3h-5L6 9z" fill="currentColor" />
          </svg>
        </span>
      </button>
    </th>
  );
}

export default function SummaryTableCard({
  users,
  loading,
  error,
  page = 0,
  size = 20,
  total = 0,
  onPageChange,
}) {
  const [sortConfig, setSortConfig] = useState({
    field: "name",
    direction: "asc",
  });

  const handleSort = (field) => {
    setSortConfig((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "asc" }
    );
  };

  const sortedUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];

    const dir = sortConfig.direction === "asc" ? 1 : -1;

    const getValue = (u) => {
      switch (sortConfig.field) {
        case "name":         return u.fullName || u.name || "";
        case "document":     return u.dni || "";
        case "motivo":       return u.motivoConsulta || "";
        case "municipality": return u.municipality || "";
        case "phone":      return u.phone || "";
        case "genero":     return u.genero || "";
        case "edad":       return u.ageRange || u.edad || "";
        case "enfoque":    return u.differentialFocus || u.enfoqueDiferencial || "";
        case "riesgo":     return u.riskProfile || "";
        case "avance":     return getProgressFromStatus(u.experienceStatus);
        default:           return "";
      }
    };

    const clone = [...users];
    clone.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);

      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });

    return clone;
  }, [users, sortConfig]);

  const totalPages = Math.max(Math.ceil(total / size), 1);
  const canGoPrev = page > 0;
  const canGoNext = page + 1 < totalPages;

  const handlePrev = () => {
    if (!onPageChange || !canGoPrev) return;
    onPageChange(page - 1);
  };

  const handleNext = () => {
    if (!onPageChange || !canGoNext) return;
    onPageChange(page + 1);
  };

  return (
    <section className="rounded-[32px] bg-[#2a2e40] border border-black/20 px-5 py-4 md:px-6 md:py-5 shadow-[0_16px_36px_rgba(0,0,0,0.45)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold">Tabla resumen</h3>
        <span className="text-[11px] md:text-xs text-white/60">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#29C6F8]" />
            Módulo completo
          </span>
          {" · "}
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-white/15" />
            Pendiente
          </span>
        </span>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-white/70">
          No hay usuarios registrados aún.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <SortableHeader label="Participante"         field="name"         sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Documento"            field="document"     sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Motivo de consulta"   field="motivo"       sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Municipio"            field="municipality" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Teléfono"            field="phone"      sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Género"              field="genero"     sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Rango de edad"       field="edad"       sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Enfoque diferencial" field="enfoque"    sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Perfil de riesgo"    field="riesgo"     sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="% de avance"         field="avance"     sortConfig={sortConfig} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => (
                    <tr
                      key={u.id ?? u.email}
                      className="border-b border-white/5 last:border-b-0 hover:bg-white/5"
                    >
                      {/* Estudiante */}
                      <td className="py-2 pr-4 align-middle">
                        <div className="flex flex-col">
                          <span className="text-xs md:text-sm text-white/75">
                            {u.fullName || u.name || "-"}
                          </span>
                          <span className="text-[11px] text-white/50">{u.email}</span>
                        </div>
                      </td>

                      {/* Documento */}
                      <td className="py-2 px-4 align-middle text-[11px] md:text-xs whitespace-nowrap">
                        <span className="text-white/40 mr-1 uppercase">{u.documentType || "CC"}</span>
                        {u.dni || "-"}
                      </td>

                      {/* Motivo de consulta */}
                      <td className="py-2 px-4 align-middle text-[11px] md:text-xs">
                        {u.motivoConsulta || "-"}
                      </td>

                      {/* Municipio */}
                      <td className="py-2 px-4 align-middle text-[11px] md:text-xs">
                        {toLabel(u.municipality) || "-"}
                      </td>

                      {/* Teléfono */}
                      <td className="py-2 px-4 align-middle text-[11px] md:text-xs whitespace-nowrap">
                        {u.phone || "-"}
                      </td>

                      {/* Género */}
                      <td className="py-2 px-4 align-middle text-[11px] md:text-xs">
                        {GENERO_MAP[u.genero] || toLabel(u.genero) || "-"}
                      </td>

                      {/* Rango de edad */}
                      <td className="py-2 px-4 align-middle text-[11px] md:text-xs whitespace-nowrap">
                        {AGE_MAP[u.ageRange ?? u.edad] || u.ageRange || u.edad || "-"}
                      </td>

                      {/* Enfoque diferencial */}
                      <td className="py-2 px-4 align-middle text-[11px] md:text-xs max-w-[160px]">
                        <span className="line-clamp-2">
                          {FOCUS_MAP[u.differentialFocus ?? u.enfoqueDiferencial] ||
                            u.differentialFocus || u.enfoqueDiferencial || "-"}
                        </span>
                      </td>

                      {/* Perfil de riesgo */}
                      <td className="py-2 px-4 align-middle">
                        <RiskPill profile={u.riskProfile} />
                      </td>

                      {/* % de avance */}
                      <td className="py-2 px-4 align-middle">
                        <ModuleDots modulosDone={u.modulosDone} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Paginador */}
          <div className="mt-4 flex items-center justify-between text-[11px] md:text-xs text-white/70">
            <span>
              Página {page + 1} de {totalPages} · {users.length} registros en
              esta página · {total} total
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!canGoPrev}
                className={[
                  "px-3 py-1 rounded-full border border-white/20",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  "hover:bg-white/10 transition-colors",
                ].join(" ")}
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                className={[
                  "px-3 py-1 rounded-full border border-white/20",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  "hover:bg-white/10 transition-colors",
                ].join(" ")}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
