import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizePaymentMethod } from '@/lib/formatters';
import {
  canManageZapchasUser,
  canSellZapchasUser,
  getTashkentTodayRange,
  isAdminUser,
  resolveZapchasUser,
} from '@/lib/zapchas';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get('telegramId');
    const scope = searchParams.get('scope') === 'admin' ? 'admin' : 'app';
    const typeFilter = searchParams.get('type') || 'ALL';
    const partIdFilter = searchParams.get('partId') || '';
    const search = (searchParams.get('search') || '').trim();
    const monthParam = searchParams.get('month') || '';

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
    }

    const user = await resolveZapchasUser(telegramId);
    if (!user) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }
    if (!canSellZapchasUser(user)) {
      return NextResponse.json({ error: "Zapchas bo'limiga ruxsat berilmagan" }, { status: 403 });
    }

    const isAdmin = isAdminUser(user);
    if (scope === 'admin' && !isAdmin) {
      return NextResponse.json(
        { error: "Faqat adminlar admin nazorat bo'limiga kira oladi" },
        { status: 403 }
      );
    }

    // Admins supervise from Admin Panel (scope=admin); in the employee app (scope=app) Admins only sell.
    // Non-admin assigned managers (canManageZapchas) manage stock inside the app.
    const canManage =
      scope === 'admin'
        ? isAdmin
        : !isAdmin && canManageZapchasUser(user);

    const parts = await prisma.zapchasPart.findMany({
      orderBy: { name: 'asc' },
    });

    let enrichedParts = parts.map((p) => ({
      ...p,
      totalIn: 0,
      totalOut: 0,
    }));

    let todayIn = 0;
    let todayOut = 0;
    let todaySalesRevenue = 0;
    let totalZapchasDebt = 0;
    const todayPaymentBreakdown: Record<string, number> = {};

    if (canManage) {
      const { start, end } = getTashkentTodayRange();
      const [groupedTotals, todayGrouped, todayPayments, debtAgg] = await Promise.all([
        prisma.zapchasTransaction.groupBy({
          by: ['partId', 'type'],
          _sum: { quantity: true },
        }),
        prisma.zapchasTransaction.groupBy({
          by: ['type'],
          where: { createdAt: { gte: start, lte: end } },
          _sum: { quantity: true },
        }),
        prisma.zapchasSalePayment.findMany({
          where: { createdAt: { gte: start, lte: end } },
        }),
        prisma.zapchasSale.aggregate({
          where: { balance: { gt: 0 } },
          _sum: { balance: true },
        }),
      ]);

      const totalsMap = new Map<string, { inQty: number; outQty: number }>();
      groupedTotals.forEach((row) => {
        const entry = totalsMap.get(row.partId) || { inQty: 0, outQty: 0 };
        if (row.type === 'IN') entry.inQty += row._sum.quantity || 0;
        if (row.type === 'OUT') entry.outQty += row._sum.quantity || 0;
        totalsMap.set(row.partId, entry);
      });

      enrichedParts = parts.map((p) => {
        const totals = totalsMap.get(p.id);
        return {
          ...p,
          totalIn: totals?.inQty || 0,
          totalOut: totals?.outQty || 0,
        };
      });

      todayGrouped.forEach((row) => {
        if (row.type === 'IN') todayIn += row._sum.quantity || 0;
        if (row.type === 'OUT') todayOut += row._sum.quantity || 0;
      });

      todayPayments.forEach((p) => {
        const m = normalizePaymentMethod(p.method);
        todayPaymentBreakdown[m] = (todayPaymentBreakdown[m] || 0) + p.amount;
        todaySalesRevenue += p.amount;
      });

      totalZapchasDebt = debtAgg._sum.balance || 0;
    }

    const txWhere: Prisma.ZapchasTransactionWhereInput = canManage
      ? {}
      : { userId: user.id, type: 'OUT' };
    if (canManage && typeFilter && typeFilter !== 'ALL') {
      txWhere.type = typeFilter;
    }
    if (partIdFilter) {
      txWhere.partId = partIdFilter;
    }
    if (search) {
      txWhere.OR = [
        { part: { name: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
      ];
    }

    const salesWhere: Prisma.ZapchasSaleWhereInput = canManage ? {} : { userId: user.id };
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      if (!Number.isNaN(y) && !Number.isNaN(m)) {
        const startOfMonth = new Date(Date.UTC(y, m - 1, 1, -5, 0, 0));
        const endOfMonth = new Date(Date.UTC(y, m, 0, 18, 59, 59, 999));
        salesWhere.createdAt = { gte: startOfMonth, lte: endOfMonth };
      }
    }

    const [transactions, sales] = await Promise.all([
      prisma.zapchasTransaction.findMany({
        where: txWhere,
        include: {
          part: { select: { id: true, name: true, unit: true } },
          user: { select: { id: true, name: true, role: true, telegramId: true } },
          zapchasSale: {
            select: {
              id: true,
              paymentMethod: true,
              totalPrice: true,
              advance: true,
              balance: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: canManage ? 300 : 100,
      }),
      prisma.zapchasSale.findMany({
        where: salesWhere,
        include: {
          user: { select: { id: true, name: true, role: true } },
          payments: { orderBy: { createdAt: 'asc' } },
          transactions: {
            include: {
              part: { select: { id: true, name: true, unit: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: canManage ? 300 : 100,
      }),
    ]);

    const totalStock = parts.reduce((sum, p) => sum + p.quantity, 0);
    const outOfStockCount = parts.filter((p) => p.quantity <= 0).length;
    const lowStockCount = parts.filter(
      (p) => p.quantity > 0 && p.minQuantity > 0 && p.quantity <= p.minQuantity
    ).length;
    const inventoryValue = parts.reduce(
      (sum, p) => sum + p.quantity * (p.price || 0),
      0
    );

    // Compute period analytics for Admin / Manager view
    let analytics: {
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
    } | null = null;

    if (canManage) {
      const periodPaymentBreakdown: Record<string, number> = {};
      const sellerMap = new Map<
        string,
        {
          userId: string;
          name: string;
          salesCount: number;
          totalAmount: number;
          paidAmount: number;
          debtAmount: number;
        }
      >();
      const partMap = new Map<
        string,
        { partId: string; name: string; unit: string; soldQty: number; soldRevenue: number }
      >();

      let periodSalesTotal = 0;
      let periodPaidTotal = 0;
      let periodDebtTotal = 0;

      for (const s of sales) {
        periodSalesTotal += s.totalPrice || 0;
        periodPaidTotal += s.advance || 0;
        periodDebtTotal += s.balance || 0;

        for (const pay of s.payments) {
          const m = normalizePaymentMethod(pay.method);
          periodPaymentBreakdown[m] = (periodPaymentBreakdown[m] || 0) + pay.amount;
        }

        const sellerId = s.userId;
        const sellerName = s.user?.name || "Noma'lum";
        const sellerEntry = sellerMap.get(sellerId) || {
          userId: sellerId,
          name: sellerName,
          salesCount: 0,
          totalAmount: 0,
          paidAmount: 0,
          debtAmount: 0,
        };
        sellerEntry.salesCount += 1;
        sellerEntry.totalAmount += s.totalPrice || 0;
        sellerEntry.paidAmount += s.advance || 0;
        sellerEntry.debtAmount += s.balance || 0;
        sellerMap.set(sellerId, sellerEntry);

        for (const item of s.transactions) {
          const pEntry = partMap.get(item.partId) || {
            partId: item.partId,
            name: item.part.name,
            unit: item.part.unit,
            soldQty: 0,
            soldRevenue: 0,
          };
          pEntry.soldQty += item.quantity;
          pEntry.soldRevenue += item.totalPrice || 0;
          partMap.set(item.partId, pEntry);
        }
      }

      analytics = {
        inventoryValue,
        periodSalesCount: sales.length,
        periodSalesTotal,
        periodPaidTotal,
        periodDebtTotal,
        periodPaymentBreakdown,
        topSellers: Array.from(sellerMap.values()).sort(
          (a, b) => b.totalAmount - a.totalAmount
        ),
        topParts: Array.from(partMap.values())
          .sort((a, b) => b.soldQty - a.soldQty)
          .slice(0, 15),
      };
    }

    return NextResponse.json({
      parts: enrichedParts,
      transactions,
      sales,
      analytics,
      summary: {
        totalParts: parts.length,
        totalStock,
        outOfStockCount,
        lowStockCount,
        todayIn,
        todayOut,
        todaySalesRevenue,
        totalZapchasDebt,
        todayPaymentBreakdown,
      },
      permissions: {
        canSell: true,
        canManage,
        isAdmin,
      },
    });
  } catch (error) {
    console.error('Error fetching zapchas data:', error);
    return NextResponse.json({ error: "Zapchas ma'lumotlarini yuklashda xatolik" }, { status: 500 });
  }
}
