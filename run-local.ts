import 'dotenv/config';
import { bot } from './src/app/api/webhook/route';
bot.launch(() => console.log('Bot is running locally!'));
