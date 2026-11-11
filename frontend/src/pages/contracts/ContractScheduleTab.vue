<script setup lang="ts">
// Tab "Lịch thu" của form hợp đồng: các đợt thu do hệ thống sinh, chỉ đọc.
import { computed } from 'vue'
import { Alert, Button, LoadingText, useList } from 'frappe-ui'
import { FnField, FormSection, MiniTable, StatusBadge, serverErrorMessage } from '@/standard'
import {
  MSG_NO_SCHEDULE,
  SCHEDULE_COLUMNS,
  SCHEDULE_DOCTYPE,
  SCHEDULE_FIELDS,
  acceptanceStatusOf,
  invoiceStatusOf,
  overdueStatusOf,
  paymentStatusOf,
  requestStatusOf,
  scheduleTotals,
  showScheduleTable,
  type ScheduleRow,
} from './contract'

const props = defineProps<{ contract: string; status: string }>()

const list = useList<ScheduleRow>({
  doctype: SCHEDULE_DOCTYPE,
  fields: SCHEDULE_FIELDS,
  filters: { contract: props.contract },
  orderBy: 'due_date asc',
  limit: 1000,
})

const rows = computed<ScheduleRow[]>(() => list.data ?? [])
const totals = computed(() => scheduleTotals(rows.value))
const showTable = computed(() => showScheduleTable(props.status))

/** Tải lại dữ liệu tab (sau khi kích hoạt hoặc lưu thay đổi hạng mục). */
function reload() {
  return list.reload()
}
defineExpose({ reload })
</script>

<template>
  <div class="space-y-4">
    <p v-if="!showTable" class="text-base text-ink-gray-5">{{ MSG_NO_SCHEDULE }}</p>
    <template v-else>
      <div v-if="list.error" class="space-y-2">
        <Alert theme="red" title="Không tải được lịch thu" :description="serverErrorMessage(list.error)" />
        <Button size="sm" variant="outline" label="Thử lại" @click="reload" />
      </div>
      <LoadingText v-else-if="list.loading && !list.data" text="Đang tải lịch thu…" />
      <template v-else>
        <div class="overflow-x-auto">
          <MiniTable :columns="SCHEDULE_COLUMNS" :rows="rows" empty-text="Chưa có đợt thu nào.">
            <template #cell-acceptance_status="{ row }"><StatusBadge :status="acceptanceStatusOf(row as ScheduleRow)" /></template>
            <template #cell-request_status="{ row }"><StatusBadge :status="requestStatusOf(row as ScheduleRow)" /></template>
            <template #cell-invoice_status="{ row }"><StatusBadge :status="invoiceStatusOf(row as ScheduleRow)" /></template>
            <template #cell-payment_status="{ row }"><StatusBadge :status="paymentStatusOf(row as ScheduleRow)" /></template>
            <template #cell-is_overdue="{ row }"><StatusBadge :status="overdueStatusOf(row as ScheduleRow)" /></template>
          </MiniTable>
        </div>
        <FormSection title="Tổng" muted :columns="3">
          <FnField :model-value="totals.before" field="schedule_total_before" label="Trước thuế" type="currency" unit="VND" readonly />
          <FnField :model-value="totals.tax" field="schedule_total_tax" label="Tiền thuế" type="currency" unit="VND" readonly />
          <FnField :model-value="totals.total" field="schedule_total_amount" label="Tổng tiền" type="currency" unit="VND" readonly />
        </FormSection>
      </template>
    </template>
  </div>
</template>
