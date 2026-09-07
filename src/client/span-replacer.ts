import { findDegradedImageSpans, IMG_FLAG, pathTextOf } from './detect.ts'
import { requestImageUrl } from './remote.ts'

type ResolveImageFn = (args: { path: string; cwd?: string }) => Promise<unknown>

/**
 * 消息文本降级 span 的前端替换器.
 * MarkdownText 拒绝非 http(s) 图片 src 后输出纯文本 span, 这里扫描该 span,
 * 经 host resolveImage 授权后替换为 <img>. 不修改任何会话数据.
 */
export class SpanReplacer {
  private resolveImage: ResolveImageFn | undefined
  private getCwd: () => string | undefined
  private replaceSpan: (span: Element, url: string, path: string) => void
  private pending = new Set<Element>()
  private inflight = new Set<string>()

  constructor(
    resolveImage: ResolveImageFn | undefined,
    getCwd: () => string | undefined,
    replaceSpan: (span: Element, url: string, path: string) => void,
  ) {
    this.resolveImage = resolveImage
    this.getCwd = getCwd
    this.replaceSpan = replaceSpan
  }

  /** 扫描 root 下的降级 span 并异步替换; 已处理/进行中的 span 自动跳过. */
  scan(root: ParentNode): void {
    const spans = findDegradedImageSpans(root)
    for (const span of spans) {
      if (this.pending.has(span) || span.getAttribute(IMG_FLAG) !== null) continue
      const path = pathTextOf(span)
      if (path === '' || this.inflight.has(path)) continue
      this.pending.add(span)
      void this.resolveOne(span, path)
    }
  }

  private async resolveOne(span: Element, path: string): Promise<void> {
    this.inflight.add(path)
    try {
      const url = await requestImageUrl(this.resolveImage, path, this.getCwd())
      this.pending.delete(span)
      if (url === undefined || !span.isConnected) return
      this.replaceSpan(span, url, path)
    } finally {
      this.inflight.delete(path)
    }
  }
}
