import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp'],
  build: {
    assetsInlineLimit: 0, // 禁止将资源转换为 base64
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Vue3ChinaMap3D',
      fileName: (format) => `vue3-china-map-3d.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['vue', 'three', 'd3-geo', 'gsap', 'lodash-es'],
      output: {
        globals: {
          vue: 'Vue',
          three: 'THREE',
          'd3-geo': 'd3',
          gsap: 'gsap',
          'lodash-es': '_'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'style.css'
          // 确保所有图片资源都输出到 assets 目录
          if (/\.(png|jpe?g|gif|svg|webp)$/i.test(assetInfo.name || '')) {
            return 'assets/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    cssCodeSplit: false,
    copyPublicDir: false,
    // 确保资源文件被正确处理
    assetsDir: 'assets',
    // 增加 chunk 大小警告阈值（因为有大量 GeoJSON 数据）
    chunkSizeWarningLimit: 2000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
