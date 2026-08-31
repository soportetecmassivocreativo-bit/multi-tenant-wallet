"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { logAuditEvent } from "@/lib/audit";
import { formatEntityCode } from "@/lib/config";
import type { MutationResult } from "@/lib/mutations";

export type AccountType =
  | "banco_nacional"
  | "pago_movil"
  | "banco_internacional"
  | "zelle"
  | "crypto"
  | "billetera_digital"
  | "efectivo";

export interface CompanyAccount {
  id: string;
  code?: string;
  name: string;
  accountType: AccountType;
  currency: "USD" | "VES" | "EUR" | "USDT";
  accountNumber?: string;
  holderName?: string;
  holderId?: string;
  email?: string;
  phone?: string;
  bankName?: string;
  notes?: string;
  isDefault?: boolean;
  active: boolean;
  createdAt: string;
}

const DEFAULT_COMPANY_ACCOUNTS: CompanyAccount[] = [
  {
    id: "cta-1",
    code: "Mas-Corp-Cta-0001",
    name: "Banesco Corriente Nacional",
    accountType: "banco_nacional",
    currency: "VES",
    bankName: "Banesco Banco Universal (0134)",
    accountNumber: "0134-0000-00-0000000000",
    holderName: "Massivo Creativo C.A.",
    holderId: "J-50000000-0",
    notes: "Transferencias directas e interbancarias vía BCV.",
    isDefault: true,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cta-2",
    code: "Mas-Corp-Cta-0002",
    name: "Pago Móvil Banesco",
    accountType: "pago_movil",
    currency: "VES",
    bankName: "Banesco (0134)",
    phone: "0412-0000000",
    holderId: "J-50000000-0",
    holderName: "Massivo Creativo",
    notes: "Reportar número de referencia de 6 dígitos.",
    isDefault: true,
    active: true,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "cta-3",
    code: "Mas-Corp-Cta-0003",
    name: "Zelle Corporativo",
    accountType: "zelle",
    currency: "USD",
    email: "pagos@massivocreativo.com",
    holderName: "Massivo Creativo LLC",
    notes: "Colocar solo el número de factura en el concepto / memo.",
    isDefault: true,
    active: true,
    createdAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "cta-4",
    code: "Mas-Corp-Cta-0004",
    name: "Binance USDT TRC20",
    accountType: "crypto",
    currency: "USDT",
    accountNumber: "TPx9MassivoWalletAddressTronTRC20Sample",
    holderName: "Massivo Binance Pay",
    notes: "Red Tron (TRC-20) o Binance Pay ID: 888999111",
    isDefault: false,
    active: true,
    createdAt: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "cta-5",
    code: "Mas-Corp-Cta-0005",
    name: "Caja Chica Efectivo USD",
    accountType: "efectivo",
    currency: "USD",
    holderName: "Custodio de Caja Principal",
    notes: "Billetes en buen estado, sin roturas ni marcas.",
    isDefault: false,
    active: true,
    createdAt: "2026-01-05T00:00:00.000Z",
  },
];

const ACCOUNTS_COOKIE_NAME = "m_wallet_company_accounts";
const ACCOUNTS_COUNTER_COOKIE = "m_wallet_company_accounts_counter";

export async function getCompanyAccounts(): Promise<CompanyAccount[]> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(ACCOUNTS_COOKIE_NAME)?.value;
    if (raw) {
      let parsed: CompanyAccount[] = JSON.parse(decodeURIComponent(raw));
      if (Array.isArray(parsed) && parsed.length > 0) {
        let needsResave = false;

        // Re-secuenciar las cuentas existentes a 0002 y 0003 si venían de 0004 y 0005
        parsed = parsed.map((a, idx) => {
          if (a.code === "Mas-Corp-Cta-0004" && (idx === 0 || a.name.includes("Binance"))) {
            needsResave = true;
            return { ...a, code: "Mas-Corp-Cta-0002" };
          }
          if (a.code === "Mas-Corp-Cta-0005" && (idx === 1 || a.name.includes("Caja Chica"))) {
            needsResave = true;
            return { ...a, code: "Mas-Corp-Cta-0003" };
          }
          if (!a.code) {
            needsResave = true;
            return { ...a, code: formatEntityCode("Mas-Corp-Cta-", idx + 2, 4) };
          }
          return a;
        });

        if (needsResave) {
          cookieStore.set(ACCOUNTS_COOKIE_NAME, encodeURIComponent(JSON.stringify(parsed)), {
            maxAge: 60 * 60 * 24 * 365,
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
          cookieStore.set(ACCOUNTS_COUNTER_COOKIE, "3", {
            maxAge: 60 * 60 * 24 * 365,
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        }

        return parsed;
      }
    }
  } catch {}

  return DEFAULT_COMPANY_ACCOUNTS;
}

async function saveAccountsToCookie(accounts: CompanyAccount[]) {
  const cookieStore = await cookies();
  cookieStore.set(ACCOUNTS_COOKIE_NAME, encodeURIComponent(JSON.stringify(accounts)), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

async function getNextAccountSequence(currentAccounts: CompanyAccount[]): Promise<number> {
  const cookieStore = await cookies();
  const rawCounter = cookieStore.get(ACCOUNTS_COUNTER_COOKIE)?.value;
  let storedCounter = rawCounter ? parseInt(rawCounter, 10) : 0;
  if (isNaN(storedCounter)) storedCounter = 0;

  // Encontrar el número más alto existente entre los códigos actuales
  const maxFromCodes = currentAccounts.reduce((max, a) => {
    const num = parseInt(a.code?.replace(/\D/g, "") || "0", 10);
    return Math.max(max, isNaN(num) ? 0 : num);
  }, 0);

  const nextNum = Math.max(storedCounter + 1, maxFromCodes + 1, 4);
  return nextNum;
}

async function updateAccountCounterCookie(num: number) {
  const cookieStore = await cookies();
  cookieStore.set(ACCOUNTS_COUNTER_COOKIE, String(num), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export interface AddAccountInput {
  name: string;
  accountType: AccountType;
  currency: "USD" | "VES" | "EUR" | "USDT";
  bankName?: string;
  accountNumber?: string;
  holderName?: string;
  holderId?: string;
  email?: string;
  phone?: string;
  notes?: string;
  isDefault?: boolean;
}

export async function addCompanyAccount(
  input: AddAccountInput
): Promise<MutationResult> {
  try {
    const current = await getCompanyAccounts();
    const nextNum = await getNextAccountSequence(current);

    const newAccount: CompanyAccount = {
      id: `cta-${Date.now()}`,
      code: formatEntityCode("Mas-Corp-Cta-", nextNum, 4),
      name: input.name.trim(),
      accountType: input.accountType,
      currency: input.currency,
      bankName: input.bankName?.trim() || "",
      accountNumber: input.accountNumber?.trim() || "",
      holderName: input.holderName?.trim() || "",
      holderId: input.holderId?.trim() || "",
      email: input.email?.trim() || "",
      phone: input.phone?.trim() || "",
      notes: input.notes?.trim() || "",
      isDefault: Boolean(input.isDefault),
      active: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...current, newAccount];
    await saveAccountsToCookie(updated);
    await updateAccountCounterCookie(nextNum);

    await logAuditEvent({
      action: "account_create",
      entityType: "account",
      description: `Se agregó la cuenta "${newAccount.name}" (${newAccount.currency})`,
      details: { code: newAccount.code, type: newAccount.accountType },
    });

    revalidatePath("/cuentas");
    revalidatePath("/configuracion");
    revalidatePath("/cobros");
    revalidatePath("/gastos");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al guardar cuenta." };
  }
}

export async function updateCompanyAccount(
  id: string,
  input: Partial<AddAccountInput> & { active?: boolean }
): Promise<MutationResult> {
  try {
    const current = await getCompanyAccounts();
    const updated = current.map((a) => {
      if (a.id !== id) return a;
      return {
        ...a,
        name: input.name !== undefined ? input.name.trim() : a.name,
        accountType: input.accountType !== undefined ? input.accountType : a.accountType,
        currency: input.currency !== undefined ? input.currency : a.currency,
        bankName: input.bankName !== undefined ? input.bankName.trim() : a.bankName,
        accountNumber: input.accountNumber !== undefined ? input.accountNumber.trim() : a.accountNumber,
        holderName: input.holderName !== undefined ? input.holderName.trim() : a.holderName,
        holderId: input.holderId !== undefined ? input.holderId.trim() : a.holderId,
        email: input.email !== undefined ? input.email.trim() : a.email,
        phone: input.phone !== undefined ? input.phone.trim() : a.phone,
        notes: input.notes !== undefined ? input.notes.trim() : a.notes,
        isDefault: input.isDefault !== undefined ? input.isDefault : a.isDefault,
        active: input.active !== undefined ? input.active : a.active,
      };
    });

    await saveAccountsToCookie(updated);

    await logAuditEvent({
      action: "account_update",
      entityType: "account",
      entityId: id,
      description: `Se actualizó la cuenta bancaria ID ${id}`,
      details: { id, changes: input },
    });

    revalidatePath("/cuentas");
    revalidatePath("/configuracion");
    revalidatePath("/cobros");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al actualizar cuenta." };
  }
}

export async function deleteCompanyAccount(id: string): Promise<MutationResult> {
  try {
    const current = await getCompanyAccounts();
    const updated = current.filter((a) => a.id !== id);
    await saveAccountsToCookie(updated);

    await logAuditEvent({
      action: "account_delete",
      entityType: "account",
      entityId: id,
      description: `Se eliminó la cuenta bancaria ID ${id}`,
      details: { id },
    });

    revalidatePath("/cuentas");
    revalidatePath("/configuracion");
    revalidatePath("/cobros");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al eliminar cuenta." };
  }
}
