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
```

## 🎮 交互说明

- **鼠标悬停**: 城市/区县区块高亮并上浮
- **点击城市**: 进入该城市的市级视图
- **点击区县**: 进入该区县的详细视图
- **按 ESC 键**: 返回上一级视图
- **鼠标拖拽**: 旋转视角
- **鼠标滚轮**: 缩放视图

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
