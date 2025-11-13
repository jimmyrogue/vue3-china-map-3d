import type { FeatureCollection } from 'geojson'

type GeoLoader = () => Promise<{ default: FeatureCollection }>

// 使用相对于包根目录的路径
const getAssetUrl = (path: string) => {
  // 在开发模式下，使用 Vite 的资源处理
  if (import.meta.env.DEV) {
    return new URL(`../../assets/${path}`, import.meta.url).href
  }
  // 在生产模式下，使用相对路径
  return `./assets/${path}`
}

const cityGeoLoaders: Record<string, GeoLoader> = {
  杭州市: () => import('../../assets/geo/hangzhoudistrict.json'),
  宁波市: () => import('../../assets/geo/ningbodistrict.json'),
  温州市: () => import('../../assets/geo/wenzhoudistrict.json'),
  绍兴市: () => import('../../assets/geo/shaoxingdistrict.json'),
  湖州市: () => import('../../assets/geo/huzhoudistrict.json'),
  嘉兴市: () => import('../../assets/geo/jiaxingdistrict.json'),
  金华市: () => import('../../assets/geo/jinhuadistrict.json'),
  衢州市: () => import('../../assets/geo/quzhoudistrict.json'),
  舟山市: () => import('../../assets/geo/zhoushandistrict.json'),
  台州市: () => import('../../assets/geo/taizhoudistrict.json'),
  丽水市: () => import('../../assets/geo/lishuidistrict.json'),
}

const cityTextureMap: Record<string, string> = {
  杭州市: getAssetUrl('images/city/hangzhou.jpg'),
  宁波市: getAssetUrl('images/city/ningbo.jpg'),
  温州市: getAssetUrl('images/city/wenzhou.jpg'),
  绍兴市: getAssetUrl('images/city/shaoxing.jpg'),
  湖州市: getAssetUrl('images/city/huzhou.jpg'),
  嘉兴市: getAssetUrl('images/city/jiaxing.jpg'),
  金华市: getAssetUrl('images/city/jinhua.jpg'),
  衢州市: getAssetUrl('images/city/quzhou.jpg'),
  舟山市: getAssetUrl('images/city/zhoushan.jpg'),
  台州市: getAssetUrl('images/city/taizhou.jpg'),
  丽水市: getAssetUrl('images/city/lishui.jpg'),
}

const cityNormalTextureMap: Record<string, string> = {
  杭州市: getAssetUrl('images/city/hangzhou_normal.png'),
  宁波市: getAssetUrl('images/city/ningbo_normal.png'),
  温州市: getAssetUrl('images/city/wenzhou_normal.png'),
  绍兴市: getAssetUrl('images/city/shaoxing_normal.png'),
  湖州市: getAssetUrl('images/city/huzhou_normal.png'),
  嘉兴市: getAssetUrl('images/city/jiaxing_normal.png'),
  金华市: getAssetUrl('images/city/jinhua_normal.png'),
  衢州市: getAssetUrl('images/city/quzhou_normal.png'),
  舟山市: getAssetUrl('images/city/zhoushan_normal.png'),
  台州市: getAssetUrl('images/city/taizhou_normal.png'),
  丽水市: getAssetUrl('images/city/lishui_normal.png'),
}

// District 纹理映射 - 使用动态路径生成
const districtTextureMap: Record<string, string> = Object.create(null)

export async function loadCityGeo(cityName: string): Promise<FeatureCollection | null> {
  const loader = cityGeoLoaders[cityName]
  if (!loader)
    return null

  const module = await loader()
  return module.default
}

export function getCityTexture(cityName: string): string | null {
  return cityTextureMap[cityName] ?? null
}

export function getCityNormalTexture(cityName: string): string | null {
  return cityNormalTextureMap[cityName] ?? null
}

export function getDistrictTexture(districtName: string): string | null {
  if (!districtName)
    return null

  const normalizedName = districtName.trim()

  // 如果已经缓存，直接返回
  if (districtTextureMap[normalizedName]) {
    return districtTextureMap[normalizedName]
  }

  // 动态生成路径并缓存
  const url = getAssetUrl(`images/district/${normalizedName}.jpg`)
  districtTextureMap[normalizedName] = url
  return url
}
