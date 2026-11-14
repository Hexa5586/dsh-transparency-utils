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
  factory(require) {
    const React = require('react')
    const h = React.createElement
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

    // Configuration section on this bundle's page in the sidebar Plugins
    // panel. The form reads and writes through the bundle's own Host routes,
    // so it does not depend on the Plugin Manager's form services.
    const CONFIG_URL = '/background-utils/config'
    const CONFIG_SLOT = 'plugins.detail.section'
    const CONFIG_SECTION_ID = 'background-utils-config'
    const PACKAGE_NAME = 'dsh-background-utils'
    const LOCALE_NS = 'backgroundUtils'
    const FIELD_ROWS = [
      'image', 'background', 'opacity', 'surfaceOpacity', 'surfaceBlur',
      'backgroundBlur', 'trajectoryOpacity', 'trajectoryBlur',
      'composerFadeHeight',
    ]
    const MESSAGES = {
      en: {
        'section.title': 'Background configuration',
        'section.hint':
          'Values take effect after saving and reloading the page. Leave a field empty to use its default.',
        'action.save': 'Save',
        'action.saving': 'Saving…',
        'status.loading': 'Loading…',
        'status.saved': 'Saved. Reload the page to see the change.',
        'status.failed': 'Saving failed.',
        'status.unavailable': 'This profile cannot change the configuration.',
        'field.image': 'Wallpaper image path',
        'field.background': 'Wallpaper CSS background',
        'field.opacity': 'Wallpaper opacity',
        'field.surfaceOpacity': 'Surface opacity',
        'field.surfaceBlur': 'Surface blur (px)',
        'field.backgroundBlur': 'Wallpaper blur (px)',
        'field.trajectoryOpacity': 'Trajectory surface opacity',
        'field.trajectoryBlur': 'Trajectory surface blur (px)',
        'field.composerFadeHeight': 'Composer veil height (px)',
        'field.image.hint': 'Absolute path to a local image file.',
        'field.background.hint': 'Any CSS background value; used when no image is set.',
        'field.scale.hint': 'Between 0 and 1.',
      },
      zh: {
        'section.title': '背景配置',
        'section.hint': '保存后需要刷新页面才会生效；留空的字段使用默认值。',
        'action.save': '保存',
        'action.saving': '保存中…',
        'status.loading': '读取中…',
        'status.saved': '已保存，刷新页面后生效。',
        'status.failed': '保存失败。',
        'status.unavailable': '当前 profile 不能修改配置。',
        'field.image': '壁纸图片路径',
        'field.background': '壁纸 CSS 背景',
        'field.opacity': '壁纸透明度',
        'field.surfaceOpacity': '表面不透明度',
        'field.surfaceBlur': '表面模糊（px）',
        'field.backgroundBlur': '壁纸模糊（px）',
        'field.trajectoryOpacity': '轨迹页表面不透明度',
        'field.trajectoryBlur': '轨迹页表面模糊（px）',
        'field.composerFadeHeight': '输入框遮罩高度（px）',
        'field.image.hint': '本地图片的绝对路径。',
        'field.background.hint': '任意 CSS background 值；未设置图片时使用。',
        'field.scale.hint': '取值 0 到 1。',
      },
    }
    const FIELD_HINTS = {
      image: 'field.image.hint',
      background: 'field.background.hint',
    }
    const SCALE_FIELDS = new Set([
      'opacity', 'surfaceOpacity', 'trajectoryOpacity',
    ])
    const styles = {
      section: {
        margin: '20px 0 8px',
        padding: '16px',
        border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.28))',
        borderRadius: '12px',
        background: 'var(--dsw-alias-bg-layer-1, transparent)',
      },
      title: {
        margin: '0 0 4px',
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--dsw-alias-label-primary, inherit)',
      },
      hint: {
        margin: '0 0 14px',
        fontSize: '12px',
        color: 'var(--dsw-alias-label-tertiary, rgba(127,127,127,.9))',
      },
      row: {
        display: 'grid',
        gridTemplateColumns: 'minmax(140px, 220px) minmax(0, 1fr)',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '10px',
      },
      label: {
        fontSize: '13px',
        color: 'var(--dsw-alias-label-secondary, inherit)',
      },
      input: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '6px 10px',
        fontSize: '13px',
        fontFamily: 'inherit',
        color: 'var(--dsw-alias-label-primary, inherit)',
        background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.12))',
        border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.3))',
        borderRadius: '8px',
      },
      footer: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '14px',
      },
      button: {
        padding: '6px 18px',
        fontSize: '13px',
        fontFamily: 'inherit',
        borderRadius: '8px',
        border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.35))',
        background: 'var(--dsw-alias-bg-layer-3, rgba(127,127,127,.18))',
        color: 'var(--dsw-alias-label-primary, inherit)',
        cursor: 'pointer',
      },
      status: {
        fontSize: '12px',
        color: 'var(--dsw-alias-label-tertiary, rgba(127,127,127,.9))',
      },
    }

    /** One labeled text field of the configuration form. */
    function Field({ t, name, value, onChange, disabled }) {
      const id = `background-utils-${name}`
      const hint = FIELD_HINTS[name]
        ? `${t(FIELD_HINTS[name])}`
        : SCALE_FIELDS.has(name)
          ? t('field.scale.hint')
          : ''
      return h('div', { style: styles.row },
        h('label', { htmlFor: id, style: styles.label }, t(`field.${name}`)),
        h('div', { style: { minWidth: 0 } },
          h('input', {
            id,
            type: 'text',
            inputMode: SCALE_FIELDS.has(name) || name.endsWith('Blur')
              || name === 'composerFadeHeight' ? 'decimal' : 'text',
            spellCheck: false,
            autoComplete: 'off',
            value,
            disabled,
            style: styles.input,
            onChange: (event) => onChange(name, event.target.value),
          }),
          hint === '' ? null : h('div', { style: { ...styles.status, marginTop: '4px' } }, hint),
        ),
      )
    }

    /** The bundle page section: loads the row configuration and saves edits. */
    function ConfigForm({ t }) {
      const [values, setValues] = React.useState(null)
      const [status, setStatus] = React.useState('loading')
      const [saving, setSaving] = React.useState(false)
      const [saved, setSaved] = React.useState(false)

      React.useEffect(() => {
        let alive = true
        fetch(CONFIG_URL, { cache: 'no-store' })
          .then((response) => (response.ok
            ? response.json()
            : response.json().then((body) => Promise.reject(new Error(body?.error ?? 'failed')))))
          .then((body) => {
            if (!alive) return
            setValues(body?.values ?? {})
            setStatus('idle')
          })
          .catch(() => {
            if (alive) setStatus('unavailable')
          })
        return () => { alive = false }
      }, [])

      const update = (name, value) => {
        setValues((current) => ({ ...current, [name]: value }))
        setSaved(false)
      }

      const save = () => {
        if (saving) return
        setSaving(true)
        // The Host route carrier only admits GET, so the submitted values ride
        // the `save` query parameter.
        const target = `${CONFIG_URL}?save=${encodeURIComponent(JSON.stringify(values ?? {}))}`
        fetch(target, { cache: 'no-store' })
          .then((response) => (response.ok
            ? response.json()
            : response.json()
              .then((body) => Promise.reject(new Error(body?.error ?? 'failed')))
              .catch(() => Promise.reject(new Error('failed')))))
          .then(() => {
            setStatus('idle')
            setSaved(true)
          })
          .catch(() => setStatus('failed'))
          .finally(() => setSaving(false))
      }

      const disabled = values === null || status === 'unavailable'
      const message = status === 'loading'
        ? t('status.loading')
        : status === 'unavailable'
          ? t('status.unavailable')
          : status === 'failed'
            ? t('status.failed')
            : saved
              ? t('status.saved')
              : ''

      return h('section', { style: styles.section, 'aria-label': t('section.title') },
        h('h3', { style: styles.title }, t('section.title')),
        h('p', { style: styles.hint }, t('section.hint')),
        disabled
          ? null
          : FIELD_ROWS.map((name) => h(Field, {
            key: name,
            t,
            name,
            value: values[name] ?? '',
            disabled: saving,
            onChange: update,
          })),
        h('div', { style: styles.footer },
          h('button', {
            type: 'button',
            style: { ...styles.button, opacity: disabled || saving ? 0.6 : 1 },
            disabled: disabled || saving,
            onClick: save,
          }, saving ? t('action.saving') : t('action.save')),
          message === '' ? null : h('span', { role: 'status', style: styles.status }, message),
        ),
      )
    }

    /** Only this bundle's page gets the section. */
    function ConfigSection({ t, subject }) {
      if (!subject || subject.kind !== 'bundle') return null
      if (subject.pkg?.name !== PACKAGE_NAME) return null
      return h(ConfigForm, { t })
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(LOCALE_NS)
        ctx.locale.register(LOCALE_NS, MESSAGES)
        ctx.slots.inject(CONFIG_SLOT, () => ctx.slots.register({
          name: CONFIG_SLOT,
          id: CONFIG_SECTION_ID,
          locale: LOCALE_NS,
          order: 20,
        }, (props) => h(ConfigSection, { t, subject: props?.subject })))
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
