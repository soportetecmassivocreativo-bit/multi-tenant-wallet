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

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message };

    revalidatePath("/", "layout");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al conectar con el servidor.";
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
