import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export const ADMIN_TELEGRAM_IDS = ['1037362053', '3491381'];

export interface ZapchasActor {
  id: string;
  telegramId: string;
  name: string;
  role: string;
  active: boolean;
  canUseZapchas: boolean;
  canManageZapchas: boolean;
}

export function isAdminUser(user: Partial<ZapchasActor> | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || ADMIN_TELEGRAM_IDS.includes(String(user.telegramId || ''));
}

export function canManageZapchasUser(user: Partial<ZapchasActor> | null | undefined): boolean {
  if (!user || user.active === false) return false;
  return isAdminUser(user) || user.canManageZapchas === true;
}

export function canSellZapchasUser(user: Partial<ZapchasActor> | null | undefined): boolean {
  if (!user || user.active === false) return false;
  return isAdminUser(user) || user.canManageZapchas === true || user.canUseZapchas !== false;
}

export function getTashkentTodayRange() {
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
  const [y, m, d] = todayStr.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d - 1, 19, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, 18, 59, 59, 999));
  return { start, end, todayStr };
}

export async function resolveZapchasUser(telegramId?: string | null, userId?: string | null) {
  if (userId) {
    return prisma.user.findUnique({ where: { id: String(userId) } });
  }
  if (telegramId) {
    return prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
  }
  return null;
}

export async function notifyZapchasTelegram(
  message: string,
  options: { includeManagers?: boolean; excludeTelegramId?: string } = {}
) {
  try {
    if (!process.env.BOT_TOKEN) return;
    const bot = new Telegraf(process.env.BOT_TOKEN);

    const recipients = await prisma.user.findMany({
      where: {
        active: true,
        OR: [
          { role: 'ADMIN' },
          { telegramId: { in: ADMIN_TELEGRAM_IDS } },
          ...(options.includeManagers ? [{ canManageZapchas: true }] : []),
        ],
      },
      select: { telegramId: true },
    });

    const targetIds = new Set<string>(ADMIN_TELEGRAM_IDS);
    recipients.forEach((r) => {
      if (r.telegramId) targetIds.add(r.telegramId);
    });

    if (options.excludeTelegramId) {
      targetIds.delete(String(options.excludeTelegramId));
    }

    for (const tgId of targetIds) {
      await bot.telegram.sendMessage(tgId, message, { parse_mode: 'HTML' }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to send Zapchas Telegram notification:', err);
  }
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
