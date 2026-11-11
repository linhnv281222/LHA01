<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import { Alert, Password } from 'frappe-ui'
import { FnField, PrimaryButton, focusField, isEmpty, useFormValidation } from '@/standard'
import LhaLogo from './LhaLogo.vue'
import { FORGOT_PASSWORD_URL, LOGIN_RULES, emptyLoginForm, redirectTarget, submitLogin } from './login'

const form = reactive(emptyLoginForm())
const { errors, validateField, validateAll } = useFormValidation(form, LOGIN_RULES)
const submitting = ref(false)
const serverError = ref('')

async function onSubmit() {
  if (submitting.value) return
  if (!validateAll()) return
  submitting.value = true
  serverError.value = ''
  const result = await submitLogin(form)
  if (result.ok) {
    // Giữ trạng thái đang xử lý cho tới khi trang chuyển.
    window.location.href = redirectTarget(window.location.search)
    return
  }
  serverError.value = result.message
  form.pwd = ''
  submitting.value = false
  await nextTick()
  focusField('pwd')
}
</script>

<template>
  <div class="flex min-h-screen flex-col overflow-x-hidden bg-surface-base text-base text-ink-gray-8">
    <div class="flex flex-1">
      <section class="hidden flex-col items-center justify-center gap-6 bg-fn-brand px-12 text-center text-white lg:flex lg:w-3/5">
        <LhaLogo size="lg" />
        <h1 class="text-3xl font-bold">CÔNG TY LHA</h1>
        <p class="max-w-md text-lg">Quản lý hợp đồng và thu tiền tập trung, minh bạch</p>
      </section>

      <main class="flex w-full items-center justify-center px-4 py-8 lg:w-2/5">
        <div class="w-full max-w-sm">
          <LhaLogo size="sm" />
          <div class="space-y-5 rounded-lg border border-outline-gray-2 bg-surface-white p-6">
            <h2 class="text-2xl font-semibold text-ink-gray-9">Đăng nhập</h2>
            <form novalidate class="space-y-4" @submit.prevent="onSubmit">
              <FnField
                v-model="form.usr"
                field="usr"
                label="Email hoặc tên đăng nhập"
                required
                :error="errors.usr"
                @blur="validateField('usr')"
              />

              <div data-field="pwd" class="space-y-1.5">
                <label for="login-pwd" class="flex items-center gap-0.5 text-sm-medium text-ink-gray-7">
                  Mật khẩu
                  <span :class="isEmpty(form.pwd) ? 'text-ink-red-6' : 'text-ink-gray-9'" aria-hidden="true">*</span>
                  <span class="sr-only">(bắt buộc)</span>
                </label>
                <div :class="errors.pwd ? 'pwd-invalid' : ''">
                  <Password
                    id="login-pwd"
                    v-model="form.pwd"
                    variant="outline"
                    autocomplete="current-password"
                    :aria-invalid="!!errors.pwd"
                    :aria-describedby="errors.pwd ? 'login-pwd-err' : undefined"
                    @blur="validateField('pwd')"
                  />
                </div>
                <p v-if="errors.pwd" id="login-pwd-err" class="flex items-center gap-1 text-sm text-ink-red-7" role="alert">
                  <span class="lucide-circle-alert size-3.5 shrink-0" aria-hidden="true" />{{ errors.pwd }}
                </p>
              </div>

              <PrimaryButton type="submit" label="Đăng nhập" class="w-full" :loading="submitting" :disabled="submitting" />
            </form>
            <div class="text-center text-sm">
              <a :href="FORGOT_PASSWORD_URL" class="text-fn-brand hover:underline">Quên mật khẩu?</a>
            </div>
          </div>
          <div class="mt-4" aria-live="polite">
            <Alert v-if="serverError" theme="red" :title="serverError" />
          </div>
        </div>
      </main>
    </div>
    <footer class="py-3 text-center text-sm text-ink-gray-5">© 2026 Công ty LHA</footer>
  </div>
</template>

<style scoped>
/* Tương đương .fn-invalid của FnField (style scoped, không dùng lại được). */
.pwd-invalid :deep(input) {
  border-color: var(--outline-red-3);
}
</style>
