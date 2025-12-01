/**
 * 资源配置模块
 * 用于管理库的资源路径配置
 */

// 默认使用线上 CDN 地址
const DEFAULT_CDN_BASE_URL = 'https://dowload.20001220.com'

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

  // 默认使用线上 CDN 地址
  // 根据路径类型选择对应的 CDN 路径
  if (path.startsWith('textures/zhejiang/')) {
    // textures/zhejiang 资源映射到 zhejiang 目录下，去掉 textures/zhejiang/ 前缀
    const fileName = path.replace('textures/zhejiang/', '')
    finalUrl = `${DEFAULT_CDN_BASE_URL}/zhejiang/${fileName}`
  } else {
    // images 等其他资源直接在根目录下
    finalUrl = `${DEFAULT_CDN_BASE_URL}/${path}`
  }

  if (debugMode) {
    console.log(`[Vue3ChinaMap3D] 使用 CDN 地址: ${path} -> ${finalUrl}`)
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
