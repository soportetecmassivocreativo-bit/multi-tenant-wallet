# 🔌 Conectar M-Wallet con Supabase

La app funciona **sin Supabase** (modo demo con datos de ejemplo). Para activar la base
de datos real, la autenticación y la persistencia, sigue estos pasos.

## 1. Crear el proyecto
1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Nombre: `m-wallet`. Región: la más cercana (ej. *East US*). Define una contraseña de BD.
3. Espera ~2 min a que se aprovisione.

## 2. Obtener las claves
En el proyecto: **Project Settings → API**. Copia:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Pégalas en el archivo **`.env.local`** (ya existe en la raíz):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```
> La `anon key` es pública (segura para el frontend). **No** copies la `service_role`.

## 3. Crear las tablas
En Supabase: **SQL Editor → New query** → pega el contenido de
[`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) → **Run**.
Esto crea todas las tablas, la seguridad por empresa (RLS) y el trigger que crea tu
empresa + perfil al registrarte.

## 4. (Opcional) Registro sin confirmar correo
Para probar más rápido: **Authentication → Providers → Email** → desactiva
*"Confirm email"*. (Si lo dejas activo, deberás confirmar por correo al registrarte.)

## 5. Reiniciar y usar
1. Reinicia el servidor: `npm run dev`.
2. Abre la app → te llevará a **/login** → **Regístrate** con el nombre de tu empresa.
3. Al registrarte se crea automáticamente tu empresa y tu perfil.

## 6. (Opcional) Datos de ejemplo
Para no empezar con la base vacía: **SQL Editor** → pega
[`supabase/seed_demo.sql`](../supabase/seed_demo.sql) → **Run**, luego ejecuta:
```sql
select public.seed_demo('tu-correo@ejemplo.com');
```

---
Mientras `.env.local` esté vacío, la app sigue en **modo demo** (datos mock, sin login).
