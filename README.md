# dsh-transparency-utils

DeepSeek Harness (DSH) plugin bundle for a full-window wallpaper and layered
panel effects:

- a full-window wallpaper from a local image or any CSS background value;
- adjustable wallpaper opacity and blur;
- translucent, optionally backdrop-blurred panels: text boxes, code boxes,
  cards, menus, and hover previews;
- the **Trajectory** view follows the same panel opacity and blur;
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
pnpm install github:Hexa5586/dsh-transparency-utils
# pin a release tag instead of the default branch
pnpm install github:Hexa5586/dsh-transparency-utils#v1.6.2
```

These URL forms are equivalent:

```sh
pnpm install git+https://github.com/Hexa5586/dsh-transparency-utils.git
pnpm install https://github.com/Hexa5586/dsh-transparency-utils
```

A bare `pnpm install` only adds the package to the project. DSH also has to
select the bundle for the profile, and Plugin Manager does both steps: open
**Settings → Plugins → Add plugin**, paste the same Git URL, and enable the
`dsh-transparency-utils` bundle. Its patch inserts the `transparency-utils`
plugin row. From an agent, `plugin_manager` `install_bundle` with the Git URL
does the same.

### From a local directory

1. Clone the repository, or place a checkout somewhere stable.
2. In DSH, open **Settings → Plugins → Add plugin** and select the directory,
   or install it with `plugin_manager` `install_bundle` using the absolute
   directory path.
3. Enable the `dsh-transparency-utils` bundle.

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
- id: transparency-utils
  name: "dsh-transparency-utils"
  config:
    image: 'C:\path\to\wallpaper.webp'
    opacity: 0.4
    panelOpacity: 0.5
    panelBlur: 12
    backgroundBlur: 0
    composerFadeHeight: 36
```

Color or gradient instead of a local image:

```yaml
config:
  background: 'radial-gradient(circle at 30% 20%, #2b4a75, #0b1220 70%)'
  opacity: 0.6
  panelOpacity: 0.5
  panelBlur: 12
  composerFadeHeight: 36
```

All fields are optional; the valid fields are listed below.

### Edit the configuration on the bundle page

The bundle carries its own configuration section: open **Plugins** in the
sidebar, select **Panel transparency utils**, and edit the same fields as text
boxes under the description. Labels follow the interface language (English and
Chinese are shipped). **Save** writes the profile patch through the Host
configuration editor, which validates and serializes the write; the change then
needs a page reload, and the Host may restart this plugin to apply it. An empty
field removes the override, so the value falls back to its default.

The section reads and writes the bundle's own routes; it needs no direct file
editing and no extra configuration.


### Fields

| Field | Meaning |
|---|---|
| `image` | Absolute path to a local image (`png`, `jpg`, `jpeg`, `webp`, `gif`, `avif`, `svg`). The plugin serves it at `/transparency-utils/image` with the type its bytes declare, so a JPEG saved with a `.png` name still renders correctly. No `file://` URL is needed. |
| `background` | CSS `background` value: a color, a gradient, or a remote `url("...")`. Used when `image` is absent, missing, or has an unsupported extension. |
| `opacity` | Wallpaper layer opacity from `0` to `1`; defaults to `1`. `0` leaves the window unchanged. |
| `panelOpacity` | How opaque the panels stay over the wallpaper, from `0` (fully transparent) to `1` (unchanged). Panels are the prompt and its composer card, text boxes, code boxes (body and header), raised cards, menus, hover previews, and the Trajectory view. Defaults to `1`. |
| `panelBlur` | Backdrop blur radius in px for those panels. `0` disables it. |
| `backgroundBlur` | Blur radius in px applied to the wallpaper image itself. `0` keeps it sharp. |
| `composerFadeHeight` | Height in px of the wallpaper veil above the composer. Defaults to `36`; `0` disables it. |

After changing the configuration, reload the page (Ctrl+R). If the change does
not appear, restart DSH once. Replacing the `image` file only needs a reload.

## Behavior and limits

- The wallpaper sits behind the UI. The base background and the sidebar fill
  become transparent, so the wallpaper backs the whole window: sidebar,
  conversation column, bottom row, and the Trajectory view.
- `panelOpacity` / `panelBlur` apply to the composer/input fill, markdown
  code blocks (body and header), raised card layers, plain `input` /
  `textarea` / `select` controls, and menu surfaces. The slash menu, the add
  menu, and every other popover built on the shared menu surface take their fill
  from `panelOpacity` and their backdrop blur from `panelBlur`. Code-block
  banners and `pre` are matched everywhere, so documentation pages such as a
  bundle's README in Plugin Manager get the same frosted code blocks as the
  transcript.
- Hover previews — the file-diff card a changed file opens — are portaled onto
  the page instead of into the shell, so the shared card layer stays
  translucent. They take the same denser fill as menus plus the `panelBlur`
  backdrop, which keeps the diff readable over the transcript.
- The model and effort picker panel is portaled onto the page as well and paints
  a glass token of its own, so the plugin writes the panel fill and blur onto
  its panel element directly. It opens over the composer like a menu, so it
  takes the menu's denser fill.
- Dialogs are portaled outside the application shell, so the plugin restores the
  theme's own background and panel tokens inside them: their panels stay
  opaque over the wallpaper, while a translucent scrim keeps its own paint.
- The bundle page's configuration section reads and writes
  `/transparency-utils/config`. The Host route carrier admits only `GET`, so a
  save travels as the `save` query parameter; the route validates the values and
  edits only this plugin's own row through the profile configuration editor.
- The Trajectory view (`[data-conversation-composer-overlay]`) uses the same
  `panelOpacity` and `panelBlur` as the rest of the window; it has no separate
  settings of its own. Portaled menus opened from the view take the same values.
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

## Changes

### 1.6.2

- Menus follow the panel settings. The shared menu primitive paints its panel
  through a dedicated material layer (the first child of `[data-menu-material]`)
  and the `--dsw-menu-surface-fill` token, so the plugin now writes both, with a
  fill slightly denser than `panelOpacity` because menus open over text. The
  slash menu, the add menu, and the other popovers built on that primitive take
  their fill from `panelOpacity` and their backdrop blur from `panelBlur`.
- Menus can blur again inside the composer. The composer card carried the
  backdrop blur itself, which makes it a backdrop root and leaves every menu in
  its subtree without a page backdrop; the card's frost moved to a layer inside
  it, so the card still reads as frosted while its menus get a real backdrop.
- The turn-usage popover is no longer treated as a modal dialog. It is a
  non-modal `role="dialog"`, so the dialog token restore is skipped for it and
  it gets its own glass surface (80% Canvas plus a 28px saturating backdrop
  blur) instead of an opaque panel or a fully transparent one.
- Hover previews are frosted. The changed-file diff card is portaled onto the
  page and paints `--dsw-alias-bg-layer-1`, which the global sheet keeps
  translucent, so it showed the transcript through the diff. It now takes the
  same denser fill as menus plus the `panelBlur` backdrop.
- The package is renamed to `dsh-transparency-utils`, matching the repository.
  The bundle patch inserts the `transparency-utils` row, the routes serve under
  `/transparency-utils/`, and the plugin page shows the localized name
  “Panel transparency utils” / “面板透明化工具”.
- The panel settings are renamed: `surfaceOpacity` / `surfaceBlur` became
  `panelOpacity` / `panelBlur`, and the Chinese labels say 面板 instead of 表面.
  The Trajectory view no longer has its own `trajectoryOpacity` /
  `trajectoryBlur`; it follows `panelOpacity` / `panelBlur` like every other
  panel, so its card, table, toolbar, code blocks, and inputs are no longer
  restored to the theme's opaque surfaces.
- The model and effort picker panel now follows `panelOpacity` / `panelBlur`. It
  painted its own glass token and read the shared menu blur token, which the
  plugin pins to `none`, so it neither matched the panel fill nor blurred.

### 1.6.1

- The image route sniffs the file header, so a JPEG saved with a `.png` name is
  served as `image/jpeg`.

## Files

| File | Role |
|---|---|
| `index.js` | Host half: config, image route, stylesheet route. |
| `client.js` | Client half: applies the stylesheet and restores tokens inside portaled dialogs. |
| `cordis.patch.yml` | Bundle patch inserting the `transparency-utils` row. |
| `locale/en.json`, `locale/zh.json` | Plugin Manager title and description. |
| `icon.svg` | Plugin icon. |
| `README.md` | This document. |
| `LICENSE` | MIT license text, copyright Hexa5586. |
| `.gitignore`, `.gitattributes` | Repository hygiene: ignored local output, normalized line endings. |

## License

MIT. See [`LICENSE`](LICENSE). Copyright (c) 2026 Hexa5586.

## 中文

`dsh-transparency-utils` 是一个 DSH 面板透明化插件，提供：整窗壁纸、壁纸透明度与
模糊、半透明/磨砂的面板（文本框、代码框、卡片、菜单、悬停预览）、轨迹页沿用同一套
面板设置，以及输入框上方的真实壁纸遮罩。

### 安装

本项目没有依赖也没有构建步骤，可以直接从仓库安装：

```sh
pnpm install github:Hexa5586/dsh-transparency-utils
pnpm install github:Hexa5586/dsh-transparency-utils#v1.6.2   # 固定标签
```

在 DSH 中，打开 **设置 → 插件 → 添加插件**，粘贴同一个 Git 地址并启用
`dsh-transparency-utils` 这个 bundle；也可以用 `plugin_manager` 的
`install_bundle` 传 Git 地址。只执行 `pnpm install` 只会把包装进项目，DSH 仍需
在 profile 中选中该 bundle（Plugin Manager 会同时完成这两步）。

也可以改用本地目录：把仓库克隆到固定位置，在 **设置 → 插件 → 添加插件** 中选择
该目录，或用 `install_bundle` 传绝对路径。安装后默认 `background` 为空，不会
改变外观。

### 在插件页面直接修改配置

插件自带配置区：打开侧边栏的 **插件**，选中 **面板透明化工具**，描述下方就是这些字段的
文本框，标签跟随界面语言（已提供英文与中文）。点击 **保存** 后，插件通过宿主的
配置编辑器写回 profile 的 patch 文件（会校验并串行写入）；之后刷新页面即可看到
效果，必要时宿主会重启本插件。留空的字段会移除对应覆盖，回落到默认值。

### 配置

编辑 profile 的 `cordis.patch.yml`（位于
`%USERPROFILE%\.dsh\profiles\<profile>\cordis.patch.yml`，也可用
`DSH_PROFILE_DIR` 定位）：

```yaml
- id: transparency-utils
  name: "dsh-transparency-utils"
  config:
    image: 'C:\path\to\wallpaper.webp'
    opacity: 0.4
    panelOpacity: 0.5
    panelBlur: 12
    backgroundBlur: 0
    composerFadeHeight: 36
```

字段说明：

- `image`：本地图片绝对路径，支持 `png`、`jpg`、`jpeg`、`webp`、`gif`、`avif`、`svg`；
  由插件通过 `/transparency-utils/image` 提供，返回的 MIME 类型按文件实际内容判定，所以
  内容是 JPEG 但后缀写成 `.png` 的文件也能正常显示；不需要 `file://`。
- `background`：任意 CSS background 值（颜色、渐变或远程 `url("...")`），在没有
  可用 `image` 时使用。
- `opacity`：壁纸透明度，0 到 1。
- `panelOpacity`：面板（文本框、代码框、卡片、菜单、悬停预览、轨迹页）的不透明度，
  0 全透明，1 保持原样。
- `panelBlur`：这些面板背后的磨砂模糊半径（像素）。
- `backgroundBlur`：壁纸图本身的模糊半径（像素）。
- `composerFadeHeight`：输入框上方壁纸遮罩高度（像素），默认 36；0 关闭。

代码框顶部栏和 `pre` 不限定在对话区内，因此插件 README 等文档页面的代码框同样会被
磨砂。对话框通过 portal 渲染在应用外壳之外，插件会在其中恢复主题原本的背景与面板
变量，面板保持不透明，遮罩层仍保留自己的半透明填充。

悬停预览卡片（例如悬停变更文件时弹出的 diff 卡片）也是 portal 到页面上、而不是渲染
在外壳内，它会采用与菜单相同的更密填充，并应用 `panelBlur` 的背景模糊，因此在
对话文字之上仍然清晰可读。

模型与思考强度选择面板（`data-ces-part="picker-panel"`）同样 portal 到页面上，并且
使用它自己的玻璃变量；插件会把面板填充与 `panelBlur` 直接写到这个面板元素上，所以
它和菜单一样跟随面板设置。

修改配置后刷新页面（Ctrl+R）；若未生效，重启一次 DSH。同 id 的覆盖会替换整行
配置，因此需要保留的字段都要写。

### 版本变更

**1.6.2**

- 斜杠菜单、「添加」菜单等共享菜单面板改为跟随 `panelOpacity` / `panelBlur`：
  插件写入菜单材质层和 `--dsw-menu-surface-fill` 变量，填充比 `panelOpacity` 略密，
  因为菜单总是浮在文字之上。
- 菜单在输入框卡片内部重新能模糊：此前背板模糊挂在输入框卡片本身，使它成为
  backdrop root，卡片内的菜单因此没有可模糊的页面背景；模糊改由卡片内部的一层承担。
- 「本轮用量」浮层不再按模态对话框处理。它是非模态的 `role="dialog"`，现在跳过对话框
  的主题变量恢复，单独使用一层玻璃面板（80% Canvas + 28px 饱和模糊）。
- 悬停预览卡片（变更文件的 diff 卡片）改为磨砂：它 portal 到页面上、使用
  `--dsw-alias-bg-layer-1`，以前会把对话文字透出来；现在使用与菜单相同的更密填充，
  并应用 `panelBlur`。
- 项目更名为 `dsh-transparency-utils`：bundle patch 插入的行 id 改为
  `transparency-utils`，路由改到 `/transparency-utils/`，插件页显示的名称改为
  「面板透明化工具」（英文为 Panel transparency utils）。
- 配置项改名：`surfaceOpacity` / `surfaceBlur` 改为 `panelOpacity` / `panelBlur`，
  中文标签里的「表面」改为「面板」。轨迹页不再有单独的 `trajectoryOpacity` /
  `trajectoryBlur`，而是和其他面板一样沿用 `panelOpacity` / `panelBlur`，其卡片、
  表格、工具栏、代码框和输入框也不再恢复成主题的不透明面板。
- 模型与思考强度选择面板现在跟随 `panelOpacity` / `panelBlur`：它原本使用自己的
  玻璃变量，并且读取那个被插件置为 `none` 的共享菜单模糊变量，所以既没有面板填充
  也没有模糊。
