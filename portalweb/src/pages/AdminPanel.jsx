// src/pages/AdminPanel.jsx
import { useMemo, useState } from "react";
import { MOCK_ADMIN_USERS } from "@/data/mockAdminUsers";
import ImpactSummaryCard from "@/components/admin/ImpactSummaryCard";
import ParticipationSliderCard from "@/components/admin/ParticipationSliderCard";
import GeoMapCard from "@/components/admin/GeoMapCard";
import SummaryTableCard from "@/components/admin/SummaryTableCard";

// 🔹 Correos administrativos explícitos
const ADMIN_EMAIL_SET = new Set(
  [
    "benavideznaida@gmail.com",
    "camilo@gmail.com",
    "hahnahhernandez396@gmail.com",
    "luis.vargas@iudigital.edu.co",
    "uriel.osorio@iudigital.edu.co",
    "isabellacasasperez1@gmail.com",
    "julia.puerta@iudigital.edu.co",
    "wilmer.medina@iudigital.edu.co",
    "iudigital.isabelcastro@gmail.com",
    "rabedoya551@gmail.com",
    "sados20222@gmail.com",
  ].map((e) => e.toLowerCase())
);

// 🔹 Regla para marcar si un usuario es administrativo
function isAdminUser(user) {
  const email = (user?.email || "").trim().toLowerCase();
  if (!email) return false;

  if (ADMIN_EMAIL_SET.has(email)) return true;

  // Todos los que sean @iudigital.edu.co (pero NO @est.iudigital.edu.co) se consideran administrativos
  if (
    email.endsWith("@iudigital.edu.co") &&
    !email.endsWith("@est.iudigital.edu.co")
  ) {
    return true;
  }

  return false;
}

export default function AdminPanel() {
  const [page, setPage] = useState(0);
  const size = 20;

  // Datos simulados · pasajeros Metro de Medellín
  const allUsers = MOCK_ADMIN_USERS;
  const totalUsers = allUsers.length;

  // 🔹 Participantes reales (sin administrativos) para estadísticas
  const participants = useMemo(
    () => allUsers.filter((u) => !isAdminUser(u)),
    [allUsers]
  );

  // Paginación en frontend: la tabla muestra TODOS (incluye administrativos)
  const usersPage = useMemo(() => {
    const start = page * size;
    const end = start + size;
    return allUsers.slice(start, end);
  }, [allUsers, page, size]);

  // Métricas globales usando SOLO participantes (sin admin)
  const { total, altoRiesgo, completados } = useMemo(() => {
    const total = participants.length;
    let altoRiesgo = 0;
    let completados = 0;

    participants.forEach((u) => {
      if (u.riskProfile === "ALTO") altoRiesgo += 1;
      if (Array.isArray(u.modulosDone) && u.modulosDone.every(Boolean)) completados += 1;
    });

    return { total, altoRiesgo, completados };
  }, [participants]);

  return (
    <div className="space-y-8">
      {/* Mapa: aquí puedes decidir si quieres incluir admin o no.
          Ahora mismo usa TODOS (allUsers). */}
      <section className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.7fr)]">
        <div className="order-1 lg:order-2">
          <GeoMapCard users={allUsers} />
          {/* Si quieres excluir admin del mapa, cambia a:
              <GeoMapCard users={participants} />
          */}
        </div>

        {/* Impact summary + slider → usan SOLO participantes (sin admin) */}
        <div className="order-2 lg:order-1 flex flex-col gap-6">
          <ImpactSummaryCard
            total={total}
            altoRiesgo={altoRiesgo}
            completados={completados}
          />
          <ParticipationSliderCard users={participants} />
        </div>
      </section>

      {/* Tabla paginada: muestra TODOS, incluyendo administrativos */}
      <section className="hidden md:block">
        <SummaryTableCard
          users={usersPage}
          loading={false}
          error={null}
          page={page}
          size={size}
          total={totalUsers}
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}
