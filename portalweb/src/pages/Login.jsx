// src/pages/AuthGateway.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import LoginForm from "@/components/auth/LoginForm";
import SignupPersonalStep from "@/components/auth/SignupPersonalStep";
import SignupCredentialsStep from "@/components/auth/SignupCredentialsStep";
import ForgotIdentityStep from "@/components/auth/ForgotIdentityStep";
import ForgotResetStep from "@/components/auth/ForgotResetStep";

import {
  verifyUserIdentityApi,
  signupApi,
  resetPasswordApi,
} from "@/services/authService";

import brandLogo from "../assets/brand-logo.png";
import hero from "../assets/login-hero.png";
import partner1 from "../assets/partner-1.png";
import partner2 from "../assets/partner-2.png";

/* ------- Tabs ------- */
const tabs = [
  { key: "login", label: "Ingresar" },
  { key: "signup", label: "Crear cuenta" },
  { key: "forgot", label: "Recuperar" },
];

const formContainerVariants = {
  initial: { opacity: 0, y: 10, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.28, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(4px)",
    transition: { duration: 0.2 },
  },
};

function ProgressDots({ total = 2, index = 0 }) {
  return (
    <div className="flex items-center gap-2.5 justify-center my-4" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <motion.span
          key={i}
          className="h-2.5 w-2.5 rounded-full"
          animate={{ scale: i === index ? 1 : 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{
            background:
              i === index ? "rgba(108,76,255,1)" : "rgba(255,255,255,0.28)",
            boxShadow: i === index ? "0 0 14px rgba(108,76,255,0.55)" : "none",
          }}
        />
      ))}
    </div>
  );
}

export default function AuthGateway() {
  const [mode, setMode] = useState("login");
  const [forgotStep, setForgotStep] = useState(1);
  const [signupStep, setSignupStep] = useState(1);

  const navigate = useNavigate();
  const { login } = useAuth();

  // Más amigable en mobile: full width + breakpoints
  const FORM_WIDTH = "w-full max-w-sm sm:max-w-[420px]";
  const isEmail = (v) => /\S+@\S+\.\S+/.test(v);

  // --------- LOGIN ---------
  const [loginValues, setLoginValues] = useState({ email: "", pass: "" });
  const [loginErrors, setLoginErrors] = useState({ email: "", pass: "" });
  const [loginOkBurst, setLoginOkBurst] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setLoginErrors({ email: "", pass: "" });

    if (!isEmail(loginValues.email)) {
      setLoginErrors((p) => ({ ...p, email: "Email incorrecto" }));
    }
    if (!loginValues.pass) {
      setLoginErrors((p) => ({ ...p, pass: "Campo requerido" }));
    }

    if (isEmail(loginValues.email) && loginValues.pass) {
      try {
        setIsLoggingIn(true);
        await login(loginValues.email, loginValues.pass);
        setLoginOkBurst(true);
        setTimeout(() => navigate("/courses"), 250);
      } catch {
        setLoginErrors((p) => ({ ...p, pass: "Credenciales inválidas" }));
      } finally {
        setIsLoggingIn(false);
      }
    }
  }

  // --------- SIGNUP (un solo paso con datos personales + credenciales) ---------
  const [credValues, setCredValues] = useState({
    municipio: "",
    barrio: "",
    nombresApellidos: "",
    cedula: "",
    email: "",
    ageRange: "",
    celular: "",
    genero: "",
    enfoque: "",
    pass: "",
    confirm: "",
    accept: false,
  });

  const [credErrors, setCredErrors] = useState({
    municipio: "",
    barrio: "",
    nombresApellidos: "",
    cedula: "",
    email: "",
    ageRange: "",
    celular: "",
    genero: "",
    enfoque: "",
    pass: "",
    confirm: "",
    accept: "",
  });

  const signupRules = useMemo(
    () => ({
      len: credValues.pass.length >= 8,
      upper: /[A-ZÁÉÍÓÚÑ]/.test(credValues.pass),
      special: /[^A-Za-z0-9]/.test(credValues.pass),
    }),
    [credValues.pass]
  );

  const EMPTY_SIGNUP_ERRORS = {
    municipio: "",
    barrio: "",
    nombresApellidos: "",
    cedula: "",
    email: "",
    ageRange: "",
    celular: "",
    genero: "",
    enfoque: "",
    pass: "",
    confirm: "",
    accept: "",
  };

  function validateSignupPersonal(values) {
    const errs = {};

    if (!values.municipio.trim()) {
      errs.municipio = "Campo requerido";
    }
    if (!values.barrio.trim()) {
      errs.barrio = "Campo requerido";
    }
    if (!values.nombresApellidos.trim()) {
      errs.nombresApellidos = "Campo requerido";
    }
    if (!/^\d{6,10}$/.test(values.cedula)) {
      errs.cedula = "Cédula inválida (6–10 dígitos)";
    }
    if (!isEmail(values.email)) {
      errs.email = "Correo electrónico inválido";
    }
    if (!/^\d{7,10}$/.test(values.celular)) {
      errs.celular = "Número de celular inválido";
    }

    return errs;
  }

  function validateSignupSecurity(values, rules) {
    const errs = {};

    if (!values.ageRange) {
      errs.ageRange = "Selecciona un rango de edad";
    }
    if (!values.genero) {
      errs.genero = "Selecciona una opción";
    }
    if (!values.enfoque) {
      errs.enfoque = "Selecciona una opción";
    }

    if (!(rules.len && rules.upper && rules.special)) {
      errs.pass = "Contraseña insegura";
    }
    if (values.confirm !== values.pass) {
      errs.confirm = "Las contraseñas no coinciden";
    }
    if (!values.accept) {
      errs.accept = "Debes aceptar las políticas";
    }

    return errs;
  }

  function handleSignupNextStep() {
    const personalErrors = validateSignupPersonal(credValues);
    const merged = { ...EMPTY_SIGNUP_ERRORS, ...personalErrors };
    setCredErrors(merged);

    const hasErrors = Object.values(personalErrors).some((v) => v);
    if (!hasErrors) {
      setSignupStep(2);
    }
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();

    const personalErrors = validateSignupPersonal(credValues);
    const securityErrors = validateSignupSecurity(credValues, signupRules);

    const newErrors = {
      ...EMPTY_SIGNUP_ERRORS,
      ...personalErrors,
      ...securityErrors,
    };
    setCredErrors(newErrors);

    const hasError = Object.values(newErrors).some((v) => v);
    if (hasError) return;

    try {
      await signupApi({
        email: credValues.email,
        dni: credValues.cedula,
        password: credValues.pass,
        municipio: credValues.municipio,
        barrio: credValues.barrio,
        nombresApellidos: credValues.nombresApellidos,
        ageRange: credValues.ageRange,
        celular: credValues.celular, // sin +57, el backend lo arma
        genero: credValues.genero,
        enfoque: credValues.enfoque,
      });

      await login(credValues.email, credValues.pass);
      navigate("/courses");
    } catch (err) {
      setCredErrors((p) => ({
        ...p,
        pass: err.message || "Error al crear la cuenta",
      }));
    }
  }

  // --------- FORGOT ---------
  const [forgotIdValues, setForgotIdValues] = useState({ email: "", dni: "" });
  const [forgotIdErrors, setForgotIdErrors] = useState({ email: "", dni: "" });
  const [forgotGeneralErr, setForgotGeneralErr] = useState("");
  const [forgotEmailFixed, setForgotEmailFixed] = useState("");

  async function handleForgotValidate(e) {
    e.preventDefault();
    setForgotIdErrors({ email: "", dni: "" });
    setForgotGeneralErr("");

    let ok = true;
    if (!isEmail(forgotIdValues.email)) {
      setForgotIdErrors((p) => ({
        ...p,
        email: "Email institucional inválido",
      }));
      ok = false;
    }
    if (!/^\d{6,10}$/.test(forgotIdValues.dni)) {
      setForgotIdErrors((p) => ({
        ...p,
        dni: "Cédula inválida (6–10 dígitos)",
      }));
      ok = false;
    }
    if (!ok) return;

    try {
      const resp = await verifyUserIdentityApi({
        email: forgotIdValues.email,
        dni: forgotIdValues.dni,
      });
      if (!resp?.ok) {
        setForgotGeneralErr("Combinación no válida o usuario no encontrado.");
        return;
      }
      setForgotEmailFixed(forgotIdValues.email);
      setForgotStep(2);
    } catch (err) {
      setForgotGeneralErr(err.message || "No pudimos validar tu identidad");
    }
  }

  const [forgotResetValues, setForgotResetValues] = useState({
    pass: "",
    confirm: "",
  });
  const [forgotResetErrors, setForgotResetErrors] = useState({
    pass: "",
    confirm: "",
  });
  const forgotRules = useMemo(
    () => ({
      len: forgotResetValues.pass.length >= 8,
      upper: /[A-ZÁÉÍÓÚÑ]/.test(forgotResetValues.pass),
      special: /[^A-Za-z0-9]/.test(forgotResetValues.pass),
    }),
    [forgotResetValues.pass]
  );
  const [forgotOkBurst, setForgotOkBurst] = useState(false);

  async function handleForgotReset(e) {
    e.preventDefault();
    setForgotResetErrors({ pass: "", confirm: "" });

    if (!(forgotRules.len && forgotRules.upper && forgotRules.special)) {
      setForgotResetErrors((p) => ({ ...p, pass: "Contraseña insegura" }));
    }
    if (forgotResetValues.confirm !== forgotResetValues.pass) {
      setForgotResetErrors((p) => ({
        ...p,
        confirm: "Las contraseñas no coinciden",
      }));
    }

    if (
      forgotRules.len &&
      forgotRules.upper &&
      forgotRules.special &&
      forgotResetValues.confirm === forgotResetValues.pass
    ) {
      try {
        await resetPasswordApi({
          email: forgotEmailFixed,
          dni: forgotIdValues.dni,
          newPassword: forgotResetValues.pass,
        });
        setForgotOkBurst(true);
        setMode("login");
        setForgotStep(1);
        setLoginValues((v) => ({ ...v, email: forgotEmailFixed, pass: "" }));
        setForgotIdValues({ email: "", dni: "" });
        setForgotResetValues({ pass: "", confirm: "" });
      } catch (err) {
        setForgotResetErrors((p) => ({
          ...p,
          pass: err.message || "Error al actualizar contraseña",
        }));
      }
    }
  }

  /* --------- Accesibilidad --------- */
  const firstFieldRef = useRef(null);
  useEffect(() => {
    firstFieldRef.current?.focus?.();
  }, [mode, forgotStep, signupStep]);

  const showStepper =
    (mode === "forgot" && (forgotStep === 1 || forgotStep === 2)) ||
    (mode === "signup" && (signupStep === 1 || signupStep === 2));

  const stepIndex =
    mode === "forgot" ? forgotStep - 1 : mode === "signup" ? signupStep - 1 : 0;

  return (
    <div className="min-h-screen bg-[#0f1422] text-white flex items-start md:items-center justify-center">
      <div className="w-full max-w-[1400px] px-4 py-6 sm:py-8 md:py-10">
        <div className="grid items-start md:items-center gap-8 sm:gap-10 md:gap-12 lg:gap-16 lg:grid-cols-[440px_minmax(0,1fr)]">
          {/* Columna izquierda */}
          <div className="w-full">
            <div className={`${FORM_WIDTH} mx-auto mb-6 sm:mb-8`}>
              <img
                src={brandLogo}
                alt="Urbanik"
                className="mx-auto block w-[68%] sm:w-[64%] md:w-[60%]"
              />
            </div>

            {/* Tabs */}
            <div className={`${FORM_WIDTH} mx-auto mb-4`}>
              <div className="relative flex items-center justify-between bg-white/5 rounded-full p-1">
                {tabs.map((t) => {
                  const active = mode === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => {
                        setMode(t.key);
                        if (t.key === "forgot") setForgotStep(1);
                        if (t.key === "signup") setSignupStep(1);
                      }}
                      className="relative z-10 flex-1 py-2 text-xs sm:text-sm rounded-full"
                    >
                      <motion.span
                        className={`block text-center ${
                          active ? "text-white" : "text-white/65"
                        }`}
                        whileTap={{ scale: 0.98 }}
                      >
                        {t.label}
                      </motion.span>
                      {active && (
                        <motion.span
                          layoutId="tab-underline"
                          className="absolute inset-0 rounded-full bg-white/10"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 36,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={`${FORM_WIDTH} mx-auto relative rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/10 p-4 sm:p-5 md:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]`}
            >
              {showStepper && <ProgressDots total={2} index={stepIndex} />}

              <motion.div
                key={`${mode}-${forgotStep}-${signupStep}`}
                variants={formContainerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="min-h-[360px] sm:min-h-[400px] md:min-h-[420px]"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {mode === "login" && (
                    <motion.div layout key="login" className="relative">
                      <AnimatePresence>
                        {loginOkBurst && (
                          <motion.div
                            key="ok-burst"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1.02 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            transition={{ duration: 0.25 }}
                            className="absolute -top-2 -right-2 text-emerald-400"
                            aria-hidden
                          >
                            ✓
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <LoginForm
                        onSubmit={handleLoginSubmit}
                        onToForgot={() => {
                          setMode("forgot");
                          setForgotStep(1);
                        }}
                        onToSignup={() => {
                          setMode("signup");
                        }}
                        errors={loginErrors}
                        values={loginValues}
                        setValues={setLoginValues}
                        isLoading={isLoggingIn}
                      />
                      <div className="sr-only" aria-live="polite">
                        {loginErrors?.email || loginErrors?.pass
                          ? "Hay errores en el formulario"
                          : ""}
                      </div>
                    </motion.div>
                  )}

                  {/* SIGNUP */}
                  {mode === "signup" && signupStep === 1 && (
                    <motion.div key="signup-1" layout>
                      <SignupPersonalStep
                        values={credValues}
                        setValues={setCredValues}
                        errors={credErrors}
                        onNext={handleSignupNextStep}
                        onToLogin={() => {
                          setMode("login");
                          setSignupStep(1);
                        }}
                      />
                    </motion.div>
                  )}

                  {mode === "signup" && signupStep === 2 && (
                    <motion.div key="signup-2" layout>
                      <SignupCredentialsStep
                        emailFixed={credValues.email}
                        values={credValues}
                        setValues={setCredValues}
                        errors={credErrors}
                        rules={signupRules}
                        onBack={() => setSignupStep(1)}
                        onSubmit={handleSignupSubmit}
                        onToLogin={() => {
                          setMode("login");
                          setSignupStep(1);
                        }}
                      />
                    </motion.div>
                  )}

                  {mode === "forgot" && forgotStep === 1 && (
                    <motion.div
                      key="forgot-1"
                      layout
                      animate={forgotGeneralErr ? { x: [0, -6, 6, -4, 0] } : {}}
                      transition={{ duration: 0.35 }}
                    >
                      <ForgotIdentityStep
                        values={forgotIdValues}
                        setValues={setForgotIdValues}
                        errors={forgotIdErrors}
                        generalError={forgotGeneralErr}
                        isVerifying={false}
                        onValidate={handleForgotValidate}
                        onToLogin={() => setMode("login")}
                      />
                      <div className="sr-only" aria-live="assertive">
                        {forgotGeneralErr}
                      </div>
                    </motion.div>
                  )}

                  {mode === "forgot" && forgotStep === 2 && (
                    <motion.div key="forgot-2" layout>
                      <AnimatePresence>
                        {forgotOkBurst && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute -top-2 -right-2 text-emerald-400"
                          >
                            ✓
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <ForgotResetStep
                        emailFixed={forgotEmailFixed}
                        values={forgotResetValues}
                        setValues={setForgotResetValues}
                        errors={forgotResetErrors}
                        rules={forgotRules}
                        onBack={() => setForgotStep(1)}
                        onSubmit={handleForgotReset}
                        onToLogin={() => setMode("login")}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>

          {/* Columna derecha: hero */}
          <div className="hidden lg:flex justify-end pr-3">
            <motion.div
              className="relative overflow-hidden rounded-[36px] w-[min(64vw,1200px)] max-w-[1200px]"
              initial={{ y: 6 }}
              animate={{ y: 0 }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
            >
              <motion.img
                src={hero}
                alt="Escena de bienvenida"
                className="block w-full h-[65vh] object-cover rounded-[36px] will-change-transform"
                initial={{ scale: 1.02 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8 }}
              />

              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[36px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(15,20,34,0.0) 0%, rgba(15,20,34,0.08) 60%, rgba(15,20,34,0.18) 100%)",
                }}
              />

              <div className="absolute bottom-6 right-6 z-10 flex items-center gap-9 pr-1">
                <img
                  src={partner2}
                  alt="Partner 2"
                  className="h-[162px] w-auto opacity-95"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
