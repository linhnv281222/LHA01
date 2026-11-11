// Ứng dụng phục vụ ở /contracts (xem vite.config.ts). Mỗi màn hình một route; đường dẫn tiếng Anh, gạch ngang.
import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory('/contracts'),
  routes: [
    { path: '/', redirect: '/contract-types' },
    {
      path: '/contract-types',
      name: 'ContractTypeList',
      component: () => import('./pages/contract-types/ContractTypeList.vue'),
    },
    {
      path: '/contract-types/new',
      name: 'ContractTypeNew',
      component: () => import('./pages/contract-types/ContractTypeForm.vue'),
    },
    {
      path: '/contract-types/:name/edit',
      name: 'ContractTypeEdit',
      component: () => import('./pages/contract-types/ContractTypeForm.vue'),
      props: true,
    },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('./pages/NotFound.vue') },
  ],
})
