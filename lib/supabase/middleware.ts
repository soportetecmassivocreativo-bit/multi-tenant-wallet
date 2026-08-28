import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

const PUBLIC_PATHS = ["/login", "/registro", "/auth"];

/** Refresca la sesión y protege las rutas de la app (solo si Supabase está configurado). */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar rutas de API y si Supabase no está configurado
  if (pathname.startsWith("/api") || !isSupabaseConfigured) {
    return NextResponse.next({ request });
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const cookies = request.cookies.getAll();
  const hasAuthCookie = cookies.some(
    (c) => c.name.includes("-auth-token") || c.name.startsWith("sb-")
  );

  // Si no hay cookies de autenticación, resolvemos al instante sin latencia de red
  if (!hasAuthCookie) {
    if (isPublic) {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // Timeout de 2.5s para evitar que el middleware se cuelgue en Edge
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 2500)
    );

    const {
      data: { user },
    } = await Promise.race([userPromise, timeoutPromise]);

    // Sin sesión y ruta protegida → login.
    if (!user && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Con sesión en una ruta de auth → dashboard.
    if (user && isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  } catch (err) {
    console.error("Middleware auth error:", err);
  }

  return response;
}

