const datasetSchema = [{ key: 'message', type: 'string' }]

// a global variable to manage interruption
let stopped

// main running method of the task
// pluginConfig: an object matching the schema in plugin-config-schema.json
// processingConfig: an object matching the schema in processing-config-schema.json
// processingId: the id of the processing configuration in @data-fair/processings
// dir: a persistent directory associated to the processing configuration
// tmpDir: a temporary directory that will automatically destroyed after running
// axios: an axios instance configured so that its base url is a data-fair instance and it sends proper credentials
// log: contains async debug/info/warning/error methods to store a log on the processing run
// patchConfig: async method accepting an object to be merged with the configuration
// ws: an event emitter to wait for some state changes coming through web socket from the data-fair server
// sendMail: an async function to send an email (see https://nodemailer.com/usage/#sending-mail)
exports.run = async ({ pluginConfig, processingConfig, processingId, dir, tmpDir, axios, log, patchConfig, ws, sendMail }) => {
  if (processingConfig.delay) {
    await log.step('Application du délai')
    await log.info(`attend ${processingConfig.delay} seconde(s)`)
    for (let i = 0; i < processingConfig.delay; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      if (stopped && !processingConfig.ignoreStop) {
        return await log.warning('interrompu proprement pendant l\'attente')
      }
    }
  }

  if (processingConfig.email && processingConfig.email.to && processingConfig.email.from) {
    await log.step('Envoi d\'un mail de test')
    const mail = {
      from: processingConfig.email.from,
      to: processingConfig.email.to,
      subject: 'Hello world processing !',
      text: 'A test email',
      attachments: [{ filename: 'test.txt', content: 'A test attachment' }]
    }
    await log.info('mail : ' + JSON.stringify(mail))
    await sendMail(mail)
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
    await ws.waitForJournal(dataset.id, 'finalize-end')
  } else if (processingConfig.datasetMode === 'update') {
    await log.step('Vérification du jeu de données')
    dataset = (await axios.get(`api/v1/datasets/${processingConfig.dataset.id}`)).data
    if (!dataset) throw new Error(`le jeu de données n'existe pas, id="${processingConfig.dataset.id}"`)
    await log.info(`le jeu de donnée existe, id="${dataset.id}", title="${dataset.title}"`)
  }

  await log.task('Tâche avec progression')
  await log.progress('Tâche avec progression', 0, 100)
  await new Promise(resolve => setTimeout(resolve, 2000))
  for (let i = 0; i < 100; i++) {
    await new Promise(resolve => setTimeout(resolve, 100))
    await log.progress('Tâche avec progression', i + 1, 100)
  }

  await log.step('Écriture du message de bienvenue')
  await axios.put(`api/v1/datasets/${dataset.id}/lines/hello`, {
    message: pluginConfig.pluginMessage + ' ' + processingConfig.message
  })
  await log.info('1 ligne de donnée écrite')
  await ws.waitForJournal(dataset.id, 'finalize-end')
}

// used to manage interruption
// not required but it is a good practice to prevent incoherent state a smuch as possible
// the run method should finish shortly after calling stop, otherwise the process will be forcibly terminated
// the grace period before force termination is 20 seconds
exports.stop = async () => {
  stopped = true
}
