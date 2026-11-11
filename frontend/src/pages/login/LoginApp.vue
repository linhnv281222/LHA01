<script setup lang="ts">
import { FrappeUIProvider } from 'frappe-ui'
import LoginPage from './LoginPage.vue'

document.title = 'Đăng nhập | Công ty LHA'
</script>

<template>
  <FrappeUIProvider>
    <LoginPage />
  </FrappeUIProvider>
</template>
