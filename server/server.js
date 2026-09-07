// pod plugin — server-side component.
//
// One route, one directory read: the names of the sites this farm holds. Which
// of them are sisters or children is arithmetic on those names, worked out in
// the browser with src/pod/kinship.js. Server code is resident in the shared
// farm process on every site, so only what needs the disk is here.
//
// Started on the `running-serv` event with { argv, app }.
//
// NOTE: authored as CommonJS on purpose. wiki-server loads a plugin's
// server/server.js with require() (older releases) or import() (newer); CJS is
// the only format that works under BOTH, on every Node version. An ESM
// server.js throws ERR_REQUIRE_ESM on the require() loader (Node < 22.12), and
// the wiki swallows that error, so the plugin's routes silently vanish. The
// sibling server/package.json ({"type":"commonjs"}) makes Node treat this file
// as CJS even though the plugin's root package.json is "type":"module". The
// shared module is ESM and is reached by dynamic import(), which works from
// CommonJS on every Node that runs the wiki.

const path = require('node:path')

const startServer = ({ argv, app }) => {
  // argv.status = {farmRoot}/{thisDomain}/status
  const farmRoot = path.dirname(path.dirname(argv.status))
  const origin = path.basename(path.dirname(argv.status)) // e.g. demoscene.localhost

  // Imported once, awaited per request, so a slow or failed load cannot delay
  // the route being registered.
  const thinking = import('../src/pod/roll.js')

  app.get('/plugin/pod/sites', async (req, res) => {
    try {
      const { sitesOf, parentOf } = await thinking
      res.json({ origin, parentDomain: parentOf(origin), sites: await sitesOf(farmRoot) })
    } catch (e) {
      console.log('pod plugin: sites failed —', e?.stack || e)
      res.status(500).json({ error: e.message })
    }
  })
}

module.exports = { startServer }
