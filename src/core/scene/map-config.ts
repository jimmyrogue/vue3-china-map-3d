import type { GeoProjection } from 'd3-geo'
import type { Feature, FeatureCollection, Position } from 'geojson'
import type { CityBoardDatum } from '../zhejiangCityBoards'
import zhejiangGeo from '../../assets/geo/zhejiang.json'
import * as d3 from 'd3-geo'
import * as THREE from 'three'
import { zhejiangCityBoards } from '../zhejiangCityBoards'
import { getAssetUrl } from '../config/asset-config'

export interface MapBoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

export type CityRiskDatum = CityBoardDatum & {
  rank?: number
  center: [number, number]
}

export interface ControlLimits {
  minDistance: number
  maxDistance: number
  minPolarAngle: number
  maxPolarAngle: number
}

export const CONTROL_LIMITS: ControlLimits = {
  minDistance: 68,
  maxDistance: 250,
  minPolarAngle: Math.PI / 6,
  maxPolarAngle: Math.PI / 2.05,
}

export interface MapLayerConfig {
  center: [number, number]
  scale: number
  extrusionDepth: number
  floatHeight: number
  offsetZ: number
  defaultCameraPosition: [number, number, number]
  defaultCameraTarget: [number, number, number]
}

export const MAP_LAYER_CONFIG: MapLayerConfig = {
  center: [120.153576, 29.287459],
  scale: 850,
  extrusionDepth: 5,
  floatHeight: -13.6,
  offsetZ: 100,
  defaultCameraPosition: [0, 100, 170],
  defaultCameraTarget: [0, -35, 110],
}

export const CITY_MARKER_SCALE = 0.17

export const MAP_TEXTURE_SRC = {
  baseColor: getAssetUrl('textures/zhejiang/baseColor.png'),
  normal: getAssetUrl('textures/zhejiang/normal.jpg'),
  detail: '',
  emissive: '',
  roughness: '',
  background: getAssetUrl('images/bg.jpg'),
  waterRipple: getAssetUrl('images/ocean-bg.png'),
  blur: '',
  rotationBorder1: '',
  rotationBorder2: getAssetUrl('images/ring1.png'),
  haloPrimary: getAssetUrl('images/ring2.png'),
  haloSecondary: getAssetUrl('images/ring2.png'),
  topGlow: '',
  ambientMask: '',
}

export const MAP_BACKGROUND_BRIGHTNESS = 1.32

export const MAP_EDGE_GRADIENT = {
  bottom: new THREE.Color(0x001428),
  middle: new THREE.Color(0x045F92),
  top: new THREE.Color(0x11D6FF),
}

export function computeGeoBoundingBox(
  geoData: FeatureCollection,
  projection: GeoProjection = createMapProjection(),
): MapBoundingBox {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  geoData.features?.forEach((feature: Feature) => {
    const coordinates = feature.geometry?.type === 'MultiPolygon'
      ? (feature.geometry.coordinates as Position[][][])
      : [(feature.geometry as any).coordinates as Position[][]]

    coordinates.forEach((multiPolygon) => {
      multiPolygon.forEach((polygon) => {
        polygon.forEach((point) => {
          const [x, y] = projection(point as [number, number]) || [0, 0]
          const mappedX = x
          const mappedY = -y

          if (mappedX < minX)
            minX = mappedX
          if (mappedX > maxX)
            maxX = mappedX
          if (mappedY < minY)
            minY = mappedY
          if (mappedY > maxY)
            maxY = mappedY
        })
      })
    })
  })

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  }
}

export const MAP_BOUNDING_BOX: MapBoundingBox = computeGeoBoundingBox(
  zhejiangGeo as FeatureCollection,
  createMapProjection(),
)

export const CITY_CENTROIDS: Map<string, [number, number]> = (() => {
  const centroids = new Map<string, [number, number]>()
  const geoData = zhejiangGeo as FeatureCollection

  geoData.features?.forEach((feature: Feature) => {
    const name = (feature.properties as { name?: string } | undefined)?.name
    if (!name)
      return

    const [lon, lat] = d3.geoCentroid(feature as unknown as any) as [number, number]
    centroids.set(name, [Number(lon.toFixed(6)), Number(lat.toFixed(6))])
  })

  return centroids
})()

export function buildCityDisplayData(source: CityBoardDatum[] = zhejiangCityBoards): CityRiskDatum[] {
  return source
    .map((city) => {
      const centroid = CITY_CENTROIDS.get(city.name)
      const center = city.center ?? centroid

      if (!center)
        return null

      return {
        ...city,
        center,
      }
    })
    .filter((city): city is CityRiskDatum => city !== null)
    .sort((a, b) => b.value - a.value)
    .map((city, index) => ({
      ...city,
      rank: index + 1,
    }))
}

export const DEFAULT_CITY_DISPLAY_DATA = buildCityDisplayData()

export function createMapProjection(): GeoProjection {
  return d3.geoMercator()
    .center(MAP_LAYER_CONFIG.center)
    .scale(MAP_LAYER_CONFIG.scale)
    .translate([0, 0])
}
