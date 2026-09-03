import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getTenantBySlug,
  getTenantFromHost,
  TENANT_COOKIE_NAME,
  type TenantConfig,
} from "@/lib/supabase/tenants-config";

const PUBLIC_PATHS = ["/login", "/registro", "/auth"];

/**
 * Middleware Multi-Tenant:
 * 1. Detecta el tenant por subdominio, parámetro ?tenant= o cookie.
 * 2. Inyecta headers de tenant (x-tenant-slug, x-tenant-name, x-tenant-url).
 * 3. Valida y refresca la sesión en la base de datos de Supabase de ESE tenant específico.
 */
export async function updateSession(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Detección de Tenant
  const host = request.headers.get("host") || request.nextUrl.host;
  const tenantFromHost = getTenantFromHost(host);
  
  const queryTenantSlug = searchParams.get("tenant");
  const cookieTenantSlug = request.cookies.get(TENANT_COOKIE_NAME)?.value;
  
  let activeTenant: TenantConfig = tenantFromHost;
  if (queryTenantSlug) {
    activeTenant = getTenantBySlug(queryTenantSlug);
  } else if (cookieTenantSlug && tenantFromHost.slug === "massivo") {
    activeTenant = getTenantBySlug(cookieTenantSlug);
  }

  // Clonar headers e inyectar datos del tenant para Server Components y Actions
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-slug", activeTenant.slug);
  requestHeaders.set("x-tenant-name", activeTenant.name);
  requestHeaders.set("x-tenant-url", activeTenant.supabaseUrl);

  // Ignorar rutas de API internas o estáticos
  if (pathname.startsWith("/api")) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("x-tenant-slug", activeTenant.slug);
    return res;
  }

  const isConfigured =
    activeTenant.supabaseUrl.startsWith("http") &&
    activeTenant.supabaseAnonKey.length > 20;

  if (!isConfigured) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.cookies.set(TENANT_COOKIE_NAME, activeTenant.slug, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const cookiesList = request.cookies.getAll();
  const hasAuthCookie = cookiesList.some(
    (c) => c.name.includes("-auth-token") || c.name.startsWith("sb-")
  );

  // Respuesta base con headers inyectados y cookie de tenant sincronizada
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.cookies.set(TENANT_COOKIE_NAME, activeTenant.slug, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.headers.set("x-tenant-slug", activeTenant.slug);

  // Limpiar cookies infladas para prevenir error 431 y excepciones en el cliente
  for (const c of cookiesList) {
    if (c.name.startsWith("m_wallet_system_config") && c.value.length > 3000) {
      response.cookies.delete(c.name);
    }
  }

  // Si no hay cookies de autenticación, resolvemos al instante
  if (!hasAuthCookie) {
    if (isPublic) {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectRes = NextResponse.redirect(url);
    redirectRes.cookies.set(TENANT_COOKIE_NAME, activeTenant.slug, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return redirectRes;
  }

  try {
    const supabase = createServerClient(
      activeTenant.supabaseUrl,
      activeTenant.supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
            response.cookies.set(TENANT_COOKIE_NAME, activeTenant.slug, {
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          },
        },
      }
    );

    // Timeout de 2.5s para evitar que el middleware se cuelgue en Edge
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 2500)
    );

    const {
      data: { user },
    } = await Promise.race([userPromise, timeoutPromise]);

    // Si el host corresponde al portal master multi-tenant (multi-tenant-wallet o muti-tenant-wallet)
    const isMasterPortal =
      host.includes("multi-tenant") ||
      host.includes("muti-tenant") ||
      process.env.NEXT_PUBLIC_APP_MODE === "master";

    if (isMasterPortal && (pathname === "/" || pathname === "/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/empresas";
      const redirectRes = NextResponse.redirect(url);
      redirectRes.cookies.set(TENANT_COOKIE_NAME, activeTenant.slug, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return redirectRes;
    }

    // Sin sesión y ruta protegida → login.
    if (!user && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const redirectRes = NextResponse.redirect(url);
      redirectRes.cookies.set(TENANT_COOKIE_NAME, activeTenant.slug, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return redirectRes;
    }

    // Con sesión en una ruta de auth → dashboard o panel master según el dominio.
    if (user && isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = isMasterPortal ? "/admin/empresas" : "/dashboard";
      const redirectRes = NextResponse.redirect(url);
      redirectRes.cookies.set(TENANT_COOKIE_NAME, activeTenant.slug, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return redirectRes;
    }
  } catch (err) {
    console.error("Middleware auth error:", err);
  }

  return response;
}
