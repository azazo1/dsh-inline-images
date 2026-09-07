// src/index.ts
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

// src/shared.ts
var PLUGIN_NAME = "dsh-inline-images";
var ROUTE_PATH = "/plugins/dsh-inline-images/image";
var IMAGE_FORMATS = ["png", "jpg", "jpeg", "webp", "gif", "svg", "avif", "bmp", "ico"];
function asFiniteNumber(value, label) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error(label + " \u5FC5\u987B\u662F\u6709\u9650\u6570\u5B57");
  return n;
}
function parseConfig(value) {
  if (typeof value !== "object" || value === null) throw new Error("config \u5FC5\u987B\u662F\u5BF9\u8C61");
  const record = value;
  const formats = Array.isArray(record.formats) ? record.formats.filter((item) => typeof item === "string") : [...IMAGE_FORMATS];
  return {
    maxWidth: asFiniteNumber(record.maxWidth, "maxWidth"),
    maxHeight: asFiniteNumber(record.maxHeight, "maxHeight"),
    formats
  };
}
function parseSetConfigArgs(value) {
  if (value === void 0) return {};
  if (typeof value !== "object" || value === null) throw new Error("setConfig args \u5FC5\u987B\u662F\u5BF9\u8C61");
  const record = value;
  const out = {};
  if (record.maxWidth !== void 0) out.maxWidth = asFiniteNumber(record.maxWidth, "maxWidth");
  if (record.maxHeight !== void 0) out.maxHeight = asFiniteNumber(record.maxHeight, "maxHeight");
  return out;
}
function parseResolveImageArgs(value) {
  if (typeof value !== "object" || value === null) throw new Error("resolveImage args \u5FC5\u987B\u662F\u5BF9\u8C61");
  const record = value;
  if (typeof record.path !== "string" || record.path.trim() === "") throw new Error("path \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32");
  if (record.cwd !== void 0 && typeof record.cwd !== "string") throw new Error("cwd \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  return { path: record.path, ...record.cwd === void 0 ? {} : { cwd: record.cwd } };
}
function strictCodec(typeSymbol, parse) {
  return { mode: "strict", typeSymbol, schema: { parse } };
}
var configCodec = strictCodec("dsh-inline-images#Config", parseConfig);
var setConfigArgsCodec = strictCodec("dsh-inline-images#SetConfigArgs", parseSetConfigArgs);
var resolveImageArgsCodec = strictCodec("dsh-inline-images#ResolveImageArgs", parseResolveImageArgs);
var resolveImageResultCodec = strictCodec("dsh-inline-images#ResolveImageResult", (value) => {
  if (typeof value !== "object" || value === null) throw new Error("result \u5FC5\u987B\u662F\u5BF9\u8C61");
  const record = value;
  if (record.url !== void 0 && typeof record.url !== "string") throw new Error("url \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  return { ...record.url === void 0 ? {} : { url: record.url } };
});
var INLINE_INVOCATIONS = [
  {
    id: "dsh-inline-images#inlineImages/getConfig",
    service: "inlineImages",
    namespace: "inlineImages",
    method: "getConfig",
    invocation: { kind: "direct" },
    parameters: [],
    result: configCodec
  },
  {
    id: "dsh-inline-images#inlineImages/setConfig",
    service: "inlineImages",
    namespace: "inlineImages",
    method: "setConfig",
    invocation: { kind: "direct" },
    parameters: [{
      name: "args",
      wire: "args",
      source: "json",
      codec: setConfigArgsCodec
    }],
    result: configCodec
  },
  {
    id: "dsh-inline-images#inlineImages/resolveImage",
    service: "inlineImages",
    namespace: "inlineImages",
    method: "resolveImage",
    invocation: { kind: "direct" },
    parameters: [{
      name: "args",
      wire: "args",
      source: "json",
      codec: resolveImageArgsCodec
    }],
    result: resolveImageResultCodec
  }
];
var INLINE_MANIFEST = {
  package: PLUGIN_NAME,
  face: "host",
  schemas: [],
  model: {
    services: [{
      key: "inlineImages",
      exportName: "InlineImagesRuntime",
      description: "\u5BF9\u8BDD\u5185\u8054\u56FE\u7247\u7684\u5C3A\u5BF8\u914D\u7F6E\u7AEF\u70B9.",
      tags: [],
      members: [
        { kind: "method", name: "getConfig", signature: "getConfig(): Promise<Config>" },
        { kind: "method", name: "setConfig", signature: "setConfig(args: SetConfigArgs): Promise<Config>" },
        { kind: "method", name: "resolveImage", signature: "resolveImage(args: ResolveImageArgs): Promise<ResolveImageResult>" }
      ],
      types: []
    }],
    events: [],
    objects: []
  },
  invocations: INLINE_INVOCATIONS
};

// src/index.ts
var name = PLUGIN_NAME;
var inject = ["fs", "webServer"];
var REF_MAX_WIDTH = "INLINE_IMAGE_MAX_WIDTH";
var REF_MAX_HEIGHT = "INLINE_IMAGE_MAX_HEIGHT";
var REF_TOKEN = "INLINE_IMAGE_TOKEN";
var PROMPT_SECTION_NAME = "plugin:dsh-inline-images";
var INLINE_IMAGES_PROMPT = "Inline images in Web chat: to let the user preview a local image file (png/jpg/jpeg/webp/gif/svg/avif/bmp/ico), write the same image path twice as a Markdown image in the reply text, like ![path](path) \u2014 the alt text must be the path itself, because the preview is recovered from the visible text. Use an absolute path or a path relative to the session working directory, and only reference image files you have confirmed exist. A bare path in plain text stays plain text. Usually you want to show user a local image when you have created it, or you have created an pdf and demostrate its page(s).";
function mediaTypeFor(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".ico")) return "image/x-icon";
  return null;
}
var IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i;
var ABSOLUTE_PATH_RE = /^([A-Za-z]:[\\/]|\\\\|\/)/;
var URL_LIKE_RE = /^(https?:|data:|file:|blob:|mailto:)/i;
var PLACEHOLDER_SEGMENT = /^(路径|示例|占位|本地路径|某某|xx|xxx)$/i;
function isImageCandidatePath(path) {
  if (path.length < 3) return false;
  if (URL_LIKE_RE.test(path)) return false;
  if (/[*?[\]]/.test(path)) return false;
  if (!IMAGE_EXT_RE.test(path)) return false;
  if (path.split(/[\\/]/).some((segment) => PLACEHOLDER_SEGMENT.test(segment))) return false;
  return true;
}
var InlineImagesRuntime = class extends TypertRemoteService {
  credentials;
  fs;
  webServer;
  tokenPromise;
  /** apply 注入, 与图片路由共用同一 getToken, 避免 credentials 未注入时签发失败. */
  tokenSource = async () => {
    throw new Error("token source unset");
  };
  constructor(ctx) {
    super(ctx, "inlineImages");
    this.credentials = ctx.get("credentials");
    this.fs = ctx.get("fs");
    this.webServer = ctx.get("webServer");
  }
  /** 取回环 token (惰性初始化, 与 apply 内共享凭证存储). */
  ensureToken(resolve, set) {
    if (this.tokenPromise === void 0) {
      this.tokenPromise = (async () => {
        try {
          const resolved = await resolve(REF_TOKEN);
          const stored = typeof resolved?.value === "string" ? resolved.value.trim() : "";
          if (/^[A-Za-z0-9]{16,128}$/.test(stored)) return stored;
        } catch {
        }
        const fresh = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        try {
          await set(REF_TOKEN, fresh);
        } catch {
        }
        return fresh;
      })();
    }
    return this.tokenPromise;
  }
  async getConfig() {
    const read = async (ref, fallback) => {
      if (this.credentials === void 0) return fallback;
      try {
        const resolved = await this.credentials.resolve(ref);
        if (resolved === void 0) return fallback;
        const value = Number(resolved.value);
        return Number.isFinite(value) && value >= 64 ? Math.round(value) : fallback;
      } catch {
        return fallback;
      }
    };
    return {
      maxWidth: await read(REF_MAX_WIDTH, 640),
      maxHeight: await read(REF_MAX_HEIGHT, 420),
      formats: [...IMAGE_FORMATS]
    };
  }
  async setConfig(args) {
    if (this.credentials === void 0) throw new Error("\u51ED\u8BC1\u670D\u52A1\u4E0D\u53EF\u7528, \u65E0\u6CD5\u4FDD\u5B58\u914D\u7F6E");
    if (typeof args.maxWidth === "number") {
      const value = Math.round(args.maxWidth);
      if (!(value >= 64 && value <= 2400)) throw new Error("\u5BBD\u5EA6\u9700\u5728 64-2400 \u4E4B\u95F4");
      await this.credentials.set(REF_MAX_WIDTH, String(value));
    }
    if (typeof args.maxHeight === "number") {
      const value = Math.round(args.maxHeight);
      if (!(value >= 64 && value <= 2400)) throw new Error("\u9AD8\u5EA6\u9700\u5728 64-2400 \u4E4B\u95F4");
      await this.credentials.set(REF_MAX_HEIGHT, String(value));
    }
    return this.getConfig();
  }
  /**
   * 前端授权入口: 校验路径指向真实存在的图片文件, 返回同源回环 URL.
   * 相对路径按 args.cwd (发起会话的工作目录) 解析; 不存在或非法时返回空对象.
   */
  async resolveImage(input) {
    const args = unwrapResolveArgs(input);
    const fs = this.ctx.get?.("fs") ?? this.fs;
    const webServer = this.ctx.get?.("webServer") ?? this.webServer;
    if (fs === void 0 || webServer === void 0) return {};
    const raw = typeof args.path === "string" ? args.path.trim() : "";
    if (!isImageCandidatePath(raw)) return {};
    const cwd = typeof args.cwd === "string" && args.cwd.trim() !== "" ? args.cwd.trim() : void 0;
    if (!ABSOLUTE_PATH_RE.test(raw) && cwd === void 0) return {};
    try {
      const target = await fs.resolve(raw, cwd === void 0 ? void 0 : { cwd });
      const info = await fs.stat(target);
      if (info === void 0 || info.type !== "file") return {};
      const token = await this.tokenSource();
      return {
        url: "http://127.0.0.1:" + webServer.port + ROUTE_PATH + "?t=" + token + "&p=" + encodeURIComponent(target.displayPath)
      };
    } catch {
      return {};
    }
  }
};
function unwrapResolveArgs(input) {
  if (input !== null && typeof input === "object" && "path" in input && typeof input.path === "string") {
    return input;
  }
  const nested = input.args;
  if (nested !== void 0 && typeof nested.path === "string") return nested;
  return { path: "" };
}
function apply(ctx) {
  const logger = ctx.logger(PLUGIN_NAME);
  const fs = ctx.get("fs");
  const attachments = ctx.get("attachments");
  const webServer = ctx.get("webServer");
  const credentials = ctx.get("credentials");
  const connection = ctx.get("connection");
  const typert = ctx.get("typert");
  const systemPrompt = ctx.get("systemPrompt");
  let token;
  let tokenPromise;
  const getToken = () => {
    if (tokenPromise === void 0) {
      tokenPromise = (async () => {
        if (credentials !== void 0) {
          try {
            const resolved = await credentials.resolve(REF_TOKEN);
            const stored = typeof resolved?.value === "string" ? resolved.value.trim() : "";
            if (/^[A-Za-z0-9]{16,128}$/.test(stored)) {
              token = stored;
              return stored;
            }
          } catch {
          }
        }
        const fresh = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        token = fresh;
        if (credentials !== void 0) {
          try {
            await credentials.set(REF_TOKEN, fresh);
          } catch {
          }
        }
        return fresh;
      })();
    }
    return tokenPromise;
  };
  const runtime = new InlineImagesRuntime(ctx);
  runtime.tokenSource = getToken;
  if (typert !== void 0) typert.register(INLINE_MANIFEST);
  runtime.ensureToken(
    (ref) => credentials === void 0 ? Promise.resolve(void 0) : credentials.resolve(ref),
    (ref, value) => credentials === void 0 ? Promise.resolve() : credentials.set(ref, value)
  ).then((fresh) => {
    if (token === void 0) {
      token = fresh;
      tokenPromise = Promise.resolve(fresh);
    }
  }).catch(() => {
  });
  if (systemPrompt !== void 0) {
    const order = systemPrompt.getSectionOrder?.("DELIVERABLE_FILE_REFERENCES") ?? 9e3;
    ctx.effect(() => systemPrompt.section({
      name: PROMPT_SECTION_NAME,
      order,
      text: INLINE_IMAGES_PROMPT
    }), "dsh-inline-images: prompt section");
  }
  ctx.effect(() => webServer.register({
    kind: "exact",
    path: ROUTE_PATH,
    async handler(req, res) {
      try {
        if (connection !== void 0) {
          const rejection = connection.requestRejection(req);
          if (rejection !== void 0) {
            res.writeHead(rejection);
            res.end();
            return;
          }
        }
        const raw = String(req.url ?? "");
        const at = raw.indexOf("?");
        const query = {};
        if (at !== -1) {
          for (const pair of raw.slice(at + 1).split("&")) {
            const eq = pair.indexOf("=");
            if (eq === -1) continue;
            try {
              query[pair.slice(0, eq)] = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, " "));
            } catch {
            }
          }
        }
        if (!query.p) {
          res.writeHead(400);
          res.end("bad request");
          return;
        }
        if (query.t !== await getToken()) {
          res.writeHead(400);
          res.end("bad request");
          return;
        }
        const mediaType = mediaTypeFor(query.p);
        if (mediaType === null) {
          res.writeHead(400);
          res.end("not an image path");
          return;
        }
        let maxBytes = 20 * 1024 * 1024;
        if (attachments !== void 0) {
          try {
            maxBytes = attachments.imageLimits.maxImageBytes;
          } catch {
          }
        }
        const target = await fs.resolve(query.p);
        const bytes = await fs.readBytes(target, void 0, maxBytes);
        res.writeHead(200, { "Content-Type": mediaType, "Cache-Control": "private, max-age=60" });
        res.end(bytes);
      } catch {
        try {
          res.writeHead(404);
          res.end("not found");
        } catch {
        }
      }
    }
  }), "dsh-inline-images: image route");
  void getToken();
  logger.info("\u5DF2\u6302\u8F7D\u56FE\u7247\u56DE\u73AF\u8DEF\u7531, resolveImage \u6388\u6743\u7AEF\u70B9" + (systemPrompt !== void 0 ? "\u4E0E\u7CFB\u7EDF\u63D0\u793A\u8BCD\u6307\u5F15" : ""));
}
export {
  InlineImagesRuntime,
  apply,
  inject,
  isImageCandidatePath,
  name
};
//# sourceMappingURL=index.js.map
