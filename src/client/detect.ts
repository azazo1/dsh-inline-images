import { PLUGIN_NAME, ROUTE_PATH } from '../shared.ts'

/**
 * 检测元素是否为 MarkdownText 降级 span: 纯文本内容匹配图片路径候选.
 * 产品 renderImage 在 URL 白名单拒绝时输出 <span class="imageAlt">{alt}</span>,
 * 我们按 "span 无子元素 + 文本以图片扩展名结尾" 识别, 不依赖内部 CSS 类名.
 */
export function findDegradedImageSpans(root: ParentNode): HTMLSpanElement[] {
  const spans = root.querySelectorAll('span')
  const found: HTMLSpanElement[] = []
  for (const span of spans) {
    if (span.childNodes.length !== 1) continue
    const first = span.childNodes[0]
    if (first.nodeType !== Node.TEXT_NODE) continue
    const text = span.textContent?.trim() ?? ''
    if (!isCandidateText(text)) continue
    found.push(span)
  }
  return found
}

/** 图片路径候选: 后缀白名单 + 排除 URL/已替换的回环地址. */
export function isCandidateText(text: string): boolean {
  if (text.length < 3 || text.length > 1024) return false
  if (/(^|[^\\])\s/.test(text)) return false
  if (/^https?:/i.test(text)) return false
  if (text.includes(ROUTE_PATH)) return false
  return /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i.test(text)
}

/** 灯箱与替换后图片共享的 data 标记. */
export const IMG_FLAG = 'data-' + PLUGIN_NAME + '-img'

/** 从降级 span 提取待解析的图片路径文本. */
export function pathTextOf(span: Element): string {
  return (span.textContent ?? '').trim()
}
