exports.pluginConfigSchema = async () => ({
  type: 'object',
  properties: {
    defaultMessage: {
      type: 'string',
      title: 'Default message',
      default: 'Hello world'
    }
  }
})

exports.processingConfigSchema = async (pluginConfig) => ({
  type: 'object',
  properties: {
    message: {
      type: 'string',
      title: 'Message',
      default: pluginConfig.defaultMessage
    }
  }
})

exports.run = async (pluginConfig, processingConfig, { tmpDir }) => {
  return {
    schema: [{ key: 'message', type: 'string' }],
    bulkLines: [{ _id: 'hello', message: processingConfig.message }]
  }
}
