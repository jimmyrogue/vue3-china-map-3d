import type { Feature, FeatureCollection } from 'geojson'
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import type { CityBoardDatum, CityDistrictDatum } from '../zhejiangCityBoards'
import type { CityRiskDatum } from './map-config'
import type { GeoToSceneTransformerResult } from './map-geometry'
import type { PulsingHalo, RotatingPlane, WaterRipple, WaveMesh } from './types'
import zhejiangGeo from '@/assets/geo/zhejiang.json'
import { geoCentroid } from 'd3-geo'
import gsap from 'gsap'
import { throttle } from 'lodash-es'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { CSS3DRenderer, CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import { getCityNormalTexture, getCityTexture, getDistrictTexture, loadCityGeo } from './city-geo-loader'
import { createEnvironmentLayer } from './environment'
import {
  buildCityDisplayData,
  CONTROL_LIMITS,
  createMapProjection,
  DEFAULT_CITY_DISPLAY_DATA,
  MAP_BOUNDING_BOX,
  MAP_LAYER_CONFIG,
} from './map-config'
import { buildMapGeometry } from './map-geometry'
import { buildCityMarkers } from './markers'

export interface CustomLabelConfig {
  id: string
  position: [number, number]
  regionName?: string
  height?: number
  scale?: number
  renderer: () => HTMLElement
  onClick?: (event: MouseEvent, label: CustomLabelConfig) => void
  onHover?: (isHovering: boolean, label: CustomLabelConfig) => void
}

export interface ZhejiangMapSceneOptions {
  onProgress: (value: number) => void
  onComplete: () => void
  onLevelChange?: (level: 'province' | 'city' | 'district', cityName: string | null, districtName: string | null) => void
  onCityLabelClick?: (payload: { event: MouseEvent, city: CityRiskDatum }) => void
  onDistrictLabelClick?: (payload: {
    event: MouseEvent
    cityName: string
    districtName: string
    districtData: CityDistrictDatum | null
  }) => void
  cityLabelRenderer?: (city: CityRiskDatum, normalized: number) => HTMLElement
  districtLabelRenderer?: (name: string, options: { value?: number, strength?: number }) => HTMLElement | null | false
  customLabels?: CustomLabelConfig[]
}

export interface ZhejiangMapSceneMountOptions {
  cityData?: CityBoardDatum[] | CityRiskDatum[]
}

interface CityMeshMetadata {
  cityName?: string
  originalY: number
  isHovered: boolean
  originalEmissive?: number
  isClickable?: boolean
}

export class ZhejiangMapScene {
  private static readonly DISTRICT_LABEL_BASE_SCALE = 0.028
  private static readonly CITY_LABEL_HOVER_OFFSET = 50
  private static readonly DISTRICT_LABEL_HOVER_OFFSET = 8

  private container: HTMLDivElement | null = null
  private scene: THREE.Scene | null = null
  private rootGroup: THREE.Group | null = null
  private mapGroup: THREE.Group | null = null
  private mapGeometryGroup: THREE.Group | null = null
  private environmentGroup: THREE.Group | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private controls: OrbitControls | null = null
  private labelRenderer: CSS3DRenderer | null = null

  private animationId: number | null = null
  private manualProgress = 0
  private assetProgress = 0
  private lastEmittedProgress = -1
  private hasCompletedLoading = false
  private hasReportedAnimationStart = false

  private readonly raycaster = new THREE.Raycaster()
  private readonly mouse = new THREE.Vector2()
  private cityMeshes: THREE.Mesh[] = []
  private cityMeshesByName: Map<string, THREE.Mesh[]> = new Map()
  private currentHoveredMeshes: THREE.Mesh[] = []
  private currentHoveredKey: string | null = null
  private onMouseMoveHandler: ((event: MouseEvent) => void) | null = null
  // 🚀 性能优化：缓存容器边界矩形，减少 DOM 查询
  private cachedContainerRect: DOMRect | null = null
  private cachedRectTimestamp = 0
  private readonly RECT_CACHE_DURATION = 100 // 缓存有效期 100ms
  // 🚀 性能优化：缓存窗口尺寸，避免重复更新
  private lastWidth = 0
  private lastHeight = 0
  private readonly provinceGeo: FeatureCollection = zhejiangGeo as FeatureCollection
  private readonly cityGeoCache = new Map<string, FeatureCollection>()
  private currentLevel: 'province' | 'city' | 'district' = 'province'
  private currentCityName: string | null = null
  private currentDistrictName: string | null = null
  private isTransitioning = false
  // 🚀 性能优化：CSS3D 标签渲染优化标志
  private labelNeedsUpdate = true
  private readonly defaultCameraPosition = new THREE.Vector3(0, 100, 170)
  private readonly defaultControlsTarget = new THREE.Vector3(0, -35, MAP_LAYER_CONFIG.offsetZ + 10)
  // 🚀 性能优化：相机位置缓存，用于检测相机移动
  private lastCameraPosition = new THREE.Vector3()
  private lastControlsTarget = new THREE.Vector3()

  private readonly loadingManager = new THREE.LoadingManager()
  private readonly textureLoader = new THREE.TextureLoader(this.loadingManager)

  private readonly rotatingPlanes: RotatingPlane[] = []
  private readonly pulsingHalos: PulsingHalo[] = []
  private readonly waterRipples: WaterRipple[] = []
  private waveMeshArr: WaveMesh[] = []
  private lineMaterials: LineMaterial[] = []
  private cityMarkerGroups: THREE.Group[] = []
  // 🚀 性能优化：预验证的标记组数组，避免运行时类型检查
  private cityMarkerGroupsOptimized: Array<{
    group: THREE.Group
    baseY: number
    phase: number
  }> = []

  private districtLabelSprites: CSS3DSprite[] = []
  private cityLabelSpritesByName: Map<string, CSS3DSprite> = new Map()
  private districtLabelSpritesByName: Map<string, CSS3DSprite> = new Map()
  private customLabelSprites: CSS3DSprite[] = []
  private customLabelSpritesById: Map<string, CSS3DSprite> = new Map()
  private loadedTextures: THREE.Texture[] = []
  private cityDisplayData: CityRiskDatum[] = DEFAULT_CITY_DISPLAY_DATA
  private cityDistrictData: Map<string, CityDistrictDatum[]> = new Map()
  private currentCityGeo: FeatureCollection | null = null
  private currentCityTransformer: GeoToSceneTransformerResult | null = null
  // @ts-ignore - 保留用于未来功能
  private _currentDistrictTransformer: GeoToSceneTransformerResult | null = null
  private provinceGeometryGroup: THREE.Group | null = null
  private provinceCityMeshesCache: THREE.Mesh[] = []
  private provinceCityMeshGroupsCache: Map<string, THREE.Mesh[]> = new Map()
  private dynamicGeometryGroup: THREE.Group | null = null
  private currentHoveredLabelName: string | null = null
  // 🎯 点击与拖拽区分：追踪鼠标按下状态
  private mouseDownPosition = { x: 0, y: 0 }
  private mouseDownTime = 0
  private readonly CLICK_DISTANCE_THRESHOLD = 5 // 像素
  private readonly CLICK_TIME_THRESHOLD = 300 // 毫秒

  private readonly haloUniforms = {
    u_time: { value: 0.0 },
  }

  private readonly handleMouseDown = (event: MouseEvent): void => {
    // 记录鼠标按下时的位置和时间
    this.mouseDownPosition = { x: event.clientX, y: event.clientY }
    this.mouseDownTime = Date.now()
  }

  private readonly handleCanvasClick = (event: MouseEvent): void => {
    if (event.button !== 0)
      return

    // 🎯 检测是否为拖拽操作：计算鼠标移动距离
    const dx = event.clientX - this.mouseDownPosition.x
    const dy = event.clientY - this.mouseDownPosition.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const elapsedTime = Date.now() - this.mouseDownTime

    // 如果移动距离超过阈值或按下时间过长，认为是拖拽操作，不触发点击
    if (distance > this.CLICK_DISTANCE_THRESHOLD || elapsedTime > this.CLICK_TIME_THRESHOLD)
      return

    const targetMesh = this.getIntersectedMesh(event)
    if (!targetMesh)
      return

    const userData = targetMesh.userData as CityMeshMetadata
    if (!userData?.cityName || userData.isClickable === false)
      return

    if (this.currentLevel === 'province')
      void this.focusCity(userData.cityName)
    else if (this.currentLevel === 'city' && this.currentCityName)
      void this.focusDistrict(this.currentCityName, userData.cityName)
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape')
      return

    if (event.defaultPrevented)
      return

    if (typeof document !== 'undefined' && document.querySelector('.monitoring-dialog'))
      return

    void this.navigateUpOneLevel()
  }

  constructor(private readonly options: ZhejiangMapSceneOptions) {
    this.setupLoadingManager()
  }

  mount(container: HTMLDivElement, options: ZhejiangMapSceneMountOptions = {}): void {
    if (options.cityData?.length) {
      this.cityDisplayData = buildCityDisplayData(options.cityData)
      this.rebuildCityDistrictData(options.cityData)
    }
    else {
      this.rebuildCityDistrictData()
    }

    this.container = container
    if (this.container)
      this.container.dataset.mapLevel = 'province'
    this.resetLoadingState()

    requestAnimationFrame(() => {
      this.setManualProgress(10)
      this.initThreeScene()

      requestAnimationFrame(() => {
        this.setManualProgress(28)
        this.initMap()

        requestAnimationFrame(() => {
          this.setManualProgress(72)
          this.animateFrame()
        })
      })
    })
  }

  dispose(): void {
    this.cleanup()
  }

  public updateCityData(data?: CityBoardDatum[] | CityRiskDatum[]): void {
    this.cityDisplayData = data ? buildCityDisplayData(data) : DEFAULT_CITY_DISPLAY_DATA
    this.rebuildCityDistrictData(data ?? this.cityDisplayData)

    if (this.currentLevel === 'province')
      this.refreshCityMarkers()
    else if (this.currentLevel === 'city')
      this.refreshDistrictLabelsForCurrentCity()
  }

  private setupLoadingManager(): void {
    this.loadingManager.onStart = () => {
      this.setAssetProgress(5)
    }

    this.loadingManager.onProgress = (_url, itemsLoaded, itemsTotal) => {
      const progress = itemsTotal === 0 ? 0 : Math.floor((itemsLoaded / itemsTotal) * 100)
      this.setAssetProgress(Math.min(95, progress))
    }

    this.loadingManager.onLoad = () => {
      this.completeLoading()
    }

    this.loadingManager.onError = () => {
      this.completeLoading()
    }
  }

  private resetLoadingState(): void {
    this.manualProgress = 0
    this.assetProgress = 0
    this.lastEmittedProgress = -1
    this.hasCompletedLoading = false
    this.hasReportedAnimationStart = false
    this.options.onProgress(0)
    this.currentLevel = 'province'
    this.currentCityName = null
    this.isTransitioning = false
    this.currentCityGeo = null
    this.currentCityTransformer = null
  }

  private updateLoadingProgress(): void {
    if (this.hasCompletedLoading)
      return

    const easedAssetProgress = Math.min(this.assetProgress, this.manualProgress + 25)
    const combined = Math.min(95, Math.max(this.manualProgress, easedAssetProgress))
    if (combined <= this.lastEmittedProgress)
      return

    this.lastEmittedProgress = combined
    this.options.onProgress(combined)
  }

  private setManualProgress(value: number): void {
    if (this.hasCompletedLoading)
      return

    const clamped = Math.max(0, Math.min(95, Math.floor(value)))
    if (clamped <= this.manualProgress)
      return

    this.manualProgress = clamped
    this.updateLoadingProgress()
  }

  private setAssetProgress(value: number): void {
    const clamped = Math.max(0, Math.min(100, Math.floor(value)))
    if (clamped <= this.assetProgress)
      return

    this.assetProgress = clamped
    if (clamped >= 100)
      this.completeLoading()
    else
      this.updateLoadingProgress()
  }

  private completeLoading(): void {
    if (this.hasCompletedLoading)
      return

    this.hasCompletedLoading = true
    this.manualProgress = 100
    this.assetProgress = 100
    this.lastEmittedProgress = 100
    this.options.onProgress(100)
    this.options.onComplete()
  }

  private initThreeScene(): void {
    if (!this.container)
      return

    const width = this.container.clientWidth
    const height = this.container.clientHeight + 100

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0x000A1F, 260, 520)

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1200)
    this.camera.position.copy(this.defaultCameraPosition)
    this.camera.lookAt(
      this.defaultControlsTarget.x,
      this.defaultControlsTarget.y,
      this.defaultControlsTarget.z,
    )

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      logarithmicDepthBuffer: true,
    })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.18
    this.container.appendChild(this.renderer.domElement)

    this.labelRenderer = new CSS3DRenderer()
    this.labelRenderer.setSize(width, height)
    const labelDom = this.labelRenderer.domElement
    labelDom.style.position = 'absolute'
    labelDom.style.top = '0'
    labelDom.style.left = '0'
    labelDom.style.pointerEvents = 'none'
    this.container.appendChild(labelDom)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.04
    this.controls.enablePan = true
    this.controls.minDistance = CONTROL_LIMITS.minDistance
    this.controls.maxDistance = CONTROL_LIMITS.maxDistance
    this.controls.minPolarAngle = CONTROL_LIMITS.minPolarAngle
    this.controls.maxPolarAngle = CONTROL_LIMITS.maxPolarAngle
    this.controls.autoRotate = false
    this.controls.autoRotateSpeed = 0
    this.controls.target.copy(this.defaultControlsTarget)
    this.controls.update()
    this.applyControlLimits()

    this.addLights()

    this.registerGlobalListeners()
    this.setManualProgress(18)
  }

  private addLights(): void {
    if (!this.scene)
      return

    const ambientLight = new THREE.AmbientLight(0x5CCAFF, 1.1)
    this.scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0x164B8F, 0x010615, 0.68)
    hemiLight.position.set(0, 180, 0)
    this.scene.add(hemiLight)

    const directionalLight1 = new THREE.DirectionalLight(0x7AF4FF, 0.9)
    directionalLight1.position.set(-160, 120, -140)
    directionalLight1.castShadow = false
    this.scene.add(directionalLight1)

    const directionalLight2 = new THREE.DirectionalLight(0x4DD8FF, 0.75)
    directionalLight2.position.set(180, 140, 160)
    directionalLight2.castShadow = false
    this.scene.add(directionalLight2)

    const rimLight = new THREE.DirectionalLight(0x1EA0FF, 0.6)
    rimLight.position.set(0, 260, 0)
    this.scene.add(rimLight)
  }

  private initMap(): void {
    if (!this.scene)
      return

    this.rootGroup = new THREE.Group()
    this.rootGroup.name = 'zhejiang-root'

    this.environmentGroup = createEnvironmentLayer({
      renderer: this.renderer,
      tryLoadTexture: this.tryLoadTexture,
      rotatingPlanes: this.rotatingPlanes,
      pulsingHalos: this.pulsingHalos,
      lineMaterials: this.lineMaterials,
      registerWaterRipple: ripple => this.waterRipples.push(ripple),
    })

    if (this.environmentGroup)
      this.rootGroup.add(this.environmentGroup)

    this.mapGroup = new THREE.Group()
    this.mapGroup.name = 'zhejiang-map-group'
    this.mapGroup.position.set(0, MAP_LAYER_CONFIG.floatHeight, MAP_LAYER_CONFIG.offsetZ)

    this.mapGeometryGroup = new THREE.Group()
    this.mapGeometryGroup.name = 'zhejiang-map-geometry'
    this.mapGroup.add(this.mapGeometryGroup)

    this.buildProvinceGeometry({ animateCamera: false })

    this.rootGroup.add(this.mapGroup)
    this.scene.add(this.rootGroup)

    this.buildCustomLabels(this.options.customLabels)
  }

  private readonly tryLoadTexture = (url: string): THREE.Texture | null => {
    if (!url)
      return null
    const texture = this.textureLoader.load(url)
    this.loadedTextures.push(texture)
    return texture
  }

  private readonly handleMouseMoveInternal = (event: MouseEvent): void => {
    const intersectedMesh = this.getIntersectedMesh(event)
    if (intersectedMesh) {
      this.handleMeshHover(intersectedMesh)
      return
    }

    this.handleMeshLeave()
  }

  private getIntersectedMesh(event: MouseEvent): THREE.Mesh | null {
    if (!this.camera || !this.container)
      return null

    // 🚀 性能优化：如果没有可交互的网格，直接返回
    if (!this.cityMeshes.length)
      return null

    // 🚀 性能优化：使用缓存的边界矩形，减少 DOM 查询
    const now = performance.now()
    let rect = this.cachedContainerRect
    if (!rect || (now - this.cachedRectTimestamp) > this.RECT_CACHE_DURATION) {
      rect = this.container.getBoundingClientRect()
      this.cachedContainerRect = rect
      this.cachedRectTimestamp = now
    }

    if (rect.width === 0 || rect.height === 0)
      return null

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    // 🚀 性能优化：使用更严格的检测参数
    const intersects = this.raycaster.intersectObjects(this.cityMeshes, false)
    if (!intersects.length)
      return null

    // 🚀 性能优化：只需要第一个交互对象
    return intersects[0].object as THREE.Mesh
  }

  private buildProvinceGeometry(options: { animateCamera?: boolean } = {}): void {
    if (!this.mapGroup || !this.mapGeometryGroup)
      return

    this.clearDynamicGeometry()
    this.clearCityMarkers()
    this.clearDistrictLabels()

    if (!this.provinceGeometryGroup) {
      this.provinceGeometryGroup = new THREE.Group()
      this.provinceGeometryGroup.name = 'zhejiang-province-geometry'
      this.mapGeometryGroup.add(this.provinceGeometryGroup)

      this.provinceCityMeshesCache.length = 0
      this.provinceCityMeshGroupsCache.clear()

      buildMapGeometry({
        mapGroup: this.provinceGeometryGroup,
        cityMeshes: this.provinceCityMeshesCache,
        cityMeshGroups: this.provinceCityMeshGroupsCache,
        tryLoadTexture: this.tryLoadTexture,
        geoJson: this.provinceGeo,
        mode: 'absolute',
      })
    }
    else {
      this.provinceGeometryGroup.visible = true
    }

    this.showProvinceGeometry()

    this.currentLevel = 'province'
    this.currentCityName = null
    this.currentDistrictName = null
    this.currentCityGeo = null
    this.currentCityTransformer = null
    this._currentDistrictTransformer = null
    this.refreshCityMarkers()
    this.reportLevelChange('province', null, null)
    this.updateCustomLabelsVisibility()

    if (options.animateCamera)
      this.animateToProvinceView()
  }

  private refreshCityMarkers(): void {
    if (!this.mapGroup || this.currentLevel !== 'province')
      return

    this.clearCityMarkers()

    buildCityMarkers({
      mapGroup: this.mapGroup,
      waveMeshArr: this.waveMeshArr,
      cityMarkerGroups: this.cityMarkerGroups,
      cityMarkerGroupsOptimized: this.cityMarkerGroupsOptimized,
      cityData: this.cityDisplayData,
      onCityLabelClick: payload => this.options.onCityLabelClick?.(payload),
      onLabelCreated: ({ city, label }) => {
        this.cityLabelSpritesByName.set(city.name, label)
      },
      cityLabelRenderer: this.options.cityLabelRenderer,
    })

    // 🚀 性能优化：标签创建后需要渲染
    this.labelNeedsUpdate = true
  }

  private rebuildCityDistrictData(source?: CityBoardDatum[] | CityRiskDatum[]): void {
    this.cityDistrictData.clear()

    const base = source ?? this.cityDisplayData
    if (!Array.isArray(base))
      return

    base.forEach((city) => {
      if (!city?.districts?.length)
        return

      const cloned = city.districts.map(district => ({ ...district }))
      this.cityDistrictData.set(city.name, cloned)
    })
  }

  private refreshDistrictLabelsForCurrentCity(): void {
    if (this.currentLevel !== 'city')
      return

    if (!this.mapGroup || !this.currentCityName || !this.currentCityGeo || !this.currentCityTransformer)
      return

    this.buildDistrictLabels(this.currentCityGeo, this.currentCityTransformer, this.currentCityName)
  }

  private clearMapGeometry(): void {
    this.clearDynamicGeometry()
    this.disposeProvinceGeometry()
    this.setActiveGeometryState([], new Map())
  }

  private clearCityMarkers(): void {
    if (!this.mapGroup) {
      this.cityMarkerGroups = []
      this.cityMarkerGroupsOptimized = []
      this.waveMeshArr = []
      this.cityLabelSpritesByName.clear()
      return
    }

    if (this.cityMarkerGroups.length) {
      this.cityMarkerGroups.forEach((group) => {
        this.mapGroup?.remove(group)
        this.disposeObject(group)
      })
    }

    this.cityMarkerGroups = []
    this.cityMarkerGroupsOptimized = []
    this.waveMeshArr = []
    this.cityLabelSpritesByName.clear()
  }

  private clearDistrictLabels(): void {
    if (this.districtLabelSprites.length) {
      this.districtLabelSprites.forEach((sprite) => {
        const handler = (sprite.userData as { __clickHandler?: (event: MouseEvent) => void } | undefined)?.__clickHandler
        if (handler) {
          const element = sprite.element as HTMLElement | undefined
          element?.removeEventListener('click', handler)
        }
        this.mapGroup?.remove(sprite)
        this.disposeObject(sprite)
      })
    }

    this.districtLabelSprites = []
    this.districtLabelSpritesByName.clear()
  }

  private buildCustomLabels(labels?: CustomLabelConfig[]): void {
    if (!labels || !labels.length) {
      console.log('[CustomLabels] No custom labels to build')
      return
    }

    console.log(`[CustomLabels] Building ${labels.length} custom labels`)
    this.clearCustomLabels()

    const projection = createMapProjection()

    labels.forEach((config) => {
      console.log(`[CustomLabels] Creating label: ${config.id} at position [${config.position[0]}, ${config.position[1]}]`)

      const [x, y] = projection(config.position) || [0, 0]
      const element = config.renderer()

      if (!element) {
        console.error(`[CustomLabels] ERROR: Renderer returned null/undefined for label: ${config.id}`)
        throw new Error(`customLabel renderer must return a valid HTMLElement, got ${element}`)
      }

      console.log(`[CustomLabels] Element created for ${config.id}:`, element, 'tagName:', element.tagName)
      element.style.pointerEvents = 'auto'

      const sprite = new CSS3DSprite(element)
      const defaultHeight = MAP_LAYER_CONFIG.extrusionDepth + 1.2
      sprite.position.set(x, config.height ?? defaultHeight, y)
      sprite.scale.setScalar(config.scale ?? 0.24)

      // 先设置 userData，确保动画能正确使用
      sprite.userData.__labelId = config.id
      sprite.userData.__baseY = sprite.position.y
      sprite.userData.__regionName = config.regionName

      if (config.onClick) {
        const handler = (e: MouseEvent) => {
          e.stopPropagation()
          console.log(`[CustomLabels] Label clicked: ${config.id}`)
          config.onClick!(e, config)
        }
        element.addEventListener('click', handler)
        sprite.userData.__clickHandler = handler
      }

      // 添加默认的悬停动画
      const hoverHandler = () => {
        console.log(`[CustomLabels] Label hover: ${config.id}`)
        this.animateCustomLabelHover(sprite, true)
        config.onHover?.(true, config)
      }
      const leaveHandler = () => {
        console.log(`[CustomLabels] Label leave: ${config.id}`)
        this.animateCustomLabelHover(sprite, false)
        config.onHover?.(false, config)
      }
      element.addEventListener('mouseenter', hoverHandler)
      element.addEventListener('mouseleave', leaveHandler)
      sprite.userData.__hoverHandler = hoverHandler
      sprite.userData.__leaveHandler = leaveHandler
      this.mapGroup?.add(sprite)
      this.customLabelSprites.push(sprite)
      this.customLabelSpritesById.set(config.id, sprite)

      console.log(`[CustomLabels] Label created successfully: ${config.id}`)
    })

    this.labelNeedsUpdate = true
    this.updateCustomLabelsVisibility()
    console.log(`[CustomLabels] All ${labels.length} labels built successfully`)
  }

  private clearCustomLabels(): void {
    if (this.customLabelSprites.length) {
      console.log(`[CustomLabels] Clearing ${this.customLabelSprites.length} custom labels`)

      this.customLabelSprites.forEach((sprite) => {
        const handler = sprite.userData.__clickHandler
        const hoverHandler = sprite.userData.__hoverHandler
        const leaveHandler = sprite.userData.__leaveHandler
        const element = sprite.element as HTMLElement | undefined

        if (handler && element) {
          element.removeEventListener('click', handler)
        }
        if (hoverHandler && element) {
          element.removeEventListener('mouseenter', hoverHandler)
        }
        if (leaveHandler && element) {
          element.removeEventListener('mouseleave', leaveHandler)
        }

        this.mapGroup?.remove(sprite)
        this.disposeObject(sprite)
      })
    }

    this.customLabelSprites = []
    this.customLabelSpritesById.clear()
    console.log('[CustomLabels] All custom labels cleared')
  }

  public updateCustomLabels(labels?: CustomLabelConfig[]): void {
    console.log('[CustomLabels] Updating custom labels')
    this.buildCustomLabels(labels)
  }

  private setActiveGeometryState(meshes: THREE.Mesh[], meshGroups: Map<string, THREE.Mesh[]>): void {
    this.cityMeshes = meshes
    this.cityMeshesByName = meshGroups

    if (!meshes.length) {
      if (this.renderer?.domElement)
        this.renderer.domElement.style.cursor = 'default'
      this.currentHoveredMeshes = []
      this.currentHoveredKey = null
      this.currentHoveredLabelName = null
    }
  }

  private hideProvinceGeometry(): void {
    if (this.provinceGeometryGroup)
      this.provinceGeometryGroup.visible = false
  }

  private showProvinceGeometry(): void {
    if (!this.provinceGeometryGroup)
      return

    this.handleMeshLeave()
    this.provinceGeometryGroup.visible = true
    this.setActiveGeometryState(this.provinceCityMeshesCache, this.provinceCityMeshGroupsCache)
  }

  private clearDynamicGeometry(): void {
    if (!this.dynamicGeometryGroup)
      return

    this.handleMeshLeave()

    const group = this.dynamicGeometryGroup
    this.dynamicGeometryGroup = null
    this.mapGeometryGroup?.remove(group)
    this.disposeObject(group)
    this.setActiveGeometryState([], new Map())
  }

  private disposeProvinceGeometry(): void {
    if (!this.provinceGeometryGroup)
      return

    this.handleMeshLeave()

    const group = this.provinceGeometryGroup
    this.provinceGeometryGroup = null
    this.mapGeometryGroup?.remove(group)
    this.disposeObject(group)

    this.provinceCityMeshesCache = []
    this.provinceCityMeshGroupsCache = new Map()
  }

  private disposeObject(object: THREE.Object3D): void {
    object.children.slice().forEach(child => this.disposeObject(child))

    if (object instanceof THREE.Mesh) {
      object.geometry?.dispose()
      if (Array.isArray(object.material))
        object.material.forEach(material => material.dispose())
      else
        object.material?.dispose()
    }
    else if (object instanceof Line2) {
      object.geometry.dispose()
      const material = object.material as THREE.Material
      material.dispose()
    }
    else if (object instanceof THREE.Line) {
      object.geometry.dispose()
      const material = object.material as THREE.Material | THREE.Material[]
      if (Array.isArray(material))
        material.forEach(mat => mat.dispose())
      else
        material.dispose()
    }
    else if (object instanceof THREE.Points) {
      object.geometry.dispose()
      const material = object.material as THREE.Material
      material.dispose()
    }
    else if (object instanceof THREE.Sprite) {
      const material = object.material as THREE.Material & { map?: THREE.Texture }
      material.map?.dispose()
      material.dispose()
    }
    else if (object instanceof CSS3DSprite) {
      const element = object.element as HTMLElement
      const { __clickHandler } = object.userData as {
        __clickHandler?: (event: MouseEvent) => void
      }
      if (__clickHandler)
        element.removeEventListener('click', __clickHandler)
      if (element.parentNode)
        element.parentNode.removeChild(element)
    }
  }

  public async focusCity(cityName: string): Promise<void> {
    if (!cityName || !this.mapGeometryGroup || this.isTransitioning)
      return

    this.isTransitioning = true
    try {
      const geo = await this.getCityGeo(cityName)
      if (!geo)
        return
      const textureUrl = getCityTexture(cityName)
      const normalTextureUrl = getCityNormalTexture(cityName)

      this.handleMeshLeave()
      this.hideProvinceGeometry()
      this.clearDynamicGeometry()
      this.clearCityMarkers()
      this.clearDistrictLabels()

      const cityGroup = new THREE.Group()
      cityGroup.name = `zhejiang-city-geometry-${cityName}`
      this.mapGeometryGroup.add(cityGroup)
      this.dynamicGeometryGroup = cityGroup

      const cityMeshes: THREE.Mesh[] = []
      const cityMeshGroups = new Map<string, THREE.Mesh[]>()

      const geometryTransform = buildMapGeometry({
        mapGroup: cityGroup,
        cityMeshes,
        cityMeshGroups,
        tryLoadTexture: this.tryLoadTexture,
        geoJson: geo,
        mode: 'centered',
        targetSize: {
          width: MAP_BOUNDING_BOX.width * 0.82,
          height: MAP_BOUNDING_BOX.height * 0.82,
        },
        textureUrl,
        normalTextureUrl,
      })

      this.setActiveGeometryState(cityMeshes, cityMeshGroups)

      this.currentCityGeo = geo
      this.currentCityTransformer = geometryTransform ?? null
      this._currentDistrictTransformer = null

      if (this.cityMeshes.length) {
        this.cityMeshes.forEach((mesh) => {
          const metadata = mesh.userData as CityMeshMetadata
          metadata.isClickable = true
        })
      }

      if (geometryTransform)
        this.buildDistrictLabels(geo, geometryTransform, cityName)
      else
        this.clearDistrictLabels()

      this.currentLevel = 'city'
      this.currentCityName = cityName
      this.currentDistrictName = null
      this.reportLevelChange('city', cityName, null)
      this.updateCustomLabelsVisibility()
      this.animateToCityView()
    }
    finally {
      this.isTransitioning = false
    }
  }

  public async focusDistrict(cityName: string, districtName: string): Promise<void> {
    if (!cityName || !districtName || !this.mapGeometryGroup)
      return

    if (this.currentLevel === 'district' && this.currentCityName === cityName && this.currentDistrictName === districtName)
      return

    if (this.isTransitioning)
      return

    if (this.currentLevel === 'province' || this.currentCityName !== cityName) {
      await this.focusCity(cityName)
    }

    if (!this.currentCityGeo)
      return

    const features = this.currentCityGeo.features ?? []
    const targetFeature = features.find((feature) => {
      const properties = feature.properties as { name?: string } | undefined
      return properties?.name === districtName
    })

    if (!targetFeature)
      return

    this.isTransitioning = true
    try {
      this.handleMeshLeave()
      this.hideProvinceGeometry()
      this.clearDynamicGeometry()
      this.clearDistrictLabels()

      const districtGroup = new THREE.Group()
      districtGroup.name = `zhejiang-district-geometry-${cityName}-${districtName}`
      this.mapGeometryGroup.add(districtGroup)
      this.dynamicGeometryGroup = districtGroup

      const districtMeshes: THREE.Mesh[] = []
      const districtMeshGroups = new Map<string, THREE.Mesh[]>()

      const clonedFeature = JSON.parse(JSON.stringify(targetFeature)) as Feature
      const districtGeo: FeatureCollection = {
        type: 'FeatureCollection',
        features: [clonedFeature],
      }
      const districtTextureUrl = getDistrictTexture(districtName)

      const geometryTransform = buildMapGeometry({
        mapGroup: districtGroup,
        cityMeshes: districtMeshes,
        cityMeshGroups: districtMeshGroups,
        tryLoadTexture: this.tryLoadTexture,
        geoJson: districtGeo,
        mode: 'centered',
        targetSize: {
          width: MAP_BOUNDING_BOX.width * 0.86,
          height: MAP_BOUNDING_BOX.height * 0.86,
        },
        textureUrl: districtTextureUrl,
      })

      this.setActiveGeometryState(districtMeshes, districtMeshGroups)

      this._currentDistrictTransformer = geometryTransform ?? null

      if (geometryTransform)
        this.buildFocusedDistrictLabel(districtGeo, geometryTransform, cityName, districtName)
      else
        this.clearDistrictLabels()

      if (this.cityMeshes.length) {
        this.cityMeshes.forEach((mesh) => {
          const metadata = mesh.userData as CityMeshMetadata
          metadata.isClickable = false
        })
      }

      this.currentLevel = 'district'
      this.currentCityName = cityName
      this.currentDistrictName = districtName
      this.reportLevelChange('district', cityName, districtName)
      this.updateCustomLabelsVisibility()
      this.animateToDistrictView(geometryTransform)
    }
    finally {
      this.isTransitioning = false
    }
  }

  private buildDistrictLabels(
    geo: FeatureCollection,
    transformer: GeoToSceneTransformerResult,
    cityName: string,
  ): void {
    console.log(`[DistrictLabels] Building district labels for city: ${cityName}`)
    console.log(`[DistrictLabels] districtLabelRenderer: ${this.options.districtLabelRenderer ? 'CUSTOM' : 'DEFAULT'}`)

    if (!this.mapGroup) {
      console.log('[DistrictLabels] No mapGroup, skipping')
      return
    }

    this.clearDistrictLabels()

    const features = geo.features ?? []
    if (!features.length) {
      console.log('[DistrictLabels] No features, skipping')
      return
    }

    console.log(`[DistrictLabels] Feature count: ${features.length}`)

    const labelHeight = MAP_LAYER_CONFIG.extrusionDepth + 3.4
    const scaleFactor = THREE.MathUtils.clamp(transformer.normalizedScale, 0.76, 1.6)
    const districtData = this.cityDistrictData.get(cityName) ?? []
    const districtStats = this.computeDistrictStats(districtData)

    features.forEach((feature: Feature) => {
      const properties = feature.properties as {
        name?: string
        adcode?: number
        centroid?: [number, number]
        center?: [number, number]
      } | undefined

      const districtName = properties?.name
      if (!districtName)
        return

      const lonLat = this.resolveFeatureLonLat(feature)
      if (!lonLat)
        return

      const [x, mappedY] = transformer.project(lonLat)
      const districtInfo = districtStats.get(districtName)
      const districtDatum = districtData.find(item => item.name === districtName) ?? null
      const sprite = this.createDistrictLabelSprite(districtName, {
        value: districtInfo?.value ?? districtDatum?.value,
        strength: districtInfo?.normalized,
      })

      if (!sprite)
        return

      sprite.position.set(x, labelHeight, -mappedY)
      sprite.scale.setScalar(ZhejiangMapScene.DISTRICT_LABEL_BASE_SCALE * scaleFactor)
      this.bindDistrictLabelInteraction(sprite, cityName, districtName, districtDatum)
      sprite.userData = {
        ...sprite.userData,
        __baseY: sprite.position.y,
        __labelName: districtName,
      }

      if (this.mapGroup) {
        this.mapGroup.add(sprite)
      }
      this.districtLabelSprites.push(sprite)
      this.districtLabelSpritesByName.set(districtName, sprite)
    })

    // 🚀 性能优化：标签创建后需要渲染
    this.labelNeedsUpdate = true
  }

  private createDistrictLabelSprite(
    name: string,
    options: { value?: number, strength?: number } = {},
  ): CSS3DSprite | null {
    let marker: HTMLElement

    if (this.options.districtLabelRenderer) {
      console.log(`[DistrictLabel] Using custom renderer for district: ${name}`)
      const result = this.options.districtLabelRenderer(name, options)
      console.log('[DistrictLabel] Custom renderer executed successfully')

      if (result === null || result === false) {
        console.log(`[DistrictLabel] Custom renderer returned ${result}, hiding label for district: ${name}`)
        return null
      }

      if (!result) {
        console.error(`[DistrictLabel] ERROR: Custom renderer returned invalid value for district: ${name}`)
        throw new Error(`districtLabelRenderer must return HTMLElement, null, or false, got ${result}`)
      }

      marker = result
      console.log('[DistrictLabel] Marker element:', marker, 'tagName:', marker.tagName)
    }
    else {
      console.log(`[DistrictLabel] Using default renderer for district: ${name}`)
      marker = document.createElement('div')
      marker.className = 'zj-city-marker zj-city-marker--district'
      marker.dataset.district = name
      marker.style.pointerEvents = 'auto'
      marker.style.cursor = 'pointer'

      const normalized = typeof options.strength === 'number'
        ? THREE.MathUtils.clamp(options.strength, 0, 1)
        : 0.65
      marker.style.setProperty('--marker-strength', (0.6 + normalized * 0.4).toFixed(2))

      const valueRaw = typeof options.value === 'number'
        ? options.value.toFixed(0)
        : '--'
      const valueText = valueRaw === '--' ? '' : valueRaw

      marker.innerHTML = `
        <div class="zj-city-marker__panel">
          <div class="zj-city-marker__name">
            <span class="zj-city-marker__name-zh">${name}${valueText}</span>
          </div>
        </div>
      `
    }

    return new CSS3DSprite(marker)
  }

  private buildFocusedDistrictLabel(
    geo: FeatureCollection,
    transformer: GeoToSceneTransformerResult,
    cityName: string,
    districtName: string,
  ): void {
    if (!this.mapGroup)
      return

    this.clearDistrictLabels()

    const feature = geo.features?.[0]
    if (!feature)
      return

    const lonLat = this.resolveFeatureLonLat(feature as Feature)
    if (!lonLat)
      return

    const labelHeight = MAP_LAYER_CONFIG.extrusionDepth + 3.4
    const scaleFactor = THREE.MathUtils.clamp(transformer.normalizedScale, 0.76, 1.6)
    const districtData = this.cityDistrictData.get(cityName) ?? []
    const districtStats = this.computeDistrictStats(districtData)
    const districtInfo = districtStats.get(districtName)
    const districtDatum = districtData.find(item => item.name === districtName) ?? null

    const [x, mappedY] = transformer.project(lonLat)
    const sprite = this.createDistrictLabelSprite(districtName, {
      value: districtInfo?.value ?? districtDatum?.value,
      strength: districtInfo?.normalized,
    })

    if (!sprite)
      return

    sprite.position.set(x, labelHeight, -mappedY)
    sprite.scale.setScalar(ZhejiangMapScene.DISTRICT_LABEL_BASE_SCALE * scaleFactor)

    this.bindDistrictLabelInteraction(sprite, cityName, districtName, districtDatum)
    sprite.userData = {
      ...sprite.userData,
      __baseY: sprite.position.y,
      __labelName: districtName,
    }

    this.mapGroup.add(sprite)
    this.districtLabelSprites.push(sprite)
    this.districtLabelSpritesByName.set(districtName, sprite)

    // 🚀 性能优化：标签创建后需要渲染
    this.labelNeedsUpdate = true
  }

  private bindDistrictLabelInteraction(
    sprite: CSS3DSprite,
    cityName: string,
    districtName: string,
    districtDatum: CityDistrictDatum | null,
  ): void {
    const labelElement = sprite.element as HTMLElement
    labelElement.style.pointerEvents = 'auto'
    labelElement.style.cursor = 'pointer'

    const clickHandler = (event: MouseEvent): void => {
      event.stopPropagation()
      // console.info('[ZhejiangMapScene] district label clicked', {
      //   cityName,
      //   districtName,
      //   value: districtDatum?.value,
      // })
      this.options.onDistrictLabelClick?.({
        event,
        cityName,
        districtName,
        districtData: districtDatum,
      })
    }

    labelElement.addEventListener('click', clickHandler)
    sprite.userData = {
      ...sprite.userData,
      districtName,
      __clickHandler: clickHandler,
    }
  }

  private computeDistrictStats(
    districtData: CityDistrictDatum[],
  ): Map<string, { value: number, normalized: number }> {
    const districtStats = new Map<string, { value: number, normalized: number }>()

    if (!districtData.length)
      return districtStats

    const values = districtData
      .map(item => item.value)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

    if (!values.length)
      return districtStats

    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const range = Math.max(maxValue - minValue, 1)

    districtData.forEach((item) => {
      if (typeof item.value !== 'number' || !Number.isFinite(item.value))
        return

      const normalized = maxValue === minValue
        ? 0.8
        : THREE.MathUtils.clamp((item.value - minValue) / range, 0, 1)

      districtStats.set(item.name, {
        value: item.value,
        normalized,
      })
    })

    return districtStats
  }

  private resolveFeatureLonLat(feature: Feature): [number, number] | null {
    const properties = feature.properties as {
      centroid?: [number, number]
      center?: [number, number]
    } | undefined

    const centroidProp = properties?.centroid
    const centerProp = properties?.center

    if (Array.isArray(centroidProp) && centroidProp.length >= 2)
      return [Number(centroidProp[0]), Number(centroidProp[1])]

    if (Array.isArray(centerProp) && centerProp.length >= 2)
      return [Number(centerProp[0]), Number(centerProp[1])]

    const centroid = geoCentroid(feature as Feature)
    if (Array.isArray(centroid) && centroid.length >= 2)
      return [Number(centroid[0]), Number(centroid[1])]

    return null
  }

  public async focusProvince(): Promise<void> {
    if (this.currentLevel === 'province' || this.isTransitioning)
      return

    this.isTransitioning = true
    try {
      this.buildProvinceGeometry({ animateCamera: true })
    }
    finally {
      this.isTransitioning = false
    }
  }

  private async navigateUpOneLevel(): Promise<void> {
    if (this.isTransitioning)
      return

    try {
      if (this.currentLevel === 'district' && this.currentCityName)
        await this.focusCity(this.currentCityName)
      else if (this.currentLevel === 'city')
        await this.focusProvince()
    }
    catch {
      // ignored: focus methods already guard against invalid transitions
    }
  }

  private async getCityGeo(cityName: string): Promise<FeatureCollection | null> {
    if (this.cityGeoCache.has(cityName))
      return this.cityGeoCache.get(cityName) ?? null

    const geo = await loadCityGeo(cityName)
    if (geo)
      this.cityGeoCache.set(cityName, geo)
    return geo
  }

  private applyControlLimits(limits?: Partial<typeof CONTROL_LIMITS>): void {
    if (!this.controls)
      return

    const minDistance = limits?.minDistance ?? CONTROL_LIMITS.minDistance
    const maxDistance = limits?.maxDistance ?? CONTROL_LIMITS.maxDistance
    const minPolar = limits?.minPolarAngle ?? CONTROL_LIMITS.minPolarAngle
    const maxPolar = limits?.maxPolarAngle ?? CONTROL_LIMITS.maxPolarAngle

    this.controls.minDistance = minDistance
    this.controls.maxDistance = maxDistance
    this.controls.minPolarAngle = minPolar
    this.controls.maxPolarAngle = maxPolar
    this.controls.update()
  }

  private transitionCamera(position: THREE.Vector3, target: THREE.Vector3): void {
    if (!this.camera || !this.controls)
      return

    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.controls.target)

    gsap.to(this.camera.position, {
      x: position.x,
      y: position.y,
      z: position.z,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.controls?.update()
      },
      onComplete: () => {
        this.camera?.position.copy(position)
        this.controls?.update()
      },
    })

    gsap.to(this.controls.target, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.controls?.update()
      },
      onComplete: () => {
        this.controls?.target.copy(target)
        this.controls?.update()
      },
    })
  }

  private animateToProvinceView(): void {
    this.applyControlLimits()
    this.transitionCamera(this.defaultCameraPosition.clone(), this.defaultControlsTarget.clone())
  }

  private animateToCityView(): void {
    const cityCameraPosition = new THREE.Vector3(0, 98, 116)
    const cityTarget = new THREE.Vector3(0, -28, MAP_LAYER_CONFIG.offsetZ + 4)

    this.applyControlLimits({
      minDistance: 32,
      maxDistance: 150,
      minPolarAngle: Math.PI / 5,
      maxPolarAngle: Math.PI / 1.8,
    })

    this.transitionCamera(cityCameraPosition, cityTarget)
  }

  private animateToDistrictView(transform?: GeoToSceneTransformerResult | null): void {
    const districtCameraPosition = new THREE.Vector3(0, 158, 320)
    const districtTarget = new THREE.Vector3(0, -26, MAP_LAYER_CONFIG.offsetZ + 6)

    if (transform) {
      const scale = THREE.MathUtils.clamp(transform.normalizedScale, 0.65, 2.8)
      districtCameraPosition.multiplyScalar(1 / scale)
      districtCameraPosition.y = THREE.MathUtils.clamp(districtCameraPosition.y, 96, 176)
      districtCameraPosition.z = THREE.MathUtils.clamp(districtCameraPosition.z, 152, 320)
    }

    this.applyControlLimits({
      minDistance: 42,
      maxDistance: 320,
      minPolarAngle: Math.PI / 6,
      maxPolarAngle: Math.PI / 1.82,
    })

    if (!this.camera || !this.controls)
      return

    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.controls.target)

    this.camera.position.copy(districtCameraPosition)
    this.controls.target.copy(districtTarget)
    this.controls.update()
  }

  private reportLevelChange(level: 'province' | 'city' | 'district', cityName: string | null, districtName: string | null): void {
    if (this.container)
      this.container.dataset.mapLevel = level
    if (this.labelRenderer?.domElement)
      this.labelRenderer.domElement.dataset.mapLevel = level
    this.options.onLevelChange?.(level, cityName, districtName)
  }

  private handleMeshHover(mesh: THREE.Mesh): void {
    const userData = mesh.userData as CityMeshMetadata
    const groupKey = userData.cityName ?? `__mesh_${mesh.id}`
    const hoveredRegionName = userData.cityName ?? null

    const isInteractiveLevel = this.currentLevel === 'province' || this.currentLevel === 'city'
    if (!isInteractiveLevel || userData.isClickable === false) {
      this.handleMeshLeave()
      return
    }

    if (this.currentHoveredKey === groupKey && this.currentHoveredMeshes.length)
      return

    if (this.currentHoveredMeshes.length)
      this.handleMeshLeave()

    const relatedMeshes = userData.cityName
      ? this.cityMeshesByName.get(userData.cityName) ?? [mesh]
      : [mesh]

    this.currentHoveredKey = groupKey
    this.currentHoveredMeshes = relatedMeshes

    if (this.renderer?.domElement) {
      const isInteractiveLevel = this.currentLevel === 'province' || this.currentLevel === 'city'
      const shouldShowPointer = isInteractiveLevel && (userData.isClickable === true || userData.isClickable === undefined)
      this.renderer.domElement.style.cursor = shouldShowPointer ? 'pointer' : 'default'
    }

    relatedMeshes.forEach((targetMesh) => {
      const metadata = targetMesh.userData as CityMeshMetadata
      metadata.isHovered = true

      // 🚀 性能优化：避免动画冲突，先停止之前的动画
      gsap.killTweensOf(targetMesh.position)
      gsap.to(targetMesh.position, {
        y: metadata.originalY + 8,
        duration: 0.5,
        ease: 'power2.out',
      })
    })

    this.currentHoveredLabelName = hoveredRegionName
    this.animateRegionLabelHover(hoveredRegionName, true)
    this.animateMatchingCustomLabels(hoveredRegionName, true)
  }

  private handleMeshLeave(): void {
    if (!this.currentHoveredMeshes.length && !this.currentHoveredLabelName)
      return

    if (this.renderer?.domElement)
      this.renderer.domElement.style.cursor = 'default'

    this.currentHoveredMeshes.forEach((mesh) => {
      const userData = mesh.userData as CityMeshMetadata
      userData.isHovered = false

      // 🚀 性能优化：避免动画冲突，先停止之前的动画
      gsap.killTweensOf(mesh.position)
      gsap.to(mesh.position, {
        y: userData.originalY,
        duration: 0.5,
        ease: 'power2.inOut',
      })
    })

    if (this.currentHoveredLabelName)
      this.animateRegionLabelHover(this.currentHoveredLabelName, false)

    this.animateMatchingCustomLabels(this.currentHoveredLabelName, false)

    this.currentHoveredMeshes = []
    this.currentHoveredKey = null
    this.currentHoveredLabelName = null
  }

  private animateRegionLabelHover(name: string | null, isHovering: boolean): void {
    if (!name)
      return

    let sprite: CSS3DSprite | undefined
    if (this.currentLevel === 'province')
      sprite = this.cityLabelSpritesByName.get(name)
    else if (this.currentLevel === 'city')
      sprite = this.districtLabelSpritesByName.get(name)

    if (!sprite)
      return

    const userData = sprite.userData as { __baseY?: number } | undefined
    const baseY = typeof userData?.__baseY === 'number' ? userData.__baseY : sprite.position.y

    if (typeof userData?.__baseY !== 'number')
      sprite.userData = Object.assign(userData ?? {}, { __baseY: baseY })

    const offset = this.currentLevel === 'province'
      ? ZhejiangMapScene.CITY_LABEL_HOVER_OFFSET
      : ZhejiangMapScene.DISTRICT_LABEL_HOVER_OFFSET
    const targetY = isHovering ? baseY + offset : baseY

    gsap.killTweensOf(sprite.position)
    gsap.to(sprite.position, {
      y: targetY,
      duration: 0.45,
      ease: isHovering ? 'power2.out' : 'power2.inOut',
      onUpdate: () => {
        // 🚀 性能优化：标签位置变化时标记需要渲染
        this.labelNeedsUpdate = true
      },
    })
  }

  private animateCustomLabelHover(sprite: CSS3DSprite, isHovering: boolean): void {
    const userData = sprite.userData as { __baseY?: number } | undefined
    const baseY = typeof userData?.__baseY === 'number' ? userData.__baseY : sprite.position.y

    const offset = 8
    const targetY = isHovering ? baseY + offset : baseY

    gsap.killTweensOf(sprite.position)
    gsap.to(sprite.position, {
      y: targetY,
      duration: 0.45,
      ease: isHovering ? 'power2.out' : 'power2.inOut',
      onUpdate: () => {
        this.labelNeedsUpdate = true
      },
    })
  }

  private animateMatchingCustomLabels(regionName: string | null, isHovering: boolean): void {
    if (!regionName)
      return

    this.customLabelSprites.forEach((sprite) => {
      const userData = sprite.userData as { __regionName?: string }
      if (userData.__regionName === regionName)
        this.animateCustomLabelHover(sprite, isHovering)
    })
  }

  private updateCustomLabelsVisibility(): void {
    this.customLabelSprites.forEach((sprite) => {
      const userData = sprite.userData as { __regionName?: string }
      const regionName = userData.__regionName

      if (!regionName) {
        sprite.visible = false
        return
      }

      const parts = regionName.split(',').map(p => p.trim())

      if (this.currentLevel === 'province') {
        sprite.visible = true
      }
      else if (this.currentLevel === 'city' && this.currentCityName) {
        sprite.visible = parts.includes(this.currentCityName)
      }
      else if (this.currentLevel === 'district' && this.currentDistrictName) {
        sprite.visible = parts.includes(this.currentDistrictName)
      }
      else {
        sprite.visible = false
      }
    })

    this.labelNeedsUpdate = true
  }

  private registerGlobalListeners(): void {
    if (this.onMouseMoveHandler)
      window.removeEventListener('mousemove', this.onMouseMoveHandler)

    // 🚀 性能优化：增加节流时间到 100ms，减少事件处理频率
    this.onMouseMoveHandler = throttle(this.handleMouseMoveInternal, 100)
    window.addEventListener('mousemove', this.onMouseMoveHandler)
    window.addEventListener('resize', this.onWindowResize)
    window.addEventListener('keydown', this.onKeyDown)

    if (this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown)
      this.renderer.domElement.removeEventListener('click', this.handleCanvasClick)
      this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown)
      this.renderer.domElement.addEventListener('click', this.handleCanvasClick)
    }
  }

  private readonly onWindowResize = (): void => {
    if (!this.container || !this.camera || !this.renderer)
      return

    const width = this.container.clientWidth
    const height = this.container.clientHeight

    // 🚀 性能优化：尺寸未变化时跳过更新
    if (width === this.lastWidth && height === this.lastHeight)
      return

    this.lastWidth = width
    this.lastHeight = height

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    if (this.labelRenderer)
      this.labelRenderer.setSize(width, height)

    // 🚀 性能优化：只在有材质时才遍历
    if (this.lineMaterials.length) {
      this.lineMaterials.forEach((material) => {
        material.resolution.set(width, height)
      })
    }

    // 🚀 性能优化：窗口尺寸变化时，标签需要重新定位
    this.labelNeedsUpdate = true
    // 🚀 性能优化：清除缓存的边界矩形
    this.cachedContainerRect = null
  }

  private readonly animateFrame = (): void => {
    if (!this.scene || !this.camera || !this.renderer || !this.controls)
      return

    this.animationId = requestAnimationFrame(this.animateFrame)

    if (!this.hasReportedAnimationStart) {
      this.hasReportedAnimationStart = true
      this.setManualProgress(85)
    }

    this.controls.update()

    // 🚀 性能优化：相机移动时，标签需要重新定位
    const cameraPositionChanged = this.camera.position.distanceToSquared(this.lastCameraPosition) > 0.0001
    const controlsTargetChanged = this.controls.target.distanceToSquared(this.lastControlsTarget) > 0.0001
    if (cameraPositionChanged || controlsTargetChanged) {
      this.labelNeedsUpdate = true
      this.lastCameraPosition.copy(this.camera.position)
      this.lastControlsTarget.copy(this.controls.target)
    }

    this.rotatingPlanes.forEach(({ mesh, speed }) => {
      mesh.rotation.z += speed
    })

    this.pulsingHalos.forEach((item) => {
      item.time += item.speed
      const progress = (Math.sin(item.time) + 1) / 2
      const scale = THREE.MathUtils.lerp(item.min, item.max, progress)
      item.mesh.scale.set(scale, scale, scale)

      // 🚀 性能优化：直接访问材质，移除运行时数组检查
      const opacity = THREE.MathUtils.lerp(item.opacityRange[0], item.opacityRange[1], progress)
      ;(item.mesh.material as THREE.MeshBasicMaterial).opacity = opacity
    })

    // 🚀 性能优化：直接修改 scale 属性，避免创建临时向量
    this.waveMeshArr.forEach((mesh) => {
      const waveMesh = mesh as WaveMesh
      waveMesh._s += 0.007

      // 直接修改 scale 属性而非使用 set()
      const scaleFactor = waveMesh.size * waveMesh._s
      mesh.scale.x = scaleFactor
      mesh.scale.y = scaleFactor
      mesh.scale.z = scaleFactor

      const material = mesh.material as THREE.Material & { opacity: number }

      // 简化透明度计算
      if (waveMesh._s > 2) {
        waveMesh._s = 1.0
      }
      const t = waveMesh._s - 1 // 0 到 1
      material.opacity = t <= 0.5 ? t * 2 : 1 - (t - 0.5) * 2
    })

    this.haloUniforms.u_time.value += 0.007

    this.waterRipples.forEach((ripple) => {
      ripple.uniforms.uTime.value += ripple.timeScale
      if (ripple.uniforms.uTime.value > 1000)
        ripple.uniforms.uTime.value -= 1000
    })

    // 🚀 性能优化：使用预验证数组，避免运行时类型检查
    this.cityMarkerGroupsOptimized.forEach(({ group, baseY, phase }) => {
      const offset = Math.sin(this.haloUniforms.u_time.value * 2.1 + phase) * 0.24
      group.position.y = baseY + offset
    })

    this.renderer.render(this.scene, this.camera)

    // 🚀 性能优化：仅在标签需要更新时渲染 CSS3D
    if (this.labelRenderer && this.labelNeedsUpdate) {
      this.labelRenderer.render(this.scene, this.camera)
      this.labelNeedsUpdate = false
    }
  }

  private cleanup(): void {
    this.manualProgress = 0
    this.assetProgress = 0
    this.lastEmittedProgress = -1
    this.hasCompletedLoading = false
    this.hasReportedAnimationStart = false

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    window.removeEventListener('resize', this.onWindowResize)
    window.removeEventListener('keydown', this.onKeyDown)
    if (this.onMouseMoveHandler) {
      window.removeEventListener('mousemove', this.onMouseMoveHandler)
      this.onMouseMoveHandler = null
    }

    this.currentHoveredMeshes = []
    this.currentHoveredKey = null
    this.currentHoveredLabelName = null
    this.cityMeshes = []
    this.clearCityMarkers()
    this.clearDistrictLabels()
    this.clearCustomLabels()
    this.clearMapGeometry()
    this.currentCityGeo = null
    this.currentCityTransformer = null

    if (this.renderer) {
      this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown)
      this.renderer.domElement.removeEventListener('click', this.handleCanvasClick)
      this.renderer.forceContextLoss()
      this.renderer.dispose()
      if (this.renderer.domElement && this.renderer.domElement.parentNode)
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
      this.renderer = null
    }

    if (this.labelRenderer) {
      const dom = this.labelRenderer.domElement
      if (dom && dom.parentNode)
        dom.parentNode.removeChild(dom)
      this.labelRenderer = null
    }

    if (this.scene) {
      this.scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
          if (Array.isArray(child.material))
            child.material.forEach(material => material.dispose())
          else
            child.material?.dispose()
        }
        else if (child instanceof Line2) {
          child.geometry.dispose()
          const material = child.material as THREE.Material
          material.dispose()
        }
        else if (child instanceof THREE.Points) {
          child.geometry.dispose()
          const material = child.material as THREE.Material
          material.dispose()
        }
        else if (child instanceof THREE.Sprite) {
          const material = child.material as THREE.Material & { map?: THREE.Texture }
          material.map?.dispose()
          material.dispose()
        }
      })
      this.scene.clear()
      this.scene = null
    }

    if (this.controls) {
      this.controls.dispose()
      this.controls = null
    }

    this.waveMeshArr = []
    this.waterRipples.length = 0
    this.rotatingPlanes.length = 0
    this.pulsingHalos.length = 0
    this.lineMaterials.forEach(material => material.dispose())
    this.lineMaterials = []
    this.cityMarkerGroups = []
    this.loadedTextures.forEach(texture => texture.dispose())
    this.loadedTextures = []
    this.mapGroup = null
    this.mapGeometryGroup = null
    this.rootGroup = null
    this.environmentGroup = null
    this.camera = null
    this.haloUniforms.u_time.value = 0
    this.cityGeoCache.clear()
  }
}
