import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'

function copyAssets() {
  return {
    name: 'copy-assets',
    closeBundle() {
      const copyDir = (src: string, dest: string) => {
        mkdirSync(dest, { recursive: true })
        const entries = readdirSync(src, { withFileTypes: true })
        for (const entry of entries) {
          const srcPath = join(src, entry.name)
          const destPath = join(dest, entry.name)
          if (entry.isDirectory()) {
            copyDir(srcPath, destPath)
          } else {
            copyFileSync(srcPath, destPath)
          }
        }
      }
      copyDir(resolve(__dirname, 'src/assets'), resolve(__dirname, 'dist/assets'))
    }
  }
}

export default defineConfig({
  plugins: [vue(), copyAssets()],
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp'],
  build: {
    assetsInlineLimit: 0, // 禁止将资源转换为 base64
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Vue3ChinaMap3D',
      fileName: (format) => `vue3-china-map-3d.${format}.js`
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
        },
        // 关键：确保资源文件不被内联到 chunk 中
        inlineDynamicImports: false
      }
    },
    cssCodeSplit: false,
    copyPublicDir: false,
    // 确保资源文件被正确处理
    assetsDir: 'assets'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
