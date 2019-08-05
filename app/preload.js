;(() => {
  const net = require('net')
  const crypto = require('crypto')
  const { promisify } = require('util')

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
    if (working.full === '') {
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

  const sendRequest = new Promise((connectResolve, connectReject) => {
    const discordRequests = new Map()
    const connect = pipeId => {
      if (pipeId > 10) {
        connectReject({
          err: new Error('Cannot connect to Discord RPC.'),
          kind: 'net'
        })
        return
      }
      const reconnectTimeout = setTimeout(() => {
        connect(pipeId + 1)
      }, 1000)
      const client = net.createConnection('\\\\?\\pipe\\discord-ipc-' + pipeId)
      client.on('error', () => {
        clearTimeout(reconnectTimeout)
        connect(pipeId + 1)
      })
      client.on('readable', () => {
        decode(client, async ({ op, data }) => {
          clearTimeout(reconnectTimeout)
          if (op === ops.FRAME && data.cmd === 'DISPATCH') {
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

  window._zeiwNative = {
    getDiscordOauthCode: async () => {
      const data = await (await sendRequest)('AUTHORIZE', {
        client_id: clientId,
        scopes: ['identify']
      })
      if (data.evt === 'ERROR') {
        throw {
          err: new Error(data.data.message),
          kind: 'user'
        }
      }
      return data.data.code
    },
    setDiscordPresence: async activity => {
      const data = await (await sendRequest)('SET_ACTIVITY', {
        pid: process.pid,
        activity
      })
      if (data.evt === 'ERROR') {
        throw {
          err: new Error(data.data.message),
          kind: 'net'
        }
      }
    }
  }
})()
