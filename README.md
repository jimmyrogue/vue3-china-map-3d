# Vue3 China Map 3D

基于 Vue 3 + Three.js 的中国省份 3D 地图可视化组件，支持省/市/区三级钻取交互。

## ✨ 特性

- 🎨 精美的 3D 视觉效果（法线贴图、光照系统、环境装饰）
- 🗺️ 支持省/市/区三级地图钻取
- 📦 开箱即用，零配置启动
- 🎯 完整的 TypeScript 类型支持
- 🚀 高性能渲染优化（事件节流、按需渲染）
- 📱 响应式设计，自适应容器尺寸
- 🎭 丰富的交互效果（悬停高亮、点击钻取、ESC 返回）

## 📦 安装

```bash
npm install vue3-china-map-3d
# 或
yarn add vue3-china-map-3d
# 或
pnpm add vue3-china-map-3d
```

## 🚀 快速开始

### 全局注册

```typescript
// main.ts
import { createApp } from 'vue'
import Map3D from 'vue3-china-map-3d'
import 'vue3-china-map-3d/style.css'
import App from './App.vue'

const app = createApp(App)
app.use(Map3D)
app.mount('#app')
```

### 局部使用

```vue
<template>
  <div style="width: 100vw; height: 100vh;">
    <Map3D
      :city-data="cityData"
      @level-change="handleLevelChange"
      @city-click="handleCityClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Map3D } from 'vue3-china-map-3d'
import type { CityBoardDatum } from 'vue3-china-map-3d'
import 'vue3-china-map-3d/style.css'

const cityData = ref<CityBoardDatum[]>([
  {
    name: '杭州市',
    value: 120,
    center: [120.153576, 30.287459],
    districts: [
      { name: '西湖区', value: 45 },
      { name: '滨江区', value: 38 }
    ]
  },
  {
    name: '宁波市',
    value: 95,
    center: [121.549792, 29.868388]
  }
])

function handleLevelChange(level: string, cityName: string | null, districtName: string | null) {
  console.log('地图层级变化:', { level, cityName, districtName })
}

function handleCityClick(city: any) {
  console.log('城市点击:', city)
}
</script>
```

## 📖 API

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `cityData` | `CityBoardDatum[]` | `[]` | 城市数据数组 |
| `cityLabelRenderer` | `(city, normalized) => HTMLElement \| null \| false` | - | 自定义城市标签渲染函数 |
| `districtLabelRenderer` | `(name, options) => HTMLElement \| null \| false` | - | 自定义区县标签渲染函数 |
| `customLabels` | `CustomLabelConfig[]` | - | 完全自定义标签配置数组 |
| `hideCityLabel` | `boolean` | `false` | 隐藏所有城市标记(包括光柱和标签) |
| `hideDistrictLabel` | `boolean` | `false` | 隐藏所有区县标签 |
| `controlLimits` | `Partial<ControlLimits>` | - | 相机控制限制配置(缩放距离、旋转角度等) |
| `mapLayerConfig` | `Partial<MapLayerConfig>` | - | 地图层配置(中心点、缩放比例、高度等) |
| `levelLimit` | `Partial<LevelLimitConfig>` | - | 地图层级限制配置(控制可进入的最大层级) |
| `cityLabelConfig` | `Partial<CityLabelConfig>` | - | 城市标签配置(高度、缩放等) |

### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `level-change` | `(level, cityName, districtName)` | 地图层级变化时触发 |
| `city-click` | `(city)` | 城市标记点击时触发 |
| `district-click` | `(payload)` | 区县标记点击时触发 |

### 类型定义

```typescript
interface CityBoardDatum {
  name: string                    // 城市名称
  value: number                   // 数值（用于排名和可视化）
  center?: [number, number]       // 城市中心坐标 [经度, 纬度]
  districts?: CityDistrictDatum[] // 区县数据
}

interface CityDistrictDatum {
  name: string   // 区县名称
  value?: number // 数值
}

interface ControlLimits {
  minDistance: number     // 最小缩放距离，默认 68
  maxDistance: number     // 最大缩放距离，默认 250
  minPolarAngle: number   // 最小俯仰角（弧度），默认 Math.PI / 6
  maxPolarAngle: number   // 最大俯仰角（弧度），默认 Math.PI / 2.05
}

interface MapLayerConfig {
  center: [number, number]              // 地图中心点 [经度, 纬度]，默认 [120.153576, 29.287459]
  scale: number                         // 地图缩放比例，默认 850
  extrusionDepth: number                // 地图挤出深度（厚度），默认 5
  floatHeight: number                   // 地图浮动高度，默认 -13.6
  offsetZ: number                       // 地图 Z 轴偏移，默认 100
  defaultCameraPosition: [number, number, number]  // 初始相机位置 [x, y, z]，默认 [0, 100, 170]
  defaultCameraTarget: [number, number, number]    // 初始相机目标点 [x, y, z]，默认 [0, -35, 110]
}

interface LevelLimitConfig {
  maxLevel: 'province' | 'city' | 'district'  // 可进入的最大层级，默认 'district'（无限制）
}

interface CityLabelConfig {
  offsetY: number  // 城市标签Y轴偏移高度，默认 13.5
  scale: number    // 城市标签缩放比例，默认 0.24
}
```

### 实例方法与状态

`Map3D` 会通过 `defineExpose` 暴露一组方法与状态，借助模板 ref 即可访问：

```vue
<template>
  <Map3D ref="mapRef" :city-data="cityData" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Map3D } from 'vue3-china-map-3d'

const mapRef = ref<InstanceType<typeof Map3D> | null>(null)

function resetView() {
  mapRef.value?.focusProvince()
}

function jumpToCity(name: string) {
  mapRef.value?.focusCity(name)
}
</script>
```

**可用方法/属性**:

- `updateCityData(data)` / `updateCustomLabels(labels)`：在不重新挂载组件的情况下更新城市/自定义标签数据。
- `focusProvince()` / `focusCity(cityName)` / `focusDistrict(cityName, districtName)`：手动切换视角到指定层级。
- `setProvince(provinceId)`：切换到指定省份。当前构建仅内置浙江省数据，其余省份（如文档中的“福建省”示例）会提示暂未支持。
- `currentRegion`：响应式对象，包含 `{ level, provinceId, provinceName, cityName, districtName, provinces }`。其中 `provinces` 提供所有可选省份条目（结构为 `{ id, name, supported }`）。

`currentRegion` 可用于驱动省/市/区的联动绑定：

```ts
import { computed, ref, watch } from 'vue'
import { Map3D } from 'vue3-china-map-3d'

const mapRef = ref<InstanceType<typeof Map3D> | null>(null)
const selectedProvince = ref('zhejiang')
const provinces = computed(() => mapRef.value?.currentRegion.provinces ?? [])

watch(selectedProvince, (id) => {
  if (id)
    mapRef.value?.setProvince(id)
})

watch(
  () => mapRef.value?.currentRegion,
  (region) => {
    if (!region)
      return
    console.log('当前层级', region.level, region.cityName, region.districtName)
  },
  { deep: true }
)
```

## 🏷️ 标签控制

### 隐藏标签

如果你想完全隐藏城市或区县标签，可以使用 `hideCityLabel` 和 `hideDistrictLabel` 配置：

```vue
<template>
  <!-- 隐藏所有城市标签 -->
  <Map3D :hide-city-label="true" />

  <!-- 隐藏所有区县标签 -->
  <Map3D :hide-district-label="true" />

  <!-- 同时隐藏城市和区县标签 -->
  <Map3D
    :hide-city-label="true"
    :hide-district-label="true"
  />
</template>
```

## 🎨 自定义标签

### 自定义城市标签

```vue
<template>
  <Map3D :city-label-renderer="customCityLabel" />
</template>

<script setup lang="ts">
import { Map3D } from 'vue3-china-map-3d'
import type { CityRiskDatum } from 'vue3-china-map-3d'

function customCityLabel(city: CityRiskDatum, normalized: number): HTMLElement | null | false {
  // 返回 null 或 false 可以隐藏特定城市的标签
  if (city.name === '杭州市') {
    return null // 不显示杭州的标签
  }

  const div = document.createElement('div')
  div.className = 'my-city-label'
  div.innerHTML = `<strong>${city.name}</strong>: ${city.value}`
  div.style.pointerEvents = 'auto'
  div.style.cursor = 'pointer'
  return div
}
</script>
```

### 自定义区县标签

```vue
<template>
  <Map3D :district-label-renderer="customDistrictLabel" />
</template>

<script setup lang="ts">
import { Map3D } from 'vue3-china-map-3d'

function customDistrictLabel(
  name: string,
  options: { value?: number, strength?: number }
): HTMLElement | null | false {
  // 返回 null 或 false 可以隐藏特定区县的标签
  if (name === '西湖区') {
    return false // 不显示西湖区的标签
  }

  const div = document.createElement('div')
  div.className = 'my-district-label'
  div.innerHTML = `${name} ${options.value || ''}`
  div.style.pointerEvents = 'auto'
  div.style.cursor = 'pointer'
  return div
}
</script>
```

**参数说明**:

- `cityLabelRenderer(city, normalized)`:
  - `city`: 城市数据对象
  - `normalized`: 归一化值 (0-1)，用于表示数据强度
  - **返回值**: `HTMLElement` 显示标签 | `null` 或 `false` 隐藏标签
- `districtLabelRenderer(name, options)`:
  - `name`: 区县名称
  - `options.value`: 区县数值
  - `options.strength`: 强度值 (0-1)
  - **返回值**: `HTMLElement` 显示标签 | `null` 或 `false` 隐藏标签

### 完全自定义标签

除了城市和区县标签，你还可以在地图上添加完全自定义的标签，位置、样式、交互完全由你控制：

```vue
<template>
  <Map3D :custom-labels="customLabels" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Map3D } from 'vue3-china-map-3d'
import type { CustomLabelConfig } from 'vue3-china-map-3d'

const customLabels = ref<CustomLabelConfig[]>([
  {
    id: 'poi-1',
    position: [120.2, 30.3], // 经纬度 [lng, lat]
    height: 15,              // 可选：Y 轴高度偏移，默认 10
    scale: 0.3,              // 可选：缩放比例，默认 0.24
    renderer: () => {
      const div = document.createElement('div')
      div.className = 'custom-poi'
      div.innerHTML = `
        <div style="
          background: rgba(255, 100, 100, 0.9);
          padding: 8px 12px;
          border-radius: 4px;
          color: white;
          font-weight: bold;
        ">
          📍 重要地点
        </div>
      `
      return div
    },
    onClick: (event, label) => {
      console.log('标签被点击:', label.id)
    },
    onHover: (isHovering, label) => {
      console.log(isHovering ? '鼠标进入' : '鼠标离开', label.id)
    }
  }
])
</script>
```

**CustomLabelConfig 接口**:

```typescript
interface CustomLabelConfig {
  id: string                    // 唯一标识
  position: [number, number]    // 经纬度 [lng, lat]
  regionName?: string           // 所属区域完整路径，如 "浙江省,宁波市,江北区"
  height?: number               // Y 轴高度偏移，默认 10
  scale?: number                // 缩放比例，默认 0.24
  renderer: () => HTMLElement   // DOM 渲染函数
  onClick?: (event: MouseEvent, label: CustomLabelConfig) => void
  onHover?: (isHovering: boolean, label: CustomLabelConfig) => void
}
```

**层级可见性控制**:

通过 `regionName` 属性，标签会根据当前地图层级自动显示/隐藏：

```typescript
const customLabels = ref<CustomLabelConfig[]>([
  {
    id: 'hangzhou-poi',
    position: [120.2, 30.3],
    regionName: '浙江省,杭州市,西湖区',  // 完整的层级路径
    renderer: () => { /* ... */ }
  },
  {
    id: 'ningbo-poi',
    position: [121.5, 29.8],
    regionName: '浙江省,宁波市,江北区,孔浦街道',
    renderer: () => { /* ... */ }
  }
])
```

**可见性规则**:

- **省级视图**: 显示所有有 `regionName` 的标签
- **市级视图**: 只显示路径中包含当前城市的标签（如进入"杭州市"，只显示包含"杭州市"的标签）
- **区级视图**: 只显示路径中包含当前区县的标签（如进入"江北区"，只显示包含"江北区"的标签）
- **无 `regionName`**: 标签在所有层级都隐藏

**悬浮交互**:

标签会在其对应区域被鼠标悬浮时自动上浮，增强交互反馈：

```typescript
{
  id: 'poi-1',
  position: [120.2, 30.3],
  regionName: '浙江省,杭州市,西湖区',  // 只在西湖区被悬浮时上浮
  renderer: () => { /* ... */ }
}
```

**动态更新标签**:

```typescript
// 通过 ref 更新
customLabels.value = [
  { id: 'new-label', position: [121.5, 31.2], renderer: () => { /* ... */ } }
]

// 或通过组件方法更新
const mapRef = ref()
mapRef.value?.updateCustomLabels([...])
```

## 🎮 交互说明

- **鼠标悬停**: 城市/区县区块高亮并上浮
- **点击城市**: 进入该城市的市级视图
- **点击区县**: 进入该区县的详细视图
- **按 ESC 键**: 返回上一级视图
- **鼠标拖拽**: 旋转视角
- **鼠标滚轮**: 缩放视图

## 🎛️ 相机控制配置

通过 `controlLimits` 属性，你可以自定义相机的缩放范围和旋转角度限制：

```vue
<template>
  <Map3D
    :control-limits="{
      minDistance: 50,
      maxDistance: 300,
      minPolarAngle: Math.PI / 8,
      maxPolarAngle: Math.PI / 2.2
    }"
  />
</template>

<script setup lang="ts">
import { Map3D } from 'vue3-china-map-3d'
import type { ControlLimits } from 'vue3-china-map-3d'

// 或者使用类型定义
const customLimits: Partial<ControlLimits> = {
  minDistance: 50,    // 最小缩放距离（相机离地图最近的距离）
  maxDistance: 300,   // 最大缩放距离（相机离地图最远的距离）
  minPolarAngle: Math.PI / 8,    // 最小俯仰角（相机最高的角度）
  maxPolarAngle: Math.PI / 2.2   // 最大俯仰角（相机最低的角度）
}
</script>
```

**参数说明**:

- `minDistance`: 最小缩放距离，默认 `68`。值越小，相机可以离地图越近
- `maxDistance`: 最大缩放距离，默认 `250`。值越大，相机可以离地图越远
- `minPolarAngle`: 最小俯仰角（弧度），默认 `Math.PI / 6`（30°）。控制相机可以抬多高
- `maxPolarAngle`: 最大俯仰角（弧度），默认 `Math.PI / 2.05`（约 88°）。控制相机可以压多低

> **注意**: 配置会在所有视图级别生效。当切换到城市或区县视图时，`maxDistance` 会取你的配置和视图默认值中的较大值，确保有足够的缩放空间。

**常用配置示例**:

```typescript
// 限制更近的观察距离（适合查看细节）
const closeView: Partial<ControlLimits> = {
  minDistance: 30,
  maxDistance: 150
}

// 限制更远的观察距离（适合全局视角）
const farView: Partial<ControlLimits> = {
  minDistance: 100,
  maxDistance: 400
}

// 限制俯视角度（防止看到地图底部）
const topDownView: Partial<ControlLimits> = {
  minPolarAngle: Math.PI / 4,   // 45°
  maxPolarAngle: Math.PI / 2.5  // 约 72°
}

// 允许更自由的视角
const freeView: Partial<ControlLimits> = {
  minPolarAngle: 0,             // 完全俯视
  maxPolarAngle: Math.PI / 2    // 完全平视
}
```

**注意事项**:

- 所有参数都是可选的，未指定的参数将使用默认值
- 角度使用弧度制，可以使用 `Math.PI` 进行计算
- `minPolarAngle` 应小于 `maxPolarAngle`
- `minDistance` 应小于 `maxDistance`

## 🗺️ 地图层配置

通过 `mapLayerConfig` 属性，你可以自定义地图的投影、缩放、高度等核心参数：

```vue
<template>
  <Map3D
    :map-layer-config="{
      center: [120.2, 30.3],
      scale: 1000,
      extrusionDepth: 8,
      floatHeight: -15,
      offsetZ: 120
    }"
  />
</template>

<script setup lang="ts">
import { Map3D } from 'vue3-china-map-3d'
import type { MapLayerConfig } from 'vue3-china-map-3d'

// 或者使用类型定义
const customMapConfig: Partial<MapLayerConfig> = {
  center: [120.2, 30.3],      // 地图中心点 [经度, 纬度]
  scale: 1000,                // 地图缩放比例
  extrusionDepth: 8,          // 地图挤出深度（厚度）
  floatHeight: -15,           // 地图浮动高度
  offsetZ: 120                // 地图 Z 轴偏移
}
</script>
```

**参数说明**:

- `center`: 地图中心点坐标 `[经度, 纬度]`，默认 `[120.153576, 29.287459]`（浙江省中心）。调整此参数可以改变地图的投影中心
- `scale`: 地图缩放比例，默认 `850`。值越大，地图显示越大
- `extrusionDepth`: 地图挤出深度（厚度），默认 `5`。控制地图的 3D 厚度效果
- `floatHeight`: 地图浮动高度，默认 `-13.6`。控制地图在 Y 轴上的位置
- `offsetZ`: 地图 Z 轴偏移，默认 `100`。控制地图在 Z 轴上的位置
- `defaultCameraPosition`: 初始相机位置 `[x, y, z]`，默认 `[0, 100, 170]`。控制用户首次看到地图时的相机位置
- `defaultCameraTarget`: 初始相机目标点 `[x, y, z]`，默认 `[0, -35, 110]`。控制相机看向的焦点位置

**常用配置示例**:

```typescript
// 放大地图显示
const zoomedIn: Partial<MapLayerConfig> = {
  scale: 1200,
  extrusionDepth: 8
}

// 更扁平的地图效果
const flatMap: Partial<MapLayerConfig> = {
  extrusionDepth: 2,
  floatHeight: -10
}

// 调整地图位置（更靠近相机）
const closerMap: Partial<MapLayerConfig> = {
  offsetZ: 80,
  floatHeight: -10
}

// 自定义投影中心（适配不同省份）
const customCenter: Partial<MapLayerConfig> = {
  center: [119.5, 29.8],  // 调整中心点
  scale: 900
}

// 调整初始视角（更近的观察距离）
const closeView: Partial<MapLayerConfig> = {
  defaultCameraPosition: [0, 80, 120],   // 相机更靠近地图
  defaultCameraTarget: [0, -30, 100]     // 焦点也相应调整
}

// 调整初始视角（俯视角度）
const topView: Partial<MapLayerConfig> = {
  defaultCameraPosition: [0, 150, 100],  // 相机更高，更靠前
  defaultCameraTarget: [0, -20, 100]     // 焦点向上
}

// 调整初始视角（侧视角度）
const sideView: Partial<MapLayerConfig> = {
  defaultCameraPosition: [100, 100, 150], // 相机偏向一侧
  defaultCameraTarget: [0, -35, 110]      // 保持焦点不变
}
```

**注意事项**:

- 所有参数都是可选的，未指定的参数将使用默认值
- 修改 `center` 和 `scale` 会影响地图的投影效果，需要根据实际地理数据调整
- `extrusionDepth` 影响地图的 3D 厚度，过大可能影响视觉效果
- `floatHeight` 和 `offsetZ` 影响地图在 3D 空间中的位置，需要与相机位置配合调整
- `defaultCameraPosition` 和 `defaultCameraTarget` 控制初始视角，调整时需要配合使用以获得理想的观察效果
- 相机位置的 Y 值越大，视角越高；Z 值越大，相机离地图越远
- 建议先调整 `defaultCameraPosition`，再根据效果微调 `defaultCameraTarget` 以获得最佳视角

## 🔒 地图层级限制

通过 `levelLimit` 属性，你可以控制地图允许进入的最大层级深度，适用于只需要展示省级或市级数据的场景。

### 基本用法

```vue
<template>
  <!-- 默认：无限制，支持省→市→区三级钻取 -->
  <Map3D :city-data="cityData" />

  <!-- 限制只能进入市级，不能再进入区县 -->
  <Map3D
    :city-data="cityData"
    :level-limit="{ maxLevel: 'city' }"
  />

  <!-- 限制只能查看省级，禁止任何层级下钻 -->
  <Map3D
    :city-data="cityData"
    :level-limit="{ maxLevel: 'province' }"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Map3D } from 'vue3-china-map-3d'
import type { CityBoardDatum, LevelLimitConfig } from 'vue3-china-map-3d'

const cityData = ref<CityBoardDatum[]>([
  {
    name: '杭州市',
    value: 120,
    center: [120.153576, 30.287459],
    districts: [
      { name: '西湖区', value: 45 },
      { name: '滨江区', value: 38 }
    ]
  },
  {
    name: '宁波市',
    value: 95,
    center: [121.549792, 29.868388]
  }
])
</script>
```

### 配置说明

```typescript
interface LevelLimitConfig {
  maxLevel: 'province' | 'city' | 'district'
}
```

**maxLevel 参数说明**:

| 值 | 说明 | 交互行为 |
|---|------|---------|
| `'district'` | 默认，无限制 | 支持省→市→区三级完整钻取 |
| `'city'` | 限制到市级 | ✅ 省级可进入市级<br>❌ 市级内点击区县无响应<br>❌ 调用 `focusDistrict()` 被拦截 |
| `'province'` | 限制到省级 | ❌ 省级内点击城市无响应<br>❌ 城市标签点击无响应<br>❌ 调用 `focusCity()` 被拦截 |

### 完整示例

```vue
<template>
  <div style="width: 100vw; height: 100vh;">
    <div style="position: absolute; top: 20px; left: 20px; z-index: 10;">
      <label>
        层级限制:
        <select v-model="selectedMaxLevel">
          <option value="district">无限制（省→市→区）</option>
          <option value="city">限制到市级</option>
          <option value="province">限制到省级</option>
        </select>
      </label>
    </div>

    <Map3D
      :city-data="cityData"
      :level-limit="{ maxLevel: selectedMaxLevel }"
      @level-change="handleLevelChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Map3D } from 'vue3-china-map-3d'
import type { CityBoardDatum } from 'vue3-china-map-3d'

const selectedMaxLevel = ref<'province' | 'city' | 'district'>('city')

const cityData = ref<CityBoardDatum[]>([
  {
    name: '杭州市',
    value: 120,
    center: [120.153576, 30.287459],
    districts: [
      { name: '西湖区', value: 45 },
      { name: '滨江区', value: 38 },
      { name: '拱墅区', value: 32 }
    ]
  },
  {
    name: '宁波市',
    value: 95,
    center: [121.549792, 29.868388],
    districts: [
      { name: '海曙区', value: 28 },
      { name: '江北区', value: 22 }
    ]
  }
])

function handleLevelChange(
  level: 'province' | 'city' | 'district',
  cityName: string | null,
  districtName: string | null
) {
  console.log(`当前层级: ${level}`)
  if (cityName)
    console.log(`城市: ${cityName}`)
  if (districtName)
    console.log(`区县: ${districtName}`)
}
</script>
```

### 使用场景

**1. 业务数据只到市级**
```vue
<template>
  <!-- 数据库只有省市两级数据，无区县数据 -->
  <Map3D
    :city-data="citiesWithoutDistricts"
    :level-limit="{ maxLevel: 'city' }"
  />
</template>
```

**2. 大屏展示限制交互**
```vue
<template>
  <!-- 大屏只展示省级概览，禁止用户交互钻取 -->
  <Map3D
    :city-data="cityData"
    :level-limit="{ maxLevel: 'province' }"
  />
</template>
```

**3. 权限控制**
```vue
<template>
  <!-- 根据用户权限动态控制可访问的层级 -->
  <Map3D
    :city-data="cityData"
    :level-limit="{ maxLevel: userMaxLevel }"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

// 根据用户角色计算最大层级
const userMaxLevel = computed(() => {
  if (userRole.value === 'admin')
    return 'district'  // 管理员可查看所有层级
  if (userRole.value === 'manager')
    return 'city'      // 经理只能查看到市级
  return 'province'    // 普通用户只能查看省级
})
</script>
```

### 注意事项

- 层级限制不影响 `focusProvince()` 返回上一级的功能
- 当达到限制层级时，点击操作会被静默拦截，控制台会输出警告信息
- 程序式调用 `focusCity()` 或 `focusDistrict()` 时也会受到限制
- 未配置 `levelLimit` 时，默认 `maxLevel: 'district'`，即无任何限制

## 🏷️ 城市标签配置

通过 `cityLabelConfig` 属性，你可以调整城市标签的悬浮高度和缩放比例。

### 基本用法

```vue
<template>
  <Map3D
    :city-data="cityData"
    :city-label-config="{
      offsetY: 20,
      scale: 0.3
    }"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Map3D } from 'vue3-china-map-3d'
import type { CityBoardDatum, CityLabelConfig } from 'vue3-china-map-3d'

const cityData = ref<CityBoardDatum[]>([
  {
    name: '杭州市',
    value: 120,
    center: [120.153576, 30.287459]
  }
])
</script>
```

### 配置说明

```typescript
interface CityLabelConfig {
  scale: number    // 城市标签缩放比例，默认 0.24
}
```

**参数详解**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `scale` | `number` | `0.24` | 标签的缩放比例，控制标签的大小 |

> 标签高度现由 `mapLayerConfig.extrusionDepth` 控制，`offsetY` 已移除。

### 使用场景

**1. 调整标签高度**
```vue
<template>
  <!-- 标签更高，更醒目 -->
  <Map3D
    :city-data="cityData"
    :city-label-config="{ offsetY: 20 }"
  />

  <!-- 标签更低，更贴近地图 -->
  <Map3D
    :city-data="cityData"
    :city-label-config="{ offsetY: 8 }"
  />
</template>
```

**2. 调整标签大小**
```vue
<template>
  <!-- 标签更大，更清晰 -->
  <Map3D
    :city-data="cityData"
    :city-label-config="{ scale: 0.35 }"
  />

  <!-- 标签更小，更精简 -->
  <Map3D
    :city-data="cityData"
    :city-label-config="{ scale: 0.18 }"
  />
</template>
```

**3. 同时调整高度和大小**
```vue
<template>
  <!-- 创造视觉层次感 -->
  <Map3D
    :city-data="cityData"
    :city-label-config="{
      offsetY: 18,
      scale: 0.32
    }"
  />
</template>

<script setup lang="ts">
import type { CityLabelConfig } from 'vue3-china-map-3d'

// 或使用类型定义
const labelConfig: CityLabelConfig = {
  offsetY: 18,
  scale: 0.32
}
</script>
```

**4. 响应式调整**
```vue
<template>
  <div>
    <div style="position: absolute; top: 20px; left: 20px; z-index: 10;">
      <label>
        标签高度:
        <input
          v-model.number="labelOffsetY"
          type="range"
          min="5"
          max="30"
          step="0.5"
        />
        {{ labelOffsetY }}
      </label>
      <br>
      <label>
        标签大小:
        <input
          v-model.number="labelScale"
          type="range"
          min="0.1"
          max="0.5"
          step="0.02"
        />
        {{ labelScale }}
      </label>
    </div>

    <Map3D
      :city-data="cityData"
      :city-label-config="{
        offsetY: labelOffsetY,
        scale: labelScale
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Map3D } from 'vue3-china-map-3d'
import type { CityBoardDatum } from 'vue3-china-map-3d'

const labelOffsetY = ref(13.5)
const labelScale = ref(0.24)

const cityData = ref<CityBoardDatum[]>([
  { name: '杭州市', value: 120, center: [120.153576, 30.287459] },
  { name: '宁波市', value: 95, center: [121.549792, 29.868388] }
])
</script>
```

### 推荐值范围

```typescript
// 不同风格的配置
const configs = {
  // 紧凑型 - 适合信息密集场景
  compact: {
    offsetY: 8,
    scale: 0.18
  },

  // 标准型 - 默认平衡配置
  standard: {
    offsetY: 13.5,
    scale: 0.24
  },

  // 醒目型 - 适合重点展示
  prominent: {
    offsetY: 20,
    scale: 0.35
  },

  // 超大型 - 适合大屏展示
  large: {
    offsetY: 25,
    scale: 0.45
  }
}
```

### 注意事项

- `offsetY` 值过大可能导致标签超出视野，建议范围：5-30
- `scale` 值过小会导致标签不易阅读，建议范围：0.15-0.5
- 两个参数通常需要配合调整：高度越高的标签，scale 也应适当增大
- 配置会影响所有城市标签，如需个别城市不同样式，请使用 `cityLabelRenderer` 自定义渲染

## 🛠️ 本地开发

```bash
# 克隆仓库
git clone <repository-url>
cd vue3-china-map-3d

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 📂 项目结构

```
vue3-china-map-3d/
├── src/
│   ├── components/
│   │   └── Map3D.vue              # 主组件
│   ├── core/
│   │   ├── scene/
│   │   │   ├── zhejiang-map-scene.ts  # 3D场景引擎
│   │   │   ├── map-geometry.ts        # 几何体构建
│   │   │   ├── map-config.ts          # 地图配置
│   │   │   ├── markers.ts             # 城市标记
│   │   │   ├── environment.ts         # 环境层
│   │   │   └── types.ts               # 类型定义
│   │   └── zhejiangCityBoards.ts      # 城市数据
│   ├── assets/
│   │   ├── geo/                       # GeoJSON 数据
│   │   ├── textures/                  # 纹理贴图
│   │   └── styles/                    # CSS 样式
│   └── index.ts                       # 入口文件
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🔧 技术栈

- **Vue 3.4+** - 渐进式 JavaScript 框架
- **Three.js 0.171** - 3D 图形库
- **D3-geo 3.1** - 地理投影库
- **GSAP 3.13** - 动画库
- **TypeScript 5.8** - 类型安全

## 📝 注意事项

1. **容器尺寸**: 确保父容器有明确的宽高
2. **GeoJSON 数据**: 目前内置浙江省数据，其他省份需自行准备
3. **性能优化**: 大数据量时建议简化 GeoJSON 精度
4. **浏览器兼容**: 需要支持 WebGL 的现代浏览器

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

## 🙏 致谢

本项目基于浙江省监控大屏项目抽离而来。
