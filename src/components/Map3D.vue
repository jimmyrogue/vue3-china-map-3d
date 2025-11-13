<script setup lang="ts">
import type { CityRiskDatum } from '../core/scene/map-config'
import type { CityBoardDatum, CityDistrictDatum } from '../core/zhejiangCityBoards'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ZhejiangMapScene } from '../core/scene/zhejiang-map-scene'

const props = defineProps<{
  cityData?: CityBoardDatum[] | CityRiskDatum[]
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

const mapContainerRef = ref<HTMLDivElement | null>(null)
let mapScene: ZhejiangMapScene | null = null

function mountScene(initialData?: CityBoardDatum[] | CityRiskDatum[]) {
  if (!mapContainerRef.value)
    return

  mapScene = new ZhejiangMapScene({
    onProgress: value => emit('loadingProgress', value),
    onComplete: () => emit('loadingComplete'),
    onLevelChange: (level, cityName, districtName) => {
      emit('levelChange', level, cityName, districtName)
    },
    onCityLabelClick: payload => emit('cityLabelClick', payload),
    onDistrictLabelClick: payload => emit('districtLabelClick', payload),
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
})

function updateCityData(data?: CityBoardDatum[] | CityRiskDatum[]) {
  mapScene?.updateCityData(data)
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

defineExpose({
  updateCityData,
  focusProvince,
  focusDistrict,
  focusCity,
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
