import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadConfigFromFile } from 'vite'

const configFile = fileURLToPath(new URL('../vite.config.js', import.meta.url))
const { config } = await loadConfigFromFile(
  { command: 'serve', mode: 'development' },
  configFile,
)

// Registration and occurrence requests must all use the gateway in development.
for (const route of ['/community', '/ocorrencia']) {
  test(`proxies ${route} to the API gateway without rewriting the path`, () => {
    assert.equal(config.server.proxy[route], 'http://localhost:8081')
  })
}
