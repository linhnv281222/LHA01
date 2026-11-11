/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
interface Window {
  csrf_token?: string
  session_user?: string
  user_fullname?: string
}
