/**
 * pod — the handlers named by the api declaration in package.json.
 *
 * Plain functions taking and returning plain values. Nothing here sees a
 * request or a response, imports nothing from express, and reads nothing from
 * the environment.
 *
 * Unlike a search, this plugin's answer depends on WHERE it was asked: the same
 * question put to two sites of one farm has two different right answers. So the
 * site is an input, declared as context in the specification and supplied by the
 * farm alongside the query parameters — never reached for. A handler that cannot
 * be told where it is being asked should fail loudly rather than guess.
 */

import { roll as gather } from '../src/pod/roll.js'

export async function roll({ kinds = 'sisters', origin, farmRoot } = {}) {
  if (!origin || !farmRoot) {
    const err = new Error('roll needs the site it is asked at — origin and farmRoot are declared context')
    err.status = 500
    throw err
  }
  return gather({ kinds, origin, farmRoot })
}
