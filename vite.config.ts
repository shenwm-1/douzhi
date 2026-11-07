import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/douzhi/',
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      // 网易云音乐API代理
      '/api/netease': {
        target: 'https://music.163.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/netease/, '/api'),
        headers: {
          'Referer': 'https://music.163.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      },
      // QQ音乐API代理
      '/api/qq': {
        target: 'https://c.y.qq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/qq/, ''),
        headers: {
          'Referer': 'https://y.qq.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    }
  }
})
