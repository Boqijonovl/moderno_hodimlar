import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const saleId = params.id;
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { user: true, items: true }
    });

    if (!sale) {
      return new NextResponse('Sale not found', { status: 404 });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: [350, 450 + ((sale.items?.length || 0) * 20)], margin: 30 });
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });

    // Draw PDF
    doc.fontSize(22).font('Helvetica-Bold').text('MODERNO MEBEL', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('gray').text('Sifat va Qulaylik', { align: 'center' });
    
    doc.moveDown(2);
    doc.moveTo(30, doc.y).lineTo(320, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(1);
    
    doc.fontSize(12).fillColor('black');
    const startY1 = doc.y;
    doc.text('Sana:', 30, startY1).font('Helvetica-Bold').text(new Date(sale.createdAt).toLocaleString('uz-UZ'), 150, startY1, { align: 'right', width: 170 });
    
    doc.moveDown(0.5);
    const startY2 = doc.y;
    doc.font('Helvetica').text('Sotuvchi:', 30, startY2).font('Helvetica-Bold').text(sale.user?.name || 'Noma\'lum', 150, startY2, { align: 'right', width: 170 });
    
    doc.moveDown(0.5);
    const startY3 = doc.y;
    doc.font('Helvetica').text("To'lov turi:", 30, startY3).font('Helvetica-Bold').text(sale.paymentMethod === 'CASH' ? 'Naqd' : sale.paymentMethod === 'CARD' ? 'Karta' : 'Muddatli', 150, startY3, { align: 'right', width: 170 });
    
    doc.moveDown(1.5);
    doc.moveTo(30, doc.y).lineTo(320, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(1);
    
    doc.fontSize(14).font('Helvetica-Bold').text('Tovarlar:', { align: 'left' });
    doc.moveDown(0.5);
    
    sale.items.forEach((item: any) => {
      const y = doc.y;
      doc.fontSize(12).font('Helvetica').fillColor('black').text(item.name, 30, y, { width: 150 });
      doc.font('Helvetica-Bold').text(`${(item.price).toLocaleString()} so'm`, 180, y, { align: 'right', width: 140 });
      doc.moveDown(0.5);
    });
    
    doc.moveDown(1);
    doc.fontSize(18).font('Helvetica-Bold').fillColor('black').text(`Jami: ${(sale.totalPrice).toLocaleString()} so'm`, { align: 'right' });
    
    doc.moveDown(2);
    doc.moveTo(30, doc.y).lineTo(320, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(1);
    
    doc.fontSize(10).font('Helvetica-Oblique').fillColor('gray').text('Xaridingiz uchun rahmat!\nYana kutib qolamiz.', { align: 'center' });
    
    doc.end();

    const pdfBuffer = await pdfPromise;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Chek_${saleId}.pdf"`
      }
    });

  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
