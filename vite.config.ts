import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // 自定义插件：构建完成后生成指定文件
    {
      name: 'generate-custom-file',
      closeBundle() {
        const filePath = resolve(__dirname, 'dist', '74f525054197ed47230b42b55e35d505.txt')
        const fileContent = '2e5efdfb8848641bd3a6b676331d1891a4bfb639'
        writeFileSync(filePath, fileContent, 'utf8')
        console.log('✅ 已生成文件:', filePath)
      }
    }
  ],
})
