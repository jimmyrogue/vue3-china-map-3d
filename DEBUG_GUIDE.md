# 🐛 资源加载问题调试指南

## 📋 问题描述

如果你遇到 Three.js 的 `TextureLoader` 无法加载图片，或者在浏览器 Console 中看到图片加载失败的错误，请按照以下步骤进行调试。

---

## 🔍 第一步：启用调试模式

在你的应用入口文件中，启用调试模式：

```typescript
import { createApp } from 'vue'
import { setDebugMode } from 'vue3-china-map-3d'
import App from './App.vue'

// 🔥 启用调试模式
setDebugMode(true)

createApp(App).mount('#app')
```

**调试模式会在浏览器 Console 中输出详细的资源 URL 生成日志**，包括：
- `import.meta.url` 的实际值
- 每个资源的完整 URL
- 资源路径的生成过程

---

## 🧪 第二步：检查 Console 输出

启用调试模式后，打开浏览器开发者工具的 **Console** 标签，你会看到类似这样的输出：

```
[Vue3ChinaMap3D] 调试模式已启用
[Vue3ChinaMap3D] import.meta.url = http://localhost:3000/node_modules/vue3-china-map-3d/dist/vue3-china-map-3d.es.js
[Vue3ChinaMap3D] 生产模式:
  - 当前模块 URL: http://localhost:3000/node_modules/vue3-china-map-3d/dist/vue3-china-map-3d.es.js
  - 基础 URL: http://localhost:3000/node_modules/vue3-china-map-3d/dist
  - 资源路径: textures/zhejiang/baseColor.png
  - 最终 URL: http://localhost:3000/node_modules/vue3-china-map-3d/dist/assets/textures/zhejiang/baseColor.png
```

### ✅ 检查要点

1. **`import.meta.url` 是否正确？**
   - 应该指向你的 `vue3-china-map-3d.es.js` 文件
   - 如果是 `blob:` 或 `data:` 开头，说明有问题

2. **最终 URL 是否可访问？**
   - 复制 Console 中的 "最终 URL"
   - 在浏览器新标签页中打开
   - 检查图片是否能正常显示

3. **路径是否正确？**
   - 确认 `assets/` 目录在 `dist/` 目录下
   - 确认图片文件确实存在

---

## 🔧 第三步：检查 Network 请求

在浏览器开发者工具的 **Network** 标签中：

1. 筛选 `Img` 类型的请求
2. 查看失败的图片请求（红色）
3. 点击失败的请求，查看详细信息

### 常见错误和解决方案

#### ❌ 错误 1：404 Not Found

**原因**：资源文件路径不正确或文件不存在

**解决方案**：

```typescript
import { setAssetsBasePath } from 'vue3-china-map-3d'

// 方案 A：使用绝对路径
setAssetsBasePath('http://localhost:3000/node_modules/vue3-china-map-3d/dist/assets')

// 方案 B：使用相对于根目录的路径
setAssetsBasePath('/node_modules/vue3-china-map-3d/dist/assets')

// 方案 C：如果资源在 CDN 上
setAssetsBasePath('https://cdn.example.com/vue3-china-map-3d/assets')
```

#### ❌ 错误 2：CORS 错误

**原因**：资源托管在不同的域名，且未配置 CORS

**解决方案**：

1. **在资源服务器上配置 CORS 头**：
   ```nginx
   add_header Access-Control-Allow-Origin *;
   ```

2. **或者将资源部署到同域名下**

#### ❌ 错误 3：`import.meta.url` 返回 `blob:` 或 `data:`

**原因**：某些构建工具或打包方式会导致 `import.meta.url` 不可用

**解决方案**：

```typescript
import { setAssetsBasePath } from 'vue3-china-map-3d'

// 手动指定资源路径
setAssetsBasePath('/static/vue3-china-map-3d/assets')
```

---

## 📦 第四步：验证资源文件

确认资源文件已被正确部署：

### 本地开发环境

```bash
# 检查 node_modules 中的资源
ls -la node_modules/vue3-china-map-3d/dist/assets/

# 应该看到以下目录结构：
# assets/
# ├── geo/
# ├── images/
# │   ├── city/
# │   │   ├── hangzhou.jpg
# │   │   ├── ningbo.jpg
# │   │   └── ...
# │   └── district/
# ├── styles/
# └── textures/
#     └── zhejiang/
#         ├── baseColor.png (1.2MB)
#         ├── background.png (4.2MB)
#         ├── normal.jpg (828KB)
#         └── ...
```

### 生产环境

确认部署后的目录结构：

```
your-domain.com/
├── node_modules/
│   └── vue3-china-map-3d/
│       └── dist/
│           ├── vue3-china-map-3d.es.js
│           ├── vue3-china-map-3d.umd.js
│           ├── style.css
│           └── assets/  ← 必须存在！
│               ├── geo/
│               ├── images/
│               ├── styles/
│               └── textures/
```

---

## 🎯 第五步：手动测试资源加载

在浏览器 Console 中运行以下代码，手动测试资源加载：

```javascript
// 测试图片加载
const testUrl = 'http://localhost:3000/node_modules/vue3-china-map-3d/dist/assets/textures/zhejiang/baseColor.png'

const img = new Image()
img.onload = () => console.log('✅ 图片加载成功！', img.width, 'x', img.height)
img.onerror = (e) => console.error('❌ 图片加载失败！', e)
img.src = testUrl

// 或者使用 fetch 测试
fetch(testUrl)
  .then(res => {
    console.log('✅ 资源可访问！状态码:', res.status)
    return res.blob()
  })
  .then(blob => {
    console.log('✅ 资源大小:', (blob.size / 1024 / 1024).toFixed(2), 'MB')
  })
  .catch(err => {
    console.error('❌ 资源访问失败！', err)
  })
```

---

## 🚀 完整的调试示例

```typescript
// main.ts
import { createApp } from 'vue'
import { setDebugMode, setAssetsBasePath } from 'vue3-china-map-3d'
import 'vue3-china-map-3d/style.css'
import App from './App.vue'

// 1. 启用调试模式
setDebugMode(true)

// 2. 如果自动检测失败，手动设置资源路径
// setAssetsBasePath('/node_modules/vue3-china-map-3d/dist/assets')

// 3. 创建应用
const app = createApp(App)
app.mount('#app')

// 4. 在 Console 中查看调试信息
console.log('应用已启动，请检查 Console 中的资源加载日志')
```

---

## 📝 常见部署场景

### 场景 1：Vite 开发服务器

**无需额外配置**，资源会自动被正确处理。

### 场景 2：Vite 生产构建

```typescript
// vite.config.ts
export default defineConfig({
  // 确保 node_modules 中的资源可访问
  server: {
    fs: {
      allow: ['..']
    }
  }
})
```

### 场景 3：Nginx 静态服务器

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/html;

  # 允许访问 node_modules 中的资源
  location /node_modules/ {
    alias /var/www/html/node_modules/;
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Access-Control-Allow-Origin *;
  }

  # 或者将资源复制到 static 目录
  location /static/vue3-china-map-3d/ {
    alias /var/www/html/static/vue3-china-map-3d/;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

然后在代码中配置：

```typescript
setAssetsBasePath('/static/vue3-china-map-3d/assets')
```

### 场景 4：CDN 部署

```typescript
// 将资源上传到 CDN
// https://cdn.example.com/vue3-china-map-3d/assets/...

setAssetsBasePath('https://cdn.example.com/vue3-china-map-3d/assets')
```

---

## 🔍 高级调试技巧

### 1. 拦截 TextureLoader 请求

```typescript
import * as THREE from 'three'

// 保存原始的 load 方法
const originalLoad = THREE.TextureLoader.prototype.load

// 重写 load 方法，添加日志
THREE.TextureLoader.prototype.load = function(url, onLoad, onProgress, onError) {
  console.log('[TextureLoader] 正在加载:', url)

  return originalLoad.call(
    this,
    url,
    (texture) => {
      console.log('[TextureLoader] ✅ 加载成功:', url)
      onLoad?.(texture)
    },
    onProgress,
    (error) => {
      console.error('[TextureLoader] ❌ 加载失败:', url, error)
      onError?.(error)
    }
  )
}
```

### 2. 检查所有资源 URL

```typescript
import { setDebugMode } from 'vue3-china-map-3d'

// 启用调试模式
setDebugMode(true)

// 然后在 Console 中运行：
// 这会输出所有资源的 URL
```

### 3. 使用测试页面

打开项目根目录下的 `test-assets.html` 文件，在浏览器中测试资源加载。

---

## 📞 仍然无法解决？

如果以上方法都无法解决问题，请提供以下信息：

1. **浏览器 Console 的完整输出**（启用调试模式后）
2. **Network 标签中失败的请求详情**
3. **你的部署环境**（本地开发 / 生产服务器 / CDN）
4. **你的构建工具和版本**（Vite / Webpack / 其他）
5. **`import.meta.url` 的实际值**
6. **失败的资源 URL**

在 GitHub Issues 中提交问题，我们会尽快帮你解决！

---

## ✅ 成功标志

当一切正常时，你应该看到：

1. **Console 中**：
   ```
   [Vue3ChinaMap3D] 调试模式已启用
   [Vue3ChinaMap3D] import.meta.url = http://...
   [Vue3ChinaMap3D] 生产模式: ...
   [TextureLoader] ✅ 加载成功: http://.../baseColor.png
   [TextureLoader] ✅ 加载成功: http://.../normal.jpg
   ...
   ```

2. **Network 标签中**：
   - 所有图片请求都是绿色（200 OK）
   - 没有 404 或 CORS 错误

3. **页面上**：
   - 3D 地图正常显示
   - 纹理和材质正确渲染
   - 没有黑色或白色的缺失纹理

🎉 **恭喜！资源加载成功！**
