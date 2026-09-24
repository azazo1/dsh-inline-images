/**
 * Host Config: 正文图片最大宽高的 volatile 字段.
 * 宽高是普通偏好, 写在 profile 条目的 Config 里; 回环 token 仍放凭证存储.
 */
import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_MAX_HEIGHT,
  DEFAULT_MAX_WIDTH,
  SIZE_MAX,
  SIZE_MIN,
} from './shared.ts'

export interface Config {
  maxWidth: Volatile<number>
  maxHeight: Volatile<number>
}

/** Runtime schema for {@link Config}. */
export const Config = z.object({
  maxWidth: z.number().min(SIZE_MIN).max(SIZE_MAX).default(DEFAULT_MAX_WIDTH)
    .description('对话正文内联图片的最大宽度, 单位像素.').volatile(),
  maxHeight: z.number().min(SIZE_MIN).max(SIZE_MAX).default(DEFAULT_MAX_HEIGHT)
    .description('对话正文内联图片的最大高度, 单位像素.').volatile(),
})
