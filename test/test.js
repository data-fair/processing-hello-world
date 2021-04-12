process.env.NODE_ENV = 'test'
const config = require('config')
const axios = require('axios')
const chalk = require('chalk')
const assert = require('assert').strict
const helloWorld = require('../')

describe('Hello world processing', () => {
  it('should expose a plugin config schema for super admins', async () => {
    const schema = require('../plugin-config-schema.json')
    assert.equal(schema.properties.pluginMessage.default, 'Hello')
  })

  it('should expose a processing config schema builder for users', async () => {
    const schema = require('../processing-config-schema.json')
    assert.equal(schema.properties.message.default, 'world !')
  })

  it('should run a task', async function () {
    this.timeout(10000)

    const axiosInstance = axios.create({
      baseURL: config.dataFairUrl,
      headers: { 'x-apiKey': config.dataFairAPIKey }
    })
    await helloWorld.run({
      pluginConfig: {
        pluginMessage: 'Hello'
      },
      processingConfig: {
        dataset: { id: 'hello-world-test', title: 'Hello world test', overwrite: false },
        message: 'world test !'
      },
      axios: axiosInstance,
      log: {
        step: (msg) => console.log(chalk.blue.bold.underline(msg)),
        error: (msg, extra) => console.log(chalk.red.bold(msg), extra),
        warning: (msg, extra) => console.log(chalk.red(msg), extra),
        info: (msg, extra) => console.log(chalk.blue(msg), extra),
        debug: (msg, extra) => console.log(msg, extra)
      }
    })
    const dataset = (await axiosInstance.get('api/v1/datasets/hello-world-test')).data
    assert.equal(dataset.title, 'Hello world test')
    const lines = (await axiosInstance.get('api/v1/datasets/hello-world-test/lines')).data.results
    assert.equal(lines.length, 1)
    assert.equal(lines[0]._id, 'hello')
    assert.equal(lines[0].message, 'Hello world test !')
  })
})
