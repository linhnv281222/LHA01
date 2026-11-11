<script setup lang="ts">
// Thanh trên cùng: logo (về trang chủ), menu chính (dropdown cho mục cha), lời chào, ngôn ngữ,
// thông báo, đăng xuất. Logo và vị trí các nút giống nhau trên mọi trang.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Dropdown, dialog } from 'frappe-ui'
import type { MenuItem } from './menu'

defineProps<{ appTitle: string; menu: MenuItem[] }>()
const route = useRoute()
const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`
const userName = computed(() => window.user_fullname || window.session_user || '')

function isActive(item: MenuItem): boolean {
  if (item.route) return route.path === item.route || route.path.startsWith(item.route + '/')
  return (item.children ?? []).some(isActive)
}

type Opt = { label: string; icon?: string; route?: string; submenu?: Opt[] }
function toOptions(items: MenuItem[]): Opt[] {
  return items.map((c) =>
    c.children?.length ? { label: c.label, icon: c.icon, submenu: toOptions(c.children) } : { label: c.label, icon: c.icon, route: c.route },
  )
}

function logout() {
  dialog.confirm({
    title: 'Đăng xuất',
    message: 'Anh/chị có chắc muốn đăng xuất khỏi hệ thống?',
    confirmLabel: 'Đăng xuất',
    cancelLabel: 'Ở lại',
    onConfirm: async () => {
      await fetch('/api/method/logout', {
        method: 'POST',
        headers: { 'X-Frappe-CSRF-Token': window.csrf_token ?? '' },
      })
      window.location.href = '/login'
    },
  })
}
</script>

<template>
  <header class="sticky top-0 z-30 flex h-12 items-center gap-4 bg-fn-brand px-4 text-white shadow-sm">
    <RouterLink to="/" class="flex items-center gap-2 whitespace-nowrap text-lg-semibold text-white" aria-label="Về trang chủ">
      <img :src="logoUrl" alt="" class="size-7 rounded-3 ring-1 ring-white/40" />
      {{ appTitle }}
    </RouterLink>

    <nav class="flex min-w-0 flex-1 items-center gap-1" aria-label="Menu chính">
      <template v-for="item in menu" :key="item.label">
        <Dropdown v-if="item.children?.length" :options="toOptions(item.children) as any">
          <button type="button" class="fn-nav-item" :class="isActive(item) ? 'fn-nav-active' : ''">
            {{ item.label }}
            <span class="lucide-chevron-down size-3.5" aria-hidden="true" />
          </button>
        </Dropdown>
        <RouterLink v-else :to="item.route ?? '/'" class="fn-nav-item" :class="isActive(item) ? 'fn-nav-active' : ''">
          {{ item.label }}
        </RouterLink>
      </template>
    </nav>

    <div class="flex items-center gap-2 text-base">
      <span class="hidden whitespace-nowrap lg:inline">Xin chào, <strong>{{ userName }}</strong></span>
      <span class="rounded-4 px-2 py-1 text-sm-medium ring-1 ring-white/40" title="Ngôn ngữ: Tiếng Việt">VI</span>
      <button type="button" class="fn-icon-btn" aria-label="Thông báo" title="Thông báo">
        <span class="lucide-bell size-4" aria-hidden="true" />
      </button>
      <button type="button" class="fn-icon-btn" aria-label="Đăng xuất" title="Đăng xuất" @click="logout">
        <span class="lucide-log-out size-4" aria-hidden="true" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.fn-nav-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}
.fn-nav-item:hover {
  background: rgb(255 255 255 / 0.14);
}
.fn-nav-active {
  background: rgb(255 255 255 / 0.22);
  box-shadow: inset 0 -2px 0 #fff;
}
.fn-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
}
.fn-icon-btn:hover {
  background: rgb(255 255 255 / 0.14);
}
</style>
