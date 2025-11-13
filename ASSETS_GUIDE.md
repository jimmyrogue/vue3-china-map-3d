# 资源加载配置指南

## 📋 问题背景

本包包含大量图片资源（纹理、法线贴图、环境贴图等），这些资源以独立文件形式存在于 `dist/assets/` 目录中，而不是被 base64 inline 到 JS 文件中。

## ✅ 默认行为

默认情况下，资源会从以下路径加载：

```
http://your-domain.com/node_modules/vue3-china-map-3d/dist/assets/
```

这在大多数情况下都能正常工作，因为包会使用 `import.meta.url` 动态计算资源的实际位置。

## 🔧 自定义资源路径

如果你的项目有特殊的部署需求（例如 CDN、静态资源服务器等），可以手动配置资源基础路径：

### 方法 1：在应用启动时配置

```typescript
import { createApp } from 'vue'
import { setAssetsBasePath } from 'vue3-china-map-3d'
import App from './App.vue'

// 设置自定义资源路径
setAssetsBasePath('https://cdn.example.com/vue3-china-map-3d/assets')

createApp(App).mount('#app')
```

### 方法 2：在组件中配置

```vue
<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { Map3D, setAssetsBasePath } from 'vue3-china-map-3d'

onBeforeMount(() => {
  // 在组件挂载前设置资源路径
  setAssetsBasePath('/static/map-assets')
})
</script>

<template>
  <Map3D />
</template>
```

## 🐛 调试资源加载问题

如果你遇到图片无法加载的问题，可以按照以下步骤排查：

### 1. 检查资源文件是否存在

确认 `dist/assets/` 目录已被正确部署：

```bash
# 检查本地构建产物
ls -la node_modules/vue3-china-map-3d/dist/assets/

# 应该看到以下目录结构：
# assets/
# ├── geo/
# ├── images/
# │   ├── city/
# │   └── district/
# ├── styles/
# └── textures/
#     └── zhejiang/
```

### 2. 在浏览器中验证资源 URL

打开浏览器开发者工具，在 Console 中运行：

```javascript
// 检查当前使用的资源基础路径
console.log(import.meta.url)

// 手动测试资源 URL
const testUrl = new URL('./assets/textures/zhejiang/baseColor.png', import.meta.url).href
console.log('Test URL:', testUrl)

// 尝试加载测试图片
const img = new Image()
img.onload = () => console.log('✅ 图片加载成功')
img.onerror = () => console.error('❌ 图片加载失败')
img.src = testUrl
```

### 3. 检查网络请求

在浏览器开发者工具的 Network 标签中：

1. 筛选 `Img` 类型的请求
2. 查看失败的图片请求
3. 检查请求的 URL 是否正确
4. 检查响应状态码（404 = 文件不存在，403 = 权限问题）

### 4. 常见问题和解决方案

#### 问题 1：404 Not Found

**原因**：资源文件路径不正确

**解决方案**：
```typescript
import { setAssetsBasePath } from 'vue3-china-map-3d'

// 根据你的实际部署路径调整
setAssetsBasePath('/node_modules/vue3-china-map-3d/dist/assets')
```

#### 问题 2：CORS 错误

**原因**：资源托管在不同的域名，且未配置 CORS

**解决方案**：
- 在资源服务器上配置 CORS 头：
  ```
  Access-Control-Allow-Origin: *
  ```
- 或者将资源部署到同域名下

#### 问题 3：相对路径错误

**原因**：使用了相对路径，但实际运行环境与预期不符

**解决方案**：
```typescript
// 使用绝对路径
setAssetsBasePath('https://your-domain.com/assets')

// 或者使用相对于根目录的路径
setAssetsBasePath('/static/vue3-china-map-3d/assets')
```

## 📦 部署建议

### Vite 项目

如果你使用 Vite 构建工具，资源会自动被正确处理。无需额外配置。

### Webpack 项目

确保 Webpack 配置中包含对 `node_modules` 的静态资源处理：

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
}
```

### CDN 部署

如果你将包部署到 CDN，确保目录结构如下：

```
https://cdn.example.com/vue3-china-map-3d/
├── vue3-china-map-3d.es.js
├── vue3-china-map-3d.umd.js
├── style.css
└── assets/
    ├── geo/
    ├── images/
    ├── styles/
    └── textures/
```

然后在代码中配置：

```typescript
setAssetsBasePath('https://cdn.example.com/vue3-china-map-3d/assets')
```

### Nginx 静态服务器

确保 Nginx 配置允许访问静态资源：

```nginx
location /node_modules/vue3-china-map-3d/dist/assets/ {
    alias /path/to/node_modules/vue3-china-map-3d/dist/assets/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔍 高级调试

如果以上方法都无法解决问题，可以启用详细日志：

```typescript
// 在浏览器 Console 中运行
localStorage.setItem('DEBUG_ASSETS', 'true')

// 然后刷新页面，查看详细的资源加载日志
```

或者手动检查资源加载逻辑：

```typescript
import { getAssetUrl } from 'vue3-china-map-3d/dist/vue3-china-map-3d.es.js'

// 注意：这是内部 API，仅用于调试
console.log('Base Color URL:', getAssetUrl('textures/zhejiang/baseColor.png'))
console.log('City Texture URL:', getAssetUrl('images/city/hangzhou.jpg'))
```

## 📞 获取帮助

如果你仍然遇到问题，请提供以下信息：

1. 你的构建工具（Vite / Webpack / 其他）
2. 部署环境（本地开发 / 生产服务器 / CDN）
3. 浏览器 Console 中的错误信息
4. Network 标签中失败的资源请求 URL
5. 你的 `setAssetsBasePath()` 配置（如果有）

在 GitHub Issues 中提交问题：https://github.com/your-repo/vue3-china-map-3d/issues
