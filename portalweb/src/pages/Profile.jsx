import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { CHARACTERS, PROFILES } from "@/assets/characters";
import banner from "@/assets/banner-blur.jpg";
import {
  MdEmail,
  MdPerson,
  MdPhone,
  MdLocationCity,
  MdHome,
  MdTransgender,
} from "react-icons/md";
import Input from "@/components/Input";
import shield from "@/assets/shield.png";

export default function Profile() {
  const { session, updateUser } = useAuth();
  const user = session?.user;

  // Estados UI
  const [edit, setEdit] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [toast, setToast] = useState({ type: "", msg: "" }); // "ok" | "err"
  const [errors, setErrors] = useState({
    name: "",
    phone: "",
    genero: "",
    municipio: "",
    barrio: "",
    enfoque: "",
  });

  // Form: mapeamos los campos que devuelve UserMeRes
  const [form, setForm] = useState({
    email: user?.email || "",
    dni: user?.dni || "",
    name: user?.name || "",
    phone: user?.celularSinPrefijo || user?.phone || "",
    genero: user?.genero || "",
    municipio: user?.municipio || user?.ciudadResidencia || "",
    barrio: user?.barrio || user?.subregion || "",
    enfoque: user?.enfoque || user?.enfoqueDiferencial || "",
  });

  // Mantener form sincronizado al cambiar el user (ej: recarga/me)
  useEffect(() => {
    setForm({
      email: user?.email || "",
      dni: user?.dni || "",
      name: user?.name || "",
      phone: user?.celularSinPrefijo || user?.phone || "",
      genero: user?.genero || "",
      municipio: user?.municipio || user?.ciudadResidencia || "",
      barrio: user?.barrio || user?.subregion || "",
      enfoque: user?.enfoque || user?.enfoqueDiferencial || "",
    });
    setErrors({
      name: "",
      phone: "",
      genero: "",
      municipio: "",
      barrio: "",
      enfoque: "",
    });
  }, [
    user?.email,
    user?.dni,
    user?.name,
    user?.phone,
    user?.celularSinPrefijo,
    user?.genero,
    user?.municipio,
    user?.ciudadResidencia,
    user?.barrio,
    user?.subregion,
    user?.enfoque,
    user?.enfoqueDiferencial,
  ]);

  // Validaciones simples
  const validate = () => {
    const next = {
      name: "",
      phone: "",
      genero: "",
      municipio: "",
      barrio: "",
      enfoque: "",
    };

    if (!form.name?.trim()) next.name = "Nombre requerido";

    // municipio / barrio / genero / enfoque requeridos (igual que en signup)
    if (!form.municipio?.trim()) next.municipio = "Campo requerido";
    if (!form.barrio?.trim()) next.barrio = "Campo requerido";
    if (!form.genero) next.genero = "Selecciona una opción";
    if (!form.enfoque) next.enfoque = "Selecciona una opción";

    // phone opcional, si viene validarlo suave (7-20 chars útiles)
    if (form.phone && !/^[0-9+\s()-]{7,20}$/.test(form.phone)) {
      next.phone = "Teléfono inválido";
    }

    setErrors(next);
    return (
      !next.name &&
      !next.phone &&
      !next.genero &&
      !next.municipio &&
      !next.barrio &&
      !next.enfoque
    );
  };

  // Dirty-state real (compara con user actual)
  const isDirty = useMemo(() => {
    const basePhone = user?.celularSinPrefijo || user?.phone || "";
    const baseMunicipio = user?.municipio || user?.ciudadResidencia || "";
    const baseBarrio = user?.barrio || user?.subregion || "";
    const baseEnfoque = user?.enfoque || user?.enfoqueDiferencial || "";

    return (
      (form.name ?? "") !== (user?.name ?? "") ||
      (form.phone ?? "") !== (basePhone ?? "") ||
      (form.genero ?? "") !== (user?.genero ?? "") ||
      (form.municipio ?? "") !== (baseMunicipio ?? "") ||
      (form.barrio ?? "") !== (baseBarrio ?? "") ||
      (form.enfoque ?? "") !== (baseEnfoque ?? "")
    );
  }, [form, user]);

  const canSave = useMemo(
    () => edit && isDirty && !saving,
    [edit, isDirty, saving]
  );

  const avatarId = user?.avatarId ?? 0;
  const avatarSrc = CHARACTERS[avatarId];
  const profileSrc = PROFILES[avatarId];

  const riskInfo = useMemo(() => {
    const raw = (user?.nivelRiesgo || "").toUpperCase();

    if (!raw) {
      return {
        label: "Sin calcular",
        badgeClass: "bg-white/8 text-white/70 ring-white/15",
        desc: "Aún no se ha calculado tu nivel de riesgo. Completa el diagnóstico inicial para personalizar mejor tu experiencia.",
      };
    }

    switch (raw) {
      case "ALTO":
        return {
          label: "Alto",
          badgeClass: "bg-red-500/15 text-red-200 ring-red-400/40",
          desc: "Tu perfil de riesgo actual es alto. Te recomendamos priorizar los módulos de autocuidado, rutas de ayuda y denuncia.",
        };
      case "MEDIO":
        return {
          label: "Medio",
          badgeClass: "bg-amber-500/15 text-amber-100 ring-amber-400/40",
          desc: "Tu perfil de riesgo es medio. La plataforma ajusta contenidos para reforzar prevención y manejo de situaciones de riesgo.",
        };
      case "BAJO":
        return {
          label: "Bajo",
          badgeClass: "bg-emerald-500/15 text-emerald-100 ring-emerald-400/40",
          desc: "Tu perfil de riesgo es bajo. Aun así, encontrarás recursos para fortalecer tu autocuidado y el de tu entorno.",
        };
      default:
        return {
          label: raw,
          badgeClass: "bg-white/8 text-white/80 ring-white/20",
          desc: "Tu nivel de riesgo ha sido calculado, pero no se reconoce en la escala estándar. Consulta con el equipo si persiste.",
        };
    }
  }, [user?.nivelRiesgo]);

  // ⬇️ NUEVO: info de edad / grupo de edad
  const ageInfo = useMemo(() => {
    const edad = user?.edad;
    if (edad == null) {
      return {
        hasAge: false,
        band: "Sin dato",
        label: "Sin dato",
      };
    }

    let band = "";
    if (edad < 18) band = "Menor de 18";
    else if (edad <= 24) band = "18–24 años";
    else if (edad <= 29) band = "25–29 años";
    else if (edad <= 39) band = "30–39 años";
    else if (edad <= 59) band = "40–59 años";
    else band = "60+ años";

    return {
      hasAge: true,
      band,
      label: `${edad} años`,
    };
  }, [user?.edad]);

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      await updateUser({
        name: form.name.trim(),
        phone: form.phone?.trim() || null,
        genero: form.genero || null,
        municipio: form.municipio?.trim() || null,
        barrio: form.barrio?.trim() || null,
        enfoque: form.enfoque || null,
      });
      setEdit(false);
      setToast({ type: "ok", msg: "Cambios guardados" });
    } catch (e) {
      setToast({ type: "err", msg: e?.message || "No se pudo guardar" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast({ type: "", msg: "" }), 3000);
    }
  };

  const puntosSeguros = user?.puntosSeguros ?? 160;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-2 sm:px-4 lg:px-0">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* Columna izquierda */}
        <div className="space-y-6">
          {/* Header card */}
          <section className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 md:p-5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]">
            <div className="relative">
              <img
                src={banner}
                alt=""
                className="h-28 w-full rounded-2xl object-cover md:h-32 select-none"
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 z-10">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full p-[3px] bg-gradient-to-tr from-[#6C4CFF] via-[#8B7BFF] to-transparent">
                  <div className="h-full w-full rounded-full ring-4 ring-[#1F2336] overflow-hidden bg-white/10 backdrop-blur">
                    <img
                      src={profileSrc}
                      alt="Foto de perfil"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-10">
              <h2 className="text-center text-xl md:text-2xl font-semibold drop-shadow-sm">
                {user?.name || "Usuario"}
              </h2>
              {user?.role && (
                <p className="mt-1 text-center text-xs uppercase tracking-[0.18em] text-white/60">
                  {user.role}
                </p>
              )}
            </div>
          </section>

          {/* Card principal: avatar o selector */}
          <section className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 md:p-6 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]">
            {!showPicker ? (
              <>
                <div className="relative grid place-items-center min-h-[340px]">
                  <img
                    src={avatarSrc}
                    alt="Character"
                    className="max-h-[340px] w-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)] select-none"
                    draggable={false}
                  />
                </div>

                <div className="mt-5 text-center">
                  <h3 className="text-base md:text-lg font-medium mb-3">
                    Personaliza tu avatar y vive una experiencia única
                  </h3>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-full px-7
                               bg-gradient-to-b from-[#7457FF] to-[#5B43EE]
                               shadow-[0_8px_24px_rgba(108,76,255,0.35)]
                               hover:brightness-105 active:brightness-95
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70
                               cursor-pointer"
                    onClick={() => setShowPicker(true)}
                  >
                    Personalizar
                  </button>
                </div>

                {toast.msg && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={[
                      "mt-4 text-sm px-3 py-2 rounded-md text-center transition-opacity",
                      toast.type === "ok"
                        ? "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30"
                        : "bg-red-500/15 text-red-200 border border-red-400/30",
                    ].join(" ")}
                  >
                    {toast.msg}
                  </div>
                )}
              </>
            ) : (
              <AvatarPicker
                currentId={avatarId}
                loading={pickerLoading}
                onCancel={() => setShowPicker(false)}
                onConfirm={async (id) => {
                  try {
                    setPickerLoading(true);
                    await updateUser({ avatarId: id });
                    setShowPicker(false);
                    setToast({ type: "ok", msg: "Avatar actualizado" });
                  } catch (e) {
                    setToast({
                      type: "err",
                      msg: e?.message || "No se pudo guardar el avatar",
                    });
                  } finally {
                    setPickerLoading(false);
                    setTimeout(() => setToast({ type: "", msg: "" }), 3000);
                  }
                }}
              />
            )}
          </section>
        </div>

        {/* Columna derecha: Datos personales */}
        <aside className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 md:p-7 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]">
          <h3 className="text-center text-base font-semibold mb-3">
            Datos personales
          </h3>

          {/* Pills de grupo de edad y nivel de riesgo */}
          <div className="mb-3 flex w-full justify-center">
            <div className="flex flex-col items-center gap-2">
              {ageInfo.hasAge && (
                <span
                  className="
                    inline-flex flex-col items-center gap-0
                    rounded-full px-4 py-1 text-[11px] font-medium
                    bg-white/7 text-white/80 ring-1 ring-white/18 backdrop-blur-sm
                  "
                >
                  <span className="uppercase tracking-[0.18em] text-[8px] text-white/60">
                    GRUPO DE EDAD
                  </span>
                  <span className="text-xs md:text-sm text-white">
                    {ageInfo.band}{" "}
                    <span className="text-white/55">· {ageInfo.label}</span>
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {/* Email (solo lectura) */}
            <Input
              placeholder="Email"
              value={form.email}
              onChange={() => {}}
              iconLeft={<MdEmail size={18} />}
              disabled
            />

            {/* DNI (solo lectura) */}
            <Input
              placeholder="Número de documento"
              value={form.dni}
              onChange={() => {}}
              disabled
            />

            {/* Nombre */}
            <Input
              placeholder="Nombres y apellidos"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              iconLeft={<MdPerson size={18} />}
              error={errors.name}
              disabled={!edit}
            />

            {/* Género */}
            <div>
              <div className="relative">
                <select
                  value={form.genero}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, genero: e.target.value }))
                  }
                  disabled={!edit}
                  className={`w-full h-11 rounded-full bg-white/10 px-3 pr-9 text-sm outline-none border appearance-none
                    ${errors.genero ? "border-red-400" : "border-white/15"}
                    focus:border-[#6C4CFF] text-white/90
                    [&>option]:bg-white [&>option]:text-slate-900
                    disabled:opacity-60
                  `}
                >
                  <option value="">Selecciona una opción</option>
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
                  <option value="no_binaria">Persona no binaria</option>
                  <option value="prefiero_no_decirlo">
                    Prefiero no decirlo
                  </option>
                </select>
                <MdTransgender
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none"
                />
              </div>
              {errors.genero && (
                <p className="mt-1 text-xs text-red-300">{errors.genero}</p>
              )}
            </div>

            {/* Municipio */}
            <Input
              placeholder="Municipio de residencia"
              value={form.municipio}
              onChange={(e) =>
                setForm((f) => ({ ...f, municipio: e.target.value }))
              }
              iconLeft={<MdLocationCity size={18} />}
              error={errors.municipio}
              disabled={!edit}
            />

            {/* Barrio / vereda */}
            <Input
              placeholder="Barrio, vereda o sector"
              value={form.barrio}
              onChange={(e) =>
                setForm((f) => ({ ...f, barrio: e.target.value }))
              }
              iconLeft={<MdHome size={18} />}
              error={errors.barrio}
              disabled={!edit}
            />

            {/* Teléfono / celular */}
            <div>
              <div className="flex items-stretch gap-2">
                <div className="w-[84px] sm:w-[96px] shrink-0">
                  <Input value="+57" onChange={() => {}} disabled />
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    placeholder="Número de celular"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    iconLeft={<MdPhone size={18} />}
                    error={errors.phone}
                    disabled={!edit}
                  />
                </div>
              </div>
            </div>

            {/* Enfoque diferencial */}
            <div>
              <select
                value={form.enfoque}
                onChange={(e) =>
                  setForm((f) => ({ ...f, enfoque: e.target.value }))
                }
                disabled={!edit}
                className={`w-full h-11 rounded-full bg-white/10 px-3 pr-3 text-sm outline-none border appearance-none
                  ${errors.enfoque ? "border-red-400" : "border-white/15"}
                  focus:border-[#6C4CFF] text-white/90
                  [&>option]:bg-white [&>option]:text-slate-900
                  disabled:opacity-60
                `}
              >
                <option value="">Selecciona una opción</option>
                <option value="lgbtiq">Población LGBTIQ+</option>
                <option value="etnica">
                  Población étnica (afro, indígena, raizal, Rrom)
                </option>
                <option value="victima_conflicto">
                  Víctima del conflicto armado
                </option>
                <option value="discapacidad">Persona con discapacidad</option>
                <option value="mujer_cabeza_hogar">
                  Mujer cabeza de hogar
                </option>
                <option value="persona_mayor">Persona mayor</option>
                <option value="joven">Joven</option>
                <option value="ninguno">Ninguno</option>
                <option value="prefiero_no_decirlo">Prefiero no decirlo</option>
              </select>
              {errors.enfoque && (
                <p className="mt-1 text-xs text-red-300">{errors.enfoque}</p>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-4">
            {!edit ? (
              <button
                className="text-white/85 hover:text-white underline underline-offset-4 cursor-pointer"
                onClick={() => setEdit(true)}
              >
                Editar
              </button>
            ) : (
              <>
                <button
                  className="h-10 rounded-full px-5 bg-white/10 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer"
                  onClick={() => {
                    // revert
                    setForm({
                      email: user?.email || "",
                      dni: user?.dni || "",
                      name: user?.name || "",
                      phone: user?.celularSinPrefijo || user?.phone || "",
                      genero: user?.genero || "",
                      municipio:
                        user?.municipio || user?.ciudadResidencia || "",
                      barrio: user?.barrio || user?.subregion || "",
                      enfoque: user?.enfoque || user?.enfoqueDiferencial || "",
                    });
                    setErrors({
                      name: "",
                      phone: "",
                      genero: "",
                      municipio: "",
                      barrio: "",
                      enfoque: "",
                    });
                    setEdit(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  disabled={!canSave}
                  className="h-10 rounded-full px-6 bg-[#6C4CFF] font-medium shadow-[0_6px_18px_rgba(108,76,255,0.35)]
                             disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer
                             transition-transform active:scale-[0.98]"
                  onClick={handleSave}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-col items-center text-center gap-3">
            {/* Línea de nivel de riesgo */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/80">Nivel de riesgo:</span>
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 backdrop-blur-sm",
                  riskInfo.badgeClass,
                ].join(" ")}
              >
                <span className="text-lg leading-none">⚠️</span>
                <span className="text-white">{riskInfo.label}</span>
              </span>
            </div>

            <div className="mt-1 flex flex-col items-center gap-2">
              {/* Fila: escudo + texto en la misma línea */}
              <div className="flex items-center gap-3">
                <img
                  src={shield}
                  alt="Puntos Seguros"
                  className="h-9 w-9 object-contain"
                />
                <p className="text-sm font-semibold text-white">
                  {puntosSeguros} Puntos Metro
                </p>
              </div>

              {/* Texto descriptivo debajo, centrado */}
              <p className="max-w-xs text-[11px] leading-relaxed text-white/70 text-center">
                ¡Gana Puntos Seguros por cuidarte! Completa módulos, reporta
                incidencias y desbloquea beneficios exclusivos, análisis
                avanzados y premios locales.
              </p>
            </div>
          </div>

          {toast.msg && !showPicker && (
            <div
              role="status"
              aria-live="polite"
              className={[
                "mt-4 text-sm px-3 py-2 rounded-md text-center transition-opacity",
                toast.type === "ok"
                  ? "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30"
                  : "bg-red-500/15 text-red-200 border border-red-400/30",
              ].join(" ")}
            >
              {toast.msg}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function AvatarPicker({ currentId = 0, onCancel, onConfirm, loading = false }) {
  const [selected, setSelected] = useState(currentId);

  return (
    <div>
      <h4 className="text-center text-lg font-semibold mb-4">
        Elige tu cuerpo…
      </h4>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4 place-items-center">
        {CHARACTERS.map((src, idx) => {
          const active = idx === selected;
          return (
            <li key={idx} className="w-full">
              <button
                type="button"
                onClick={() => setSelected(idx)}
                className={[
                  "group relative w-full aspect-[3/4] rounded-2xl ring-1 transition cursor-pointer",
                  active
                    ? "bg-white/10 ring-[#6C4CFF] shadow-[0_8px_24px_rgba(108,76,255,0.35)]"
                    : "bg-white/5 ring-white/10 hover:bg-white/10",
                ].join(" ")}
                disabled={loading}
              >
                <span className="absolute inset-0 rounded-2xl ring-0 group-focus-visible:ring-2 group-focus-visible:ring-white/70 pointer-events-none" />
                <img
                  src={src}
                  alt={`Avatar ${idx}`}
                  className="absolute inset-0 m-auto max-h-[85%] w-auto object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,.35)] select-none"
                  draggable={false}
                />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          className="h-11 rounded-full px-6 bg-white/10 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="h-11 rounded-full px-7
                     bg-gradient-to-b from-[#7457FF] to-[#5B43EE]
                     shadow-[0_8px_24px_rgba(108,76,255,0.35)]
                     hover:brightness-105 active:brightness-95 disabled:opacity-60
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer"
          onClick={() => onConfirm(selected)}
          disabled={loading}
        >
          {loading ? "Guardando…" : "Continuar"}
        </button>
      </div>
    </div>
  );
}
