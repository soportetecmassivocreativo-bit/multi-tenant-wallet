import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile?.company_id) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const companyId = profile.company_id;

  const { data: services } = await supabase
    .from("services")
    .select("id, name")
    .eq("company_id", companyId);

  const supabaseSvc = services?.find((s: { id: string; name: string }) => s.name.toLowerCase().includes("supabase"));
  const claudeSvc = services?.find((s: { id: string; name: string }) => s.name.toLowerCase().includes("claude"));

  const toInsert: object[] = [];
  if (supabaseSvc) {
    toInsert.push({
      company_id: companyId,
      category: "Base de Datos",
      note: "Servicio · Supabase [Pagado y Aprobado]",
      amount: 216.18,
      currency: "USD",
      spent_on: "2026-08-29",
      source: "servicio",
      ref_id: supabaseSvc.id,
    });
  }
  if (claudeSvc) {
    toInsert.push({
      company_id: companyId,
      category: "IA",
      note: "Servicio · Claude [Pagado y Aprobado]",
      amount: 217.75,
      currency: "USD",
      spent_on: "2026-09-01",
      source: "servicio",
      ref_id: claudeSvc.id,
    });
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ ok: false, message: "Servicios no encontrados.", services });
  }

  const { data: inserted, error } = await supabase.from("expenses").insert(toInsert).select("id, note, amount, spent_on");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    message: `Se insertaron ${inserted?.length ?? 0} egreso(s) retroactivos correctamente.`,
    inserted,
  });
}
