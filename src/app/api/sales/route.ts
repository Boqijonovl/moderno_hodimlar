import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function POST(req: Request) {
  try {
    const { items, paymentMethod, advance, telegramId, userId, employeeName } = await req.json();

    if (!items || !items.length) {
      return NextResponse.json({ error: 'Missing items' }, { status: 400 });
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
    const parsedAdvance = advance ? parseFloat(advance) : (paymentMethod === 'INSTALLMENT' ? 0 : totalPrice);
    const balance = totalPrice - parsedAdvance;
    const status = balance > 0 ? 'INCOMPLETE' : 'COMPLETED';

    const sale = await prisma.sale.create({
      data: {
        userId: user.id,
        totalPrice,
        advance: parsedAdvance,
        balance,
        status,
        paymentMethod,
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            price: parseFloat(item.price)
          }))
        }
      },
      include: { items: true }
    });

    // Send notification to all Admins
    try {
      if (process.env.BOT_TOKEN) {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        
        let itemsText = items.map((item: any, i: number) => `${i+1}. ${item.name} - ${parseFloat(item.price).toLocaleString()} so'm`).join('\n');
        
        let paymentName = paymentMethod === 'CASH' ? 'Naqd' : paymentMethod === 'CARD' ? 'Karparativ' : 'Avans';
        let amountText = `💰 Umumiy summa: <b>${totalPrice.toLocaleString()} so'm</b>`;
        if (paymentMethod === 'INSTALLMENT') {
          amountText += `\n💵 To'langan Avans: <b>${parsedAdvance.toLocaleString()} so'm</b>\n⚠️ Qoldiq (Qarz): <b>${balance.toLocaleString()} so'm</b>`;
        }
        
        const message = `🟢 <b>Yangi Savdo!</b>\n\n👤 Xodim: ${user.name}\n\n🛍 <b>Sotilgan tovarlar:</b>\n${itemsText}\n\n${amountText}\n💳 To'lov turi: ${paymentName}`;

        for (const admin of admins) {
          if (admin.telegramId) {
            await bot.telegram.sendMessage(admin.telegramId, message, { parse_mode: 'HTML' }).catch(() => {});
          }
        }

        // Send confirmation to the Employee
        try {
          if (user.telegramId) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moderno-bot-web.vercel.app';
            await bot.telegram.sendMessage(
              user.telegramId,
              `🎉 Sotuv muvaffaqiyatli saqlandi!\n\n🌐 Pastdagi tugmani bosib Veb-Chek orqali oson ko'rishingiz mumkin.`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🌐 Veb-Chekni Ochish", url: `${appUrl}/receipt/${sale.id}` }]
                  ]
                }
              }
            ).catch((e) => console.error("Error sending receipt to user:", e));
          }
        } catch (e) {
          console.error("Failed to notify user", e);
        }
      }
    } catch (e) {
      console.error('Failed to send notification', e);
    }
    return NextResponse.json(sale);
  } catch (error: any) {
    console.error('Failed to create sale:', error);
    return NextResponse.json({ error: 'Failed to create sale: ' + error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      include: { user: true, items: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}
