const datasetSchema = [{ key: 'message', type: 'string' }]

exports.run = async ({ pluginConfig, processingConfig, processingId, tmpDir, axios, log }) => {
  log.step('Vérification du jeu de données')
  log.info(`tentative de lecture du jeu ${processingConfig.dataset.id}`)
  try {
    const dataset = (await axios.get(`api/v1/datasets/${processingConfig.dataset.id}`)).data
    log.debug('détail du jeu de données', dataset)
    if (dataset.extras && dataset.extras.processingId === processingId) {
      log.info('le jeu de données existe et est rattaché à ce traitement')
    } else {
      if (processingConfig.dataset.overwrite) {
        log.warning('le jeu de données existe et n\'est pas rattaché à ce traitement, l\'option "Surcharger un jeu existant" étant active le traitement peut continuer.')
        await axios.patch(`api/v1/datasets/${processingConfig.dataset.id}`, {
          extras: { ...dataset.extras, processingId }
        })
      } else {
        throw new Error('le jeu de données existe et n\'est pas rattaché à ce traitement')
      }
    }
    await axios.patch(`api/v1/datasets/${processingConfig.dataset.id}`, {
      title: processingConfig.dataset.title,
      schema: datasetSchema
    })
  } catch (err) {
    if (!err.response || err.response.status !== 404) throw err
    log.info('le jeu de données n\'existe pas encore')

    log.step('Création du jeu de données')
    const createdDataset = (await axios.put(`api/v1/datasets/${processingConfig.dataset.id}`, {
      title: processingConfig.dataset.title,
      isRest: true,
      schema: datasetSchema,
      extras: { processingId }
    })).data
    log.info('Le jeu a été créé')
    log.debug('jeu de données créé', createdDataset)
  }

  log.step('Écriture du message de bienvenue')
  await axios.put(`api/v1/datasets/${processingConfig.dataset.id}/lines/hello`, {
    message: pluginConfig.pluginMessage + ' ' + processingConfig.message
  })
  log.info('1 ligne de donnée écrite')
}
