import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany();
    // For initial test, if empty, insert some dummy categories
    if (categories.length === 0) {
      await prisma.category.createMany({
        data: [
          { name: 'Yotoqxona mebeli' },
          { name: 'Mehmonxona mebeli' },
          { name: 'Oshxona mebeli' },
          { name: 'Yumshoq mebel' }
        ]
      });
      return NextResponse.json(await prisma.category.findMany());
    }
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
