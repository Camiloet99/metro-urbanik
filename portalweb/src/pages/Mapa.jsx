import { useAuth } from "@/context/AuthContext";

// Ajusta la extensión si tus archivos no son .png
import mapaImg from "@/assets/admin/mapa.png";
import estudiantesImg from "@/assets/admin/estudiantes.png";
import tag1 from "@/assets/admin/tags/tag1.png";
import tag2 from "@/assets/admin/tags/tag2.png";
import tag3 from "@/assets/admin/tags/tag3.png";

function StatsCard() {
  return (
    <section className="rounded-[34px] bg-[#3A3D46] px-8 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <img
            src={estudiantesImg}
            alt="Usuarios registrados"
            className="h-14 w-14 object-contain"
            draggable={false}
          />

          <div className="flex items-center gap-4">
            <span className="text-[56px] leading-none font-semibold text-white">
              100
            </span>
            <span className="text-sm leading-tight text-white/80">
              Usuarios
              <br />
              registrados
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:min-w-[190px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[40px] leading-none text-white">20</span>
            <div className="flex items-center gap-2 text-white/85 text-sm">
              <img src={tag1} alt="" className="h-5 w-5 object-contain" />
              <span>Finalizado M1</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[40px] leading-none text-white">60</span>
            <div className="flex items-center gap-2 text-white/85 text-sm">
              <img src={tag2} alt="" className="h-5 w-5 object-contain" />
              <span>Finalizado ≥M2</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DonutCard() {
  const municipiosIzquierda = [
    { nombre: "Bello", extra: "4 - 18%", icono: tag3 },
    { nombre: "Itagüí", extra: "16 - 72%", icono: tag2 },
    { nombre: "Rionegro", extra: "", icono: tag1 },
    { nombre: "Vegachí", extra: "", icono: tag1 },
    { nombre: "Barbosa", extra: "", icono: tag1 },
  ];

  const municipiosDerecha = [
    { nombre: "Copacabana", extra: "", icono: tag1 },
    { nombre: "Envigado", extra: "", icono: tag1 },
    { nombre: "Guarne", extra: "", icono: tag1 },
    { nombre: "Remedios", extra: "", icono: tag1 },
    { nombre: "El Bagre", extra: "", icono: tag1 },
  ];

  return (
    <section className="rounded-[34px] bg-[#4A4A4A] px-8 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="text-[36px] leading-none text-white/95"
        >
          ←
        </button>

        <h3 className="text-center text-[22px] font-semibold text-white">
          % de participación por municipio
        </h3>

        <button
          type="button"
          className="text-[36px] leading-none text-white/95"
        >
          →
        </button>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
        <div className="relative mx-auto lg:mx-0">
          <div
            className="h-[210px] w-[210px] rounded-full"
            style={{
              background:
                "conic-gradient(#57B6FF 0deg 260deg, #F5A623 260deg 325deg, #D7D7D7 325deg 360deg)",
            }}
          />
          <div className="absolute inset-[34px] rounded-full bg-[#4A4A4A]" />
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            {municipiosIzquierda.map((item) => (
              <div key={item.nombre} className="flex items-center gap-3">
                <img
                  src={item.icono}
                  alt=""
                  className="h-6 w-6 object-contain"
                  draggable={false}
                />
                <div className="flex items-center gap-2 text-white">
                  <span className="text-[18px]">{item.nombre}</span>
                  {item.extra ? (
                    <span className="text-[14px] text-white/65">
                      {item.extra}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {municipiosDerecha.map((item) => (
              <div key={item.nombre} className="flex items-center gap-3">
                <img
                  src={item.icono}
                  alt=""
                  className="h-6 w-6 object-contain"
                  draggable={false}
                />
                <span className="text-[18px] text-white">{item.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 text-right text-[26px] text-white">1/4</div>
    </section>
  );
}

function MapCard() {
  return (
    <section className="relative flex min-h-[520px] items-center justify-center">
      <img
        src={mapaImg}
        alt="Mapa"
        className="h-auto max-h-[510px] w-auto max-w-full object-contain"
        draggable={false}
      />

      <button
        type="button"
        className="absolute bottom-7 right-6 inline-flex items-center gap-3 rounded-full border-2 border-white/60 px-5 py-2.5 text-[18px] font-medium text-white bg-transparent"
      >
        <span>Informe PDF</span>
        <span className="text-[24px] leading-none">↓</span>
      </button>
    </section>
  );
}

function ProgressDots({ active = 4 }) {
  return (
    <div className="flex items-center gap-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <span
          key={item}
          className={`h-4 w-4 rounded-full ${
            item <= active ? "bg-[#2EC8FF]" : "bg-[#8C8C8C]"
          }`}
        />
      ))}
    </div>
  );
}

function RiskBadge({ level }) {
  const styles =
    level === "Alto"
      ? "text-[#FF5A4E]"
      : level === "Medio"
      ? "text-[#F3A11F]"
      : "text-[#B8F73C]";

  return (
    <div className={`flex items-center gap-2 text-[18px] ${styles}`}>
      <span className="text-[18px]">⚠</span>
      <span>{level}</span>
    </div>
  );
}

export default function Mapa() {
  const { session } = useAuth();

  const userName =
    session?.user?.nombre ||
    session?.user?.name?.split(" ")[0] ||
    "Juan";

  const rows = [
    {
      nombre: "Juliana Perez Gonzales",
      documento: "1128265896",
      departamento: "Antioquia",
      municipio: "Bello",
      telefono: "3112569658",
      genero: "Femenino",
      edad: "16 - 24 Joven",
      enfoque: "Discapacidad",
      riesgo: "Bajo",
      dots: 6,
    },
    {
      nombre: "Laura Mosquera",
      documento: "1254789654",
      departamento: "Antioquia",
      municipio: "Itagüí",
      telefono: "3215698565",
      genero: "Femenino",
      edad: "35 - 59 Adulto",
      enfoque: "Víctima de la violencia",
      riesgo: "Medio",
      dots: 3,
    },
    {
      nombre: "Juan Gomez Ramirez",
      documento: "1258698547",
      departamento: "Antioquia",
      municipio: "Bello",
      telefono: "3005698523",
      genero: "Masculino",
      edad: "16 - 24 Joven",
      enfoque: "Comunidad étnica",
      riesgo: "Bajo",
      dots: 2,
    },
    {
      nombre: "Andres Felipe Lopez",
      documento: "94589658",
      departamento: "Antioquia",
      municipio: "Bello",
      telefono: "3216956985",
      genero: "Masculino",
      edad: "35 - 59 Adulto",
      enfoque: "Zonas rurales",
      riesgo: "Alto",
      dots: 4,
    },
  ];

  return (
    <div className="mx-auto max-w-[1650px] px-6 py-8">
      <div className="mb-8">
        <p className="text-[22px] text-white/85">
          Inicio / Dashboard administrador
        </p>
        <h1 className="mt-2 text-[52px] font-semibold leading-none text-white">
          Hola, {userName}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <StatsCard />
          <DonutCard />
        </div>

        <div className="rounded-[34px] bg-transparent">
          <MapCard />
        </div>
      </div>

      <section className="mt-8 rounded-[34px] bg-[#3A3D46] px-7 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[44px] font-semibold text-white">
            Tabla Resumen
          </h2>

          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-lg border border-white/30 text-white text-[22px]"
          >
            ↗
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-white/30 text-left text-[18px] text-white/85">
                <th className="pb-4 font-medium">Nombre y Apellidos</th>
                <th className="pb-4 font-medium">Documento</th>
                <th className="pb-4 font-medium">Departamento</th>
                <th className="pb-4 font-medium">Municipio</th>
                <th className="pb-4 font-medium">Teléfono</th>
                <th className="pb-4 font-medium">Género</th>
                <th className="pb-4 font-medium">Rango edad</th>
                <th className="pb-4 font-medium">Enfoque Diferencial</th>
                <th className="pb-4 font-medium">Nivel riesgo</th>
                <th className="pb-4 font-medium">% de avance</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.documento}
                  className="border-t border-white/10 text-[18px] text-white"
                >
                  <td className="py-5">{item.nombre}</td>
                  <td className="py-5">{item.documento}</td>
                  <td className="py-5">{item.departamento}</td>
                  <td className="py-5">{item.municipio}</td>
                  <td className="py-5">{item.telefono}</td>
                  <td className="py-5">{item.genero}</td>
                  <td className="py-5">{item.edad}</td>
                  <td className="py-5">{item.enfoque}</td>
                  <td className="py-5">
                    <RiskBadge level={item.riesgo} />
                  </td>
                  <td className="py-5">
                    <ProgressDots active={item.dots} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}