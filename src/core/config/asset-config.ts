/**
 * 资源配置模块
 * 用于管理库的资源路径配置
 */

let customAssetsBasePath: string | null = null

/**
 * 设置自定义的资源基础路径
 * @param basePath 资源基础路径，例如 '/node_modules/vue3-china-map-3d/dist/assets'
 * @example
 * ```ts
 * import { setAssetsBasePath } from 'vue3-china-map-3d'
 * setAssetsBasePath('/static/vue3-china-map-3d/assets')
 * ```
 */
export function setAssetsBasePath(basePath: string): void {
  customAssetsBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
}

/**
 * 获取资源的完整 URL
 * @param path 相对于 assets 目录的路径，例如 'images/city/hangzhou.jpg'
 * @returns 完整的资源 URL
 */
export function getAssetUrl(path: string): string {
  // 如果用户设置了自定义基础路径，使用自定义路径
  if (customAssetsBasePath) {
    return `${customAssetsBasePath}/${path}`
  }

  // 开发模式：使用 Vite 的 new URL 处理
  if (import.meta.env?.DEV) {
    return new URL(`../../../assets/${path}`, import.meta.url).href
  }

  // 生产模式：动态构建路径
  // import.meta.url 在运行时会是类似：
  // "http://localhost:3000/node_modules/vue3-china-map-3d/dist/vue3-china-map-3d.es.js"
  const currentUrl = import.meta.url
  const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'))
  return `${baseUrl}/assets/${path}`
}

/**
 * 重置资源基础路径为默认值
 */
export function resetAssetsBasePath(): void {
  customAssetsBasePath = null
}
