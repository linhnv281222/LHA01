<script setup lang="ts">
// Nút hành động chính, màu chủ đạo #1D5FA8. Mỗi màn hình chỉ một nút chính; nhãn là động từ cụ thể
// ("Lưu", "Trình ký", "Thêm loại hợp đồng"), không dùng "Submit"/"OK".
import { Button } from 'frappe-ui'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <Button v-bind="$attrs" variant="solid" theme="blue" size="md" class="fn-primary" />
</template>
