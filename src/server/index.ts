import compression from 'compression';
import { config } from 'dotenv';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import sslRedirect from 'heroku-ssl-redirect';
import fetch from 'node-fetch';
import path from 'path';

const messages = new Map<
  string /*mobile*/,
  {
    count: number,/*error per email*/
    last: Date/*some links for same email*/
  }>()
config();

const TelegramBot = require('node-telegram-bot-api');
const token = process.env["TELEGRAM_API_KEY"];
const bot = new TelegramBot(token, { polling: false }); // Disable polling

const setTelegramGroupMessageWebHook = async () => {
  const cur_url = process.env['CURRENT_SERVER_URL'];
  const webhookUrl = `https://${cur_url}/webhook/${token}`;

  const deleteUrl = `https://api.telegram.org/bot${token}/deleteWebhook`;
  const setUrl = `https://api.telegram.org/bot${token}/setWebhook`;

  console.log('Deleting existing webhook:', deleteUrl);
  console.log('Setting new webhook:', webhookUrl);

  try {
    // Delete existing webhook
    let res = await fetch(deleteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    let json = await res.json();
    if (json.ok) {
      console.log('Existing webhook deleted successfully:', json);
    } else {
      console.error('Failed to delete existing webhook:', json);
    }

    // Set new webhook
    res = await fetch(setUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: webhookUrl })
    });

    json = await res.json();
    if (json.ok) {
      console.log('New webhook set successfully:', json);
    } else {
      console.error('Failed to set new webhook:', json);
    }
  } catch (err) {
    console.error('Error during webhook setup:', err);
  }
};

setTelegramGroupMessageWebHook();

async function startup() {
  console.log(`HI FROM ZHEALTH SERVER. CURRENT TIME: ${new Date()}. __dirname: ${__dirname}. process.cwd(): ${process.cwd()}`);

  const app = express();
  app.use(sslRedirect());
  app.use(compression());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json()); // Ensure the server can parse JSON requests

  // Handle webhook requests
  app.post(`/webhook/${token}`, (req, res) => {
    console.log(`Webhook called at: ${new Date()}`);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // Respond to messages
  bot.on('message', (msg: any) => {  // Explicitly define type for msg
    console.log(`Message received at: ${new Date()}`);
    const chatId = msg.chat.id;
    const text = msg.text;
    const name = msg.from.username

    if (!messages.has(name)){
      messages.set(name, { count: 0, last: new Date() })
    }
    ++messages.get(name)!.count
    messages.get(name)!.last = new Date()

    console.log(`Received message: ${text} from chatId: ${chatId}`);

    if (text.toLowerCase() === 'תזכורת ראשונה') {
      bot.sendMessage(chatId, 'היי בנות, תזכורת: עוד 24 שעות להצטרפות לאתגר');
    } else if (text.toLowerCase() === 'תזכורת שניה') {
      bot.sendMessage(chatId, 'היי בנות, תזכורת: עוד 12 שעות להצטרפות לאתגר');
    } else if (text.toLowerCase() === 'תזכורת אחרונה') {
      bot.sendMessage(chatId, 'היי בנות, תזכורת: שעה אחרונה! להצטרפות לאתגר');
    } else if (text.toLowerCase() === 'נוכחות') {
      let text = 'סיכום'
      text += '\n'
      for (const m of messages) {
        text += `${m[0]}: { הודעות: ${m[1].count}, עדכון אחרון: ${m[1].last} }`
        text += '\n'
      }
      bot.sendMessage(chatId, text.trim());
    } else {
      bot.sendMessage(chatId, 'היי אני הבוט של אורלי');
    }
  });

  app.post("/api/onTelegramGroupMessage", async (req, res) => {
    console.log(`onTelegramGroupMessage called at: ${new Date()}`);
    res.status(200).json({ success: true, error: '' });
  });

  let dist = path.resolve('dist/zhealth');
  if (!fs.existsSync(dist)) {
    dist = path.resolve('../zhealth');
  }
  app.use(express.static(dist));
  app.use('/*', async (req, res) => {
    if (req.headers.accept?.includes('json')) {
      console.log(req);
      res.status(404).json('missing route: ' + req.originalUrl);
      return;
    }
    try {
      res.sendFile(dist + '/index.html');
    } catch (err) {
      res.sendStatus(500);
    }
  });

  let port = process.env['PORT'] || 3002;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

startup();
