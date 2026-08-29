import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile, getCompany } from "@/lib/data";
import { ProfileForm } from "@/components/perfil/profile-form";
import { PasswordForm } from "@/components/perfil/password-form";
import { UserIcon } from "@/components/ui/icons";

export default async function PerfilPage() {
  const [profile, company] = await Promise.all([
    getCurrentProfile(),
    getCompany(),
  ]);

  let userEmail = "massivocreativo@gmail.com";
  let userName = "Miguel Mujica";
  let userRole = profile?.role || "ceo";

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    userEmail = user.email || userEmail;
    userName = user.user_metadata?.full_name || userName;

    const { data: profData } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (profData?.full_name) userName = profData.full_name;
    if (profData?.role) userRole = profData.role;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95">
          ‹ Más
        </Link>
      </header>

      <section className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent-bg text-accent font-serif text-2xl font-medium">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl leading-tight tracking-tight">
            {userName}
          </h1>
          <p className="text-xs text-hint">
            {userEmail} · <span className="uppercase font-medium text-accent">{userRole}</span>
          </p>
          {company && (
            <p className="text-[11px] text-muted truncate">
              {company.name}
            </p>
          )}
        </div>
      </section>

      {/* Formulario de personalización de perfil */}
      <ProfileForm
        initialName={userName}
        email={userEmail}
        role={userRole}
      />

      {/* Formulario de cambio de contraseña */}
      <PasswordForm />
    </div>
  );
}
