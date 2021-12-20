const datasetSchema = [{ key: 'message', type: 'string' }]

let stopped
exports.run = async ({ pluginConfig, processingConfig, processingId, dir, tmpDir, axios, log, patchConfig }) => {
  if (processingConfig.delay) {
    await log.step('Application du délai')
    await log.info(`attend ${processingConfig.delay} seconde(s)`)
    for (let i = 0; i < processingConfig.delay; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      if (stopped && !processingConfig.ignoreStop) return await log.error('interrompu')
    }
  }

  let dataset
  if (processingConfig.datasetMode === 'create') {
    await log.step('Création du jeu de données')
    dataset = (await axios.post('api/v1/datasets', {
      id: processingConfig.dataset.id,
      title: processingConfig.dataset.title,
      isRest: true,
      schema: datasetSchema,
      extras: { processingId }
    })).data
    await log.info(`jeu de donnée créé, id="${dataset.id}", title="${dataset.title}"`)
    await patchConfig({ datasetMode: 'update', dataset: { id: dataset.id, title: dataset.title } })
  } else if (processingConfig.datasetMode === 'update') {
    await log.step('Vérification du jeu de données')
    dataset = (await axios.get(`api/v1/datasets/${processingConfig.dataset.id}`)).data
    if (!dataset) throw new Error(`le jeu de données n'existe pas, id${processingConfig.dataset.id}`)
    await log.info(`le jeu de donnée existe, id="${dataset.id}", title="${dataset.title}"`)
  }

  await log.step('Écriture du message de bienvenue')
  await axios.put(`api/v1/datasets/${dataset.id}/lines/hello`, {
    message: pluginConfig.pluginMessage + ' ' + processingConfig.message
  })
  await log.info('1 ligne de donnée écrite')
}

exports.stop = async () => {
  stopped = true
}
