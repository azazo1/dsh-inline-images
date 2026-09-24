import type { Context } from './client-types.ts'
import {
  DEFAULT_MAX_HEIGHT,
  DEFAULT_MAX_WIDTH,
  INLINE_REMOTE_CONTRIBUTION,
  PLUGIN_NAME,
  ROUTE_PATH,
} from '../shared.ts'
import { en, NS, zh } from './locales.ts'
import { createSettingsCard, InlineImagesSettingsCard } from './settings-card.ts'
import { sessionCwdOf } from './remote.ts'
import { SpanReplacer } from './span-replacer.ts'

/**
 * dsh-inline-images client:
 *  - 前端替换: 扫描 MarkdownText 因 URL 白名单被拒而降级的图片路径 span,
 *    经 host resolveImage 授权后替换为同源回环 <img>; 会话日志保持模型原始文本.
 *  - shell.overlay 灯箱: 点击替换出的图片放大; 点背景或 Esc 关闭.
 *  - 插件页配置卡片 (plugins.bundle.config): 正文图片最大宽高经 ctx.configForms 读写,
 *    Host 侧 Config 的 volatile 字段是唯一来源, 保存落在 profile 的 patch 层.
 */
declare const window: {
  __ModuleLoader__: {
    load(registration: {
      id: string
      factory: (req: (id: string) => any) => any
    }): void
  }
}

window.__ModuleLoader__.load({
  id: PLUGIN_NAME,
  factory: (req) => {
    const React = req('react')
    // 官方控件与表单模型经 module loader 的 require 取, 不把宿主包打进本 bundle.
    const primitives = req('@deepseek-ai/dsh-client-ui-primitives')
    const SettingsCard = createSettingsCard({
      React,
      SettingsForm: primitives.SettingsForm,
      SettingsValueField: primitives.SettingsValueField,
    })

    function el(type: any, props: any, ...children: any[]) {
      return React.createElement.apply(null, [type, props].concat(children))
    }

    const lightboxStore = {
      listeners: new Set<() => void>(),
      current: null as { src: string; name: string } | null,
      open(src: string, name: string) {
        this.current = { src, name }
        for (const fn of [...this.listeners]) { try { fn() } catch { /* keep others */ } }
      },
      close() {
        this.current = null
        for (const fn of [...this.listeners]) { try { fn() } catch { /* keep others */ } }
      },
      subscribe(fn: () => void) {
        this.listeners.add(fn)
        return () => { this.listeners.delete(fn) }
      },
    }

    function useStore<T>(s: { subscribe(fn: () => void): () => void; get(): T }): T {
      const [value, setValue] = React.useState<T>(s.get())
      React.useEffect(() => s.subscribe(() => setValue(s.get())), [])
      return value
    }

    /** 灯箱关闭按钮的文案: 挂载时按当前字典覆盖. */
    let lightboxCloseLabel = '关闭 (Esc)'

    function ImageLightbox() {
      const current = useStore({ subscribe: lightboxStore.subscribe.bind(lightboxStore), get: () => lightboxStore.current })
      if (current === null) return null
      return el('div', {
        style: { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.82)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'zoom-out' },
        onClick: () => lightboxStore.close(),
      },
        el('img', { src: current.src, alt: current.name, style: { maxWidth: '92vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 6 }, onClick: (e: any) => e.stopPropagation() }),
        el('div', { style: { color: '#fff', fontSize: 13, opacity: 0.9 } }, current.name),
        el('button', { style: { padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.5)', background: 'transparent', color: '#fff', cursor: 'pointer' }, onClick: (e: any) => { e.stopPropagation(); lightboxStore.close() } }, lightboxCloseLabel),
      )
    }

    let styleTag: { textContent: string; parentNode: { removeChild(node: unknown): void } | null } | null = null
    function applyImageSizes(maxWidth: number, maxHeight: number) {
      if (typeof document === 'undefined') return
      if (styleTag === null) {
        const tag = document.createElement('style')
        tag.dataset.pluginCss = PLUGIN_NAME
        document.head.appendChild(tag)
        styleTag = tag
      }
      styleTag.textContent = 'img[src*="' + ROUTE_PATH + '"] { max-width: ' + maxWidth + 'px !important; max-height: ' + maxHeight + 'px !important; object-fit: contain; border-radius: 8px; }'
    }

    function makeSpanToImage(openLightbox: (src: string, name: string) => void) {
      return (span: Element, url: string, path: string) => {
        if (typeof document === 'undefined') return
        const img = document.createElement('img')
        img.src = url
        img.alt = path
        img.loading = 'lazy'
        img.decoding = 'async'
        img.referrerPolicy = 'no-referrer'
        img.dataset.inlineImage = PLUGIN_NAME
        img.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          openLightbox(url, path)
        })
        span.replaceWith(img)
      }
    }

    /** 与 remote 无关的界面: 灯箱、字典、插件页配置卡片与尺寸样式. */
    function setupSettings(scope: Context): void {
      scope.slots.inject('shell.overlay', () => scope.slots.register(
        { name: 'shell.overlay', id: 'inline-images-lightbox', order: 100, label: '图片灯箱' },
        () => React.createElement(ImageLightbox, null),
      ))

      const t = scope.locale.bind(NS)
      lightboxCloseLabel = t('closeLightbox')
      scope.effect(() => scope.locale.register(NS, { zh, en }), 'dsh-inline-images: dictionaries')
      const card = new InlineImagesSettingsCard(
        scope.configForms.get(PLUGIN_NAME),
        primitives.SettingsFormModel,
        primitives.settingsNumberField,
      )
      scope.effect(() => () => { card.dispose() }, 'dsh-inline-images: settings form')
      scope.effect(() => scope.configForms.whileServed([PLUGIN_NAME], () => scope.slots.inject(
        'plugins.bundle.config',
        () => scope.slots.register({
          name: 'plugins.bundle.config',
          key: PLUGIN_NAME,
          locale: NS,
          inject: () => card.inject(),
        }, SettingsCard),
      )), 'dsh-inline-images: plugins page card')

      // 尺寸跟随配置: 挂载读一次, 之后任何页面写入都实时改样式.
      const applyFromForm = () => {
        const value = (scope.configForms.get(PLUGIN_NAME).getSnapshot().value ?? {}) as { maxWidth?: number; maxHeight?: number }
        applyImageSizes(
          typeof value.maxWidth === 'number' ? value.maxWidth : DEFAULT_MAX_WIDTH,
          typeof value.maxHeight === 'number' ? value.maxHeight : DEFAULT_MAX_HEIGHT,
        )
      }
      applyFromForm()
      scope.effect(() => scope.configForms.get(PLUGIN_NAME).subscribe(applyFromForm), 'dsh-inline-images: image sizes')
    }

    function applyMounted(scope: Context, sessions: Context['sessions'], inlineImages: any): void {
      if (typeof document === 'undefined') return
      const replacer = new SpanReplacer(
        (args) => inlineImages.resolveImage(args),
        () => sessionCwdOf(sessions),
        makeSpanToImage((src, name) => lightboxStore.open(src, name)),
      )

      const scanAll = (root: ParentNode) => {
        replacer.scan(root)
      }

      // 流式渲染与翻页都会改动 DOM: 双通道兜底 (初始全量 + observer 增量).
      scanAll(document.body)
      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) scanAll(node as Element)
            else if (node.nodeType === Node.TEXT_NODE && node.parentElement !== null) scanAll(node.parentElement)
          }
          if (mutation.type === 'characterData' && mutation.target.parentElement !== null) scanAll(mutation.target.parentElement)
        }
      })
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })

      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') lightboxStore.close()
      }
      document.addEventListener('keydown', onKey, true)
      scope.effect(() => () => {
        observer.disconnect()
        document.removeEventListener('keydown', onKey, true)
        if (styleTag !== null && styleTag.parentNode !== null) styleTag.parentNode.removeChild(styleTag)
      })
    }

    async function apply(ctx: Context): Promise<void> {
      // 配置卡片与尺寸样式不依赖 remote, 先挂上.
      setupSettings(ctx)
      await ctx.remote.$mount(INLINE_REMOTE_CONTRIBUTION)
      // 不要用 ctx.remote.inlineImages (未 inject 会抛错), 也不要 ctx.inject 等这个 key (外部插件 fiber 可能永远等不到).
      const inlineImages = typeof ctx.get === 'function' ? ctx.get('remote.inlineImages') : undefined
      if (inlineImages === undefined || typeof inlineImages.resolveImage !== 'function') return
      applyMounted(ctx, ctx.sessions, inlineImages)
    }

    return {
      name: PLUGIN_NAME,
      inject: ['slots', 'remote', 'sessions', 'locale', 'configForms'],
      apply,
    }
  },
})
