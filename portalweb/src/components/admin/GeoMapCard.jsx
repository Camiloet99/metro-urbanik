// src/components/admin/GeoMapCard.jsx
import { useMemo, useState } from "react";
import mapaImg from "@/assets/admin/mapa.png";

import tag1 from "@/assets/admin/tags/tag1.png";
import tag2 from "@/assets/admin/tags/tag2.png";
import tag3 from "@/assets/admin/tags/tag3.png";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TAG_IMAGES = [tag1, tag2, tag3];

// 🔹 Activa esto en true mientras ajustas posiciones
const DEBUG_SHOW_ALL_SUBREGIONS = false;

// Label maps (sync with SummaryTableCard)
const GENERO_MAP = {
  male: "Masculino",
  female: "Femenino",
  "non-binary": "No binario/a",
  "prefer-not-say": "Prefiero no decirlo",
};

const FOCUS_MAP = {
  lgbtiq: "Población LGBTIQ+",
  ethnic: "Población étnica",
  "armed-conflict": "Víctima del conflicto",
  disability: "Persona con discapacidad",
  "female-head": "Mujer cabeza de hogar",
  none: "Ninguno",
  "prefer-not-say": "Prefiero no decirlo",
};

const AGE_MAP = {
  "16-25": "16 – 25",
  "16-24": "16 – 24",
  "25-34": "25 – 34",
  "35-59": "35 – 59",
  "60+": "60+",
};

const toLabel = (slug) =>
  slug
    ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

const getProgressFromStatus = (rawStatus) => {
  if (typeof rawStatus === "number" && !Number.isNaN(rawStatus)) {
    return Math.min(Math.max(rawStatus, 0), 100);
  }
  if (typeof rawStatus === "string") {
    const parsed = parseInt(rawStatus, 10);
    if (!Number.isNaN(parsed)) {
      return Math.min(Math.max(parsed, 0), 100);
    }
  }
  if (rawStatus === "complete") return 100;
  if (rawStatus === "progress") return 60;
  return 0;
};

const SUBREGION_CONFIG = {
  "Bajo Cauca": { top: "30%", left: "65%" },
  "Magdalena Medio": { top: "68%", left: "80%" },
  Nordeste: { top: "50%", left: "70%" },
  Norte: { top: "53%", left: "50%" },
  Occidente: { top: "55%", left: "30%" },
  Oriente: { top: "80%", left: "65%" },
  Suroeste: { top: "78%", left: "37%" },
  Uraba: { top: "30%", left: "15%" },
  "Valle del Aburra": { top: "75%", left: "48%" },
};

export default function GeoMapCard({ users = [] }) {
  const [isExporting, setIsExporting] = useState(false);

  const { presentSubregions, countsBySubregion } = useMemo(() => {
    const counts = {};

    users.forEach((u) => {
      const raw = u?.subregion;
      if (!raw) return;

      const name = String(raw).trim();
      if (!SUBREGION_CONFIG[name]) return;

      counts[name] = (counts[name] || 0) + 1;
    });

    let present;

    if (DEBUG_SHOW_ALL_SUBREGIONS) {
      // Mostrar todas para ajustar posiciones
      present = Object.keys(SUBREGION_CONFIG);

      // Aseguramos que todas tengan al menos 0
      present.forEach((sr) => {
        if (typeof counts[sr] !== "number") {
          counts[sr] = 0;
        }
      });
    } else {
      // Solo las que realmente aparecen en users
      present = Object.keys(counts);
    }

    return { presentSubregions: present, countsBySubregion: counts };
  }, [users]);

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);

      const data = users;

      if (!data || data.length === 0) {
        alert("No hay usuarios para exportar");
        return;
      }

      const doc = new jsPDF({ orientation: "landscape" });

      doc.setFontSize(14);
      doc.text("Informe de Participación – Metro de Medellín / Salud Mental", 14, 15);

      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, 14, 22);

      const head = [
        [
          "Estudiante",
          "Correo",
          "Documento",
          "Municipio",
          "Teléfono",
          "Género",
          "Edad",
          "Enfoque Diferencial",
          "Perfil de Riesgo",
          "% Avance",
        ],
      ];

      const body = data.map((u) => {
        const progress = getProgressFromStatus(u.experienceStatus);
        return [
          u.fullName || u.name || "-",
          u.email || "-",
          (u.documentType || "CC") + " " + (u.dni || "-"),
          toLabel(u.municipality) || "-",
          u.phone || "-",
          GENERO_MAP[u.genero] || toLabel(u.genero) || "-",
          AGE_MAP[u.ageRange ?? u.edad] || u.ageRange || u.edad || "-",
          FOCUS_MAP[u.differentialFocus ?? u.enfoqueDiferencial] ||
            u.differentialFocus ||
            u.enfoqueDiferencial ||
            "-",
          u.riskProfile || "-",
          `${progress}%`,
        ];
      });

      autoTable(doc, {
        head,
        body,
        startY: 26,
        styles: {
          fontSize: 8,
        },
        headStyles: {
          fillColor: [41, 55, 92],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { halign: "left" },
          1: { halign: "left" },
          2: { halign: "center" },
          3: { halign: "left" },
          4: { halign: "center" },
          5: { halign: "center" },
          6: { halign: "center" },
          7: { halign: "left" },
          8: { halign: "center" },
          9: { halign: "center", fillColor: [220, 240, 255] },
        },
      });

      const timestamp = new Date().toISOString().split("T")[0];
      doc.save(`informe-participacion-antioquia_${timestamp}.pdf`);
    } catch (err) {
      console.error("Error exportando PDF", err);
      alert("Error al generar el PDF. Intenta de nuevo.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <img
            src={mapaImg}
            alt="Mapa Antioquia"
            className="
              w-full
              max-w-[520px]
              lg:max-w-[600px]
              xl:max-w-[680px]
              h-auto
              max-h-[420px]
              object-contain
            "
            draggable={false}
          />

          {presentSubregions.map((subregion, index) => {
            const config = SUBREGION_CONFIG[subregion];
            if (!config) return null;

            const tagImg = TAG_IMAGES[index % TAG_IMAGES.length];
            const count = countsBySubregion[subregion] ?? 0;

            return (
              <div
                key={subregion}
                className="
                  absolute
                  -translate-x-1/2
                  -translate-y-1/2
                  group
                "
                style={{
                  top: config.top,
                  left: config.left,
                }}
              >
                {/* Tag en el mapa */}
                <img
                  src={tagImg}
                  alt={`Participación en ${subregion}`}
                  className="
                    cursor-default
                    select-none
                    w-5 h-5
                    sm:w-6 sm:h-6
                    lg:w-7 lg:h-7
                  "
                  draggable={false}
                />

                {/* Tooltip con nombre + conteo */}
                <div
                  className="
                    pointer-events-none
                    absolute
                    left-1/2
                    -top-2
                    -translate-x-1/2
                    -translate-y-full
                    opacity-0
                    group-hover:opacity-100
                    group-hover:-translate-y-[120%]
                    bg-slate-900/95
                    text-white
                    text-[10px]
                    sm:text-xs
                    px-2
                    py-1
                    rounded-full
                    whitespace-nowrap
                    shadow-lg
                    border border-white/10
                    transition-all
                    duration-150
                  "
                >
                  <span className="font-medium">{subregion}</span>
                  <span className="mx-1">·</span>
                  <span className="opacity-80">
                    {count} participante{count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleExportPdf}
          disabled={isExporting}
          className="
            inline-flex items-center gap-2
            rounded-full
            bg-[#2a2e40]
            px-4 py-2
            text-xs sm:text-sm
            text-white/85
            shadow-[0_8px_20px_rgba(0,0,0,0.35)]
            border border-white/10
            hover:bg-[#32364a]
            disabled:opacity-60
            disabled:cursor-not-allowed
            transition
          "
        >
          {isExporting ? "Generando PDF..." : "Informe PDF"}
        </button>
      </div>
    </div>
  );
}
