import type { App } from 'vue'
import Map3D from './components/Map3D.vue'
import './assets/styles/index.css'

// 导出组件
export { Map3D }

// 导出资源配置函数
export { setAssetsBasePath, resetAssetsBasePath, setDebugMode } from './core/config/asset-config'

// 导出类型
export type { CityBoardDatum, CityDistrictDatum } from './core/zhejiangCityBoards'
export type { ZhejiangMapSceneOptions, ZhejiangMapSceneMountOptions } from './core/scene/zhejiang-map-scene'
export type { CityRiskDatum, MapBoundingBox } from './core/scene/map-config'

// Vue 插件安装
export default {
  install(app: App) {
    app.component('Map3D', Map3D)
  }
}
