// 社区规范:源码仓库 + 构建脚本生成 lib/。esbuild 不检查类型。
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'

mkdirSync('lib', { recursive: true })

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['@deepseek-ai/*', 'zod'],
  sourcemap: true,
})

// 客户端 bundle:以普通 <script> 加载,通过全局注册把 { name, inject, apply }
// 交给宿主客户端加载器;若目标版本契约不同,请按安装版本调整全局键。
await build({
  entryPoints: ['src/client.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  globalName: '__dshPluginInlineImages',
  external: ['react'],
  sourcemap: true,
})

console.log('built dsh-inline-images (lib/index.js + lib/client.js)')
