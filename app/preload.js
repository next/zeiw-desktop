;(() => {
  const net = require('net')
  const crypto = require('crypto')
  const { promisify } = require('util')
  const { remote } = require('electron')
  const buildEnv = require('./build-env')

  const clientId = '556724399164620812'

  const ops = {
    HANDSHAKE: 0,
    FRAME: 1
  }

  const encode = (op, data) => {
    const json = JSON.stringify(data)
    const len = Buffer.byteLength(json)
    const packet = Buffer.alloc(8 + len)
    packet.writeInt32LE(op, 0)
    packet.writeInt32LE(len, 4)
    packet.write(json, 8, len)
    return packet
  }

  const decode = (
    sock,
    cb,
    working = {
      full: '',
      op: undefined
    }
  ) => {
    const packet = sock.read()
    if (!packet) {
      return
    }
    let raw
    if ('' === working.full) {
      working.op = packet.readInt32LE(0)
      const len = packet.readInt32LE(4)
      raw = packet.slice(8, len + 8)
    } else {
      raw = packet.toString()
    }
    let cbOp
    let cbData
    try {
      cbData = JSON.parse(working.full + raw)
      cbOp = working.op
      working.full = ''
      working.op = undefined
    } catch (err) {
      working.full += raw
    }
    cb({ op: cbOp, data: cbData })

    decode(sock, cb, working)
  }

  const cryptoRandomBytes = promisify(crypto.randomBytes)

  const makeNonce = async () => (await cryptoRandomBytes(16)).toString('hex')

  let sendRequest = null

  const attemptConnect = () => {
    sendRequest = new Promise((connectResolve, connectReject) => {
      const discordRequests = new Map()
      const connect = pipeId => {
        if (10 < pipeId) {
          connectReject({
            err: new Error('Cannot connect to Discord RPC.'),
            kind: 'net'
          })
          return
        }
        let finishedHandshake = false
        const reconnectTimeout = setTimeout(() => {
          connect(pipeId + 1)
        }, 2000)
        const client = net.createConnection(`\\\\?\\pipe\\discord-ipc-${pipeId}`)
        client.on('error', () => {
          if (finishedHandshake) {
            sendRequest = null
            discordRequests.forEach(prom => {
              prom.reject({
                err: new Error('Disconnected from Discord RPC.'),
                kind: 'net'
              })
            })
            return
          }
          clearTimeout(reconnectTimeout)
          connect(pipeId + 1)
        })
        client.on('readable', () => {
          decode(client, async ({ op, data }) => {
            finishedHandshake = true
            clearTimeout(reconnectTimeout)
            if (op === ops.FRAME && 'DISPATCH' === data.cmd) {
              connectResolve(
                (cmd, args) =>
                  new Promise(async (resolve, reject) => {
                    const nonce = await makeNonce()
                    discordRequests.set(nonce, {
                      resolve,
                      reject
                    })
                    client.write(
                      encode(ops.FRAME, {
                        cmd,
                        args,
                        nonce
                      })
                    )
                  })
              )
            } else if (op === ops.FRAME) {
              const prom = discordRequests.get(data.nonce)
              if (prom !== undefined) {
                discordRequests.delete(data.nonce)
                prom.resolve(data)
              }
            }
          })
        })
        client.write(
          encode(ops.HANDSHAKE, {
            v: 1,
            client_id: clientId
          })
        )
      }

      connect(0)
    })

    sendRequest.catch(() => {
      sendRequest = null
    })
  }

  attemptConnect()

  let currentActivity = null

  const setSinglePresence = async activity => {
    if (null === sendRequest) {
      attemptConnect()
    }
    const data = await (await sendRequest)('SET_ACTIVITY', {
      pid: process.pid,
      activity
    })
    if ('ERROR' === data.evt) {
      throw {
        err: new Error(data.data.message),
        kind: 'net'
      }
    }
  }

  setInterval(() => {
    if (currentActivity !== null) {
      setSinglePresence(currentActivity)
    }
  }, 10000)

  const currentWindow = remote.getCurrentWindow()

  window._zeiwNative = {
    getDiscordOauthCode: async () => {
      if (null === sendRequest) {
        attemptConnect()
      }
      const data = await (await sendRequest)('AUTHORIZE', {
        client_id: clientId,
        scopes: ['identify']
      })
      if ('ERROR' === data.evt) {
        throw {
          err: new Error(data.data.message),
          kind: 'user'
        }
      }
      return data.data.code
    },
    setDiscordPresence: activity => {
      currentActivity = activity
      setSinglePresence(activity)
    },
    frame: {
      minimize: () => currentWindow.minimize(),
      maximize: () =>
        currentWindow.isMaximized() ? currentWindow.unmaximize() : currentWindow.maximize(),
      close: () => currentWindow.close()
    },
    buildEnv
  }
  window._zeiwNative.setDiscordPresence({
    state: 'Staring at the Menu Screen',
    details: 'Competitive Pong',
    assets: {
      large_image: 'zeiw',
      large_text: 'ZEIW'
    }
  })
})()
