import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function POST(req: Request) {
  try {
    const { items, paymentDetails, telegramId, userId, employeeName, customerName, customerPhone } = await req.json();

    if (!items || !items.length) {
      return NextResponse.json({ error: 'Missing items' }, { status: 400 });
    }
    if (!paymentDetails || !Array.isArray(paymentDetails)) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
    }

    let user;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (telegramId) {
      user = await prisma.user.findUnique({ where: { telegramId: telegramId.toString() } });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.canUseSales) {
      return NextResponse.json({ error: 'Sizga savdo qilish ruxsat etilmagan' }, { status: 403 });
    }

    const totalPrice = items.reduce((acc: number, item: any) => acc + parseFloat(item.price || 0), 0);
    const advance = paymentDetails.reduce((acc: number, p: any) => acc + parseFloat(p.amount || 0), 0);
    const balance = Math.max(0, totalPrice - advance);
    const status = balance > 0 ? 'INCOMPLETE' : 'COMPLETED';
    
    // Determine the main payment method string for backward compatibility
    let paymentMethod = 'Aralash';
    const activePayments = paymentDetails.filter((p: any) => parseFloat(p.amount) > 0);
    if (activePayments.length === 1) {
      paymentMethod = String(activePayments[0].method).trim();
    } else if (activePayments.length === 0) {
      paymentMethod = 'Nasiya';
    } else {
      paymentMethod = 'Aralash';
    }

    const sale = await prisma.sale.create({
      data: {
        userId: user.id,
        customerName: customerName ? String(customerName).trim() : null,
        customerPhone: customerPhone ? String(customerPhone).trim() : null,
        totalPrice,
        advance,
        balance,
        status,
        paymentMethod,
        items: {
          create: items.map((item: any) => ({
            name: String(item.name).trim(),
            price: parseFloat(item.price)
          }))
        },
        payments: {
          create: activePayments.map((p: any) => ({
            method: String(p.method).trim(),
            amount: parseFloat(p.amount)
          }))
        }
      },
      include: { items: true, payments: true }
    });

    // Send notification to all Admins
    try {
      if (process.env.BOT_TOKEN) {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        
        let itemsText = items.map((item: any, i: number) => {
          return `${i+1}. ${item.name} - ${parseFloat(item.price).toLocaleString()} so'm`;
        }).join('\n');
        
        let paymentName = paymentMethod;
        let amountText = `💰 Umumiy summa: <b>${totalPrice.toLocaleString()} so'm</b>`;
        if (balance > 0) {
          amountText += `\n💵 To'langan: <b>${advance.toLocaleString()} so'm</b>\n⚠️ Qoldiq (Qarz): <b>${balance.toLocaleString()} so'm</b>`;
        }
        
        let paymentBreakdown = paymentDetails.filter((p:any) => parseFloat(p.amount) > 0).map((p:any) => `- ${p.method}: ${parseFloat(p.amount).toLocaleString()}`).join('\n');
        
        let customerInfo = '';
        if (customerName) customerInfo += `\n👤 <b>Mijoz:</b> ${customerName}`;
        if (customerPhone) customerInfo += `\n📞 <b>Mijoz tel:</b> <code>${customerPhone}</code>`;
        
        const message = `🟢 <b>Yangi Savdo!</b>\n\n👤 Xodim: ${user.name}${customerInfo}\n\n🛍 <b>Sotilgan tovarlar:</b>\n${itemsText}\n\n${amountText}\n\n💳 <b>To'lov turi:</b> ${paymentName}\n${paymentBreakdown}`;

        for (const admin of admins) {
          if (admin.telegramId) {
            await bot.telegram.sendMessage(admin.telegramId, message, { parse_mode: 'HTML' }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error('Failed to send admin notification', e);
    }

    // Send confirmation to the Employee
    try {
      if (process.env.BOT_TOKEN && user.telegramId) {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        await bot.telegram.sendMessage(
          user.telegramId,
          `🎉 Sotuv muvaffaqiyatli saqlandi!`
        ).catch((e) => console.error("Error sending receipt to user:", e));
      }
    } catch (e) {
      console.error("Failed to notify user", e);
    }

    return NextResponse.json(sale);
  } catch (error: any) {
    console.error('Failed to create sale:', error);
    return NextResponse.json({ error: 'Failed to create sale: ' + error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month'); // format: YYYY-MM
    let whereClause = {};

    if (monthParam) {
      const year = parseInt(monthParam.split('-')[0]);
      const month = parseInt(monthParam.split('-')[1]);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      whereClause = {
        createdAt: { gte: start, lt: end }
      };
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: { user: true, items: true, orders: true, payments: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}
