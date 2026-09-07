// 社区规范: 源码仓库 + 构建脚本生成 lib/. esbuild 不检查类型.
import { build } from 'esbuild'
import { mkdirSync, readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

mkdirSync('lib', { recursive: true })

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['@deepseek-ai/*'],
  sourcemap: true,
})

await build({
  entryPoints: ['src/client.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  external: ['react'],
  sourcemap: true,
})

verifyClientBundle()
console.log('built dsh-inline-images (lib/index.js + lib/client.js)')

function verifyClientBundle() {
  const code = readFileSync('lib/client.js', 'utf8')
  if (/\nimport\s/.test(code) || code.startsWith('import ')) {
    throw new Error('client bundle 含有顶层 ESM import, 不能作为 classic script 加载')
  }
  if (/\nexport\s/.test(code)) {
    throw new Error('client bundle 含有 ESM export, 不能作为 classic script 加载')
  }

  const registrations = []
  const sandbox = createContext({
    window: {
      __ModuleLoader__: {
        load(registration) {
          registrations.push(registration)
        },
      },
    },
    console,
  })
  runInContext(code, sandbox, { filename: 'lib/client.js' })

  if (registrations.length !== 1) {
    throw new Error('client bundle 应恰好调用一次 __ModuleLoader__.load, 实际: ' + registrations.length)
  }
  const registration = registrations[0]
  if (registration.id !== 'dsh-inline-images') {
    throw new Error('client registration id 必须等于 package.json name, 实际: ' + JSON.stringify(registration.id))
  }
  if (typeof registration.factory !== 'function') {
    throw new Error('client registration 缺少 factory')
  }

  const required = []
  const plugin = registration.factory((id) => {
    required.push(id)
    if (id === 'react') {
      return {
        createElement() { return null },
        useState(v) { return [v, () => {}] },
        useEffect() {},
      }
    }
    throw new Error('unexpected require: ' + id)
  })
  if (!required.includes('react')) {
    throw new Error('factory 应通过 require("react") 获取 React')
  }
  if (typeof plugin?.apply !== 'function') {
    throw new Error('factory 必须返回带 apply 的插件对象')
  }
  if (!Array.isArray(plugin.inject) || !plugin.inject.includes('slots') || !plugin.inject.includes('remote')) {
    throw new Error('factory 返回的 inject 必须包含 slots 和 remote')
  }
}
