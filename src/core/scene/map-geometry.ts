import type { GeoProjection } from 'd3-geo'
import type { Feature, FeatureCollection, Position } from 'geojson'
import type { MapBoundingBox } from './map-config'
import * as THREE from 'three'
import {
  computeGeoBoundingBox,
  createMapProjection,
  MAP_BOUNDING_BOX,
  MAP_EDGE_GRADIENT,
  MAP_LAYER_CONFIG,
  MAP_TEXTURE_SRC,
} from './map-config'

export type MapGeometryMode = 'absolute' | 'centered'

export interface MapGeometryContext {
  mapGroup: THREE.Group
  cityMeshes: THREE.Mesh[]
  cityMeshGroups?: Map<string, THREE.Mesh[]>
  tryLoadTexture: (url: string) => THREE.Texture | null
  extrusionDepth?: number
  geoJson: FeatureCollection
  mode?: MapGeometryMode
  targetSize?: {
    width?: number
    height?: number
  }
  projection?: GeoProjection
  textureUrl?: string | null
  normalTextureUrl?: string | null
}

export interface GeoToSceneTransformerResult {
  project: (position: [number, number]) => [number, number]
  bounds: MapBoundingBox
  scaledBounds: MapBoundingBox
  center: [number, number]
  normalizedScale: number
  projection: GeoProjection
}

interface GeoToSceneTransformerOptions {
  geoJson: FeatureCollection
  mode?: MapGeometryMode
  targetSize?: MapGeometryContext['targetSize']
  projection?: GeoProjection
}

export function createGeoToSceneTransformer(options: GeoToSceneTransformerOptions): GeoToSceneTransformerResult {
  const {
    geoJson,
    mode = 'absolute',
    targetSize,
    projection = createMapProjection(),
  } = options

  const bounds = computeGeoBoundingBox(geoJson, projection)
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const targetWidth = targetSize?.width ?? MAP_BOUNDING_BOX.width
  const targetHeight = targetSize?.height ?? MAP_BOUNDING_BOX.height
  const scaleX = bounds.width === 0 ? 1 : targetWidth / bounds.width
  const scaleY = bounds.height === 0 ? 1 : targetHeight / bounds.height
  const normalizedScale = mode === 'centered'
    ? Math.min(
        Number.isFinite(scaleX) ? scaleX : 1,
        Number.isFinite(scaleY) ? scaleY : 1,
      )
    : 1

  const scaledMinX = mode === 'centered' ? (bounds.minX - centerX) * normalizedScale : bounds.minX
  const scaledMaxX = mode === 'centered' ? (bounds.maxX - centerX) * normalizedScale : bounds.maxX
  const scaledMinY = mode === 'centered' ? (bounds.minY - centerY) * normalizedScale : bounds.minY
  const scaledMaxY = mode === 'centered' ? (bounds.maxY - centerY) * normalizedScale : bounds.maxY
  const scaledSpanX = Math.max(scaledMaxX - scaledMinX, 1e-6)
  const scaledSpanY = Math.max(scaledMaxY - scaledMinY, 1e-6)

  const scaledBounds: MapBoundingBox = {
    minX: scaledMinX,
    maxX: scaledMaxX,
    minY: scaledMinY,
    maxY: scaledMaxY,
    width: scaledSpanX,
    height: scaledSpanY,
  }

  const project = (position: [number, number]): [number, number] => {
    const [projectedX, projectedYRaw] = projection(position) || [0, 0]
    const mappedX = projectedX
    const mappedY = -projectedYRaw

    if (mode === 'centered')
      return [(mappedX - centerX) * normalizedScale, (mappedY - centerY) * normalizedScale]

    return [mappedX, mappedY]
  }

  return {
    project,
    bounds,
    scaledBounds,
    center: [centerX, centerY],
    normalizedScale,
    projection,
  }
}

interface CityMeshUserData {
  cityName: string
  originalY: number
  isHovered: boolean
  originalEmissive: number
  isClickable: boolean
}

export function buildMapGeometry(context: MapGeometryContext): GeoToSceneTransformerResult | null {
  const {
    mapGroup,
    cityMeshes,
    cityMeshGroups,
    tryLoadTexture,
    extrusionDepth = MAP_LAYER_CONFIG.extrusionDepth,
    geoJson,
    mode = 'absolute',
    targetSize,
    projection = createMapProjection(),
    textureUrl,
    normalTextureUrl,
  } = context

  const features = geoJson.features ?? []
  if (!features.length)
    return null

  const transformer = createGeoToSceneTransformer({ geoJson, mode, targetSize, projection })
  const textureBounds = mode === 'absolute' ? MAP_BOUNDING_BOX : transformer.scaledBounds
  const spanX = Math.max(textureBounds.width, 1)
  const spanY = Math.max(textureBounds.height, 1)
  const safeSpanX = spanX === 0 ? 1 : spanX
  const safeSpanY = spanY === 0 ? 1 : spanY

  const baseTexture = mode === 'absolute' ? tryLoadTexture(MAP_TEXTURE_SRC.baseColor) : null
  const normalTexture = mode === 'absolute'
    ? tryLoadTexture(MAP_TEXTURE_SRC.normal)
    : normalTextureUrl
      ? tryLoadTexture(normalTextureUrl)
      : null
  const detailTexture = mode === 'absolute' ? tryLoadTexture(MAP_TEXTURE_SRC.detail) : null
  const emissiveTexture = mode === 'absolute' ? tryLoadTexture(MAP_TEXTURE_SRC.emissive) : null
  const roughnessTexture = mode === 'absolute' ? tryLoadTexture(MAP_TEXTURE_SRC.roughness) : null
  const cityColorTexture = mode !== 'absolute' && textureUrl
    ? tryLoadTexture(textureUrl)
    : null
  const topColorTexture = baseTexture ?? cityColorTexture ?? null

  const sideMaterial = new THREE.MeshStandardMaterial({
    color: mode === 'absolute' ? 0x1A1F24 : 0x081320,
    emissive: mode === 'absolute' ? 0x052941 : 0x112C52,
    emissiveIntensity: mode === 'absolute' ? 0.18 : 0.32,
    roughness: mode === 'absolute' ? 0.68 : 0.42,
    metalness: mode === 'absolute' ? 0.16 : 0.34,
    transparent: true,
    opacity: mode === 'absolute' ? 0.95 : 0.9,
  })

  sideMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.u_edgeTopColor = { value: MAP_EDGE_GRADIENT.top }
    shader.uniforms.u_edgeMidColor = { value: MAP_EDGE_GRADIENT.middle }
    shader.uniforms.u_edgeBottomColor = { value: MAP_EDGE_GRADIENT.bottom }
    shader.uniforms.u_edgeHeight = { value: extrusionDepth }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vEdgeZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vEdgeZ = position.z;')

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying float vEdgeZ;
uniform vec3 u_edgeTopColor;
uniform vec3 u_edgeMidColor;
uniform vec3 u_edgeBottomColor;
uniform float u_edgeHeight;
`,
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `float edgeRatio = clamp(vEdgeZ / max(u_edgeHeight, 0.0001), 0.0, 1.0);
float lowerBlend = smoothstep(0.0, 0.45, edgeRatio);
float upperBlend = smoothstep(0.55, 1.0, edgeRatio);
vec3 gradientColor = mix(u_edgeBottomColor, u_edgeMidColor, lowerBlend);
gradientColor = mix(gradientColor, u_edgeTopColor, upperBlend);
vec3 edgeColor = mix(diffuse, gradientColor, 0.85);
vec4 diffuseColor = vec4(edgeColor, opacity);
`,
      )
  }
  sideMaterial.needsUpdate = true

  const topMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xFFFFFF),
    emissive: new THREE.Color(mode === 'absolute' ? 0x000000 : 0x06182E),
    emissiveIntensity: mode === 'absolute' ? 0.08 : 0.22,
    roughness: mode === 'absolute' ? 0.42 : 0.3,
    metalness: mode === 'absolute' ? 0.5 : 0.38,
    transparent: true,
    opacity: mode === 'absolute' ? 0.92 : 0.96,
  })

  const textureSpace = {
    minX: textureBounds.minX,
    minY: textureBounds.minY,
    spanX: Math.max(textureBounds.width, 1e-6),
    spanY: Math.max(textureBounds.height, 1e-6),
  }

  if (topColorTexture) {
    topColorTexture.wrapS = topColorTexture.wrapT = THREE.ClampToEdgeWrapping
    topColorTexture.offset.set(
      -textureSpace.minX / textureSpace.spanX,
      -textureSpace.minY / textureSpace.spanY,
    )
    topColorTexture.repeat.set(1 / textureSpace.spanX, 1 / textureSpace.spanY)
    topColorTexture.rotation = 0
    topMaterial.map = topColorTexture
  }

  if (normalTexture) {
    normalTexture.wrapS = normalTexture.wrapT = THREE.ClampToEdgeWrapping
    normalTexture.offset.set(-textureBounds.minX / safeSpanX, -textureBounds.minY / safeSpanY)
    normalTexture.repeat.set(1 / safeSpanX, 1 / safeSpanY)
    normalTexture.rotation = 0
    topMaterial.normalMap = normalTexture
    topMaterial.normalScale = new THREE.Vector2(0.9, 0.9)
  }

  if (detailTexture) {
    detailTexture.wrapS = detailTexture.wrapT = THREE.RepeatWrapping
    detailTexture.repeat.set(0.02, 0.02)
    topMaterial.metalnessMap = detailTexture
  }

  if (emissiveTexture) {
    emissiveTexture.wrapS = emissiveTexture.wrapT = THREE.RepeatWrapping
    emissiveTexture.repeat.set(0.01, 0.01)
    emissiveTexture.rotation = THREE.MathUtils.degToRad(33)
    topMaterial.emissiveMap = emissiveTexture
  }

  if (roughnessTexture) {
    roughnessTexture.wrapS = roughnessTexture.wrapT = THREE.RepeatWrapping
    roughnessTexture.repeat.set(0.02, 0.02)
    topMaterial.roughnessMap = roughnessTexture
  }

  features.forEach((feature: Feature) => {
    const coordinates = feature.geometry?.type === 'MultiPolygon'
      ? (feature.geometry.coordinates as Position[][][])
      : [(feature.geometry as any).coordinates as Position[][]]

    const cityName = feature.properties?.name || 'unknown'

    coordinates.forEach((multiPolygon) => {
      multiPolygon.forEach((polygon) => {
        const shape = new THREE.Shape()

        polygon.forEach((point, index) => {
          const [mappedX, mappedY] = transformer.project(point as [number, number])

          if (index === 0)
            shape.moveTo(mappedX, mappedY)
          else
            shape.lineTo(mappedX, mappedY)
        })

        shape.autoClose = true
        shape.closePath()

        const extrudeSettings = {
        depth: extrusionDepth,
          bevelEnabled: false,
        }

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
        geometry.computeVertexNormals()

        const mesh = new THREE.Mesh(geometry, [topMaterial, sideMaterial])
        mesh.rotateX(-Math.PI / 2)
        mesh.castShadow = false
        mesh.receiveShadow = false
        mesh.position.set(0, 0, 0)

        mesh.userData = {
          cityName,
          originalY: mesh.position.y,
          isHovered: false,
          originalEmissive: (sideMaterial as THREE.MeshStandardMaterial).emissive.getHex(),
          isClickable: mode === 'absolute',
        } satisfies CityMeshUserData

        cityMeshes.push(mesh)

        if (cityMeshGroups && cityName) {
          const existing = cityMeshGroups.get(cityName)
          if (existing)
            existing.push(mesh)
          else
            cityMeshGroups.set(cityName, [mesh])
        }

        const edgesGeometry = new THREE.EdgesGeometry(geometry, 15)
        const topEdges = filterTopEdges(edgesGeometry, extrusionDepth)

        const glowLineMaterial = new THREE.LineBasicMaterial({
          color: 0xD6EFFF,
          transparent: true,
          opacity: 0.95,
          depthTest: true,
          depthWrite: false,
          linewidth: 2,
        })

        const glowBorderLine = new THREE.LineSegments(topEdges, glowLineMaterial)
        glowBorderLine.renderOrder = 10
        glowBorderLine.position.y = 0.02
        mesh.add(glowBorderLine)

        const innerLineMaterial = new THREE.LineBasicMaterial({
          color: 0x0DA6FF,
          transparent: true,
          opacity: 0.8,
          depthTest: true,
          depthWrite: false,
          linewidth: 1,
        })

        const innerBorderLine = new THREE.LineSegments(topEdges.clone(), innerLineMaterial)
        innerBorderLine.renderOrder = 9
        innerBorderLine.position.y = 0.05
        mesh.add(innerBorderLine)

        mapGroup.add(mesh)
      })
    })
  })

  return transformer
}

function filterTopEdges(edgesGeometry: THREE.EdgesGeometry, extrudeDepth: number): THREE.BufferGeometry {
  const tolerance = 0.01
  const posAttr = edgesGeometry.attributes.position
  const filteredPositions: number[] = []

  for (let i = 0; i < posAttr.count; i += 2) {
    const v1 = new THREE.Vector3().fromBufferAttribute(posAttr, i)
    const v2 = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1)

    if (Math.abs(v1.z - extrudeDepth) < tolerance && Math.abs(v2.z - extrudeDepth) < tolerance) {
      filteredPositions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z)
    }
  }

  const topEdgesGeometry = new THREE.BufferGeometry()
  topEdgesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(filteredPositions, 3))
  return topEdgesGeometry
}
