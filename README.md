# dsh-background-utils

DeepSeek Harness (DSH) plugin bundle for a full-window wallpaper and layered
surface effects:

- a full-window wallpaper from a local image or any CSS background value;
- adjustable wallpaper opacity and blur;
- translucent, optionally backdrop-blurred text boxes, code boxes, and cards;
- an independent transparency/blur profile for the **Trajectory** view;
- a wallpaper veil above the composer that fades transcript text out and hides
  it behind the input, so the background shows through cleanly.

The Host half owns the configuration and serves the stylesheet and local image.
The Client half applies the stylesheet at runtime, which also makes it work in
the DSH Desktop window (its static index bypasses Host index injection).

## Requirements

- A current DSH installation with the Web GUI or Desktop client.
- The profile's patch file is writable.
- No build step, dependencies, or npm publish are required. The package is a
  plain ESM bundle.

## Install

The package is a plain ESM bundle with no dependencies and no build step, so it
installs straight from the repository.

### From Git (recommended)

```sh
pnpm install github:Hexa5586/dsh-background-utils
# pin a release tag instead of the default branch
pnpm install github:Hexa5586/dsh-background-utils#v1.5.2
```

These URL forms are equivalent:

```sh
pnpm install git+https://github.com/Hexa5586/dsh-background-utils.git
pnpm install https://github.com/Hexa5586/dsh-background-utils
```

A bare `pnpm install` only adds the package to the project. DSH also has to
select the bundle for the profile, and Plugin Manager does both steps: open
**Settings → Plugins → Add plugin**, paste the same Git URL, and enable the
`dsh-background-utils` bundle. Its patch inserts the `background-utils` plugin
row. From an agent, `plugin_manager` `install_bundle` with the Git URL does the
same.

### From a local directory

1. Clone the repository, or place a checkout somewhere stable.
2. In DSH, open **Settings → Plugins → Add plugin** and select the directory,
   or install it with `plugin_manager` `install_bundle` using the absolute
   directory path.
3. Enable the `dsh-background-utils` bundle.

The default configuration has an empty `background`, so installing the bundle
does **not** change the appearance until it is configured.

## Configure

Edit the profile's patch file:

```text
%USERPROFILE%\.dsh\profiles\<profile>\cordis.patch.yml
```

The active profile directory is also available as `DSH_PROFILE_DIR`. Add (or
edit) an override row; a matching-id override replaces the whole row config, so
include every field you need:

```yaml
- id: background-utils
  name: "dsh-background-utils"
  config:
    image: 'C:\path\to\wallpaper.webp'
    opacity: 0.4
    surfaceOpacity: 0.5
    surfaceBlur: 12
    backgroundBlur: 0
    trajectoryOpacity: 1
    trajectoryBlur: 0
    composerFadeHeight: 36
```

Color or gradient instead of a local image:

```yaml
config:
  background: 'radial-gradient(circle at 30% 20%, #2b4a75, #0b1220 70%)'
  opacity: 0.6
  surfaceOpacity: 0.5
  surfaceBlur: 12
  composerFadeHeight: 36
```

All fields are optional; the valid fields are listed below.

### Fields

| Field | Meaning |
|---|---|
| `image` | Absolute path to a local image (`png`, `jpg`, `jpeg`, `webp`, `gif`, `avif`, `svg`). The plugin serves it at `/background-utils/image`, so no `file://` URL is needed. |
| `background` | CSS `background` value: a color, a gradient, or a remote `url("...")`. Used when `image` is absent, missing, or has an unsupported extension. |
| `opacity` | Wallpaper layer opacity from `0` to `1`; defaults to `1`. `0` leaves the window unchanged. |
| `surfaceOpacity` | How opaque text boxes, code boxes, and raised cards stay over the wallpaper, from `0` (fully transparent) to `1` (unchanged). Defaults to `1`. |
| `surfaceBlur` | Backdrop blur radius in px for the composer, code blocks (including their header row), and text/select fields. `0` disables it. |
| `backgroundBlur` | Blur radius in px applied to the wallpaper image itself. `0` keeps it sharp. |
| `trajectoryOpacity` | Surface opacity for the Trajectory view only. `1` (default) restores the theme's original opaque surfaces there. |
| `trajectoryBlur` | Backdrop blur radius in px for the Trajectory view only. `0` (default) keeps it unblurred. |
| `composerFadeHeight` | Height in px of the wallpaper veil above the composer. Defaults to `36`; `0` disables it. |

After changing the configuration, reload the page (Ctrl+R). If the change does
not appear, restart DSH once. Replacing the `image` file only needs a reload.

## Behavior and limits

- The wallpaper sits behind the UI. The base background and the sidebar fill
  become transparent, so the wallpaper backs the whole window: sidebar,
  conversation column, bottom row, and the Trajectory view.
- `surfaceOpacity` / `surfaceBlur` apply to the composer/input fill, markdown
  code blocks (body and header), raised card layers, and plain `input` /
  `textarea` / `select` controls. Menus, popovers, and other overlays keep their
  own surfaces for readability.
- The Trajectory view (`[data-conversation-composer-overlay]`) is isolated from
  the global surface settings. Its own `trajectoryOpacity` and `trajectoryBlur`
  apply there. When `trajectoryOpacity` is `1`, the plugin captures the live
  theme tokens and restores them inside the view, so its cards, table, toolbar,
  code blocks, and inputs keep the theme's original opaque surfaces. The
  captured values are refreshed when the light/dark theme changes. Portaled
  menus opened from the view are outside its DOM scope and still use the global
  settings.
- `composerFadeHeight` paints the veil from the actual wallpaper, not a color:
  an opaque canvas backing plus the wallpaper image at the configured opacity
  and blur, masked to fade in over the top band. The transcript fades out above
  the composer and is hidden below it; the composer keeps its higher stacking
  rank. The same veil is applied to the Trajectory ledger.
- Windows Desktop serves its page index statically, so the Client half applies
  the stylesheet instead of relying on Host index injection. Desktop's native
  titlebar strip stays outside the page.
- For `background: url(...)`, the browser must be able to load the URL; local
  `file://` paths are usually blocked. Use `image` for local files.
- An absent `image`, an empty `background`, `opacity: 0`, or a disabled bundle
  restores the default look after a page reload.
- The plugin makes no model requests and reads no session data.

## Files

| File | Role |
|---|---|
| `index.js` | Host half: config, image route, stylesheet route. |
| `client.js` | Client half: applies the stylesheet and builds the Trajectory overrides. |
| `cordis.patch.yml` | Bundle patch inserting the `background-utils` row. |
| `locale/en.json`, `locale/zh.json` | Plugin Manager title and description. |
| `icon.svg` | Plugin icon. |
| `README.md` | This document. |
| `LICENSE` | MIT license text, copyright Hexa5586. |
| `.gitignore`, `.gitattributes` | Repository hygiene: ignored local output, normalized line endings. |

## License

MIT. See [`LICENSE`](LICENSE). Copyright (c) 2026 Hexa5586.

## 中文

`dsh-background-utils` 是一个 DSH 背景工具插件，提供：整窗壁纸、壁纸透明度与
模糊、半透明/磨砂的文本框与代码框、轨迹页面独立设置，以及输入框上方的真实壁纸
遮罩。

### 安装

本项目没有依赖也没有构建步骤，可以直接从仓库安装：

```sh
pnpm install github:Hexa5586/dsh-background-utils
pnpm install github:Hexa5586/dsh-background-utils#v1.5.2   # 固定标签
```

在 DSH 中，打开 **设置 → 插件 → 添加插件**，粘贴同一个 Git 地址并启用
`dsh-background-utils` 这个 bundle；也可以用 `plugin_manager` 的
`install_bundle` 传 Git 地址。只执行 `pnpm install` 只会把包装进项目，DSH 仍需
在 profile 中选中该 bundle（Plugin Manager 会同时完成这两步）。

也可以改用本地目录：把仓库克隆到固定位置，在 **设置 → 插件 → 添加插件** 中选择
该目录，或用 `install_bundle` 传绝对路径。安装后默认 `background` 为空，不会
改变外观。

### 配置

编辑 profile 的 `cordis.patch.yml`（位于
`%USERPROFILE%\.dsh\profiles\<profile>\cordis.patch.yml`，也可用
`DSH_PROFILE_DIR` 定位）：

```yaml
- id: background-utils
  name: "dsh-background-utils"
  config:
    image: 'C:\path\to\wallpaper.webp'
    opacity: 0.4
    surfaceOpacity: 0.5
    surfaceBlur: 12
    backgroundBlur: 0
    trajectoryOpacity: 1
    trajectoryBlur: 0
    composerFadeHeight: 36
```

字段说明：

- `image`：本地图片绝对路径；由插件通过 `/background-utils/image` 提供，不需要
  `file://`。
- `background`：任意 CSS background 值（颜色、渐变或远程 `url("...")`），在没有
  可用 `image` 时使用。
- `opacity`：壁纸透明度，0 到 1。
- `surfaceOpacity`：文本框、代码框、卡片等表面的不透明度，0 全透明，1 保持原样。
- `surfaceBlur`：这些表面背后的磨砂模糊半径（像素）。
- `backgroundBlur`：壁纸图本身的模糊半径（像素）。
- `trajectoryOpacity` / `trajectoryBlur`：仅轨迹页面使用的表面透明度/模糊，不受
  全局设置影响；`trajectoryOpacity: 1` 会恢复主题原本的不透明表面。
- `composerFadeHeight`：输入框上方壁纸遮罩高度（像素），默认 36；0 关闭。

修改配置后刷新页面（Ctrl+R）；若未生效，重启一次 DSH。同 id 的覆盖会替换整行
配置，因此需要保留的字段都要写。
