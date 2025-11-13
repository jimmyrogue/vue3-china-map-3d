import type { Feature, FeatureCollection, Position } from 'geojson'
import type { PulsingHalo, RotatingPlane, WaterRipple } from './types'
import zhejiangGeo from '@/assets/geo/zhejiang.json'
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import {
  createMapProjection,
  MAP_BACKGROUND_BRIGHTNESS,
  MAP_BOUNDING_BOX,
  MAP_LAYER_CONFIG,
  MAP_TEXTURE_SRC,
} from './map-config'

export interface EnvironmentLayerContext {
  renderer: THREE.WebGLRenderer | null
  tryLoadTexture: (url: string) => THREE.Texture | null
  rotatingPlanes: RotatingPlane[]
  pulsingHalos: PulsingHalo[]
  lineMaterials: LineMaterial[]
  registerWaterRipple: (ripple: WaterRipple) => void
}

export function createEnvironmentLayer(context: EnvironmentLayerContext): THREE.Group | null {
  const { renderer, tryLoadTexture, rotatingPlanes, pulsingHalos, lineMaterials, registerWaterRipple } = context

  const group = new THREE.Group()
  group.name = 'environment-layer'
  group.position.set(0, MAP_LAYER_CONFIG.floatHeight - 2.6, MAP_LAYER_CONFIG.offsetZ)

  const backgroundPlane = createBackgroundPlane(tryLoadTexture)
  if (backgroundPlane) {
    backgroundPlane.position.y = 0.05
    group.add(backgroundPlane)
  }

  const waterSurface = createWaterSurface(tryLoadTexture)
  if (waterSurface)
    group.add(waterSurface)

  const waterRipple = createWaterRippleLayer(registerWaterRipple)
  if (waterRipple)
    group.add(waterRipple)

  const blurPlane = createBlurPlane(tryLoadTexture)
  if (blurPlane)
    group.add(blurPlane)

  const rotatingRings = createRotatingRingLayer(tryLoadTexture, rotatingPlanes)
  if (rotatingRings)
    group.add(rotatingRings)

  const haloLayer = createHaloLayer(tryLoadTexture, pulsingHalos)
  if (haloLayer)
    group.add(haloLayer)

  const boundaryOutline = createBoundaryOutline(renderer, lineMaterials)
  if (boundaryOutline)
    group.add(boundaryOutline)

  return group.children.length ? group : null
}

function createBackgroundPlane(tryLoadTexture: (url: string) => THREE.Texture | null): THREE.Mesh | null {
  const texture = tryLoadTexture(MAP_TEXTURE_SRC.background)
  if (!texture)
    return null

  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
  texture.colorSpace = THREE.SRGBColorSpace

  const bounds = MAP_BOUNDING_BOX
  const margin = 100
  const width = bounds.width + margin
  const height = bounds.height + margin
  const centerX = (bounds.maxX + bounds.minX) / 2
  const centerZ = (bounds.maxY + bounds.minY) / 2

  const geometry = new THREE.PlaneGeometry(width, height)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  if (MAP_BACKGROUND_BRIGHTNESS > 1) {
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
        `gl_FragColor = vec4( outgoingLight * ${MAP_BACKGROUND_BRIGHTNESS.toFixed(2)}, diffuseColor.a );`,
      )
    }
    material.needsUpdate = true
  }

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(centerX, 0, centerZ)
  mesh.renderOrder = 0

  return mesh
}

function createBlurPlane(tryLoadTexture: (url: string) => THREE.Texture | null): THREE.Mesh | null {
  const texture = tryLoadTexture(MAP_TEXTURE_SRC.blur)
  if (!texture)
    return null

  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter

  const bounds = MAP_BOUNDING_BOX
  const size = Math.max(bounds.width, bounds.height) * 3.2
  const centerX = (bounds.maxX + bounds.minX) / 2
  const centerZ = (bounds.maxY + bounds.minY) / 2

  const geometry = new THREE.PlaneGeometry(size, size)
  const material = new THREE.MeshBasicMaterial({
    color: 0x3F82CD,
    alphaMap: texture,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(centerX, -0.12, centerZ)
  mesh.renderOrder = 1

  return mesh
}

function createWaterSurface(tryLoadTexture: (url: string) => THREE.Texture | null): THREE.Mesh | null {
  const texture = tryLoadTexture(MAP_TEXTURE_SRC.waterRipple)
  if (!texture)
    return null

  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.repeat.set(2.4, 2.4)

  const bounds = MAP_BOUNDING_BOX
  const size = Math.max(bounds.width, bounds.height) * 2.6
  const centerX = (bounds.maxX + bounds.minX) / 2
  const centerZ = (bounds.maxY + bounds.minY) / 2

  const geometry = new THREE.PlaneGeometry(size, size)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(centerX, -0.32, centerZ)
  mesh.renderOrder = 2

  return mesh
}

function createWaterRippleLayer(registerWaterRipple: (ripple: WaterRipple) => void): THREE.Mesh | null {
  const bounds = MAP_BOUNDING_BOX
  const size = Math.max(bounds.width, bounds.height) * 2.4
  const centerX = (bounds.maxX + bounds.minX) / 2
  const centerZ = (bounds.maxY + bounds.minY) / 2

  const geometry = new THREE.PlaneGeometry(size, size)
  const uniforms: WaterRipple['uniforms'] = {
    uTime: { value: 0 },
    uSpeed: { value: 32 },
    uWidth: { value: size * 0.08 },
    uOpacity: { value: 0.58 },
    uMaxRadius: { value: (size * Math.SQRT2) / 2 },
    uColor: { value: new THREE.Color(0x71918E) },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vPosition;
      void main() {
        vPosition = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vPosition;
      uniform float uTime;
      uniform float uSpeed;
      uniform float uWidth;
      uniform float uOpacity;
      uniform float uMaxRadius;
      uniform vec3 uColor;

      void main() {
        float radius = mod(uTime * uSpeed, uMaxRadius);
        float dist = length(vPosition);
        float fadeIn = smoothstep(radius - uWidth, radius, dist);
        float fadeOut = 1.0 - smoothstep(radius, radius + uWidth, dist);
        float mask = clamp(fadeIn * fadeOut, 0.0, 1.0);

        if (mask <= 0.0) {
          discard;
        }

        gl_FragColor = vec4(uColor, mask * uOpacity);
      }
    `,
  })

  material.blending = THREE.CustomBlending
  material.blendEquation = THREE.AddEquation
  material.blendSrc = THREE.DstColorFactor
  material.blendDst = THREE.OneFactor

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(centerX, -0.24, centerZ)
  mesh.renderOrder = 3

  registerWaterRipple({
    mesh,
    material,
    uniforms,
    timeScale: 0.0085,
  })

  return mesh
}

function createRotatingRingLayer(
  tryLoadTexture: (url: string) => THREE.Texture | null,
  rotatingPlanes: RotatingPlane[],
): THREE.Group | null {
  const bounds = MAP_BOUNDING_BOX
  const centerX = (bounds.maxX + bounds.minX) / 2
  const centerZ = (bounds.maxY + bounds.minY) / 2
  const baseSize = Math.max(bounds.width, bounds.height) * 1.42

  const group = new THREE.Group()
  group.name = 'environment-rotating-rings'

  const createRing = (src: string, speed: number, opacity: number, scaleMultiplier: number, height: number): void => {
    const texture = tryLoadTexture(src)
    if (!texture)
      return

    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
    texture.generateMipmaps = false
    texture.colorSpace = THREE.SRGBColorSpace

    const geometry = new THREE.PlaneGeometry(baseSize * scaleMultiplier, baseSize * scaleMultiplier)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0x48AFFF,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(centerX, height, centerZ)
    mesh.renderOrder = 5
    rotatingPlanes.push({ mesh, speed })
    group.add(mesh)
  }

  createRing(MAP_TEXTURE_SRC.rotationBorder1, 0.0026, 0.28, 1.08, 0.32)
  createRing(MAP_TEXTURE_SRC.rotationBorder2, -0.004, 0.42, 0.94, 0.34)

  return group.children.length ? group : null
}

function createHaloLayer(
  tryLoadTexture: (url: string) => THREE.Texture | null,
  pulsingHalos: PulsingHalo[],
): THREE.Group | null {
  const bounds = MAP_BOUNDING_BOX
  const centerX = (bounds.maxX + bounds.minX) / 2
  const centerZ = (bounds.maxY + bounds.minY) / 2
  const maxDimension = Math.max(bounds.width, bounds.height)

  const group = new THREE.Group()
  group.name = 'environment-halo-layer'

  const glowTexture = tryLoadTexture(MAP_TEXTURE_SRC.topGlow)
  if (glowTexture) {
    glowTexture.wrapS = glowTexture.wrapT = THREE.ClampToEdgeWrapping
    glowTexture.colorSpace = THREE.SRGBColorSpace

    const geometry = new THREE.PlaneGeometry(maxDimension * 1.6, maxDimension * 1.6)
    const material = new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      color: 0x2FC8FF,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(centerX, 0.26, centerZ)
    mesh.renderOrder = 4
    group.add(mesh)
  }

  const addPulseRing = (src: string, options: {
    sizeMultiplier: number
    height: number
    speed: number
    minScale: number
    maxScale: number
    opacityRange: [number, number]
    initialTime?: number
    tint?: number
  }): void => {
    const texture = tryLoadTexture(src)
    if (!texture)
      return

    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
    texture.generateMipmaps = false
    texture.colorSpace = THREE.SRGBColorSpace

    const geometry = new THREE.PlaneGeometry(maxDimension * options.sizeMultiplier, maxDimension * options.sizeMultiplier)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      color: options.tint ? new THREE.Color(options.tint) : new THREE.Color(0x49D5FF),
      opacity: options.opacityRange[0],
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(centerX, options.height, centerZ)
    mesh.renderOrder = 6
    mesh.scale.set(options.minScale, options.minScale, options.minScale)
    group.add(mesh)

    pulsingHalos.push({
      mesh,
      speed: options.speed,
      min: options.minScale,
      max: options.maxScale,
      opacityRange: options.opacityRange,
      time: options.initialTime ?? 0,
    })
  }

  addPulseRing(MAP_TEXTURE_SRC.haloPrimary, {
    sizeMultiplier: 1.2,
    height: 0.35,
    speed: 0.015,
    minScale: 0.88,
    maxScale: 1.22,
    opacityRange: [0.18, 0.65],
    tint: 0x67EAFF,
  })

  addPulseRing(MAP_TEXTURE_SRC.haloSecondary, {
    sizeMultiplier: 1.48,
    height: 0.37,
    speed: 0.011,
    minScale: 0.65,
    maxScale: 1.35,
    opacityRange: [0.1, 0.45],
    initialTime: Math.PI / 3,
    tint: 0x2FBCFF,
  })

  return group.children.length ? group : null
}

function createBoundaryOutline(
  renderer: THREE.WebGLRenderer | null,
  lineMaterials: LineMaterial[],
): THREE.Group | null {
  if (!renderer)
    return null

  const geoData = zhejiangGeo as FeatureCollection
  const projection = createMapProjection()
  const rendererSize = new THREE.Vector2()
  renderer.getSize(rendererSize)

  const group = new THREE.Group()
  group.name = 'geo-boundary-outline'

  geoData.features?.forEach((feature: Feature) => {
    const coordinates = feature.geometry?.type === 'MultiPolygon'
      ? (feature.geometry.coordinates as Position[][][])
      : [(feature.geometry as any).coordinates as Position[][]]

    coordinates.forEach((multiPolygon) => {
      multiPolygon.forEach((polygon) => {
        if (!polygon.length)
          return

        const positions: number[] = []

        polygon.forEach((point) => {
          const [x, y] = projection(point as [number, number]) || [0, 0]
          positions.push(x, -y, 0)
        })

        const firstPoint = polygon[0] as [number, number]
        const [firstX, firstY] = projection(firstPoint) || [0, 0]
        positions.push(firstX, -firstY, 0)

        const lineGeometry = new LineGeometry()
        lineGeometry.setPositions(positions)

        const material = new LineMaterial({
          color: 0xFF9330,
          linewidth: 0.008,
          transparent: true,
          opacity: 0.95,
        })
        material.resolution.copy(rendererSize)
        lineMaterials.push(material)

        const line = new Line2(lineGeometry, material)
        line.computeLineDistances()
        line.rotateX(-Math.PI / 2)
        line.position.set(0, 0.2, 0)
        line.renderOrder = 2
        group.add(line)
      })
    })
  })

  return group
}
