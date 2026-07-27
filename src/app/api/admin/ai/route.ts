import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        response: "Sun'iy intellekt xizmati hozircha o'chirilgan, chunki GEMINI_API_KEY ulanmagan. Iltimos so'zlamalarni tekshiring." 
      });
    }

    // 1. Gather context from DB
    const users = await prisma.user.findMany({ where: { role: { not: 'ADMIN' } } });
    
    // Get current month's sales
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const sales = await prisma.sale.findMany({
      where: { date: { gte: startOfMonth } },
      orderBy: { createdAt: 'desc' },
      include: { user: true, items: true }
    });

    const attendances = await prisma.attendance.findMany({
      where: { date: { gte: startOfMonth } },
      include: { user: true }
    });

    const totalSalesSum = sales.reduce((sum, s) => sum + s.totalPrice, 0);
    const topSeller = sales.reduce((acc, curr) => {
      acc[curr.user.name] = (acc[curr.user.name] || 0) + curr.totalPrice;
      return acc;
    }, {} as Record<string, number>);

    // Prepare context string
    const systemContext = `
      Sen Moderno Mebel do'konining aqlli biznes yordamchisisan. Admin savol beryapti. 
      Qisqa, aniq va do'stona javob ber. Raqamlarni o'zbek so'mida chiroyli formatda yoz.
      
      BU OY MA'LUMOTLARI:
      Jami xodimlar: ${users.length} ta
      Bu oydagi umumiy savdo: ${totalSalesSum.toLocaleString()} so'm
      Sotuvlar soni: ${sales.length} ta
      Xodimlarning savdolari: ${JSON.stringify(topSeller)}
      Davomat yozuvlari soni (bu oyda): ${attendances.length} marta kelingan.
      
      Eslatma: Agar xodim haqida so'ralsa ma'lumotlar bazasida ko'ringan ismlardan foydalan.
    `;

    // 2. Call Gemini API
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemContext + '\n\nAdminning savoli: ' + message }] }
      ],
      config: {
        temperature: 0.7,
      }
    });

    return NextResponse.json({ response: response.text });
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: error.message || 'Xatolik yuz berdi' }, { status: 500 });
  }
}
