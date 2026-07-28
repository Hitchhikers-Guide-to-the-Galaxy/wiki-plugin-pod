// pod plugin — server-side component.
//
// A thin caller now. Everything it used to know how to do lives in
// ../src/pod/roll.js as plain functions; this file only turns a request into
// arguments and a result into JSON. The route it serves is unchanged, so the
// shipped client keeps calling the address it always called — the migration
// adds a second way in without disturbing the first.
//
// Started on the `running-serv` event with { argv, app }.
//
// NOTE: authored as CommonJS on purpose. wiki-server loads a plugin's
// server/server.js with require() (older releases) or import() (newer); CJS
// is the only format that works under BOTH, on every Node version. An ESM
// server.js throws ERR_REQUIRE_ESM on the require() loader (Node < 22.12),
// and the wiki swallows that error, so the plugin's routes silently vanish.
// The sibling server/package.json ({"type":"commonjs"}) makes Node treat this
// file as CJS even though the plugin's root package.json is "type":"module",
// so the rest of the plugin (src/, tests, build) can stay ESM.
//
// The shared module is ESM, and is reached by dynamic import() rather than
// require(). Dynamic import works from CommonJS on every Node that runs the
// wiki, while require() of an ES module only works from Node 22.12 — so this is
// the one form that needs no version to be true.

const path = require('node:path')

const startServer = ({ argv, app }) => {
  // argv.status = {farmRoot}/{thisDomain}/status
  const farmRoot = path.dirname(path.dirname(argv.status))
  const origin = path.basename(path.dirname(argv.status)) // e.g. demoscene.localhost

  // Imported once, awaited per request. Kept as the promise so a slow or failed
  // load cannot delay the route being registered.
  const thinking = import('../src/pod/roll.js')

  app.get('/plugin/pod/roll', async (req, res) => {
    try {
      const { roll } = await thinking
      res.json(await roll({ kinds: req.query.kinds || 'sisters', origin, farmRoot }))
    } catch (e) {
      console.log('pod plugin: roll failed —', e?.stack || e)
      res.status(500).json({ error: e.message })
    }
  })
}

module.exports = { startServer }
