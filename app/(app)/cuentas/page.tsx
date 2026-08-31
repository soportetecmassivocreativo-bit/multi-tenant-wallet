import { getCompanyAccounts } from "@/lib/cuentas-actions";
import { AccountsManager } from "@/components/cuentas/accounts-manager";

export const metadata = {
  title: "Cuentas Bancarias & Métodos de Pago · M-Wallet",
};

export default async function CuentasPage() {
  const accounts = await getCompanyAccounts();

  return <AccountsManager accounts={accounts} />;
}
