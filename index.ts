import type { ProcessingContext, PrepareFunction } from '@data-fair/lib-common-types/processings.js'
import type { ProcessingConfig } from './types/processingConfig/index.ts'

const datasetSchema = [{ key: 'message', type: 'string' }]

// a global variable to manage interruption
let stopped = false

/**
 * This is the main function of the plugin, triggerd by processings.
 */
export const run = async (context: ProcessingContext<ProcessingConfig>) => {
  const { pluginConfig, processingConfig, secrets, processingId, axios, log, patchConfig, ws, sendMail } = context
  await log.step('Démarrage du traitement')
  await log.info('Context (extra log):', context)

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
  if (processingConfig.throwError) {
    throw new Error('erreur de test pendant l\'exécution du traitement')
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
    // @ts-ignore they are maybe an types error in the lib-common-types
    await sendMail(mail)
  }

  let dataset
  if (processingConfig.datasetMode === 'create') {
    await log.step('Création du jeu de données')
    dataset = (await axios.post('api/v1/datasets', {
      title: processingConfig.dataset.title,
      description: secrets?.secretField ?? processingConfig.secretField ?? '',
      isRest: true,
      schema: datasetSchema,
      extras: { processingId }
    })).data
    await log.info(`jeu de donnée créé, id="${dataset.id}", title="${dataset.title}"`)
    await patchConfig({ datasetMode: 'update', dataset: { id: dataset.id, title: dataset.title } })
  } else if (processingConfig.datasetMode === 'update') {
    await log.step('Vérification du jeu de données')
    dataset = (await axios.get(`api/v1/datasets/${processingConfig.dataset.id}`)).data
    if (!dataset) throw new Error(`le jeu de données n'existe pas, id="${processingConfig.dataset.id}"`)
    await log.info(`le jeu de donnée existe, id="${dataset.id}", title="${dataset.title}"`)
    if (secrets?.secretField) {
      await log.step('Mise à jour du secret')
      await axios.patch(`api/v1/datasets/${dataset.id}`, {
        description: secrets.secretField
      })
    }
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

/**
 * Used to manage interruption
 * Thsi method is not required but it is a good practice to prevent incoherent state as much as possible
 * The run method should finish shortly after calling stop, otherwise the process will be forcibly terminated
 * The grace period before force termination is 20 seconds
 */
export const stop = async () => { stopped = true }

export const prepare: PrepareFunction<ProcessingConfig> = async ({ processingConfig, secrets }) => {
  const secretField = processingConfig.secretField

  if (secretField && secretField !== '********') {
    secrets.secretField = '********'
  } else if (secrets?.secretField && secretField === '') {
    delete secrets.secretField
  }

  return {
    processingConfig,
    secrets
  }
}
