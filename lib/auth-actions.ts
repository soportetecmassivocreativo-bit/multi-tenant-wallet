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
    return { error: "Configura Supabase (.env.local) para iniciar sesión." };

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Correo o contraseña incorrectos." };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(
  _prev: AuthState | null,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured)
    return { error: "Configura Supabase (.env.local) para registrarte." };

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("company_name") ?? "");
  const fullName = String(formData.get("full_name") ?? "");

  if (password.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { company_name: companyName, full_name: fullName } },
  });
  if (error) return { error: error.message };

  if (!data.session) {
    return { message: "Revisa tu correo para confirmar la cuenta." };
  }

  revalidatePath("/", "layout");
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
