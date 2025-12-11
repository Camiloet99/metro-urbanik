// src/services/testsService.js
import { http } from "@/services/http";

export async function submitInitialTest(payload) {
  await http.post("/progress/me/tests", payload);
  return { ok: true };
}

export async function submitExitTest(payload) {
  await http.post("/progress/me/tests", payload);
  return { ok: true };
}