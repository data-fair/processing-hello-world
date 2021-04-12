process.env.NODE_ENV = 'test'
const config = require('config')
const axios = require('axios')
const chalk = require('chalk')
const assert = require('assert').strict
const helloWorld = require('../')

describe('Hello world processing', () => {
  it('should expose a plugin config schema for super admins', async () => {
    const schema = await helloWorld.pluginConfigSchema()
    assert.equal(schema.properties.defaultMessage.default, 'Hello world')
  })

  it('should expose a processings config schema builder for users', async () => {
    const schema = await helloWorld.processingConfigSchema({ defaultMessage: 'Hello' })
    assert.equal(schema.properties.message.default, 'Hello')
  })

  it('should run a task', async function () {
    this.timeout(10000)

    const axiosInstance = axios.create({
      baseURL: config.dataFairUrl,
      headers: { 'x-apiKey': config.dataFairAPIKey }
    })
    await helloWorld.run({
      pluginConfig: {},
      processingConfig: {
        dataset: { id: 'hello-world-test', title: 'Hello world test', overwrite: false },
        message: 'Hello world test !'
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
  })
})
