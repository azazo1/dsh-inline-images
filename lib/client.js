(() => {
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
  function strictCodec(typeSymbol, parse) {
    return { mode: "strict", typeSymbol, schema: { parse } };
  }
  var configCodec = strictCodec("dsh-inline-images#Config", parseConfig);
  var setConfigArgsCodec = strictCodec("dsh-inline-images#SetConfigArgs", parseSetConfigArgs);
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
    }
  ];
  var INLINE_REMOTE_CONTRIBUTION = {
    package: PLUGIN_NAME,
    descriptors: INLINE_INVOCATIONS
  };

  // src/client.ts
  window.__ModuleLoader__.load({
    id: PLUGIN_NAME,
    factory: (req) => {
      const React = req("react");
      function el(type, props, ...children) {
        return React.createElement.apply(null, [type, props].concat(children));
      }
      const lightboxStore = {
        listeners: /* @__PURE__ */ new Set(),
        current: null,
        open(src, name) {
          this.current = { src, name };
          for (const fn of [...this.listeners]) {
            try {
              fn();
            } catch {
            }
          }
        },
        close() {
          this.current = null;
          for (const fn of [...this.listeners]) {
            try {
              fn();
            } catch {
            }
          }
        },
        subscribe(fn) {
          this.listeners.add(fn);
          return () => {
            this.listeners.delete(fn);
          };
        }
      };
      function useStore(s) {
        const [value, setValue] = React.useState(s.get());
        React.useEffect(() => s.subscribe(() => setValue(s.get())), []);
        return value;
      }
      function ImageLightbox() {
        const current = useStore({ subscribe: lightboxStore.subscribe.bind(lightboxStore), get: () => lightboxStore.current });
        if (current === null) return null;
        return el(
          "div",
          {
            style: { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "zoom-out" },
            onClick: () => lightboxStore.close()
          },
          el("img", { src: current.src, alt: current.name, style: { maxWidth: "92vw", maxHeight: "78vh", objectFit: "contain", borderRadius: 6 }, onClick: (e) => e.stopPropagation() }),
          el("div", { style: { color: "#fff", fontSize: 13, opacity: 0.9 } }, current.name),
          el("button", { style: { padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(128,128,128,0.5)", background: "transparent", color: "#fff", cursor: "pointer" }, onClick: (e) => {
            e.stopPropagation();
            lightboxStore.close();
          } }, "\u5173\u95ED (Esc)")
        );
      }
      function unwrapRemote(result, fallbackMessage) {
        if (result && typeof result === "object" && "ok" in result) {
          if (result.ok === true) return result.value;
          const err = result.error;
          throw new Error(typeof err?.message === "string" ? err.message : fallbackMessage);
        }
        return result;
      }
      function InlineSettings(props) {
        const remote = props.ctx.remote;
        const [maxWidth, setMaxWidth] = React.useState(640);
        const [maxHeight, setMaxHeight] = React.useState(420);
        const [status, setStatus] = React.useState(null);
        React.useEffect(() => {
          let alive = true;
          if (remote?.inlineImages?.getConfig === void 0) {
            applyImageSizes(640, 420);
            return () => {
              alive = false;
            };
          }
          remote.inlineImages.getConfig().then((result) => {
            if (!alive) return;
            const cfg = unwrapRemote(result, "\u8BFB\u53D6\u914D\u7F6E\u5931\u8D25");
            setMaxWidth(cfg.maxWidth ?? 640);
            setMaxHeight(cfg.maxHeight ?? 420);
            applyImageSizes(cfg.maxWidth ?? 640, cfg.maxHeight ?? 420);
          }).catch(() => {
            if (alive) applyImageSizes(640, 420);
          });
          return () => {
            alive = false;
          };
        }, [remote]);
        const save = () => {
          if (remote?.inlineImages?.setConfig === void 0) {
            setStatus({ kind: "err", text: "Remote \u7AEF\u70B9\u672A\u6302\u8F7D, \u65E0\u6CD5\u4FDD\u5B58" });
            return;
          }
          setStatus(null);
          remote.inlineImages.setConfig({ maxWidth: Number(maxWidth) || 640, maxHeight: Number(maxHeight) || 420 }).then((result) => {
            const cfg = unwrapRemote(result, "\u4FDD\u5B58\u5931\u8D25");
            setMaxWidth(cfg.maxWidth);
            setMaxHeight(cfg.maxHeight);
            applyImageSizes(cfg.maxWidth, cfg.maxHeight);
            setStatus({ kind: "ok", text: "\u6B63\u6587\u56FE\u7247\u6700\u5927\u5C3A\u5BF8\u5DF2\u66F4\u65B0\u4E3A " + cfg.maxWidth + "x" + cfg.maxHeight });
          }).catch((err) => {
            setStatus({ kind: "err", text: "\u4FDD\u5B58\u5931\u8D25: " + String(err?.message ?? err) });
          });
        };
        const inputStyle = { width: 70, padding: "4px 8px", marginRight: 4 };
        const btnStyle = { padding: "6px 14px", cursor: "pointer" };
        return el(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 } },
          el(
            "div",
            { style: { fontSize: 12, opacity: 0.7, lineHeight: 1.5 } },
            "LLM \u56DE\u590D\u4E2D\u5199\u51FA\u7684\u672C\u5730\u56FE\u7247\u8DEF\u5F84 (\u5982 C:\\\u622A\u56FE\\a.png) \u4F1A\u5728\u6D88\u606F\u6B63\u6587\u91CC\u76F4\u63A5\u6E32\u67D3\u6210\u56FE\u7247. \u53EF\u5728\u6B64\u8C03\u6574\u6B63\u6587\u56FE\u7247\u7684\u6700\u5927\u663E\u793A\u5C3A\u5BF8; \u70B9\u51FB\u6B63\u6587\u56FE\u7247\u53EF\u653E\u5927\u67E5\u770B\u539F\u56FE. \u652F\u6301\u683C\u5F0F: png/jpg/jpeg/webp/gif/svg/avif/bmp/ico."
          ),
          el(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
            el("span", { style: { fontSize: 13 } }, "\u6B63\u6587\u56FE\u7247\u6700\u5927\u5C3A\u5BF8:"),
            el("input", { type: "number", min: 64, max: 2400, value: maxWidth, title: "\u5BBD\u5EA6 px", onChange: (e) => setMaxWidth(e.target.value), style: inputStyle }),
            el("span", null, "x"),
            el("input", { type: "number", min: 64, max: 2400, value: maxHeight, title: "\u9AD8\u5EA6 px", onChange: (e) => setMaxHeight(e.target.value), style: inputStyle }),
            el("button", { style: btnStyle, onClick: save }, "\u5E94\u7528"),
            status ? el("span", { style: { fontSize: 12, color: status.kind === "ok" ? "#2e9e5b" : "#d64545" } }, status.text) : null
          )
        );
      }
      let styleTag = null;
      function applyImageSizes(maxWidth, maxHeight) {
        if (typeof document === "undefined") return;
        if (styleTag === null) {
          const tag = document.createElement("style");
          tag.dataset.pluginCss = PLUGIN_NAME;
          document.head.appendChild(tag);
          styleTag = tag;
        }
        styleTag.textContent = 'img[src*="' + ROUTE_PATH + '"] { max-width: ' + maxWidth + "px !important; max-height: " + maxHeight + "px !important; object-fit: contain; border-radius: 8px; }";
      }
      async function apply(ctx) {
        await ctx.remote.$mount(INLINE_REMOTE_CONTRIBUTION);
        ctx.slots.inject("shell.overlay", () => ctx.slots.register(
          { name: "shell.overlay", id: "inline-images-lightbox", order: 100, label: "\u56FE\u7247\u706F\u7BB1" },
          () => React.createElement(ImageLightbox, null)
        ));
        ctx.slots.inject("settings.section", () => ctx.slots.register(
          { name: "settings.section", id: "inline-images", order: 35, label: "\u5185\u8054\u56FE\u7247" },
          (props) => React.createElement(InlineSettings, { ...props, ctx })
        ));
        if (typeof document !== "undefined") {
          const onClick = (event) => {
            const target = event.target;
            if (!target || target.tagName !== "IMG") return;
            const src = String(target.src ?? "");
            if (src.indexOf(ROUTE_PATH) === -1) return;
            event.preventDefault();
            event.stopPropagation();
            lightboxStore.open(src, target.alt || "\u56FE\u7247");
          };
          const onKey = (event) => {
            if (event.key === "Escape") lightboxStore.close();
          };
          document.addEventListener("click", onClick, true);
          document.addEventListener("keydown", onKey, true);
          ctx.effect(() => () => {
            document.removeEventListener("click", onClick, true);
            document.removeEventListener("keydown", onKey, true);
            if (styleTag !== null && styleTag.parentNode !== null) styleTag.parentNode.removeChild(styleTag);
          });
        }
      }
      return {
        name: PLUGIN_NAME,
        inject: ["slots", "remote"],
        apply
      };
    }
  });
})();
//# sourceMappingURL=client.js.map
