process.env.NODE_ENV = 'test'
const config = require('config')
const axios = require('axios')
const chalk = require('chalk')
const moment = require('moment')
const assert = require('assert').strict
const helloWorld = require('../')

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
    this.timeout(20000)

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
        // console.log(`[${moment().format('LTS')}] ${msg}`, extra)
      }
    }
    const patchConfig = async (patch) => {
      console.log('received config patch', patch)
      Object.assign(processingConfig, patch)
    }
    await helloWorld.run({ pluginConfig, processingConfig, axios: axiosInstance, log, patchConfig })
    assert.equal(processingConfig.datasetMode, 'update')
    assert.equal(processingConfig.dataset.title, 'Hello world test')
    const datasetId = processingConfig.dataset.id
    assert.ok(datasetId.startsWith('hello-world-test'))

    // another execution should update the dataset, not create it
    // await new Promise(resolve => setTimeout(resolve, 4000))
    await helloWorld.run({ pluginConfig, processingConfig, axios: axiosInstance, log, patchConfig })
    assert.equal(processingConfig.dataset.id, datasetId)
  })
})
