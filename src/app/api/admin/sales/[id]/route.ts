import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;

    // Fetch sale details before deleting
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        user: true,
        payments: true
      }
    });

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Delete sale (cascade will delete items and payments)
    await prisma.sale.delete({
      where: { id }
    });

    // Record in Audit Log
    const itemsSummary = (sale.items || []).map(i => `${i.name} (${i.price.toLocaleString()} so'm)`).join(', ');
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_SALE',
        entity: 'Sale',
        entityId: id,
        details: JSON.stringify({
          totalPrice: sale.totalPrice,
          paymentMethod: sale.paymentMethod,
          seller: sale.user?.name,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          items: itemsSummary
        }),
        user: sale.user?.name || 'Admin'
      }
    });

    // Send Telegram alert to all Admins
    try {
      if (process.env.BOT_TOKEN) {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long' });

        const itemsText = (sale.items || []).map((it, idx) => `  ${idx + 1}. ${it.name} - ${it.price.toLocaleString()} so'm`).join('\n') || "Ko'rsatilmagan";
        const customerText = sale.customerPhone ? `\n📞 Mijoz: ${sale.customerName ? `${sale.customerName} ` : ''}(${sale.customerPhone})` : '';

        const alertMessage = 
`⚠️ <b>DIQQAT! SAVDO O'CHIRILDI!</b>

👤 <b>Sotuvchi xodim:</b> ${sale.user?.name || 'Noma\'lum'}
💰 <b>Summasi:</b> ${sale.totalPrice?.toLocaleString()} so'm
💳 <b>To'lov turi:</b> ${sale.paymentMethod}
🛍 <b>Tovarlar:</b>
${itemsText}${customerText}
⏰ <b>Vaqti:</b> ${dateStr}, soat ${timeStr}

<i>Ushbu o'chirish harakati Kassa Audit tizimida saqlandi.</i>`;

        for (const admin of admins) {
          if (admin.telegramId) {
            await bot.telegram.sendMessage(admin.telegramId, alertMessage, { parse_mode: 'HTML' }).catch(() => {});
          }
        }
      }
    } catch (botErr) {
      console.error('Audit Telegram alert failed:', botErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
  }
}
