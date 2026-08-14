# dsh-inline-images 对话内联图片

让 DeepSeek Harness 的对话**直接显示本地图片**:LLM 回复中输出的本地图片路径(截图、生成图等)会在**消息正文里**自动渲染成图片 —— 不再只是一串看不到的路径文本。

![示例](assets/screenshots/demo.png)

## 功能

- **消息正文内联渲染**:扫描助手回复文本中的本地图片路径(`C:\...` 盘符、UNC、POSIX、`![](本地路径)`、反引号包裹),把真实存在的图片改写成同源回环 URL,产品 MarkdownText 直接在正文渲染。
- **支持 9 种格式**:png / jpg / jpeg / webp / gif / svg / avif / bmp / ico。
- **点击放大灯箱**:点击正文图片 → 全屏大图;点背景或按 Esc 关闭。
- **可调尺寸**:设置 → 内联图片,调整正文图片最大宽/高(64–2400 px,默认 640×420),持久化到凭证存储(`INLINE_IMAGE_MAX_WIDTH` / `INLINE_IMAGE_MAX_HEIGHT`)。
- **安静降级**:不存在的路径、示例/占位路径(路径、xx、... 等)静默跳过,不影响对话;消息内容仍是纯文本 URL,纯文本模型适配器不会拒绝。

## 构建与安装

```sh
pnpm install
pnpm run build
dsh plugin --profile web add ./dsh-inline-images
```

## 工作原理

1. `llm/stream` 包装器扫描文本块,`fs.stat` 确认文件存在。
2. 按原始区间把路径替换为 `![](http://127.0.0.1:<port>/plugins/dsh-inline-images/image?t=<token>&p=<path>)`。
3. webServer 路由实时读取文件字节返回(与页面同源,无 CSP/混合内容问题);token 每次激活随机生成。

## 许可证

MIT
