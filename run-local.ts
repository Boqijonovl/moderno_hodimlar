import 'dotenv/config';
import { bot } from './src/app/api/webhook/route';
import { handleDailyReport } from './src/app/api/cron/daily-report/route';

let lastReportSentDate = '';

// Har kuni soat 18:00 (Toshkent vaqti) da avtomatik savdo hisobotini yuboruvchi interval
setInterval(async () => {
  try {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('sv-SE', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
    const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });

    if (timeStr === '18:00' && lastReportSentDate !== todayStr) {
      lastReportSentDate = todayStr;
      console.log(`[Auto-Cron] 18:00 Toshkent vaqti bo'ldi. Kunlik savdo hisoboti adminlarga yuborilmoqda (${todayStr})...`);
      await handleDailyReport();
      console.log(`[Auto-Cron] 18:00 Daily report muvaffaqiyatli yuborildi!`);
    }
  } catch (err) {
    console.error('[Auto-Cron] Xatolik:', err);
  }
}, 30000);

bot.launch(() => console.log('Bot is running locally! 18:00 Daily report scheduler faol.'));
