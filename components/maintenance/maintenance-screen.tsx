"use client";

import Link from "next/link";
import Image from "next/image";

interface MaintenanceScreenProps {
  message?: string;
  updatedAt?: string;
}

export function MaintenanceScreen({ message, updatedAt }: MaintenanceScreenProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Luces de fondo decorativas */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg rounded-3xl border border-line bg-card/90 backdrop-blur-xl p-8 sm:p-10 shadow-2xl text-center space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Logo de la empresa */}
        <div className="flex justify-center">
          <div className="relative p-3 rounded-2xl bg-soft border border-line shadow-inner">
            <Image
              src="/logo-massivo-creativo.png"
              alt="M-Wallet"
              width={140}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
        </div>

        {/* Icono de Mantenimiento animado */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl shadow-inner">
              🛠️
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
            </span>
          </div>
        </div>

        {/* Textos */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>●</span> Modo Mantenimiento Activo
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Plataforma en Mantenimiento
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            {message ||
              "Estamos realizando labores de optimización y actualización en los servidores de la plataforma. El acceso se restablecerá automáticamente en breve."}
          </p>
        </div>

        {/* Coordenadas de estado */}
        <div className="rounded-2xl border border-line bg-soft/50 p-4 text-xs text-hint space-y-1">
          <p className="font-medium text-foreground">Sistema Multi-Tenant M-Wallet</p>
          <p>
            {updatedAt
              ? `Iniciado: ${new Date(updatedAt).toLocaleString("es-VE")}`
              : "Operación de actualización en progreso"}
          </p>
          <p className="text-[11px] text-muted">
            Los datos de cada empresa se encuentran seguros y respaldados.
          </p>
        </div>

        {/* Acceso para el Administrador */}
        <div className="pt-2 border-t border-line flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 transition-all active:scale-95"
          >
            <span>Acceso de Administrador</span>
            <span>→</span>
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-xs font-semibold text-muted hover:text-foreground hover:bg-soft transition-all"
          >
            <span>↻ Reintentar Conexión</span>
          </button>
        </div>
      </div>
    </div>
  );
}
