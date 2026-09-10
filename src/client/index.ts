import type { Context } from './client-types.ts'
import {
  DEFAULT_MAX_HEIGHT,
  DEFAULT_MAX_WIDTH,
  INLINE_REMOTE_CONTRIBUTION,
  PLUGIN_NAME,
  ROUTE_PATH,
  SIZE_MAX,
  SIZE_MIN,
} from '../shared.ts'
import { sessionCwdOf } from './remote.ts'
import { SpanReplacer } from './span-replacer.ts'

/**
 * dsh-inline-images client (dsh 0.1.2-rc.1):
 *  - 前端替换: 扫描 MarkdownText 因 URL 白名单被拒而降级的图片路径 span,
 *    经 host resolveImage 授权后替换为同源回环 <img>; 会话日志保持模型原始文本.
 *  - shell.overlay 灯箱: 点击替换出的图片放大; 点背景或 Esc 关闭.
 *  - 设置 -> 内联图片 (ctx.remote.inlineImages) 控制正文图片最大尺寸.
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

    function ImageLightbox() {
      const current = useStore({ subscribe: lightboxStore.subscribe.bind(lightboxStore), get: () => lightboxStore.current })
      if (current === null) return null
      return el('div', {
        style: { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.82)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'zoom-out' },
        onClick: () => lightboxStore.close(),
      },
        el('img', { src: current.src, alt: current.name, style: { maxWidth: '92vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 6 }, onClick: (e: any) => e.stopPropagation() }),
        el('div', { style: { color: '#fff', fontSize: 13, opacity: 0.9 } }, current.name),
        el('button', { style: { padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.5)', background: 'transparent', color: '#fff', cursor: 'pointer' }, onClick: (e: any) => { e.stopPropagation(); lightboxStore.close() } }, '关闭 (Esc)'),
      )
    }

    function unwrapRemoteResult(result: any, fallbackMessage: string): any {
      if (result && typeof result === 'object' && 'ok' in result) {
        if (result.ok === true) return result.value
        const err = result.error
        throw new Error(typeof err?.message === 'string' ? err.message : fallbackMessage)
      }
      return result
    }

    function InlineSettings(props: any) {
      const remote = props.ctx.remote
      const [maxWidth, setMaxWidth] = React.useState(DEFAULT_MAX_WIDTH)
      const [maxHeight, setMaxHeight] = React.useState(DEFAULT_MAX_HEIGHT)
      const [status, setStatus] = React.useState<{ kind: string; text: string } | null>(null)

      React.useEffect(() => {
        let alive = true
        if (remote?.inlineImages?.getConfig === undefined) {
          applyImageSizes(DEFAULT_MAX_WIDTH, DEFAULT_MAX_HEIGHT)
          return () => { alive = false }
        }
        remote.inlineImages.getConfig().then((result: any) => {
          if (!alive) return
          const cfg = unwrapRemoteResult(result, '读取配置失败')
          setMaxWidth(cfg.maxWidth ?? DEFAULT_MAX_WIDTH)
          setMaxHeight(cfg.maxHeight ?? DEFAULT_MAX_HEIGHT)
          applyImageSizes(cfg.maxWidth ?? DEFAULT_MAX_WIDTH, cfg.maxHeight ?? DEFAULT_MAX_HEIGHT)
        }).catch(() => {
          if (alive) applyImageSizes(DEFAULT_MAX_WIDTH, DEFAULT_MAX_HEIGHT)
        })
        return () => { alive = false }
      }, [remote])

      const save = () => {
        if (remote?.inlineImages?.setConfig === undefined) {
          setStatus({ kind: 'err', text: 'Remote 端点未挂载, 无法保存' })
          return
        }
        setStatus(null)
        remote.inlineImages.setConfig({
          maxWidth: Number(maxWidth) || DEFAULT_MAX_WIDTH,
          maxHeight: Number(maxHeight) || DEFAULT_MAX_HEIGHT,
        }).then((result: any) => {
          const cfg = unwrapRemoteResult(result, '保存失败')
          setMaxWidth(cfg.maxWidth)
          setMaxHeight(cfg.maxHeight)
          applyImageSizes(cfg.maxWidth, cfg.maxHeight)
          setStatus({ kind: 'ok', text: '正文图片最大尺寸已更新为 ' + cfg.maxWidth + 'x' + cfg.maxHeight })
        }).catch((err: any) => {
          setStatus({ kind: 'err', text: '保存失败: ' + String(err?.message ?? err) })
        })
      }

      const inputStyle: any = { width: 70, padding: '4px 8px', marginRight: 4 }
      const btnStyle: any = { padding: '6px 14px', cursor: 'pointer' }

      return el('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: DEFAULT_MAX_WIDTH } },
        el('div', { style: { fontSize: 12, opacity: 0.7, lineHeight: 1.5 } },
          'LLM 回复中写出的 ![路径](路径) 形式图片引用 (支持绝对路径或相对会话工作目录的相对路径) 会在前端渲染成图片, 会话内容保持原样. 可在此调整正文图片的最大显示尺寸; 点击正文图片可放大查看原图. 支持格式: png/jpg/jpeg/webp/gif/svg/avif/bmp/ico.',
        ),
        el('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
          el('span', { style: { fontSize: 13 } }, '正文图片最大尺寸:'),
          el('input', { type: 'number', min: SIZE_MIN, max: SIZE_MAX, value: maxWidth, title: '宽度 px', onChange: (e: any) => setMaxWidth(e.target.value), style: inputStyle }),
          el('span', null, 'x'),
          el('input', { type: 'number', min: SIZE_MIN, max: SIZE_MAX, value: maxHeight, title: '高度 px', onChange: (e: any) => setMaxHeight(e.target.value), style: inputStyle }),
          el('button', { style: btnStyle, onClick: save }, '应用'),
          status ? el('span', { style: { fontSize: 12, color: status.kind === 'ok' ? '#2e9e5b' : '#d64545' } }, status.text) : null,
        ),
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

    function applyMounted(scope: Context, sessions: Context['sessions'], inlineImages: any): void {
      scope.slots.inject('shell.overlay', () => scope.slots.register(
        { name: 'shell.overlay', id: 'inline-images-lightbox', order: 100, label: '图片灯箱' },
        () => React.createElement(ImageLightbox, null),
      ))
      scope.slots.inject('settings.section', () => scope.slots.register(
        { name: 'settings.section', id: 'inline-images', order: 35, label: '内联图片' },
        (props: any) => React.createElement(InlineSettings, { ...props, ctx: { ...scope, remote: { inlineImages } } }),
      ))

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
      await ctx.remote.$mount(INLINE_REMOTE_CONTRIBUTION)
      // 不要用 ctx.remote.inlineImages (未 inject 会抛错), 也不要 ctx.inject 等这个 key (外部插件 fiber 可能永远等不到).
      const inlineImages = typeof ctx.get === 'function' ? ctx.get('remote.inlineImages') : undefined
      if (inlineImages === undefined || typeof inlineImages.resolveImage !== 'function') return
      applyMounted(ctx, ctx.sessions, inlineImages)
    }

    return {
      name: PLUGIN_NAME,
      inject: ['slots', 'remote', 'sessions'],
      apply,
    }
  },
})
