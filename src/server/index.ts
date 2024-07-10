import compression from 'compression'
import session from 'cookie-session'
import express from 'express'
import fs from 'fs'
import helmet from 'helmet'
import sslRedirect from 'heroku-ssl-redirect'
import path from 'path'
// import { api } from './api'

async function startup() {
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


  app.post("/api/onTelegramGroupMessage", async (req, res) => {
    console.log(`onTelegramGroupMessage called at: ${new Date()}`)
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
