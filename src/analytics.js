export const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || ''
export const analyticsAvailable = /^G-[A-Z0-9]+$/i.test(measurementId)
let active = false

export function startAnalytics() {
  if (!analyticsAvailable || active) return false
  active = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  document.head.appendChild(script)
  return true
}

export function trackPageView(title) {
  if (!active) return
  window.gtag('event', 'page_view', {
    page_title: title,
    page_location: window.location.origin + window.location.pathname,
  })
}

export function trackEvent(name, parameters = {}) {
  if (active) window.gtag('event', name, parameters)
}
