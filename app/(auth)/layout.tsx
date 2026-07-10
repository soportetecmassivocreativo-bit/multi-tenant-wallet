import { Logo } from "@/components/ui/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col justify-center px-6 py-10">
      <div className="mb-8 flex justify-center">
        <Logo className="scale-125" />
      </div>
      {children}
    </div>
  );
}
