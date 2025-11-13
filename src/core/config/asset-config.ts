/**
 * 资源配置模块
 * 用于管理库的资源路径配置
 */

let customAssetsBasePath: string | null = null
let debugMode = false

/**
 * 启用调试模式，输出资源 URL 生成日志
 * @param enabled 是否启用调试模式
 */
export function setDebugMode(enabled: boolean): void {
  debugMode = enabled
  if (enabled) {
    console.log('[Vue3ChinaMap3D] 调试模式已启用')
    console.log('[Vue3ChinaMap3D] import.meta.url =', import.meta.url)
  }
}

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
  if (debugMode) {
    console.log('[Vue3ChinaMap3D] 自定义资源路径已设置:', customAssetsBasePath)
  }
}

/**
 * 获取资源的完整 URL
 * @param path 相对于 assets 目录的路径，例如 'images/city/hangzhou.jpg'
 * @returns 完整的资源 URL
 */
export function getAssetUrl(path: string): string {
  let finalUrl: string

  // 如果用户设置了自定义基础路径，使用自定义路径
  if (customAssetsBasePath) {
    finalUrl = `${customAssetsBasePath}/${path}`
    if (debugMode) {
      console.log(`[Vue3ChinaMap3D] 使用自定义路径: ${path} -> ${finalUrl}`)
    }
    return finalUrl
  }

  // 开发模式：使用 Vite 的 new URL 处理
  if (import.meta.env?.DEV) {
    finalUrl = new URL(`../../../assets/${path}`, import.meta.url).href
    if (debugMode) {
      console.log(`[Vue3ChinaMap3D] 开发模式: ${path} -> ${finalUrl}`)
    }
    return finalUrl
  }

  // 生产模式：动态构建路径
  // import.meta.url 在运行时会是类似：
  // "http://localhost:3000/node_modules/vue3-china-map-3d/dist/vue3-china-map-3d.es.js"
  const currentUrl = import.meta.url
  const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'))
  finalUrl = `${baseUrl}/assets/${path}`

  if (debugMode) {
    console.log(`[Vue3ChinaMap3D] 生产模式:`)
    console.log(`  - 当前模块 URL: ${currentUrl}`)
    console.log(`  - 基础 URL: ${baseUrl}`)
    console.log(`  - 资源路径: ${path}`)
    console.log(`  - 最终 URL: ${finalUrl}`)
  }

  return finalUrl
}

/**
 * 重置资源基础路径为默认值
 */
export function resetAssetsBasePath(): void {
  customAssetsBasePath = null
  if (debugMode) {
    console.log('[Vue3ChinaMap3D] 资源路径已重置为默认')
  }
}
