/**
 * Browser half of the dsh-background-utils bundle. It fetches the stylesheet the
 * Host composes from the plugin configuration and owns it as a style element,
 * so the background appears in the Web GUI and in Desktop, whose window serves
 * its index without Host index injections.
 *
 * It also isolates the trajectory view (`[data-conversation-composer-overlay]`)
 * from the global surface opacity and blur: the theme's original surface tokens
 * are captured while the global sheet is temporarily disabled, then restored
 * inside the trajectory scope with the trajectory's own opacity and blur.
 */

window.__ModuleLoader__.load({
  id: 'dsh-background-utils',
  factory() {
    const STYLE_URL = '/background-utils/style.css'
    const TRAJECTORY_SCOPE = '[data-conversation-composer-overlay]'
    const SURFACE_TOKENS = [
      '--dsw-specific-input-major',
      '--dsw-alias-markdown-code-block',
      '--dsw-alias-markdown-code-block-banner',
      '--dsw-alias-bg-layer-1',
      '--dsw-alias-bg-layer-2',
      '--dsw-alias-bg-layer-3',
    ]
    // The window fills that the global sheet makes transparent. Dialogs are
    // portaled outside the shell, so they inherit those transparent values and
    // show the wallpaper through their panel.
    const STRUCTURE_TOKENS = [
      '--dsw-alias-bg-base',
      '--dsw-specific-sidebar-fill',
    ]
    // Only variables are restored here, never `background-color`: a translucent
    // scrim keeps its own paint, and the panel becomes opaque through the theme
    // tokens it already reads.
    const DIALOG_SCOPE = [
      '[role="dialog"]',
      '[role="alertdialog"]',
      '[aria-modal="true"]',
      'dialog',
      '[data-dialog]',
      '[data-modal]',
      '[class*="dialog"]',
      '[class*="Dialog"]',
    ].join(',')

    return {
      apply(ctx) {
        ctx.effect(() => {
          const base = document.createElement('style')
          base.dataset.plugin = 'dsh-background-utils'
          const trajectory = document.createElement('style')
          trajectory.dataset.plugin = 'dsh-background-utils/trajectory'
          const dialogs = document.createElement('style')
          dialogs.dataset.plugin = 'dsh-background-utils/dialogs'
          document.head.append(base, trajectory, dialogs)

          const controller = new AbortController()
          let disposed = false
          let observer
          let frame = 0

          const readNumber = (name, fallback) => {
            const value = Number.parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(name))
            return Number.isFinite(value) ? value : fallback
          }

          const rebuild = () => {
            frame = 0
            if (disposed) return
            const opacity = Math.min(1, Math.max(0, readNumber('--wb-trajectory-opacity', 1)))
            const blur = Math.min(80, Math.max(0, readNumber('--wb-trajectory-blur', 0)))
            // Read the theme's untouched tokens with the global sheet disabled.
            // These steps are synchronous, so no frame paints between them.
            base.disabled = true
            const originals = SURFACE_TOKENS.map((token) =>
              getComputedStyle(document.body).getPropertyValue(token).trim())
            const structure = STRUCTURE_TOKENS.map((token) =>
              getComputedStyle(document.body).getPropertyValue(token).trim())
            base.disabled = false
            const declarations = SURFACE_TOKENS.map((token, index) => {
              const original = originals[index]
              const value = original === ''
                ? 'Canvas'
                : opacity >= 1
                  ? original
                  : `color-mix(in srgb, ${original} ${Math.round(opacity * 1000) / 10}%, transparent)`
              return `${token}:${value}!important;`
            }).join('')
            const blurValue = blur > 0 ? `blur(${Math.round(blur * 100) / 100}px)` : 'none'
            trajectory.textContent = [
              `${TRAJECTORY_SCOPE}{${declarations}}`,
              `${TRAJECTORY_SCOPE} [data-composer-card],${TRAJECTORY_SCOPE} pre,${TRAJECTORY_SCOPE} [data-code-block-banner],${TRAJECTORY_SCOPE} input:not([type=checkbox]):not([type=radio]):not([type=range]),${TRAJECTORY_SCOPE} textarea,${TRAJECTORY_SCOPE} select{`,
              `-webkit-backdrop-filter:${blurValue}!important;backdrop-filter:${blurValue}!important}`,
              `${TRAJECTORY_SCOPE} input:not([type=checkbox]):not([type=radio]):not([type=range]),${TRAJECTORY_SCOPE} textarea,${TRAJECTORY_SCOPE} select{`,
              `background-color:var(--dsw-specific-input-major)!important}`,
            ].join('')
            const restored = [
              ...STRUCTURE_TOKENS.map((token, index) =>
                `${token}:${structure[index] === '' ? 'Canvas' : structure[index]}!important;`),
              ...SURFACE_TOKENS.map((token, index) =>
                `${token}:${originals[index] === '' ? 'Canvas' : originals[index]}!important;`),
            ].join('')
            dialogs.textContent = `${DIALOG_SCOPE}{${restored}}`
          }

          const schedule = () => {
            if (disposed || frame !== 0) return
            frame = requestAnimationFrame(rebuild)
          }

          fetch(STYLE_URL, { cache: 'no-store', signal: controller.signal })
            .then((response) => (response.ok ? response.text() : ''))
            .then((css) => {
              if (disposed || css.trim() === '') return
              base.textContent = css
              observer = new MutationObserver(schedule)
              observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['data-ds-dark-theme', 'style'],
              })
              observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-ds-theme-source', 'style'],
              })
              rebuild()
            })
            .catch(() => {})

          return () => {
            disposed = true
            controller.abort()
            if (frame !== 0) cancelAnimationFrame(frame)
            observer?.disconnect()
            base.remove()
            trajectory.remove()
            dialogs.remove()
          }
        }, 'window background stylesheet')
      },
    }
  },
})
