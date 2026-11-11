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
    {
      path: '/vat-rates',
      name: 'VatRateList',
      component: () => import('./pages/vat-rates/VatRateList.vue'),
    },
    {
      path: '/vat-rates/new',
      name: 'VatRateNew',
      component: () => import('./pages/vat-rates/VatRateForm.vue'),
    },
    {
      path: '/vat-rates/:name/edit',
      name: 'VatRateEdit',
      component: () => import('./pages/vat-rates/VatRateForm.vue'),
      props: true,
    },
    {
      path: '/customers',
      name: 'CustomerList',
      component: () => import('./pages/customers/CustomerList.vue'),
    },
    {
      path: '/customers/new',
      name: 'CustomerNew',
      component: () => import('./pages/customers/CustomerForm.vue'),
    },
    {
      path: '/customers/:name/edit',
      name: 'CustomerEdit',
      component: () => import('./pages/customers/CustomerForm.vue'),
      props: true,
    },
    {
      path: '/contracts',
      name: 'ContractList',
      component: () => import('./pages/contracts/ContractList.vue'),
    },
    {
      path: '/contracts/new',
      name: 'ContractNew',
      component: () => import('./pages/contracts/ContractForm.vue'),
    },
    {
      path: '/contracts/:name/edit',
      name: 'ContractEdit',
      component: () => import('./pages/contracts/ContractForm.vue'),
      props: true,
    },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('./pages/NotFound.vue') },
  ],
})
