<script setup lang="ts">
// Một khối hạng mục của hợp đồng: ô chung, nhóm ô theo kiểu thu và (với Nhiều đợt) danh sách mốc thanh toán.
// Chuẩn chưa có bảng nhập nhiều dòng nên mỗi hạng mục là một khối FnField có viền.
import { computed } from 'vue'
import { Button } from 'frappe-ui'
import { FnField, formatCurrency, formatNumber, type SelectOption } from '@/standard'
import {
  BILLING_TYPES,
  BILL_TIMINGS,
  MILESTONE_INPUTS,
  PERIODS,
  emptyMilestone,
  milestoneSummary,
  onBillingTypeChange,
  type BillingType,
  type ItemForm,
} from './contract'

const props = defineProps<{
  item: ItemForm
  index: number
  errors: Record<string, string>
  vatOptions: SelectOption[]
  /** Ngày kết thúc hợp đồng, để điền ngày kết thúc kỳ khi đổi sang Định kỳ. */
  endDate: string
  disabled?: boolean
}>()
const emit = defineEmits<{ remove: [] }>()

const asOptions = (list: string[]): SelectOption[] => list.map((v) => ({ label: v, value: v }))
const BILLING_OPTIONS = asOptions(BILLING_TYPES)
const INPUT_OPTIONS = asOptions(MILESTONE_INPUTS)
const PERIOD_OPTIONS = asOptions(PERIODS)
const TIMING_OPTIONS = asOptions(BILL_TIMINGS)

const field = (name: string) => `items.${props.index}.${name}`
const err = (name: string) => props.errors[field(name)]
const mField = (j: number, name: string) => `items.${props.index}.milestones.${j}.${name}`

function setBillingType(value: string | null) {
  props.item.billing_type = (value || 'Một lần') as BillingType
  onBillingTypeChange(props.item, { end_date: props.endDate })
}

const byPercent = computed(() => props.item.milestone_input === 'Phần trăm')
const summary = computed(() => milestoneSummary(props.item, props.item.milestones))
const summaryText = computed(() => {
  const s = summary.value
  if (byPercent.value) return `Tổng: ${formatNumber(s.total)}% / Giá trị: 100% — Lệch: ${formatNumber(s.diff)}%`
  return `Tổng: ${formatCurrency(s.total)} / Giá trị: ${formatCurrency(s.target)} — Lệch: ${formatCurrency(s.diff)}`
})

function addMilestone() {
  props.item.milestones.push(emptyMilestone(props.item))
}
function removeMilestone(j: number) {
  props.item.milestones.splice(j, 1)
}
</script>

<template>
  <div class="space-y-4 rounded-6 border border-outline-gray-2 bg-surface-base p-4">
    <div class="flex items-center justify-between">
      <h3 class="text-base-semibold text-ink-gray-8">Hạng mục {{ index + 1 }}</h3>
      <Button v-if="!disabled" size="sm" variant="ghost" icon-left="lucide-trash-2" label="Xóa hạng mục" @click="emit('remove')" />
    </div>

    <div class="grid grid-cols-4 gap-x-6 gap-y-4">
      <FnField v-model="item.item_name" :field="field('item_name')" label="Tên hạng mục" required :maxlength="140" :disabled="disabled" :error="err('item_name')" />
      <FnField v-model="item.vat_rate" :field="field('vat_rate')" label="Thuế suất" type="select" required :options="vatOptions" :disabled="disabled" :error="err('vat_rate')" />
      <FnField
        :model-value="item.billing_type"
        :field="field('billing_type')"
        label="Kiểu thu"
        type="select"
        required
        :options="BILLING_OPTIONS"
        :disabled="disabled"
        @update:model-value="setBillingType"
      />
      <div class="flex items-end pb-1">
        <FnField v-model="item.requires_acceptance" :field="field('requires_acceptance')" label="Cần nghiệm thu" type="checkbox" :disabled="disabled" />
      </div>
    </div>

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

      <div :data-field="field('milestones')" class="space-y-3 rounded-4 border border-outline-gray-2 bg-surface-gray-1 p-3">
        <h4 class="text-sm-semibold text-ink-gray-8">Mốc thanh toán</h4>
        <div v-for="(m, j) in item.milestones" :key="j" class="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-start gap-x-4 gap-y-2">
          <FnField v-model="m.milestone_name" :field="mField(j, 'milestone_name')" label="Tên mốc" required :maxlength="140" :disabled="disabled" :error="errors[mField(j, 'milestone_name')]" />
          <FnField
            v-if="byPercent"
            v-model="m.percent"
            :field="mField(j, 'percent')"
            label="Phần trăm"
            type="number"
            unit="%"
            required
            :disabled="disabled"
            :error="errors[mField(j, 'percent')]"
          />
          <FnField
            v-else
            v-model="m.amount"
            :field="mField(j, 'amount')"
            label="Số tiền"
            type="currency"
            unit="VND"
            required
            :disabled="disabled"
            :error="errors[mField(j, 'amount')]"
          />
          <FnField v-model="m.due_date" :field="mField(j, 'due_date')" label="Ngày đến hạn" type="date" required :disabled="disabled" :error="errors[mField(j, 'due_date')]" />
          <div class="pt-6">
            <FnField v-model="m.requires_acceptance" :field="mField(j, 'requires_acceptance')" label="Cần nghiệm thu" type="checkbox" :disabled="disabled" />
          </div>
          <div class="pt-5">
            <Button v-if="!disabled" size="sm" variant="ghost" icon-left="lucide-x" label="Xóa mốc" @click="removeMilestone(j)" />
          </div>
        </div>
        <p v-if="!item.milestones.length" class="text-sm text-ink-gray-5">Chưa có mốc. Bấm Thêm mốc để nhập đợt thanh toán.</p>
        <div class="flex items-center justify-between gap-2">
          <Button v-if="!disabled" size="sm" variant="outline" icon-left="lucide-plus" label="Thêm mốc" @click="addMilestone" />
          <span class="text-sm tabular-nums" :class="Math.abs(summary.diff) > 0.01 ? 'text-ink-red-7' : 'text-ink-gray-7'">{{ summaryText }}</span>
        </div>
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
