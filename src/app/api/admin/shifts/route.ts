import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';
import { normalizePaymentMethod } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activeShift = await prisma.cashShift.findFirst({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' }
    });

    let currentStats = null;
    if (activeShift) {
      // Calculate real-time cash in and cash out since shift opened
      const [salePayments, rawSales, expenses] = await Promise.all([
        prisma.salePayment.findMany({
          where: { createdAt: { gte: activeShift.openedAt } }
        }),
        prisma.sale.findMany({
          where: {
            createdAt: { gte: activeShift.openedAt },
            payments: { none: {} } // sales without payments relation
          }
        }),
        prisma.expense.findMany({
          where: { createdAt: { gte: activeShift.openedAt } }
        })
      ]);

      let cashIn = 0;
      salePayments.forEach(p => {
        if (normalizePaymentMethod(p.method) === 'Naqd') {
          cashIn += p.amount;
        }
      });
      rawSales.forEach(s => {
        if (normalizePaymentMethod(s.paymentMethod) === 'Naqd') {
          cashIn += (s.advance || s.totalPrice || 0);
        }
      });

      let cashOut = 0;
      expenses.forEach(e => {
        if (normalizePaymentMethod(e.paymentMethod) === 'Naqd') {
          cashOut += e.amount;
        }
      });

      const expectedCash = activeShift.startAmount + cashIn - cashOut;

      currentStats = {
        cashIn,
        cashOut,
        expectedCash
      };
    }

    const recentShifts = await prisma.cashShift.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({
      activeShift,
      currentStats,
      recentShifts
    });
  } catch (error) {
    console.error('Error fetching cash shift:', error);
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, startAmount, actualCash, user, note } = body;
    const actorName = user?.name || user?.username || 'Admin';

    if (action === 'open') {
      const existing = await prisma.cashShift.findFirst({
        where: { status: 'OPEN' }
      });
      if (existing) {
        return NextResponse.json({ error: 'Oldingi kassa smenasi hali yopilmagan! Avval uni yakunlang.' }, { status: 400 });
      }

      const initialAmount = Math.max(0, parseFloat(startAmount) || 0);
      const shift = await prisma.cashShift.create({
        data: {
          openedBy: actorName,
          startAmount: initialAmount,
          status: 'OPEN'
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          action: 'OPEN_SHIFT',
          entity: 'CashShift',
          entityId: shift.id,
          details: `Kassa smenasi ochildi. Boshlang'ich qoldiq: ${initialAmount.toLocaleString()} so'm`,
          user: actorName
        }
      });

      // Send Telegram alert
      try {
        if (process.env.BOT_TOKEN) {
          const bot = new Telegraf(process.env.BOT_TOKEN);
          const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
          const timeStr = new Date().toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });

          const msg = 
`🟢 <b>KASSA SMENASI OCHILDI</b>

👤 <b>Mas'ul:</b> ${actorName}
💵 <b>Boshlang'ich kassa:</b> ${initialAmount.toLocaleString()} so'm
⏰ <b>Vaqt:</b> soat ${timeStr}

<i>Kassa faoliyati va barcha naqd amallar hisoblanmoqda.</i>`;

          for (const admin of admins) {
            if (admin.telegramId) {
              await bot.telegram.sendMessage(admin.telegramId, msg, { parse_mode: 'HTML' }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error('Shift open telegram alert failed:', err);
      }

      return NextResponse.json({ success: true, shift });
    }

    if (action === 'close') {
      const activeShift = await prisma.cashShift.findFirst({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' }
      });

      if (!activeShift) {
        return NextResponse.json({ error: 'Ochiq smena topilmadi!' }, { status: 404 });
      }

      // Calculate cash collected
      const [salePayments, rawSales, expenses] = await Promise.all([
        prisma.salePayment.findMany({
          where: { createdAt: { gte: activeShift.openedAt } }
        }),
        prisma.sale.findMany({
          where: {
            createdAt: { gte: activeShift.openedAt },
            payments: { none: {} }
          }
        }),
        prisma.expense.findMany({
          where: { createdAt: { gte: activeShift.openedAt } }
        })
      ]);

      let cashIn = 0;
      salePayments.forEach(p => {
        if (normalizePaymentMethod(p.method) === 'Naqd') {
          cashIn += p.amount;
        }
      });
      rawSales.forEach(s => {
        if (normalizePaymentMethod(s.paymentMethod) === 'Naqd') {
          cashIn += (s.advance || s.totalPrice || 0);
        }
      });

      let cashOut = 0;
      expenses.forEach(e => {
        if (normalizePaymentMethod(e.paymentMethod) === 'Naqd') {
          cashOut += e.amount;
        }
      });

      const expectedCash = activeShift.startAmount + cashIn - cashOut;
      const handedCash = Math.max(0, parseFloat(actualCash) || 0);
      const difference = handedCash - expectedCash;

      const now = new Date();
      const updatedShift = await prisma.cashShift.update({
        where: { id: activeShift.id },
        data: {
          closedBy: actorName,
          closedAt: now,
          cashIn,
          cashOut,
          expectedCash,
          actualCash: handedCash,
          difference,
          note: note ? String(note).trim() : null,
          status: 'CLOSED'
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          action: 'CLOSE_SHIFT',
          entity: 'CashShift',
          entityId: activeShift.id,
          details: `Z-Hisobot: Kutilgan naqd: ${expectedCash.toLocaleString()} so'm, Sanab topshirildi: ${handedCash.toLocaleString()} so'm, Farq: ${difference.toLocaleString()} so'm`,
          user: actorName
        }
      });

      // Send Telegram Z-Report to all Admins
      try {
        if (process.env.BOT_TOKEN) {
          const bot = new Telegraf(process.env.BOT_TOKEN);
          const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });

          const openTime = new Date(activeShift.openedAt).toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
          const closeTime = now.toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
          const closeDate = now.toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long' });

          let diffBadge = '✅ To\'liq mos keldi (0 so\'m)';
          if (difference > 0) {
            diffBadge = `📈 Ortiqcha: +${difference.toLocaleString()} so'm`;
          } else if (difference < 0) {
            diffBadge = `⚠️ Kamomad: ${difference.toLocaleString()} so'm`;
          }

          const zReportMsg = 
`🧾 <b>KASSA SMENASI YOPILDI (Z-HISOBOT)</b>
📅 Sana: ${closeDate}

👤 <b>Mas'ul xodim:</b> ${actorName}
⏰ <b>Smena vaqti:</b> ${openTime} — ${closeTime}

💵 <b>Boshlang'ich kassa:</b> ${activeShift.startAmount.toLocaleString()} so'm
➕ <b>Naqd savdo tushumi:</b> ${cashIn.toLocaleString()} so'm
➖ <b>Naqd xarajatlar:</b> ${cashOut.toLocaleString()} so'm
━━━━━━━━━━━━━━━━━━━━
📊 <b>Kassada bo'lishi kerak:</b> <b>${expectedCash.toLocaleString()} so'm</b>
💰 <b>Sanab topshirildi (Inkassatsiya):</b> <b>${handedCash.toLocaleString()} so'm</b>
⚖️ <b>Farq holati:</b> <b>${diffBadge}</b>${note ? `\n\n📝 <b>Izoh:</b> ${note}` : ''}

<i>Kassa smenasi muvaffaqiyatli arxivlandi.</i>`;

          for (const admin of admins) {
            if (admin.telegramId) {
              await bot.telegram.sendMessage(admin.telegramId, zReportMsg, { parse_mode: 'HTML' }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error('Z-report telegram alert failed:', err);
      }

      return NextResponse.json({ success: true, shift: updatedShift });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error handling shift:', error);
    return NextResponse.json({ error: 'Failed to process shift' }, { status: 500 });
  }
}
