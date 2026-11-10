export interface ZapchasPartItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  price: number | null;
  note: string | null;
  totalIn?: number;
  totalOut?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ZapchasTxItem {
  id: string;
  partId: string;
  type: 'IN' | 'OUT' | 'ADJUST' | string;
  quantity: number;
  quantityDelta: number;
  balanceAfter: number;
  unitPrice: number | null;
  totalPrice: number | null;
  customerName: string | null;
  note: string | null;
  userId: string;
  createdAt: string;
  part: {
    id: string;
    name: string;
    unit: string;
  };
  user?: {
    id: string;
    name: string;
    role: string;
    telegramId?: string;
  };
}

export interface ZapchasSummary {
  totalParts: number;
  totalStock: number;
  outOfStockCount: number;
  lowStockCount: number;
  todayIn: number;
  todayOut: number;
}

export interface ZapchasPermissions {
  canSell: boolean;
  canManage: boolean;
  isAdmin: boolean;
}

export const ZAPCHAS_UNITS = ['dona', 'juft', 'komplekt', 'metr', 'kg', 'quti'] as const;

export function formatAmountInput(val: string): string {
  const raw = val.replace(/\D/g, '');
  if (!raw) return '';
  return Number(raw).toLocaleString('uz-UZ').replace(/,/g, ' ');
}

export function getStockStatusBadge(quantity: number, minQuantity: number) {
  if (quantity <= 0) {
    return {
      label: 'Tugagan (0)',
      className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    };
  }
  if (minQuantity > 0 && quantity <= minQuantity) {
    return {
      label: `Kam (${quantity})`,
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
  }
  return {
    label: `Mavjud: ${quantity}`,
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  };
}
