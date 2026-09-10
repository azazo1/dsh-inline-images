/**
 * Host settings: 正文图片最大宽高的 schema.
 * 宽高是普通偏好, 走 settings; 回环 token 仍放凭证存储.
 */
import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_MAX_HEIGHT,
  DEFAULT_MAX_WIDTH,
  SIZE_MAX,
  SIZE_MIN,
} from './shared.ts'

export type InlineImagesSettings = {
  maxWidth: number
  maxHeight: number
}

export type SettingsOwner = {
  get(): InlineImagesSettings
  update(patch: Partial<InlineImagesSettings>): Promise<void>
}

export const InlineImagesSettingsSchema = z.object({
  maxWidth: z.number().min(SIZE_MIN).max(SIZE_MAX).default(DEFAULT_MAX_WIDTH)
    .description('对话正文内联图片的最大宽度, 单位像素.'),
  maxHeight: z.number().min(SIZE_MIN).max(SIZE_MAX).default(DEFAULT_MAX_HEIGHT)
    .description('对话正文内联图片的最大高度, 单位像素.'),
})
