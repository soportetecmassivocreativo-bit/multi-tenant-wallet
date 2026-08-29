import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/lib/supabase/config";

// Edge Runtime: sin cold start, ~100ms arranque, sin límite de 10s
export const runtime = "edge";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase no está configurado." },
      { status: 503 }
    );
  }

  let email: string, password: string;
  try {
    const body = await request.json();
    email = String(body.email ?? "").trim();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!email) return NextResponse.json({ error: "Escribe tu correo electrónico." }, { status: 400 });
  if (!password) return NextResponse.json({ error: "Escribe tu contraseña." }, { status: 400 });

  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    let msg = error.message;
    if (msg === "Invalid login credentials") msg = "Correo o contraseña incorrectos.";
    else if (msg === "Email not confirmed")
      msg = "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.";
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  return response;
}
