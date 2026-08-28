"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface AuthState {
  error?: string;
  message?: string;
}

export async function signIn(
  _prev: AuthState | null,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured)
    return { error: "Configura Supabase (.env.local o variables en Vercel) para iniciar sesión." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) return { error: "Escribe tu correo electrónico." };
  if (!password) return { error: "Escribe tu contraseña." };

  try {
    const supabase = await createClient();

    // Timeout de 10 segundos para no dejar al usuario colgado infinitamente
    const authPromise = supabase.auth.signInWithPassword({ email, password });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), 10000)
    );

    const { error } = await Promise.race([authPromise, timeoutPromise]);

    if (error) {
      if (error.message === "Invalid login credentials")
        return { error: "Correo o contraseña incorrectos." };
      if (error.message === "Email not confirmed")
        return { error: "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada." };
      return { error: error.message };
    }

    revalidatePath("/", "layout");
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "TIMEOUT")
      return { error: "El servidor tardó demasiado en responder. Intenta de nuevo en unos segundos." };
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return { error: `Error de conexión: ${message}` };
  }
  redirect("/dashboard");
}

export async function signUp(
  _prev: AuthState | null,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured)
    return { error: "Configura Supabase (.env.local o variables en Vercel) para registrarte." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("company_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const mode = String(formData.get("mode") ?? "empresa"); // empresa | invited

  if (password.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (mode === "empresa" && !companyName)
    return { error: "Escribe el nombre de tu empresa." };

  let sessionExists = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { mode, company_name: companyName, full_name: fullName } },
    });
    if (error) {
      if (mode === "invited")
        return {
          error:
            "No encontramos una invitación para ese correo. Pídele a tu empresa que te invite primero.",
        };
      return { error: error.message };
    }

    sessionExists = !!data.session;
    if (!sessionExists) {
      return { message: "Cuenta creada. Revisa tu correo si requiere confirmación o inicia sesión." };
    }

    revalidatePath("/", "layout");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al conectar con el servidor.";
    return { error: `Error de conexión: ${message}` };
  }

  redirect("/dashboard");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
