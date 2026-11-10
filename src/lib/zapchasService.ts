import { Prisma } from '@prisma/client';

export class ZapchasValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function parsePositiveInt(val: unknown, fieldName = 'Soni'): number {
  const num = Number(val);
  if (!Number.isInteger(num) || num <= 0) {
    throw new ZapchasValidationError(`${fieldName} musbat butun son bo'lishi kerak.`);
  }
  return num;
}

export function parseNonNegativeInt(val: unknown, fieldName = 'Soni'): number {
  const num = Number(val);
  if (!Number.isInteger(num) || num < 0) {
    throw new ZapchasValidationError(`${fieldName} 0 yoki musbat butun son bo'lishi kerak.`);
  }
  return num;
}

export function parseOptionalPrice(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const cleaned = typeof val === 'string' ? val.replace(/\s+/g, '') : val;
  const num = Number(cleaned);
  if (Number.isNaN(num) || num < 0) {
    throw new ZapchasValidationError("Narx noto'g'ri formatda kiritilgan.");
  }
  return num;
}

export async function findOrCreateZapchasPart(
  tx: Prisma.TransactionClient,
  input: {
    partId?: string;
    partName?: string;
    unit?: string;
    price?: number | null;
    minQuantity?: number;
    note?: string | null;
  }
) {
  if (input.partId) {
    const existing = await tx.zapchasPart.findUnique({ where: { id: input.partId } });
    if (!existing) {
      throw new ZapchasValidationError('Tanlangan zapchas topilmadi.', 404);
    }
    return existing;
  }

  const trimmedName = (input.partName || '').trim();
  if (!trimmedName) {
    throw new ZapchasValidationError('Zapchas nomini kiriting.');
  }

  const existingByName = await tx.zapchasPart.findFirst({
    where: { name: { equals: trimmedName, mode: 'insensitive' } },
  });
  if (existingByName) {
    return existingByName;
  }

  return tx.zapchasPart.create({
    data: {
      name: trimmedName,
      unit: (input.unit || 'dona').trim() || 'dona',
      quantity: 0,
      minQuantity: input.minQuantity ?? 0,
      price: input.price ?? null,
      note: input.note?.trim() || null,
    },
  });
}

export async function applyStockDecrement(
  tx: Prisma.TransactionClient,
  partId: string,
  qty: number
) {
  const existing = await tx.zapchasPart.findUnique({ where: { id: partId } });
  if (!existing) {
    throw new ZapchasValidationError('Zapchas topilmadi.', 404);
  }

  const updatedCount = await tx.zapchasPart.updateMany({
    where: { id: partId, quantity: { gte: qty } },
    data: { quantity: { decrement: qty } },
  });

  if (updatedCount.count === 0) {
    throw new ZapchasValidationError(
      `"${existing.name}" uchun omborda yetarli qoldiq yo'q (Mavjud: ${existing.quantity} ${existing.unit}).`,
      400
    );
  }

  const updatedPart = await tx.zapchasPart.findUniqueOrThrow({ where: { id: partId } });
  return updatedPart;
}

export async function applyStockIncrement(
  tx: Prisma.TransactionClient,
  partId: string,
  qty: number,
  optionalUpdates?: {
    unit?: string;
    price?: number | null;
    minQuantity?: number;
  }
) {
  const data: Prisma.ZapchasPartUpdateInput = {
    quantity: { increment: qty },
  };
  if (optionalUpdates?.unit && optionalUpdates.unit.trim()) {
    data.unit = optionalUpdates.unit.trim();
  }
  if (optionalUpdates?.price !== undefined && optionalUpdates.price !== null) {
    data.price = optionalUpdates.price;
  }
  if (optionalUpdates?.minQuantity !== undefined) {
    data.minQuantity = optionalUpdates.minQuantity;
  }

  return tx.zapchasPart.update({
    where: { id: partId },
    data,
  });
}
