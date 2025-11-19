import type { CityRiskDatum } from './map-config'
import type { WaveMesh } from './types'
import * as THREE from 'three'
import { CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import {
  CITY_MARKER_SCALE,
  createMapProjection,
  MAP_LAYER_CONFIG,
} from './map-config'
import './markers.css'

interface MarkerUserData {
  baseY: number
  phase: number
}

export interface MarkerLayerContext {
  mapGroup: THREE.Group
  waveMeshArr: WaveMesh[]
  cityMarkerGroups: THREE.Group[]
  // 🚀 性能优化：预验证的标记组数组
  cityMarkerGroupsOptimized: Array<{
    group: THREE.Group
    baseY: number
    phase: number
  }>
  cityData: CityRiskDatum[]
  onCityLabelClick?: (payload: { event: MouseEvent, city: CityRiskDatum }) => void
  onLabelCreated?: (payload: { city: CityRiskDatum, label: CSS3DSprite }) => void
  cityLabelRenderer?: (city: CityRiskDatum, normalized: number) => HTMLElement
  hideCityLabel?: boolean
}

const LABEL_OFFSET_Y = 13.5
const LABEL_SCALE = 0.24

// 🚀 性能优化：共享几何体实例，减少内存占用
const sharedGeometries = {
  glow: new THREE.CircleGeometry(1.2, 64),
  halo: new THREE.CircleGeometry(1.2, 64),
  ring: new THREE.RingGeometry(0.86, 1.18, 64),
  stem: new THREE.CylinderGeometry(0.1, 0.1, 2.8, 24),
  cap: new THREE.CircleGeometry(0.38, 32),
}

export function buildCityMarkers(context: MarkerLayerContext): void {
  const { mapGroup, waveMeshArr, cityMarkerGroups, cityMarkerGroupsOptimized, cityData } = context

  console.log(`[CityMarkers] Building city markers, cityLabelRenderer: ${context.cityLabelRenderer ? 'CUSTOM' : 'DEFAULT'}`)
  console.log(`[CityMarkers] City data count: ${cityData.length}`)

  const projection = createMapProjection()

  if (!cityData.length) {
    console.log('[CityMarkers] No city data, skipping marker build')
    return
  }

  const maxValue = Math.max(...cityData.map(city => city.value)) || 1
  const minValue = Math.min(...cityData.map(city => city.value)) || 0

  cityData.forEach((city) => {
    const [x, y] = projection(city.center) || [0, 0]
    const normalized = THREE.MathUtils.clamp((city.value - minValue) / (maxValue - minValue || 1), 0, 1)

    const cityGroup = new THREE.Group()
    cityGroup.name = `city-marker-${city.id}`
    cityGroup.scale.setScalar(CITY_MARKER_SCALE)

    const markerBase = createMarkerBase(normalized, waveMeshArr)
    cityGroup.add(markerBase)

    const label = context.hideCityLabel ? null : createCityLabelSprite(city, normalized, context.cityLabelRenderer)
    if (label) {
      label.position.set(0, LABEL_OFFSET_Y, 0)
      label.scale.setScalar(LABEL_SCALE)
      const labelElement = label.element as HTMLElement
      const clickHandler = (event: MouseEvent): void => {
        event.stopPropagation()
        context.onCityLabelClick?.({
          event,
          city,
        })
      }
      labelElement.addEventListener('click', clickHandler)
      label.userData = {
        ...label.userData,
        __clickHandler: clickHandler,
        __baseY: label.position.y,
        __labelName: city.name,
      }
      cityGroup.add(label)
      context.onLabelCreated?.({ city, label })
    }

    cityGroup.position.set(x, MAP_LAYER_CONFIG.extrusionDepth + 1.2, y)
    cityGroup.userData = {
      baseY: cityGroup.position.y,
      phase: Math.random() * Math.PI * 2,
    } satisfies MarkerUserData

    mapGroup.add(cityGroup)
    cityMarkerGroups.push(cityGroup)

    // 🚀 性能优化：同时填充优化数组，避免运行时类型检查
    cityMarkerGroupsOptimized.push({
      group: cityGroup,
      baseY: cityGroup.position.y,
      phase: cityGroup.userData.phase,
    })
  })
}

function createMarkerBase(normalized: number, waveMeshArr: WaveMesh[]): THREE.Group {
  const group = new THREE.Group()

  // 🚀 性能优化：使用共享几何体，减少内存占用
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color().setHSL(0.55, 0.9, THREE.MathUtils.lerp(0.52, 0.65, normalized)),
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const glowMesh = new THREE.Mesh(sharedGeometries.glow, glowMaterial)
  glowMesh.rotation.x = Math.PI / 2
  glowMesh.renderOrder = 2
  group.add(glowMesh)

  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0x8EE5FF,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const haloMesh = new THREE.Mesh(sharedGeometries.halo, haloMaterial)
  haloMesh.rotation.x = Math.PI / 2
  haloMesh.renderOrder = 2
  haloMesh.scale.set(1.55, 1.55, 1.55)
  // 🚀 性能优化：添加波纹动画属性
  Object.assign(haloMesh, { size: 1.55, _s: 1 })
  waveMeshArr.push(haloMesh as unknown as WaveMesh)
  group.add(haloMesh)

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xBBEEFF,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const ringMesh = new THREE.Mesh(sharedGeometries.ring, ringMaterial)
  ringMesh.rotation.x = Math.PI / 2
  ringMesh.position.y = 0.035
  ringMesh.renderOrder = 2
  group.add(ringMesh)

  const stemMaterial = new THREE.MeshBasicMaterial({
    color: 0x7CD0FF,
    transparent: true,
    opacity: THREE.MathUtils.lerp(0.55, 0.85, normalized),
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const stemHeight = 2.8
  const stem = new THREE.Mesh(sharedGeometries.stem, stemMaterial)
  stem.position.y = stemHeight / 2
  stem.renderOrder = 3
  group.add(stem)

  const capMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const cap = new THREE.Mesh(sharedGeometries.cap, capMaterial)
  cap.rotation.x = Math.PI / 2
  cap.position.y = stemHeight
  cap.renderOrder = 3
  group.add(cap)

  return group
}

function createCityLabelSprite(
  city: CityRiskDatum,
  normalized: number,
  customRenderer?: (city: CityRiskDatum, normalized: number) => HTMLElement | null | false,
): CSS3DSprite | null {
  let marker: HTMLElement

  if (customRenderer) {
    console.log(`[CityLabel] Using custom renderer for city: ${city.name}`)
    const result = customRenderer(city, normalized)
    console.log('[CityLabel] Custom renderer executed successfully')

    if (result === null || result === false) {
      console.log(`[CityLabel] Custom renderer returned ${result}, hiding label for city: ${city.name}`)
      return null
    }

    if (!result) {
      console.error(`[CityLabel] ERROR: Custom renderer returned invalid value for city: ${city.name}`)
      throw new Error(`cityLabelRenderer must return HTMLElement, null, or false, got ${result}`)
    }

    marker = result
    console.log('[CityLabel] Marker element:', marker, 'tagName:', marker.tagName)
  }
  else {
    console.log(`[CityLabel] Using default renderer for city: ${city.name}`)
    marker = document.createElement('div')
    marker.className = 'zj-city-marker'
    marker.setAttribute('data-city', city.id)
    marker.style.pointerEvents = 'auto'
    marker.style.cursor = 'pointer'
    marker.style.setProperty('--marker-strength', (0.6 + normalized * 0.4).toFixed(2))

    if (city.rank && city.rank <= 3)
      marker.classList.add('zj-city-marker--top')

    marker.innerHTML = `
      <div class="zj-city-marker__panel">
        <div class="zj-city-marker__name">
          <span class="zj-city-marker__name-zh">${city.name}${city.value.toFixed(0)}</span>
        </div>
      </div>
    `
  }

  return new CSS3DSprite(marker)
}
