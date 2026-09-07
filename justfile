[private]
default:
    @just --list

# 安装依赖.
install:
    pnpm install

# 构建 Host ESM 与 Client IIFE, 并校验 Client loader 注册.
build:
    pnpm run build

# 与 build 相同: 本仓库无独立类型检查, check 即构建 + loader 注册校验.
check:
    pnpm run check
