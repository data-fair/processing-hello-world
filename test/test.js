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
    assert.equal(schema.properties.message.default, 'world !')
  })

  it('should run a task', async function () {
    this.timeout(10000)

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
    const { processingConfigPatch } = await helloWorld.run({
      pluginConfig: {
        pluginMessage: 'Hello'
      },
      processingConfig: {
        dataset: { id: 'hello-world-test', title: 'Hello world test', overwrite: false },
        message: 'world test !'
      },
      axios: axiosInstance,
      log: {
        step: (msg) => console.log(chalk.blue.bold.underline(`[${moment().format('LTS')}] ${msg}`)),
        error: (msg, extra) => console.log(chalk.red.bold(`[${moment().format('LTS')}] ${msg}`), extra),
        warning: (msg, extra) => console.log(chalk.red(`[${moment().format('LTS')}] ${msg}`), extra),
        info: (msg, extra) => console.log(chalk.blue(`[${moment().format('LTS')}] ${msg}`), extra),
        debug: (msg, extra) => {
          // console.log(`[${moment().format('LTS')}] ${msg}`, extra)
        }
      }
    })
    assert.equal(processingConfigPatch.nbRuns, 1)
    const dataset = (await axiosInstance.get('api/v1/datasets/hello-world-test')).data
    assert.equal(dataset.title, 'Hello world test')
    const lines = (await axiosInstance.get('api/v1/datasets/hello-world-test/lines')).data.results
    assert.equal(lines.length, 1)
    assert.equal(lines[0]._id, 'hello')
    assert.equal(lines[0].message, 'Hello world test !')
  })
})
