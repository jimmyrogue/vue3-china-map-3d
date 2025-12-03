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
| `hideCityLabel` | `boolean` | `false` | 隐藏所有城市标记（包括光柱和标签） |
| `hideDistrictLabel` | `boolean` | `false` | 隐藏所有区县标签 |
| `controlLimits` | `Partial<ControlLimits>` | - | 相机控制限制配置（缩放距离、旋转角度等） |

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
