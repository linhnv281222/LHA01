<script setup lang="ts">
// Ô phụ của một dòng hạng mục (slot #extra của LineItems): ô theo kiểu thu và bảng mốc thanh toán.
import { computed } from 'vue'
import { FnField, LineItems, formatCurrency, formatNumber, type SelectOption } from '@/standard'
import {
  BILL_TIMINGS,
  MILESTONE_INPUTS,
  PERIODS,
  emptyMilestone,
  milestoneColumns,
  milestoneSummary,
  type ItemForm,
} from './contract'

const props = defineProps<{
  item: ItemForm
  index: number
  errors: Record<string, string>
  disabled?: boolean
}>()

const asOptions = (list: string[]): SelectOption[] => list.map((v) => ({ label: v, value: v }))
const INPUT_OPTIONS = asOptions(MILESTONE_INPUTS)
const PERIOD_OPTIONS = asOptions(PERIODS)
const TIMING_OPTIONS = asOptions(BILL_TIMINGS)

const field = (name: string) => `items.${props.index}.${name}`
const err = (name: string) => props.errors[field(name)]
const mField = (j: number, name: string) => `items.${props.index}.milestones.${j}.${name}`

const byPercent = computed(() => props.item.milestone_input === 'Phần trăm')
const columns = computed(() => milestoneColumns(byPercent.value))
const summary = computed(() => milestoneSummary(props.item, props.item.milestones))
const off = computed(() => Math.abs(summary.value.diff) > 0.01)
const summaryText = computed(() => {
  const s = summary.value
  if (byPercent.value) return `Tổng: ${formatNumber(s.total)}% / Giá trị: 100% — Lệch: ${formatNumber(s.diff)}%`
  return `Tổng: ${formatCurrency(s.total)} / Giá trị: ${formatCurrency(s.target)} — Lệch: ${formatCurrency(s.diff)}`
})
const totalsRow = computed(() => ({ milestone_name: 'Tổng mốc', value: summaryText.value }))

function addMilestone() {
  props.item.milestones.push(emptyMilestone(props.item))
}
function removeMilestone(j: number) {
  props.item.milestones.splice(j, 1)
}
</script>

<template>
  <div class="space-y-3 pt-1">
    <!-- Một lần -->
    <div v-if="item.billing_type === 'Một lần'" class="grid grid-cols-4 gap-x-6 gap-y-4">
      <FnField v-model="item.amount" :field="field('amount')" label="Số tiền trước thuế" type="currency" unit="VND" required :disabled="disabled" :error="err('amount')" />
      <FnField v-model="item.due_date" :field="field('due_date')" label="Ngày đến hạn" type="date" required :disabled="disabled" :error="err('due_date')" />
    </div>

    <!-- Nhiều đợt -->
    <div v-else-if="item.billing_type === 'Nhiều đợt'" class="space-y-4">
      <div class="grid grid-cols-4 gap-x-6 gap-y-4">
        <FnField v-model="item.item_value" :field="field('item_value')" label="Giá trị hạng mục trước thuế" type="currency" unit="VND" required :disabled="disabled" :error="err('item_value')" />
        <FnField
          v-model="item.milestone_input"
          :field="field('milestone_input')"
          label="Cách nhập mốc"
          type="select"
          :options="INPUT_OPTIONS"
          :disabled="disabled"
          hint="Áp dụng cho mọi mốc của hạng mục."
        />
      </div>

      <div :data-field="field('milestones')" class="space-y-2">
        <h4 class="text-sm-semibold text-ink-gray-8">Mốc thanh toán</h4>
        <LineItems
          :columns="columns"
          :rows="item.milestones"
          add-label="Thêm mốc"
          :totals="totalsRow"
          :readonly="disabled"
          empty-text="Chưa có mốc. Bấm Thêm mốc để nhập đợt thanh toán."
          @add="addMilestone"
          @remove="removeMilestone"
        >
          <template #cell-milestone_name="{ row, index: j }">
            <FnField v-model="row.milestone_name" :field="mField(j, 'milestone_name')" label="Tên mốc" hide-label :maxlength="140" :disabled="disabled" :error="errors[mField(j, 'milestone_name')]" />
          </template>
          <template #cell-value="{ row, index: j }">
            <FnField
              v-if="byPercent"
              v-model="row.percent"
              :field="mField(j, 'percent')"
              label="Phần trăm"
              hide-label
              type="number"
              unit="%"
              :disabled="disabled"
              :error="errors[mField(j, 'percent')]"
            />
            <FnField
              v-else
              v-model="row.amount"
              :field="mField(j, 'amount')"
              label="Số tiền"
              hide-label
              type="currency"
              unit="VND"
              :disabled="disabled"
              :error="errors[mField(j, 'amount')]"
            />
          </template>
          <template #cell-due_date="{ row, index: j }">
            <FnField v-model="row.due_date" :field="mField(j, 'due_date')" label="Ngày đến hạn" hide-label type="date" :disabled="disabled" :error="errors[mField(j, 'due_date')]" />
          </template>
          <template #cell-requires_acceptance="{ row, index: j }">
            <FnField v-model="row.requires_acceptance" :field="mField(j, 'requires_acceptance')" label="Cần nghiệm thu" hide-label type="checkbox" :disabled="disabled" />
          </template>
        </LineItems>
        <p v-if="off" class="flex items-center gap-1 text-sm text-ink-red-7">
          <span class="lucide-circle-alert size-3.5 shrink-0" aria-hidden="true" />Tổng mốc đang lệch so với giá trị hạng mục.
        </p>
        <p v-if="errors[field('milestones')]" class="flex items-center gap-1 text-sm text-ink-red-7" role="alert">
          <span class="lucide-circle-alert size-3.5 shrink-0" aria-hidden="true" />{{ errors[field('milestones')] }}
        </p>
      </div>
    </div>

    <!-- Định kỳ -->
    <div v-else-if="item.billing_type === 'Định kỳ'" class="grid grid-cols-4 gap-x-6 gap-y-4">
      <FnField v-model="item.unit_price" :field="field('unit_price')" label="Đơn giá mỗi kỳ trước thuế" type="currency" unit="VND" required :disabled="disabled" :error="err('unit_price')" />
      <FnField v-model="item.period" :field="field('period')" label="Chu kỳ" type="select" required :options="PERIOD_OPTIONS" :disabled="disabled" :error="err('period')" />
      <FnField
        v-if="item.period === 'Ngày'"
        v-model="item.period_days"
        :field="field('period_days')"
        label="Số ngày mỗi kỳ"
        type="number"
        unit="ngày"
        required
        :disabled="disabled"
        :error="err('period_days')"
      />
      <FnField v-model="item.period_start" :field="field('period_start')" label="Ngày bắt đầu kỳ đầu" type="date" required :disabled="disabled" :error="err('period_start')" />
      <FnField
        v-model="item.period_end"
        :field="field('period_end')"
        label="Ngày kết thúc"
        type="date"
        :disabled="disabled"
        :error="err('period_end')"
        hint="Để trống thì lấy theo ngày kết thúc hợp đồng."
      />
      <FnField v-model="item.bill_timing" :field="field('bill_timing')" label="Thu đầu kỳ / cuối kỳ" type="select" :options="TIMING_OPTIONS" :disabled="disabled" />
      <FnField v-model="item.credit_days" :field="field('credit_days')" label="Số ngày được nợ" type="number" unit="ngày" :disabled="disabled" :error="err('credit_days')" />
    </div>
  </div>
</template>
