// src/lib/formatters.ts
// To'lov usullari va umumiy formatlash funksiyalari

export function normalizePaymentMethod(method?: string | null): string {
  if (!method) return 'Naqd';
  const m = method.trim();
  const lower = m.toLowerCase();

  if (m === 'CASH' || lower === 'naqd') return 'Naqd';
  if (m === 'CARD' || lower === 'karta') return 'Karta';
  if (lower === 'terminal') return 'Terminal';
  if (m === 'CORPORATE' || lower === 'karparativ' || lower === 'korporativ') return 'Karparativ';
  if (m === 'INSTALLMENT' || lower === 'nasiya' || lower === 'avans') return 'Nasiya';
  if (lower === 'aralash') return 'Aralash';
  return m;
}

export function formatPaymentMethod(
  method?: string | null,
  payments?: { method: string; amount: number }[]
): string {
  if (payments && payments.length > 1) {
    return payments
      .map(p => `${normalizePaymentMethod(p.method)}: ${p.amount.toLocaleString()} so'm`)
      .join(' + ');
  }
  if (payments && payments.length === 1) {
    return normalizePaymentMethod(payments[0].method);
  }
  return normalizePaymentMethod(method);
}

export function getPaymentMethodColor(method?: string | null): {
  bg: string;
  text: string;
  border: string;
} {
  const norm = normalizePaymentMethod(method);
  switch (norm) {
    case 'Naqd':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800'
      };
    case 'Karta':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800'
      };
    case 'Terminal':
      return {
        bg: 'bg-cyan-50 dark:bg-cyan-950/40',
        text: 'text-cyan-700 dark:text-cyan-300',
        border: 'border-cyan-200 dark:border-cyan-800'
      };
    case 'Karparativ':
      return {
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        text: 'text-indigo-700 dark:text-indigo-300',
        border: 'border-indigo-200 dark:border-indigo-800'
      };
    case 'Nasiya':
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800'
      };
    case 'Aralash':
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800'
      };
    default:
      return {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700'
      };
  }
}
