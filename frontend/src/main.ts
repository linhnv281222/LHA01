import { createApp } from 'vue'
import { router } from './router'
import './style.css'
import App from './App.vue'
import LoginApp from './pages/login/LoginApp.vue'

// Trang đăng nhập (/login) là trang cho khách: không có menu và router.
if (window.location.pathname.replace(/\/$/, '') === '/login') {
  createApp(LoginApp).mount('#app')
} else {
  createApp(App).use(router).mount('#app')
}
