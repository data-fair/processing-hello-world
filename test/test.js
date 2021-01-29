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
})
