import compression from 'compression'
import { config } from 'dotenv'
import express from 'express'
import fs from 'fs'
import helmet from 'helmet'
import sslRedirect from 'heroku-ssl-redirect'
import path from 'path'
// import { api } from './api'
config()

const TelegramBot = require('node-telegram-bot-api');
const token = process.env["TELEGRAM_API_KEY"]
const bot = new TelegramBot(token);

const setTelegramGroupMessageWebHook = async () => {
  const cur_url = process.env['CURRENT_SERVER_URL']
  const fetch = require('node-fetch');
  const url = `https://api.telegram.org/bot${token}/setWebhook`;
  const webhookUrl = `https://${cur_url}/webhook/${token}`;

  console.log('url',url)
  console.log('webhookUrl',webhookUrl)

  try {

    const key = 'scalar-api-key'
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: webhookUrl })
    });

    if (res.ok) {
      console.log('json.ok:', res.statusText)
      const json = await res.json()
      console.log('json', json)
    }
    else {
      console.log('json.err:', res.statusText)
    }
  } catch (err) {
    console.log('err:', err)
  }
}

setTelegramGroupMessageWebHook()

async function startup() {
  console.log(`HI FROM ZHEALTH SERVER. CURRENT TIME: ${new Date()}. __dirname: ${__dirname}. process.cwd(): ${process.cwd()}`)

  const app = express()
  app.use(sslRedirect())
  // app.use(
  //   '/api',
  //   session({
  //     secret:
  //       process.env['NODE_ENV'] === 'production'
  //         ? process.env['SESSION_SECRET']
  //         : 'my secret',
  //     maxAge: 365 * 24 * 60 * 60 * 1000,
  //   })
  // )
  app.use(compression())
  app.use(helmet({ contentSecurityPolicy: false }))

  // app.use(api)

  // Handle webhook requests
  app.post(`/webhook/${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // Respond to messages
  bot.on('message', (msg: any) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text.toLowerCase() === 'hello') {
      bot.sendMessage(chatId, 'Hello! How can I help you today?');
    }
  });


  app.post("/api/onTelegramGroupMessage", async (req, res) => {
    console.log(`onTelegramGroupMessage called at: ${new Date()}`)
    // process.env["TELEGRAM_API_KEY"]


    res.status(200).json({ success: true, error: '' });
  })


  let dist = path.resolve('dist/zhealth')
  if (!fs.existsSync(dist)) {
    dist = path.resolve('../zhealth')
  }
  app.use(express.static(dist))
  app.use('/*', async (req, res) => {
    if (req.headers.accept?.includes('json')) {
      console.log(req)
      res.status(404).json('missing route: ' + req.originalUrl)
      return
    }
    try {
      res.sendFile(dist + '/index.html')
    } catch (err) {
      res.sendStatus(500)
    }
  })
  let port = process.env['PORT'] || 3002
  app.listen(port)
}
startup()
