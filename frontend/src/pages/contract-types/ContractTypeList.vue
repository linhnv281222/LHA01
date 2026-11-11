<script setup lang="ts">
// Màn danh sách mẫu theo chuẩn: panel trái (Truy vấn nhóm + Truy vấn chi tiết + nút Tìm kiếm),
// tiêu đề + số lượng + Xuất Excel + Thêm mới, thẻ số liệu (bấm để lọc), bảng chuẩn, chi tiết dòng chọn.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, useList } from 'frappe-ui'
import {
  COMMON_STATUS,
  DataTable,
  DetailPanel,
  FnField,
  GroupTree,
  MiniTable,
  PageTitle,
  PrimaryButton,
  SplitLayout,
  StatCards,
  formatDate,
  formatDateTime,
  type Column,
  type DataTableExpose,
  type DetailField,
  type StatCard,
} from '@/standard'
import {
  COLUMNS,
  DOCTYPE,
  emptyFilters,
  filtersActive,
  groupTree,
  statusOf,
  toFrappeFilters,
  type ContractType,
  type PanelFilters,
} from './contractType'

const route = useRoute()
const router = useRouter()

// Bộ lọc đang nhập (draft) và bộ lọc đã áp dụng: chỉ áp dụng khi bấm "Tìm kiếm" hoặc Enter.
const draft = ref<PanelFilters>(emptyFilters())
const applied = ref<PanelFilters>(emptyFilters())

const list = useList<ContractType>({
  doctype: DOCTYPE,
  fields: ['name', 'code', 'type_name', 'is_active', 'description', 'owner', 'creation', 'modified'],
  filters: () => toFrappeFilters(applied.value),
  orderBy: 'modified desc',
  limit: 5000,
})
// Cây nhóm đếm trên toàn bộ dữ liệu (không theo bộ lọc nhóm), để người dùng thấy mỗi nhóm có bao nhiêu.
const allForTree = useList<ContractType>({ doctype: DOCTYPE, fields: ['name', 'is_active'], limit: 5000 })

const rows = computed(() => list.data ?? [])
const statusCard = ref<string | null>(null)
const tableRows = computed(() => {
  if (statusCard.value === 'active') return rows.value.filter((r) => r.is_active)
  if (statusCard.value === 'inactive') return rows.value.filter((r) => !r.is_active)
  return rows.value
})

const cards = computed<StatCard[]>(() => {
  const active = rows.value.filter((r) => r.is_active).length
  return [
    { key: 'total', label: 'Tổng số loại', value: rows.value.length },
    { key: 'active', label: 'Đang dùng', value: active, status: COMMON_STATUS.active },
    { key: 'inactive', label: 'Ngừng dùng', value: rows.value.length - active, status: COMMON_STATUS.inactive },
  ]
})

function search() {
  applied.value = JSON.parse(JSON.stringify(draft.value)) as PanelFilters
}
function clearAll() {
  draft.value = emptyFilters()
  statusCard.value = null
  search()
}

// Chọn dòng: đồng bộ với ?selected= để sau khi lưu quay về thì dòng mới được chọn sẵn.
const selected = ref<string | null>((route.query.selected as string) || null)
watch(selected, (v) => {
  void router.replace({ query: { ...route.query, selected: v ?? undefined } })
})
const current = computed(() => rows.value.find((r) => r.name === selected.value) ?? null)
const detailFields = computed<DetailField[]>(() => {
  const r = current.value
  if (!r) return []
  return [
    { label: 'Mã', value: r.code },
    { label: 'Tên loại hợp đồng', value: r.type_name },
    { label: 'Trạng thái', value: statusOf(r).label },
    { label: 'Người tạo', value: r.owner },
    { label: 'Ngày tạo', value: formatDate(r.creation) },
    { label: 'Ngày cập nhật', value: formatDateTime(r.modified) },
    { label: 'Mô tả', value: r.description, wide: true },
  ]
})

// Lịch sử thay đổi của dòng đang chọn (bảng Version của Frappe).
const history = useList<{ name: string; owner: string; creation: string; data: string }>({
  doctype: 'Version',
  fields: ['name', 'owner', 'creation', 'data'],
  filters: () => ({ ref_doctype: DOCTYPE, docname: selected.value ?? '' }),
  orderBy: 'creation desc',
  limit: 20,
  immediate: false,
})
watch(selected, (v) => v && history.reload(), { immediate: true })
const HISTORY_COLUMNS: Column<{ owner: string; creation: string; data: string }>[] = [
  { key: 'creation', label: 'Thời gian', width: 170, format: (r) => formatDateTime(r.creation) },
  { key: 'owner', label: 'Người thực hiện', width: 240 },
  { key: 'data', label: 'Trường thay đổi', width: 400, format: (r) => changedFields(r.data) },
]
function changedFields(data: string): string {
  try {
    const d = JSON.parse(data) as { changed?: [string, unknown, unknown][] }
    return (d.changed ?? []).map((c) => c[0]).join(', ') || 'Tạo mới'
  } catch {
    return ''
  }
}

const table = ref<DataTableExpose | null>(null)
function exportExcel() {
  table.value?.exportExcel(`loai-hop-dong-${new Date().toISOString().slice(0, 10)}`)
}
</script>

<template>
  <SplitLayout :searching="list.loading" @search="search">
    <template #group>
      <GroupTree v-model="draft.groups" :nodes="groupTree(allForTree.data ?? [])" />
    </template>
    <template #filters>
      <FnField v-model="draft.code" field="f-code" label="Mã" />
      <FnField v-model="draft.typeName" field="f-type-name" label="Tên loại hợp đồng" />
      <FnField v-model="draft.createdFrom" field="f-created-from" label="Ngày tạo từ" type="date" />
      <FnField v-model="draft.createdTo" field="f-created-to" label="Ngày tạo đến" type="date" />
      <button type="button" class="text-base text-ink-blue-link hover:underline" @click="clearAll">Xóa bộ lọc</button>
    </template>

    <PageTitle title="Loại hợp đồng" :count="tableRows.length">
      <template #actions>
        <Button size="md" variant="outline" icon-left="lucide-file-spreadsheet" label="Xuất Excel" @click="exportExcel" />
        <PrimaryButton icon-left="lucide-plus" label="Thêm loại hợp đồng" :route="'/contract-types/new'" />
      </template>
    </PageTitle>

    <StatCards v-model:active="statusCard" :cards="cards" />

    <p v-if="list.error" class="rounded-4 border border-outline-red-3 bg-surface-red-2 px-3 py-2 text-base text-ink-red-7" role="alert">
      Không tải được danh sách: {{ list.error.message }}
      <button type="button" class="ml-2 underline" @click="list.reload()">Thử lại</button>
    </p>

    <DataTable
      ref="table"
      v-model:selected="selected"
      :columns="COLUMNS"
      :rows="tableRows"
      :loading="list.loading"
      :external-filter-active="filtersActive(applied) || statusCard !== null"
      caption="Bấm một dòng để xem chi tiết"
      @clear-filters="clearAll"
    >
      <template #cell-_actions="{ row }">
        <Button
          size="sm"
          variant="ghost"
          icon-left="lucide-pencil"
          label="Sửa"
          :route="`/contract-types/${encodeURIComponent(row.name)}/edit`"
          @click.stop
        />
      </template>
    </DataTable>

    <DetailPanel v-if="current" :title="`${current.code} — ${current.type_name}`" :fields="detailFields" @close="selected = null">
      <template #actions>
        <Button
          size="sm"
          variant="outline"
          icon-left="lucide-pencil"
          label="Cập nhật"
          :route="`/contract-types/${encodeURIComponent(current.name)}/edit`"
        />
      </template>
      <h3 class="mb-2 text-base-semibold text-ink-gray-8">Lịch sử thay đổi</h3>
      <MiniTable :columns="HISTORY_COLUMNS" :rows="history.data ?? []" empty-text="Chưa có thay đổi nào sau khi tạo." />
    </DetailPanel>
  </SplitLayout>
</template>
