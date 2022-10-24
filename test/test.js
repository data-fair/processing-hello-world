process.env.NODE_ENV = 'test'
const config = require('config')
const assert = require('assert').strict
const helloWorld = require('../')
const testUtils = require('@data-fair/processings-test-utils')

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

    const context = testUtils.context({
      pluginConfig: { pluginMessage: 'Hello' },
      processingConfig: {
        datasetMode: 'create',
        dataset: { title: 'Hello world test' },
        message: 'world test !',
        delay: 1
      }
    }, config, false)

    await helloWorld.run(context)
    assert.equal(context.processingConfig.datasetMode, 'update')
    assert.equal(context.processingConfig.dataset.title, 'Hello world test')
    const datasetId = context.processingConfig.dataset.id
    assert.ok(datasetId.startsWith('hello-world-test'))
    await context.ws._reconnect()

    // another execution should update the dataset, not create it
    // await new Promise(resolve => setTimeout(resolve, 4000))
    await helloWorld.run(context)
    assert.equal(context.processingConfig.dataset.id, datasetId)
    context.ws._ws.terminate()
  })
})
