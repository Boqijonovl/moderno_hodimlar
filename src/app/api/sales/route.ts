import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function POST(req: Request) {
  try {
    const { items, paymentMethod, telegramId, userId, employeeName } = await req.json();

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

    const sale = await prisma.sale.create({
      data: {
        userId: user.id,
        totalPrice,
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
        
        const message = `🟢 <b>Yangi Savdo!</b>\n\n👤 Xodim: ${user.name}\n\n🛍 <b>Sotilgan tovarlar:</b>\n${itemsText}\n\n💰 Umumiy summa: <b>${totalPrice.toLocaleString()} so'm</b>\n💳 To'lov turi: ${paymentMethod === 'CASH' ? 'Naqd' : paymentMethod === 'CARD' ? 'Karta' : 'Muddatli'}`;

        for (const admin of admins) {
          if (admin.telegramId) {
            await bot.telegram.sendMessage(admin.telegramId, message, { parse_mode: 'HTML' }).catch(() => {});
          }
        }

        // Generate PDF receipt for the Employee
        try {
          await new Promise<void>((resolve) => {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ size: [350, 450 + (items.length * 20)], margin: 30 });
            const buffers: Buffer[] = [];
            
            doc.on('data', buffers.push.bind(buffers));
            
            doc.on('end', async () => {
              const pdfData = Buffer.concat(buffers);
              if (user.telegramId) {
                await bot.telegram.sendDocument(user.telegramId, {
                  source: pdfData,
                  filename: `Chek_${new Date().getTime()}.pdf`
                }, {
                  caption: `🎉 Sotuv muvaffaqiyatli saqlandi!\n\nSizning elektron chekingiz (PDF) tayyor.`
                }).catch((e) => console.error("Error sending PDF:", e));
              }
              resolve();
            });

            // Draw PDF
            doc.fontSize(22).font('Helvetica-Bold').text('MODERNO MEBEL', { align: 'center' });
            doc.fontSize(10).font('Helvetica').fillColor('gray').text('Sifat va Qulaylik', { align: 'center' });
            
            doc.moveDown(2);
            doc.moveTo(30, doc.y).lineTo(320, doc.y).strokeColor('#cccccc').stroke();
            doc.moveDown(1);
            
            doc.fontSize(12).fillColor('black');
            const startY1 = doc.y;
            doc.text('Sana:', 30, startY1).font('Helvetica-Bold').text(new Date().toLocaleString('uz-UZ'), 150, startY1, { align: 'right', width: 170 });
            
            doc.moveDown(0.5);
            const startY2 = doc.y;
            doc.font('Helvetica').text('Sotuvchi:', 30, startY2).font('Helvetica-Bold').text(user.name, 150, startY2, { align: 'right', width: 170 });
            
            doc.moveDown(0.5);
            const startY3 = doc.y;
            doc.font('Helvetica').text("To'lov turi:", 30, startY3).font('Helvetica-Bold').text(paymentMethod === 'CASH' ? 'Naqd' : paymentMethod === 'CARD' ? 'Karta' : 'Muddatli', 150, startY3, { align: 'right', width: 170 });
            
            doc.moveDown(1.5);
            doc.moveTo(30, doc.y).lineTo(320, doc.y).strokeColor('#cccccc').stroke();
            doc.moveDown(1);
            
            doc.fontSize(14).font('Helvetica-Bold').text('Tovarlar:', { align: 'left' });
            doc.moveDown(0.5);
            
            items.forEach((item: any) => {
              const y = doc.y;
              doc.fontSize(12).font('Helvetica').fillColor('black').text(item.name, 30, y, { width: 150 });
              doc.font('Helvetica-Bold').text(`${parseFloat(item.price).toLocaleString()} so'm`, 180, y, { align: 'right', width: 140 });
              doc.moveDown(0.5);
            });
            
            doc.moveDown(1);
            doc.fontSize(18).font('Helvetica-Bold').fillColor('black').text(`Jami: ${totalPrice.toLocaleString()} so'm`, { align: 'right' });
            
            doc.moveDown(2);
            doc.moveTo(30, doc.y).lineTo(320, doc.y).strokeColor('#cccccc').stroke();
            doc.moveDown(1);
            
            doc.fontSize(10).font('Helvetica-Oblique').fillColor('gray').text('Xaridingiz uchun rahmat!\nYana kutib qolamiz.', { align: 'center' });
            
            doc.end();
          });
        } catch (pdfErr) {
          console.error("Failed to generate PDF", pdfErr);
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
