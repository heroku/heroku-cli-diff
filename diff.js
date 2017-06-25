const cli = require('heroku-cli-util')
const a = require('awaiting')

module.exports = {
  topic: 'apps',
  command: 'diff',
  description: 'diffs two apps',
  help: 'help text for apps:diff',
  args: [ { name: 'app1' }, { name: 'app2' }],
  needsAuth: true,
  run: cli.command(diff)
}

async function diff (context, heroku) {
  try {
    // check files first to ensure that the apps exist
    const files = await diffFiles(heroku, context.args.app1, context.args.app2)
    // then check everything else together
    const diffs = await a.object({
      env: diffEnv(heroku, context.args.app1, context.args.app2),
      stack: diffStack(heroku, context.args.app1, context.args.app2),
      bp: diffBuildpacks(heroku, context.args.app1, context.args.app2),
      addons: diffAddons(heroku, context.args.app1, context.args.app2),
      features: diffFeatures(heroku, context.args.app1, context.args.app2)
    })
    const list = [...files, ...diffs.env, ...diffs.stack, ...diffs.bp, ...diffs.addons, ...diffs.features]
    cli.table(list, {
      columns: [
        {key: 'prop', label: 'property' },
        {key: 'app1', label: context.args.app1},
        {key: 'app2', label: context.args.app2}
      ]
    })
  }
  catch (err) {
    throw err instanceof a.ErrorList ? err[0] : err
  }
}

async function diffFiles(heroku, app1, app2) {
  const sums = await Promise.all([ checksum(heroku, app1), checksum(heroku, app2) ])
  return (sums[0] === sums[1]) ? [] : [{ prop: 'slug (checksum)', app1: sums[0], app2: sums[1] }]
}

async function checksum(heroku, app) {
  try {
    const releases = await heroku.get(`/apps/${app}/releases`)
    if (releases && releases[0] && releases[0].slug) {
      const slugID = releases[0].slug.id
      const slug = await heroku.get(`/apps/${app}/slugs/${slugID}`)
      return slug ? slug.checksum : null
    }
    return null
  }
  catch (err) {
    if (err.statusCode === 404) {
      throw new Error(`App not found: ${app}`)
    }
  }
}

async function diffEnv(heroku, app1, app2) {
  const [ vars1, vars2 ] = await Promise.all([
    heroku.get(`/apps/${app1}/config-vars`),
    heroku.get(`/apps/${app2}/config-vars`)
  ])
  const keys = new Set(Object.keys(vars1).concat(Object.keys(vars2)))
  return Array.from(keys).filter(k => vars1[k] !== vars2[k]).map(k => {
    return { prop: `config (${k})`, app1: vars1[k], app2: vars2[k] }
  })
}

async function diffStack(heroku, app1, app2) {
  const apps = await Promise.all([
    heroku.get(`/apps/${app1}`),
    heroku.get(`/apps/${app2}`)
  ])
  const a = apps[0]['stack:name']
  const b = apps[1]['stack:name']
  return (a === b) ? [] : [{ prop: 'stack', app1: a, app2: b }]
}

async function diffBuildpacks(heroku, app1, app2) {
  const bps = await Promise.all([
    heroku.get(`/apps/${app1}/buildpack-installations`),
    heroku.get(`/apps/${app2}/buildpack-installations`)
  ])
  const urls1 = bps[0].map(obj => obj.buildpack.url)
  const urls2 = bps[1].map(obj => obj.buildpack.url)
  const longest = urls1.length > urls2.length ? urls1 : urls2
  const pairs = longest.map((v, k) => ({ prop: `buildpack (${k})`, app1: urls1[k], app2: urls2[k] }))
  return pairs.filter(pair => pair.app1 !== pair.app2)
}

async function diffAddons(heroku, app1, app2) {
  const [ addons1, addons2 ] = await Promise.all([
    heroku.get(`/apps/${app1}/addons`),
    heroku.get(`/apps/${app2}/addons`)
  ])
  const names1 = new Set(addons1.map(addon => addon.addon_service.name))
  const names2 = new Set(addons2.map(addon => addon.addon_service.name))
  const only1 = [...names1].filter(name => !names2.has(name))
    .map(name => ({ prop: `add-on (${name})`, app1: 'true', app2: 'false' }))
  const only2 = [...names2].filter(name => !names1.has(name))
    .map(name => ({ prop: `add-on (${name})`, app1: 'false', app2: 'true' }))
  return only1.concat(only2)
}

async function diffFeatures(heroku, app1, app2) {
  const addons = await Promise.all([
    heroku.get(`/apps/${app1}/features`),
    heroku.get(`/apps/${app2}/features`)
  ])
  const names1 = new Set(addons[0].map(feature => feature.enabled ? feature.name : null).filter(Boolean))
  const names2 = new Set(addons[1].map(feature => feature.enabled ? feature.name : null).filter(Boolean))
  const only1 = [...names1].filter(name => !names2.has(name))
    .map(name => ({ prop: `feature (${name})`, app1: 'enabled', app2: 'disabled' }))
  const only2 = [...names2].filter(name => !names1.has(name))
    .map(name => ({ prop: `feature (${name})`, app1: 'disabled', app2: 'enabled' }))
  return only1.concat(only2)
}