/* global google */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useAuth } from "@/context/AuthContext";

// URL para heatmap
const HEATMAP_API_URL =
  import.meta.env.VITE_ML_HEATMAP_URL ||
  `${import.meta.env.VITE_ML_API_URL || "http://localhost:8000"}/heatmap`;

const CATEGORIAS = [
  { value: "HURTO", label: "Hurtos" },
  { value: "VIOLENCIA_INTRAFAMILIAR", label: "Violencia intrafamiliar" },
  { value: "DELITOS_SEXUALES", label: "Delitos sexuales" },
];

export default function Mapa() {
  const { session } = useAuth();
  const userName = session?.user?.nombre || session?.user?.name || "Usuario";

  const mapRef = useRef(null);
  const heatmapRef = useRef(null);
  const [map, setMap] = useState(null);

  const [categoria, setCategoria] = useState("HURTO");
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [mes, setMes] = useState("");

  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [error, setError] = useState("");

  // Datos crudos que vienen del endpoint /heatmap
  const [heatmapData, setHeatmapData] = useState([]);

  // ========= GOOGLE MAPS =========
  const loadGoogleAPI = async () => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      console.error("Falta VITE_GOOGLE_MAPS_API_KEY en .env");
      throw new Error("Google Maps API key missing");
    }

    setOptions({
      key,
      v: "weekly",
    });

    const { Map } = await importLibrary("maps");
    // Cargamos visualization una vez
    await importLibrary("visualization");
    return { Map };
  };

  const initializeMap = (MapClass) => {
    if (!mapRef.current) return;

    const mapa = new MapClass(mapRef.current, {
      center: { lat: 7.125, lng: -73.1189 }, // centro Santander
      zoom: 8,
      streetViewControl: false,
      mapTypeControl: false,
    });

    setMap(mapa);
  };

  const updateHeatmap = async (weightedPoints) => {
    if (!map) return;

    const { HeatmapLayer } = await importLibrary("visualization");

    if (!heatmapRef.current) {
      heatmapRef.current = new HeatmapLayer({
        data: weightedPoints,
        radius: 40,
      });
      heatmapRef.current.setMap(map);
    } else {
      heatmapRef.current.setData(weightedPoints);
    }
  };

  const fetchHeatmapData = async () => {
    if (!map) return;

    setLoadingHeatmap(true);
    setError("");

    try {
      let url = HEATMAP_API_URL;
      const params = [];

      if (categoria) params.push(`categoria=${encodeURIComponent(categoria)}`);
      if (anio) params.push(`anio=${encodeURIComponent(anio)}`);
      if (mes) params.push(`mes=${encodeURIComponent(mes)}`);

      if (params.length > 0) url += "?" + params.join("&");

      const response = await fetch(url);

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        console.error("Error en el endpoint de heatmap:", body);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const lista = Array.isArray(data.resultados)
        ? data.resultados
        : data || [];

      // Guardamos los datos crudos para usarlos en el panel derecho
      setHeatmapData(lista);

      // --- Construimos los puntos ponderados para el heatmap ---
      const maxCount = lista.reduce((max, p) => {
        const c = p.count ?? p.total ?? p.total_delitos ?? 0;
        return c > max ? c : max;
      }, 0);

      const weightedPoints = lista
        .map((p) => {
          const lat = p.lat ?? p.latitud;
          const lng = p.lng ?? p.longitud;
          const rawCount = p.count ?? p.total ?? p.total_delitos ?? 1;

          if (lat == null || lng == null) return null;

          // Escalamos pesos a 1–10 para que el mapa sea legible
          const weight =
            maxCount > 0 ? Math.max(1, (rawCount / maxCount) * 10) : 1;

          return {
            location: new google.maps.LatLng(lat, lng),
            weight,
          };
        })
        .filter(Boolean);

      await updateHeatmap(weightedPoints);
    } catch (err) {
      console.error("Error cargando datos del heatmap:", err);
      setError("Error al cargar el mapa de calor.");
    } finally {
      setLoadingHeatmap(false);
    }
  };

  // Inicializar mapa
  useEffect(() => {
    (async () => {
      try {
        const { Map } = await loadGoogleAPI();
        initializeMap(Map);
      } catch (err) {
        console.error("Error cargando Google Maps:", err);
        setError("No se pudo cargar el mapa de Google.");
      }
    })();
  }, []);

  // Actualizar heatmap cuando cambian filtros
  useEffect(() => {
    if (map) {
      fetchHeatmapData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, categoria, anio, mes]);

  // ========= AGREGADOS POR MUNICIPIO (a partir del heatmap) =========

  const agregados = useMemo(() => {
    const byMun = new Map();

    for (const p of heatmapData || []) {
      const nombre = p.municipio || "SIN MUNICIPIO";
      const count = p.count ?? p.total ?? p.total_delitos ?? 0;

      const prev = byMun.get(nombre) || { municipio: nombre, total: 0 };
      prev.total += count;
      byMun.set(nombre, prev);
    }

    const lista = Array.from(byMun.values());
    const max = lista.reduce((m, item) => Math.max(m, item.total), 0);
    const totalGlobal = lista.reduce((s, item) => s + item.total, 0);

    const listaConRiesgo = lista.map((item) => {
      let nivel_riesgo = "BAJO";
      if (max > 0) {
        const ratio = item.total / max;
        if (ratio >= 0.66) nivel_riesgo = "ALTO";
        else if (ratio >= 0.33) nivel_riesgo = "MEDIO";
      }
      return {
        municipio: item.municipio,
        delitos_observados: item.total,
        nivel_riesgo,
      };
    });

    return {
      lista: listaConRiesgo,
      totalGlobal,
    };
  }, [heatmapData]);

  const topMunicipios = useMemo(() => {
    return agregados.lista
      .slice()
      .sort((a, b) => b.delitos_observados - a.delitos_observados)
      .slice(0, 5);
  }, [agregados]);

  const [municipioSeleccionado, setMunicipioSeleccionado] = useState("");

  const municipioDetalle = useMemo(() => {
    if (!municipioSeleccionado) return null;
    const item = agregados.lista.find(
      (m) => m.municipio === municipioSeleccionado
    );
    if (!item) return null;

    const porcentaje =
      agregados.totalGlobal > 0
        ? (item.delitos_observados / agregados.totalGlobal) * 100
        : 0;

    return {
      ...item,
      porcentaje,
    };
  }, [municipioSeleccionado, agregados]);

  // ========= UI =========
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6 flex flex-col xl:flex-row gap-6">
      {/* COLUMNA IZQUIERDA: MAPA */}
      <div className="flex-1 rounded-[32px] bg-[#151827] overflow-hidden shadow-xl border border-white/5">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60">Inicio</p>
            <h1 className="text-xl font-semibold text-white">
              Hola, {userName}
            </h1>
          </div>
          <p className="text-[11px] text-white/50">
            Visualización de riesgo por municipio
          </p>
        </div>

        <div className="px-6 pb-4 flex flex-wrap gap-2 text-xs">
          {CATEGORIAS.map((cat) => {
            const active = categoria === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategoria(cat.value)}
                className={[
                  "rounded-2xl px-4 py-2 font-medium border transition",
                  active
                    ? "bg-[#5b4bff] border-[#5b4bff] text-white shadow"
                    : "bg-transparent border-white/15 text-white/75 hover:border-white/60",
                ].join(" ")}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="px-6 pb-4 flex flex-wrap gap-3 text-xs">
          <div>
            <label className="block mb-1 text-white/60">Año</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              className="w-24 rounded-xl bg-[#202436] border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#5b4bff]"
            />
          </div>
          <div>
            <label className="block mb-1 text-white/60">Mes (opcional)</label>
            <input
              type="number"
              min={1}
              max={12}
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-24 rounded-xl bg-[#202436] border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#5b4bff]"
              placeholder="1-12"
            />
          </div>
          {loadingHeatmap && (
            <span className="self-end text-[11px] text-white/60">
              Actualizando mapa…
            </span>
          )}
        </div>

        <div
          ref={mapRef}
          className="w-full h-[520px] rounded-[24px] border-t border-white/10"
        />
      </div>

      {/* COLUMNA DERECHA: PANEL */}
      <aside className="w-full xl:w-[360px] rounded-[32px] bg-[#202436] text-white px-5 py-6 shadow-xl border border-white/10 flex flex-col gap-4">
        {/* Nivel de riesgo */}
        <section className="rounded-2xl bg-[#151827] border border-white/10 px-4 py-3 text-xs">
          <p className="font-semibold mb-2">Nivel de riesgo por municipio</p>
          <p className="text-white/60 text-[11px] mb-3">
            El nivel se calcula a partir del número relativo de casos en cada
            municipio para <span className="font-semibold">{categoria}</span> en{" "}
            {anio}.
          </p>
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block h-3 w-3 rounded-full bg-[#22c55e]" />
            <span>Bajo</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block h-3 w-3 rounded-full bg-[#f59e0b]" />
            <span>Medio</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block h-3 w-3 rounded-full bg-[#ef4444]" />
            <span>Alto</span>
          </div>
          {error && <p className="mt-2 text-red-400 text-[11px]">{error}</p>}
        </section>

        {/* Municipios más críticos */}
        <section className="rounded-2xl bg-[#151827] border border-white/10 px-4 py-3 text-xs">
          <p className="font-semibold mb-2">Municipios más críticos</p>
          <p className="text-white/60 text-[11px] mb-3">
            Top 5 municipios con mayor número de casos estimados para{" "}
            <span className="font-semibold">{categoria}</span> en {anio}.
          </p>

          {topMunicipios.length === 0 && !loadingHeatmap && (
            <p className="text-white/60 text-[11px]">
              Sin datos para los filtros actuales.
            </p>
          )}

          {topMunicipios.map((m, idx) => (
            <button
              key={m.municipio || idx}
              type="button"
              onClick={() => setMunicipioSeleccionado(m.municipio)}
              className={[
                "w-full flex items-center justify-between py-1.5 px-2 rounded-xl mb-1",
                municipioSeleccionado === m.municipio
                  ? "bg-[#5b4bff] text-white"
                  : "bg-transparent hover:bg-white/5 text-white/80",
              ].join(" ")}
            >
              <span>
                {idx + 1}. {m.municipio}
              </span>
              <span className="text-[11px]">
                {m.nivel_riesgo} • {m.delitos_observados} casos
              </span>
            </button>
          ))}
        </section>

        {/* Detalle del municipio seleccionado */}
        <section className="rounded-2xl bg-[#151827] border border-white/10 px-4 py-3 text-xs">
          <p className="font-semibold mb-2">Detalle del municipio</p>
          <p className="text-white/60 text-[11px] mb-3">
            Selecciona un municipio en la lista de arriba para ver su peso
            relativo dentro de los casos registrados.
          </p>

          {!municipioSeleccionado && (
            <p className="text-[11px] text-white/60">
              Aún no has seleccionado un municipio.
            </p>
          )}

          {municipioSeleccionado && municipioDetalle && (
            <div className="text-[11px] text-white/80 space-y-1">
              <p>
                Municipio:{" "}
                <span className="font-semibold">
                  {municipioDetalle.municipio}
                </span>
              </p>
              <p>
                Casos estimados:{" "}
                <span className="font-semibold">
                  {municipioDetalle.delitos_observados.toLocaleString("es-CO")}
                </span>
              </p>
              <p className="text-white/60">
                Representa aproximadamente{" "}
                <span className="font-semibold">
                  {municipioDetalle.porcentaje.toFixed(1)}%
                </span>{" "}
                del total de casos del departamento en los filtros actuales.
              </p>
              <p className="text-white/60">
                Nivel de riesgo:{" "}
                <span className="font-semibold">
                  {municipioDetalle.nivel_riesgo}
                </span>
              </p>
            </div>
          )}

          {municipioSeleccionado && !municipioDetalle && (
            <p className="text-[11px] text-white/60">
              No se encontraron datos para el municipio seleccionado.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
