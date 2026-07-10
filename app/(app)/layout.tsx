import { BottomNav } from "@/components/layout/bottom-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col">
      <main className="flex-1 px-5 pb-28 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
