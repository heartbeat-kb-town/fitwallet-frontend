import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // `vite-plugin-vue-devtools` 를 뺐다 (#202). 개발 서버에서 화면 아래에 패널이 떠서
  // 실제 화면이 어떻게 보이는지 확인하는 데 방해가 됐다. `create-vue` 스캐폴드가 기본으로
  // 넣어 주는 것이고 이 저장소에서 따로 설정해 쓰던 흔적은 없었다.
  //
  // 개발 서버에만 붙던 플러그인이라 빌드 결과물은 그대로다.
  // 다시 필요하면 `npm i -D vite-plugin-vue-devtools` 하고 이 배열에 한 줄 되살리면 된다.
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      // '@' 를 src 로 매핑 (파일 시스템 절대경로 하드코딩 없이 이동 가능)
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 개발 서버(npm run dev)에서 /api 요청을 백엔드(Tomcat, 8080)로 포워딩.
      // 개발 중 CORS 를 신경 쓰지 않아도 된다.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
