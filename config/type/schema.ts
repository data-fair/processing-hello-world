export default {
    $id: 'https://github.com/data-fair/processings-rss/config',
    'x-exports': [
      'types',
      'validate'
    ],
    type: 'object',
    title: 'Config',
    additionalProperties: false,
    required: [
      'dataFairUrl',
      'dataFairAPIKey'
    ],
    properties: {
      dataFairUrl: {
        type: 'string'
      },
      dataFairAPIKey: {
        type: 'string'
      }
    }
  }