process.env.NODE_ENV = 'test'
const EventEmitter = require('node:events')
const config = require('config')
const axios = require('axios')
const chalk = require('chalk')
const moment = require('moment')
const assert = require('assert').strict
const WebSocket = require('ws')
const helloWorld = require('../')
const { resolve } = require('node:path')

describe('Hello world processing', () => {
  it('should expose a plugin config schema for super admins', async () => {
    const schema = require('../plugin-config-schema.json')
    assert.equal(schema.properties.pluginMessage.default, 'Hello')
  })

  it('should expose a processing config schema for users', async () => {
    const schema = require('../processing-config-schema.json')
    assert.equal(schema.type, 'object')
  })

  it('should run a task', async function () {
    this.timeout(60000)

    const axiosInstance = axios.create({
      baseURL: config.dataFairUrl,
      headers: { 'x-apiKey': config.dataFairAPIKey }
    })
    // customize axios errors for shorter stack traces when a request fails
    axiosInstance.interceptors.response.use(response => response, error => {
      if (!error.response) return Promise.reject(error)
      delete error.response.request
      error.response.config = { method: error.response.config.method, url: error.response.config.url, data: error.response.config.data }
      return Promise.reject(error.response)
    })
    const pluginConfig = { pluginMessage: 'Hello' }
    const processingConfig = {
      datasetMode: 'create',
      dataset: { title: 'Hello world test' },
      message: 'world test !',
      delay: 1
    }
    const log = {
      step: (msg) => console.log(chalk.blue.bold.underline(`[${moment().format('LTS')}] ${msg}`)),
      error: (msg, extra) => console.log(chalk.red.bold(`[${moment().format('LTS')}] ${msg}`), extra),
      warning: (msg, extra) => console.log(chalk.red(`[${moment().format('LTS')}] ${msg}`), extra),
      info: (msg, extra) => console.log(chalk.blue(`[${moment().format('LTS')}] ${msg}`), extra),
      debug: (msg, extra) => {
        // console.log(`[${moment().format('LTS')}] debug - ${msg}`, extra)
      }
    }
    const patchConfig = async (patch) => {
      console.log('received config patch', patch)
      Object.assign(processingConfig, patch)
    }

    const ws = new EventEmitter()
    ws._channels = []
    ws._connect = async () => {
      return new Promise((resolve, reject) => {
        const wsUrl = config.dataFairUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/'
        log.debug(`connect Web Socket to ${wsUrl}`)
        ws._ws = new WebSocket(wsUrl)
        ws._ws.on('error', err => {
          log.debug('WS encountered an error', err.message)
          ws._reconnect()
          reject(err)
        })
        ws._ws.once('open', () => {
          log.debug('WS is opened')
          resolve(ws._ws)
        })
        ws._ws.on('message', (message) => {
          message = JSON.parse(message.toString())
          log.debug('received message', message)
          ws.emit('message', message)
        })
      })
    }
    ws._reconnect = async () => {
      log.debug('reconnect')
      ws._ws.terminate()
      await ws._connect()
      for (const channel of ws._channels) {
        await ws.subscribe(channel, true)
      }
    }
    ws.subscribe = async (channel, force = false, timeout = 2000) => {
      if (ws._channels.includes(channel) && !force) return
      if (!ws._ws) await ws._connect()
      return new Promise((resolve, reject) => {
        const _timeout = setTimeout(() => reject(new Error('timeout')), timeout)
        log.debug('subscribe to channel', channel)
        ws._ws.send(JSON.stringify({ type: 'subscribe', channel, apiKey: config.dataFairAPIKey }))
        ws.once('message', (message) => {
          if (message.channel && message.channel !== channel) return
          clearTimeout(_timeout)
          log.debug('received response to subscription', message)
          if (message.type === 'error') return reject(new Error(message))
          else if (message.type === 'subscribe-confirm') return resolve()
          else return reject(new Error('expected a subscription confirmation, got ' + JSON.stringify(message)))
        })
        if (ws._channels.includes(channel)) ws._channels.push(channel)
      })
    }
    ws.waitFor = async (channel, filter, timeout = 300000) => {
      await ws.subscribe(channel)
      return new Promise((resolve, reject) => {
        const _timeout = setTimeout(() => reject(new Error('timeout')), timeout)
        const messageCb = (message) => {
          if (message.channel === channel && (!filter || filter(message.data))) {
            clearTimeout(_timeout)
            ws.off('message', messageCb)
            resolve(message.data)
          }
        }
        ws.on('message', messageCb)
      })
    }
    ws.waitForJournal = async (datasetId, eventType, timeout = 300000) => {
      log.info(`attend l'évènement du journal ${datasetId} / ${eventType}`)
      return ws.waitFor(`datasets/${datasetId}/journal`, (e) => e.type === eventType, timeout)
    }

    await helloWorld.run({ pluginConfig, processingConfig, axios: axiosInstance, log, patchConfig, ws })
    assert.equal(processingConfig.datasetMode, 'update')
    assert.equal(processingConfig.dataset.title, 'Hello world test')
    const datasetId = processingConfig.dataset.id
    assert.ok(datasetId.startsWith('hello-world-test'))
    await ws._reconnect()

    // another execution should update the dataset, not create it
    // await new Promise(resolve => setTimeout(resolve, 4000))
    await helloWorld.run({ pluginConfig, processingConfig, axios: axiosInstance, log, patchConfig, ws })
    assert.equal(processingConfig.dataset.id, datasetId)
    ws._ws.terminate()
  })
})
