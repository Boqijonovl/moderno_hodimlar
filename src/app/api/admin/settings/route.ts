import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.settings.findFirst();
    return NextResponse.json({ settings, categories: [] });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'update_location') {
      let settings = await prisma.settings.findFirst();
      if (settings) {
        settings = await prisma.settings.update({
          where: { id: settings.id },
          data: { storeLat: payload.lat, storeLng: payload.lng, radius: payload.radius }
        });
      } else {
        settings = await prisma.settings.create({
          data: { storeLat: payload.lat, storeLng: payload.lng, radius: payload.radius }
        });
      }
      return NextResponse.json(settings);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
