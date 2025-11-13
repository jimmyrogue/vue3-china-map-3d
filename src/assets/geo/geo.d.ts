declare module '@/assets/geo/zhejiang.json' {
  import type { FeatureCollection } from 'geojson'
  const value: FeatureCollection
  export default value
}

declare module '@/assets/geo/*.json' {
  import type { FeatureCollection } from 'geojson'
  const value: FeatureCollection
  export default value
}