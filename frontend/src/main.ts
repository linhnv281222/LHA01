import { createApp } from 'vue'
import './style.css'

// Kiểm tra đường dẫn TRƯỚC khi nạp router: createWebHistory('/contracts') sẽ đổi
// URL /login thành /contracts/login ngay khi router được import.
async function bootstrap() {
  if (window.location.pathname.replace(/\/$/, '') === '/login') {
    // Trang đăng nhập là trang cho khách: không có menu và router.
    const { default: LoginApp } = await import('./pages/login/LoginApp.vue')
    createApp(LoginApp).mount('#app')
  } else {
    const [{ default: App }, { router }] = await Promise.all([
      import('./App.vue'),
      import('./router'),
    ])
    createApp(App).use(router).mount('#app')
  }
}

bootstrap()
