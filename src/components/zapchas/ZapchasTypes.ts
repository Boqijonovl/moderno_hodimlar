export interface ZapchasUserProp {
  id?: string;
  telegramId: string;
  name: string;
  role: string;
  active?: boolean;
  canUseZapchas?: boolean;
  canManageZapchas?: boolean;
}

export interface TelegramWebAppProp {
  HapticFeedback?: {
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
}

export interface PaymentMethodOption {
  id: string;
  name: string;
}

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
  zapchasSaleId?: string | null;
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
  zapchasSale?: {
    id: string;
    paymentMethod: string;
    totalPrice: number;
    advance: number;
    balance: number;
    status: string;
  } | null;
}

export interface ZapchasSalePaymentItem {
  id: string;
  method: string;
  amount: number;
  createdAt: string;
}

export interface ZapchasSaleItem {
  id: string;
  userId: string;
  customerName: string | null;
  customerPhone: string | null;
  totalPrice: number;
  advance: number;
  balance: number;
  paymentMethod: string;
  status: string;
  note: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    role: string;
  };
  payments: ZapchasSalePaymentItem[];
  transactions: Array<{
    id: string;
    partId: string;
    quantity: number;
    unitPrice: number | null;
    totalPrice: number | null;
    balanceAfter: number;
    part: {
      id: string;
      name: string;
      unit: string;
    };
  }>;
}

export interface ZapchasSummary {
  totalParts: number;
  totalStock: number;
  outOfStockCount: number;
  lowStockCount: number;
  todayIn: number;
  todayOut: number;
  todaySalesRevenue?: number;
  totalZapchasDebt?: number;
  todayPaymentBreakdown?: Record<string, number>;
}

export interface ZapchasAnalytics {
  inventoryValue: number;
  periodSalesCount: number;
  periodSalesTotal: number;
  periodPaidTotal: number;
  periodDebtTotal: number;
  periodPaymentBreakdown: Record<string, number>;
  topSellers: Array<{
    userId: string;
    name: string;
    salesCount: number;
    totalAmount: number;
    paidAmount: number;
    debtAmount: number;
  }>;
  topParts: Array<{
    partId: string;
    name: string;
    unit: string;
    soldQty: number;
    soldRevenue: number;
  }>;
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

export function parseNumericInput(val: string): number {
  return parseFloat(val.replace(/\s/g, '')) || 0;
}

export function formatPhoneNumberInput(val: string): string {
  if (!val || val === '+998' || val === '+998 ') return '';
  let digits = val.replace(/\D/g, '');
  if (digits.startsWith('998')) {
    digits = digits.slice(3);
  }
  digits = digits.slice(0, 9);
  if (!digits) return '';

  let res = '+998';
  if (digits.length > 0) res += ' ' + digits.slice(0, 2);
  if (digits.length > 2) res += ' ' + digits.slice(2, 5);
  if (digits.length > 5) res += ' ' + digits.slice(5, 7);
  if (digits.length > 7) res += ' ' + digits.slice(7, 9);
  return res;
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
