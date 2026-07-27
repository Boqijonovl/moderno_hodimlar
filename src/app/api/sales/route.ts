import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { categoryId, itemName, price, paymentMethod, telegramId } = body;

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const sale = await prisma.sale.create({
      data: {
        userId: user.id,
        categoryId,
        itemName,
        price,
        paymentMethod,
      },
      include: { category: true }
    });

    // Send notification to all Admins
    try {
      if (process.env.BOT_TOKEN) {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        
        const message = `🟢 <b>Yangi Savdo!</b>\n\n👤 Xodim: ${user.name}\n🏷 Mebel: ${itemName} (${sale.category.name})\n💰 Narxi: ${price.toLocaleString()} so'm\n💳 To'lov turi: ${paymentMethod === 'CASH' ? 'Naqd' : paymentMethod === 'CARD' ? 'Karta' : 'Muddatli'}`;

        for (const admin of admins) {
          if (admin.telegramId) {
            await bot.telegram.sendMessage(admin.telegramId, message, { parse_mode: 'HTML' }).catch(() => {});
          }
        }

        // Generate PDF receipt for the Employee
        try {
          await new Promise<void>((resolve) => {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ size: [350, 450], margin: 30 });
            const buffers: Buffer[] = [];
            
            doc.on('data', buffers.push.bind(buffers));
            
            doc.on('end', async () => {
              const pdfData = Buffer.concat(buffers);
              if (user.telegramId) {
                await bot.telegram.sendDocument(user.telegramId, {
                  source: pdfData,
                  filename: `Chek_${itemName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.pdf`
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
            
            doc.fontSize(14).font('Helvetica-Bold').text(itemName, { align: 'left' });
            doc.fontSize(10).font('Helvetica').fillColor('gray').text(sale.category.name, { align: 'left' });
            
            doc.moveDown(1);
            doc.fontSize(18).font('Helvetica-Bold').fillColor('black').text(`${price.toLocaleString()} so'm`, { align: 'right' });
            
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      include: { user: true, category: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}
