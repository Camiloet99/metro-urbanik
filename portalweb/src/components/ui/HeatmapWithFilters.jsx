/* global google */
import React, { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

// API
const HEATMAP_API_URL = "http://127.0.0.1:8000/heatmap";

export default function HeatmapWithFilters({
  categoria,
  anio,
  mes,
  municipio,
}) {
  const mapRef = useRef(null);
  const heatmapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    async function init() {
      setOptions({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        version: "weekly",
      });

      const { Map } = await importLibrary("maps");
      const { HeatmapLayer } = await importLibrary("visualization");

      // Crear mapa solo una vez
      if (!mapInstanceRef.current && mapRef.current) {
        mapInstanceRef.current = new Map(mapRef.current, {
          center: { lat: 7.125, lng: -73.118 }, // Santander
          zoom: 8,
          streetViewControl: false,
          mapTypeControl: false,
        });
      }

      await fetchHeatmapData(HeatmapLayer);
    }

    const fetchHeatmapData = async () => {
      if (!map) return;
      setLoadingHeatmap(true);
      try {
        // 1. validar que haya año
        if (!anio) {
          setError("Selecciona un año para actualizar el mapa.");
          setLoadingHeatmap(false);
          return;
        }

        // 2. construir la URL SIEMPRE con categoria + anio
        let url = HEATMAP_API_URL;

        const params = [
          `categoria=${encodeURIComponent(categoria)}`,
          `anio=${encodeURIComponent(anio)}`, // 👈 SIEMPRE presente
        ];

        if (mes && mes !== "Todos") {
          params.push(`mes=${encodeURIComponent(mes)}`);
        }

        url += "?" + params.join("&");

        const response = await fetch(url);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          console.error("Respuesta de error del heatmap:", errorBody);
          throw new Error(`Error HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          console.error("Respuesta inesperada del heatmap:", data);
          throw new Error("Formato de datos inválido");
        }

        const points = data.map((p) => ({
          lat: p.lat ?? p.latitud,
          lng: p.lng ?? p.longitud,
        }));

        await updateHeatmap(points);
      } catch (err) {
        console.error("Error cargando datos del heatmap", err);
        setError("Error al cargar el mapa de calor.");
      } finally {
        setLoadingHeatmap(false);
      }
    };

    init().catch((err) => console.error("Error inicializando heatmap:", err));
  }, [categoria, anio, mes, municipio]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[520px] rounded-[24px] border-t border-white/10"
    />
  );
}
