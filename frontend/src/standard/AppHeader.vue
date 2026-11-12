<script setup lang="ts">
// Thanh trên cùng (nền trắng, mục đang mở gạch chân màu chủ đạo): logo, menu chính (dropdown cho mục cha,
// nhãn nhóm khi mục có group), lời chào, ngôn ngữ,
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
  <header class="sticky top-0 z-30 flex h-12 items-center gap-6 border-b border-outline-gray-2 bg-surface-base px-4">
    <RouterLink to="/" class="flex items-center gap-2 whitespace-nowrap text-lg-semibold text-ink-gray-9" aria-label="Về trang chủ">
      <img :src="logoUrl" alt="" class="size-7 rounded-4" />
      {{ appTitle }}
    </RouterLink>

    <nav class="flex h-full min-w-0 flex-1 items-stretch gap-0.5" aria-label="Menu chính">
      <template v-for="(item, i) in menu" :key="item.label">
        <span
          v-if="item.group && item.group !== menu[i - 1]?.group"
          class="ml-2 flex items-center whitespace-nowrap border-l border-outline-gray-2 pl-3 pr-1 text-sm text-ink-gray-4"
        >
          {{ item.group }}
        </span>
        <Dropdown v-if="item.children?.length" :options="toOptions(item.children) as any">
          <button type="button" class="fn-nav-item" :class="isActive(item) ? 'fn-nav-active' : ''">
            {{ item.label }}
            <span class="lucide-chevron-down size-3.5" aria-hidden="true" />
          </button>
        </Dropdown>
        <RouterLink
          v-else
          :to="item.route ?? '/'"
          class="fn-nav-item"
          :class="isActive(item) ? 'fn-nav-active' : ''"
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          {{ item.label }}
        </RouterLink>
      </template>
    </nav>

    <div class="flex items-center gap-1 text-base text-ink-gray-7">
      <span class="mr-1 hidden whitespace-nowrap lg:inline">Xin chào, <strong class="text-ink-gray-9">{{ userName }}</strong></span>
      <span class="rounded-4 border border-outline-gray-2 px-1.5 py-0.5 text-sm-medium text-ink-gray-6" title="Ngôn ngữ: Tiếng Việt">VI</span>
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
  height: 100%;
  padding: 0 10px;
  color: var(--ink-gray-6);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
}
.fn-nav-item:hover {
  color: var(--ink-gray-9);
  background: var(--surface-gray-1);
}
.fn-nav-active,
.fn-nav-active:hover {
  color: theme('colors.fn.brand');
  border-bottom-color: theme('colors.fn.brand');
  background: transparent;
}
.fn-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--ink-gray-6);
}
.fn-icon-btn:hover {
  background: var(--surface-gray-2);
  color: var(--ink-gray-9);
}
</style>
