<script setup lang="ts">
import { FrappeUIProvider } from 'frappe-ui'
import { AppHeader } from '@/standard'
import { MENU } from './menu'
</script>

<template>
  <FrappeUIProvider>
    <div class="min-h-screen bg-surface-base text-base text-ink-gray-8">
      <AppHeader app-title="Theo dõi hợp đồng" :menu="MENU" />
      <router-view />
    </div>
  </FrappeUIProvider>
</template>
