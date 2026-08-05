import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function POST(req: Request) {
  try {
    const { items, paymentDetails, telegramId, userId, employeeName } = await req.json();

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
    if (paymentDetails.length === 1) {
      paymentMethod = paymentDetails[0].method;
    } else if (paymentDetails.length === 0) {
      paymentMethod = 'Nasiya';
    }

    const saleItems = items.filter((item: any) => !item.isOrder);
    const orderItems = items.filter((item: any) => item.isOrder);

    const sale = await prisma.sale.create({
      data: {
        userId: user.id,
        totalPrice,
        advance,
        balance,
        status,
        paymentMethod,
        items: {
          create: saleItems.map((item: any) => ({
            name: item.name,
            price: parseFloat(item.price)
          }))
        },
        payments: {
          create: paymentDetails.filter((p: any) => parseFloat(p.amount) > 0).map((p: any) => ({
            method: p.method,
            amount: parseFloat(p.amount)
          }))
        },
        orders: {
          create: orderItems.map((item: any) => ({
            name: item.name,
            price: parseFloat(item.price),
            description: item.description || null,
            deadline: item.deadline ? new Date(item.deadline) : null,
            assignedToId: item.assignedToId || null,
            creatorId: user.id
          }))
        }
      },
      include: { items: true, orders: { include: { assignedTo: true } }, payments: true }
    });

    // Send notification to all Admins
    try {
      if (process.env.BOT_TOKEN) {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        
        let itemsText = items.map((item: any, i: number) => {
          let text = `${i+1}. ${item.name} - ${parseFloat(item.price).toLocaleString()} so'm`;
          if (item.isOrder) text += ` (📦 Buyurtma)`;
          return text;
        }).join('\n');
        
        let paymentName = paymentMethod;
        let amountText = `💰 Umumiy summa: <b>${totalPrice.toLocaleString()} so'm</b>`;
        if (balance > 0) {
          amountText += `\n💵 To'langan: <b>${advance.toLocaleString()} so'm</b>\n⚠️ Qoldiq (Qarz): <b>${balance.toLocaleString()} so'm</b>`;
        }
        
        let paymentBreakdown = paymentDetails.filter((p:any) => parseFloat(p.amount) > 0).map((p:any) => `- ${p.method}: ${parseFloat(p.amount).toLocaleString()}`).join('\n');
        
        const message = `🟢 <b>Yangi Savdo!</b>\n\n👤 Xodim: ${user.name}\n\n🛍 <b>Sotilgan tovarlar:</b>\n${itemsText}\n\n${amountText}\n\n💳 <b>To'lov turi:</b> ${paymentName}\n${paymentBreakdown}`;

        for (const admin of admins) {
          if (admin.telegramId) {
            await bot.telegram.sendMessage(admin.telegramId, message, { parse_mode: 'HTML' }).catch(() => {});
          }
        }

        // Notify assigned employees for orders
        for (const order of sale.orders) {
          if (order.assignedTo && order.assignedTo.telegramId) {
            const dateStr = order.deadline ? new Date(order.deadline).toLocaleDateString('uz-UZ') : 'Noma\'lum';
            const orderMessage = `📦 <b>Sizga yangi buyurtma biriktirildi!</b>\n\n📝 <b>Mebel nomi:</b> ${order.name}\n💬 <b>Izohi:</b> ${order.description || 'Yo\'q'}\n📅 <b>Muddati:</b> ${dateStr}\n👤 <b>Savdoni kiritdi:</b> ${user.name}`;
            
            try {
              await bot.telegram.sendMessage(order.assignedTo.telegramId, orderMessage, { parse_mode: 'HTML' });
            } catch (err) {
              console.error("Usta xabar yuborishda xatolik:", err);
            }
          }
        }

        // Send confirmation to the Employee
        try {
          if (user.telegramId) {
            await bot.telegram.sendMessage(
              user.telegramId,
              `🎉 Sotuv muvaffaqiyatli saqlandi!`
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
