<script setup lang="ts">
import type { CityLabelConfig, ControlLimits, CityRiskDatum, LevelLimitConfig, MapLayerConfig } from '../core/scene/map-config'
import type { CityBoardDatum, CityDistrictDatum } from '../core/zhejiangCityBoards'
import type { CustomLabelConfig } from '../core/scene/zhejiang-map-scene'
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ZhejiangMapScene } from '../core/scene/zhejiang-map-scene'

const props = defineProps<{
  cityData?: CityBoardDatum[] | CityRiskDatum[]
  cityLabelRenderer?: (city: CityRiskDatum, normalized: number) => HTMLElement
  districtLabelRenderer?: (name: string, options: { value?: number, strength?: number }) => HTMLElement
  customLabels?: CustomLabelConfig[]
  hideCityLabel?: boolean
  hideDistrictLabel?: boolean
  controlLimits?: Partial<ControlLimits>
  mapLayerConfig?: Partial<MapLayerConfig>
  levelLimit?: Partial<LevelLimitConfig>
  cityLabelConfig?: Partial<CityLabelConfig>
}>()

const emit = defineEmits<{
  (e: 'loadingProgress', value: number): void
  (e: 'loadingComplete'): void
  (e: 'levelChange', level: 'province' | 'city' | 'district', cityName: string | null, districtName: string | null): void
  (e: 'cityLabelClick', payload: { event: MouseEvent, city: CityRiskDatum }): void
  (e: 'districtLabelClick', payload: {
    event: MouseEvent
    cityName: string
    districtName: string
    districtData: CityDistrictDatum | null
  }): void
}>()

type CurrentRegionState = {
  level: 'province' | 'city' | 'district'
  provinceName: string
  cityName: string | null
  districtName: string | null
}

const mapContainerRef = ref<HTMLDivElement | null>(null)
let mapScene: ZhejiangMapScene | null = null
const currentRegion = reactive<CurrentRegionState>({
  level: 'province',
  provinceName: '浙江省',
  cityName: null,
  districtName: null,
})

function resetCurrentRegion() {
  currentRegion.level = 'province'
  currentRegion.cityName = null
  currentRegion.districtName = null
}

function mountScene(initialData?: CityBoardDatum[] | CityRiskDatum[]) {
  if (!mapContainerRef.value)
    return

  mapScene = new ZhejiangMapScene({
    onProgress: value => emit('loadingProgress', value),
    onComplete: () => emit('loadingComplete'),
    onLevelChange: (level, cityName, districtName) => {
      currentRegion.level = level
      currentRegion.cityName = cityName
      currentRegion.districtName = districtName
      emit('levelChange', level, cityName, districtName)
    },
    onCityLabelClick: payload => emit('cityLabelClick', payload),
    onDistrictLabelClick: payload => emit('districtLabelClick', payload),
    cityLabelRenderer: props.cityLabelRenderer,
    districtLabelRenderer: props.districtLabelRenderer,
    customLabels: props.customLabels,
    hideCityLabel: props.hideCityLabel,
    hideDistrictLabel: props.hideDistrictLabel,
    controlLimits: props.controlLimits,
    mapLayerConfig: props.mapLayerConfig,
    levelLimit: props.levelLimit,
    cityLabelConfig: props.cityLabelConfig,
  })
  mapScene.mount(mapContainerRef.value, {
    cityData: initialData ?? props.cityData,
  })
}

onMounted(() => {
  mountScene()
})

onBeforeUnmount(() => {
  mapScene?.dispose()
  mapScene = null
  resetCurrentRegion()
})

function updateCityData(data?: CityBoardDatum[] | CityRiskDatum[]) {
  mapScene?.updateCityData(data)
}

function updateCustomLabels(labels?: CustomLabelConfig[]) {
  mapScene?.updateCustomLabels(labels)
}

async function focusProvince() {
  try {
    await mapScene?.focusProvince()
  }
  catch {
    // ignored: focusProvince already guards against state transitions
  }
}

async function focusDistrict(cityName: string, districtName: string) {
  if (!cityName || !districtName)
    return

  try {
    await mapScene?.focusDistrict(cityName, districtName)
  }
  catch {
    // ignored: focusDistrict already guards against state transitions
  }
}

async function focusCity(cityName: string) {
  if (!cityName)
    return

  try {
    await mapScene?.focusCity(cityName)
  }
  catch {
    // ignored: focusCity already guards against state transitions
  }
}

watch(
  () => props.cityData,
  (next) => {
    if (!mapScene)
      return
    mapScene.updateCityData(next)
  },
  { deep: true },
)

watch(
  () => props.customLabels,
  (next) => {
    if (!mapScene)
      return
    mapScene.updateCustomLabels(next)
  },
  { deep: true },
)

watch(
  () => [props.hideCityLabel, props.hideDistrictLabel],
  () => {
    if (!mapScene)
      return
    mapScene.updateLabelVisibility(props.hideCityLabel, props.hideDistrictLabel)
  },
)

defineExpose({
  updateCityData,
  updateCustomLabels,
  focusProvince,
  focusDistrict,
  focusCity,
  currentRegion,
})
</script>

<template>
  <div class="zhejiang-map-panel">
    <div ref="mapContainerRef" class="map-canvas" />
  </div>
</template>

<style scoped>
.zhejiang-map-panel {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.map-canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}
</style>
