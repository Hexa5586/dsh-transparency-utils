/**
 * Host half of the dsh-background-utils bundle. It owns the configuration,
 * serves the browser stylesheet and, when configured, the local image. The
 * Client half applies the stylesheet at runtime, so the background works in
 * both the Web GUI and Desktop, whose window serves its index statically.
 *
 * Configuration (edited in the profile's cordis.patch.yml row):
 * - background: any CSS background value (color, gradient, url(...)), or ''
 *   to leave the window unchanged.
 * - image: absolute path to a local image file; when it exists the plugin
 *   serves it at a same-origin route and uses it instead of `background`.
 * - opacity: 0..1, the background layer's opacity; invalid values fall back to 1.
 * - surfaceOpacity: 0..1, how opaque text boxes, code boxes, and raised cards
 *   stay over the background; 1 keeps them unchanged; defaults to 1.
 * - surfaceBlur: backdrop blur in px behind the translucent text and code
 *   surfaces; defaults to 0.
 * - backgroundBlur: blur in px applied to the background image itself;
 *   defaults to 0.
 * - trajectoryOpacity: surface opacity for the trajectory view only; defaults
 *   to 1 (the theme's original opaque surfaces).
 * - trajectoryBlur: backdrop blur in px for the trajectory view only; defaults
 *   to 0.
 * - composerFadeHeight: height in px of the wallpaper veil above the composer;
 *   the veil fades the transcript out and hides it behind the composer card.
 *   Defaults to 36; 0 disables it.
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, isAbsolute } from 'node:path'

const DEFAULT_OPACITY = 1
const IMAGE_ROUTE_PATH = '/background-utils/image'
const STYLE_ROUTE_PATH = '/background-utils/style.css'

/** Wait for the HTTP carrier before registering the routes. */
export const inject = ['webServer']

/** Extensions the image route is allowed to serve. */
const MEDIA_TYPES = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.avif', 'image/avif'],
  ['.svg', 'image/svg+xml'],
])

/**
 * Coerce a configuration value to an opacity in [0, 1].
 * @param value - Raw configured opacity.
 * @returns The clamped opacity, or the default for a non-numeric value.
 */
function normalizeOpacity(value) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return DEFAULT_OPACITY
  return Math.min(1, Math.max(0, parsed))
}

/**
 * Keep a configured value from closing the injected style element.
 * @param value - Background declaration value from configuration.
 * @returns The value with literal `</style` sequences escaped.
 */
function escapeStyleValue(value) {
  return value.replace(/<\/style/gi, '<\\/style')
}

/**
 * Resolve a configured local image path to the media type the route may serve.
 * @param value - Raw configured image path.
 * @returns The path and its media type, or undefined when unusable.
 */
function resolveImage(value) {
  if (typeof value !== 'string') return undefined
  const imagePath = value.trim()
  if (imagePath === '' || !isAbsolute(imagePath)) return undefined
  const mediaType = MEDIA_TYPES.get(extname(imagePath).toLowerCase())
  if (mediaType === undefined || !existsSync(imagePath)) return undefined
  return { imagePath, mediaType }
}

/**
 * Coerce a configured blur radius to a bounded pixel value.
 * @param value - Raw configured blur radius in px.
 * @returns The clamped radius, or 0 for a non-numeric value.
 */
function normalizeBlur(value) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(80, Math.max(0, parsed))
}

/**
 * Build the translucent surface rules for text boxes, code boxes, and cards.
 * The surface tokens are replaced with a per-theme Canvas color at the given
 * alpha, so the wallpaper shows through while text keeps a readable scrim.
 * @param opacity - Surface opacity in [0, 1]; 1 leaves the surfaces untouched.
 * @returns CSS text, or an empty string when the surfaces stay opaque.
 */
function buildSurfaceStylesheet(opacity) {
  if (opacity >= 1) return ''
  const percentage = Math.round(opacity * 1000) / 10
  const color = `color-mix(in srgb,Canvas ${percentage}%,transparent)`
  const tokens = [
    '--dsw-specific-input-major',
    '--dsw-alias-markdown-code-block',
    '--dsw-alias-markdown-code-block-banner',
    '--dsw-alias-bg-layer-1',
    '--dsw-alias-bg-layer-2',
    '--dsw-alias-bg-layer-3',
  ]
  return [
    `body{${tokens.map((token) => `${token}:${color}!important`).join(';')}}`,
    `input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,select{background-color:${color}!important}`,
  ].join('')
}

/**
 * Build the backdrop-blur rules for the translucent text and code surfaces.
 * Only elements with a stable surface identity are targeted, so no transparent
 * container gets an accidental blurred rectangle.
 * @param radius - Backdrop blur radius in px; 0 disables it.
 * @returns CSS text, or an empty string when disabled.
 */
function buildSurfaceBlurStylesheet(radius) {
  if (radius <= 0) return ''
  const blur = `blur(${Math.round(radius * 100) / 100}px)`
  return [
    '[data-composer-card],',
    '[data-conversation-content] pre,',
    '[data-conversation-content] [data-code-block-banner],',
    'input:not([type=checkbox]):not([type=radio]):not([type=range]),',
    'textarea,select{',
    `-webkit-backdrop-filter:${blur};backdrop-filter:${blur}`,
    '}',
  ].join('')
}

/**
 * Coerce the composer veil height to a bounded pixel value.
 * @param value - Raw configured height in px.
 * @returns The clamped height, or the default for a non-numeric value.
 */
function normalizeFadeHeight(value) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return 36
  return Math.min(200, Math.max(0, parsed))
}

/**
 * Build the composer veil. Instead of tinting the transcript with a color, the
 * veil paints an opaque copy of the wallpaper over the transcript in the band
 * above and behind the composer card: the top fades the wallpaper in (so text
 * fades out) and the rest hides the transcript entirely, leaving the real
 * background visible. The composer seat keeps its higher stacking rank.
 *
 * The chat transcript and the trajectory ledger scroll areas are separate DOM
 * barrels, so each gets the same veil.
 * @param fadeHeight - Fade band height in px; 0 disables the veil.
 * @param backgroundBlur - Wallpaper blur radius in px.
 * @returns CSS text, or an empty string when disabled.
 */
function buildComposerVeil(fadeHeight, backgroundBlur) {
  if (fadeHeight <= 0) return ''
  const mask = `linear-gradient(to top,#000 0,#000 calc(100% - var(--wb-veil-fade,36px)),transparent 100%)`
  const rules = (scope) => [
    `${scope}::before,${scope}::after{`,
    'content:"";position:fixed;left:0;right:0;bottom:0;z-index:7;pointer-events:none;',
    'height:calc(var(--dsh-composer-height,152px) + var(--wb-veil-fade,36px));',
    `-webkit-mask-image:${mask};mask-image:${mask}`,
    '}',
    `${scope}::before{background-color:Canvas}`,
    `${scope}::after{`,
    'background:var(--wb-layer);background-attachment:fixed;background-size:cover;',
    'background-position:center;background-repeat:no-repeat;',
    'opacity:var(--wb-layer-opacity);',
    backgroundBlur > 0 ? 'filter:blur(var(--wb-layer-blur));' : '',
    '}',
  ].join('')
  const base = '[data-conversation-content][data-content-phase="active"]'
  return rules(`${base}:not(:has([data-conversation-composer-overlay])) [data-conversation-scroll]`)
    + rules(`${base}:has([data-conversation-composer-overlay]) [data-trajectory-scroll]`)
}

/**
 * Build the stylesheet that paints the window background.
 *
 * `html` keeps the theme canvas as the opaque backdrop, `body` and the base
 * surface token become transparent so the layer shows through, and the
 * fixed `body::before` layer carries the configured background and opacity.
 * @param layer - CSS background value for the layer.
 * @param opacity - Clamped layer opacity.
 * @param surfaceOpacity - Clamped opacity for text, code, and card surfaces.
 * @param surfaceBlur - Clamped backdrop blur radius for those surfaces.
 * @param backgroundBlur - Clamped blur radius for the background image.
 * @param trajectoryOpacity - Clamped surface opacity for the trajectory view.
 * @param trajectoryBlur - Clamped backdrop blur for the trajectory view.
 * @param composerFadeHeight - Composer veil fade height in px.
 * @returns Complete CSS text.
 */
function buildStylesheet(layer, opacity, surfaceOpacity, surfaceBlur, backgroundBlur, trajectoryOpacity, trajectoryBlur, composerFadeHeight) {
  // Blur bleeds past the element edges; overdrawing the fixed layer by twice
  // the radius hides the transparent bleed at the viewport borders.
  const inset = backgroundBlur > 0 ? `-${backgroundBlur * 2}px` : '0'
  return [
    // The Client half reads the trajectory values to build its own overrides;
    // the veil pseudos reuse the layer/opacity/blur values.
    `:root{--wb-trajectory-opacity:${trajectoryOpacity};--wb-trajectory-blur:${trajectoryBlur}px;--wb-layer:${layer};--wb-layer-opacity:${opacity};--wb-layer-blur:${backgroundBlur}px;--wb-veil-fade:${composerFadeHeight}px}`,
    'html{background-color:Canvas!important}',
    // The base surface and the sidebar column share two opaque fills; clearing
    // both lets the background layer back the center column and the sidebar.
    'body{background:transparent!important;--dsw-alias-bg-base:transparent!important;--dsw-specific-sidebar-fill:transparent!important}',
    // Windows Desktop paints the whole shell frame with the sidebar fill; the
    // center column alone is transparent. Clear every ancestor of the shell
    // overlay (the frame and any slot wrapper) so the background layer shows.
    'html[data-windows-titlebar] :has([data-shell-overlay]){background-color:transparent!important}',
    'body::before{',
    `content:"";position:fixed;inset:${inset};z-index:-1;pointer-events:none;`,
    `background:${layer};`,
    'background-size:cover;background-position:center;background-repeat:no-repeat;',
    backgroundBlur > 0 ? `filter:blur(${backgroundBlur}px);` : '',
    `opacity:${opacity};`,
    '}',
    buildSurfaceStylesheet(surfaceOpacity),
    buildSurfaceBlurStylesheet(surfaceBlur),
    buildComposerVeil(composerFadeHeight, backgroundBlur),
  ].join('')
}

/**
 * Register the stylesheet route, the image route, and nothing page-injected.
 * @param ctx - Host plugin context.
 * @param config - Row configuration from the profile patch.
 */
export function apply(ctx, config) {
  const image = resolveImage(config?.image)
  const value = config?.background
  const background = typeof value === 'string' ? value.trim() : ''
  const opacity = normalizeOpacity(config?.opacity)
  const surfaceOpacity = normalizeOpacity(config?.surfaceOpacity)
  const surfaceBlur = normalizeBlur(config?.surfaceBlur)
  const backgroundBlur = normalizeBlur(config?.backgroundBlur)
  const trajectoryOpacity = normalizeOpacity(config?.trajectoryOpacity)
  const trajectoryBlur = normalizeBlur(config?.trajectoryBlur)
  const composerFadeHeight = normalizeFadeHeight(config?.composerFadeHeight)
  // An empty layer or zero opacity means "leave the window unchanged";
  // emitting styles here would still make the base surfaces transparent.
  const enabled = (image !== undefined || background !== '') && opacity > 0
  const layer = image === undefined ? escapeStyleValue(background) : `url("${IMAGE_ROUTE_PATH}")`
  const stylesheet = enabled
    ? buildStylesheet(layer, opacity, surfaceOpacity, surfaceBlur, backgroundBlur, trajectoryOpacity, trajectoryBlur, composerFadeHeight)
    : ''

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: STYLE_ROUTE_PATH,
    async resource() {
      return new Response(stylesheet, {
        headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' },
      })
    },
  }))

  if (image === undefined) return
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: IMAGE_ROUTE_PATH,
    async resource() {
      try {
        const bytes = await readFile(image.imagePath)
        return new Response(bytes, {
          headers: { 'content-type': image.mediaType, 'cache-control': 'no-store' },
        })
      } catch {
        return new Response('The configured window background image is unavailable.', {
          status: 404,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        })
      }
    },
  }))
}
