<template>
  <div class="dashboard">
    <el-row :gutter="isMobile ? 0 : 20">
      <el-col :span="24">
        <el-card class="price-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">当前黄金价格</span>
              <div class="button-group">
                <el-button type="primary" @click="refreshData(true)" :loading="loading">刷新数据</el-button>
                <el-button 
                  type="success" 
                  @click="handleBuy"
                  :loading="loading"
                >购买金条</el-button>
              </div>
            </div>
          </template>
          <div class="current-price" v-if="currentPrice">
            ¥{{ currentPrice }} / 克
          </div>
          <div v-else class="no-data">
            暂无数据
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="isMobile ? 0 : 20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <div class="chart-title-wrapper">
                <span class="card-title">价格走势图</span>
              </div>
              <div class="time-range-wrapper">
                <div class="time-range-selector">
                  <span class="range-label">时间范围：</span>
                  <el-radio-group v-model="timeRange" size="small">
                    <el-radio-button label="7">7天</el-radio-button>
                    <el-radio-button label="30">30天</el-radio-button>
                    <el-radio-button label="90">90天</el-radio-button>
                  </el-radio-group>
                </div>
              </div>
            </div>
          </template>
          <div class="chart-wrapper">
            <Chart :data="chartData" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="isMobile ? 0 : 20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">历史最低价格记录</span>
            </div>
          </template>
          <el-table 
            :data="tableData" 
            style="width: 100%"
            :default-sort="{ prop: 'timestamp', order: 'descending' }"
          >
            <el-table-column 
              prop="date" 
              label="日期" 
              sortable 
              :width="isMobile ? '' : 180"
              class-name="el-table-column--date"
              :sort-by="'timestamp'"
            />
            <el-table-column 
              prop="price" 
              label="价格" 
              sortable
              :width="isMobile ? '' : ''"
              class-name="el-table-column--price"
            >
              <template #default="{ row }">
                <span :class="{ 
                  'price-up': isPriceUp(row),
                  'price-down': isPriceDown(row)
                }">
                  {{ row.price }}
                </span>
              </template>
            </el-table-column>
            <el-table-column 
              label="涨跌"
              :width="isMobile ? '' : 120"
              align="center"
              class-name="el-table-column--change"
            >
              <template #default="{ row }">
                <span :class="{ 
                  'price-up': isPriceUp(row),
                  'price-down': isPriceDown(row)
                }">
                  {{ getPriceChange(row) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import Chart from '../components/Chart.vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const goldData = ref([])
const currentPrice = ref(null)
const timeRange = ref('7')
const loading = ref(false)

// 添加移动端检测
const isMobile = ref(window.innerWidth <= 768)

// 监听窗口大小变化
window.addEventListener('resize', () => {
  isMobile.value = window.innerWidth <= 768
})

// 计算属性：表格数据（倒序）
const tableData = computed(() => {
  return [...goldData.value].sort((a, b) => b.timestamp - a.timestamp)
})

// 计算属性：图表数据（正序）
const chartData = computed(() => {
  return [...goldData.value].sort((a, b) => a.timestamp - b.timestamp)
})

// 修改价格变化计算逻辑
const isPriceUp = (row) => {
  const index = tableData.value.indexOf(row)
  if (index === tableData.value.length - 1) return false // 如果是最后一条数据，无法比较
  return row.price > tableData.value[index + 1].price // 与后一条数据（前一天）比较
}

const isPriceDown = (row) => {
  const index = tableData.value.indexOf(row)
  if (index === tableData.value.length - 1) return false // 如果是最后一条数据，无法比较
  return row.price < tableData.value[index + 1].price // 与后一条数据（前一天）比较
}

const getPriceChange = (row) => {
  const index = tableData.value.indexOf(row)
  if (index === tableData.value.length - 1) return '--' // 如果是最后一条数据，无法比较
  
  const change = row.price - tableData.value[index + 1].price // 与后一条数据（前一天）比较
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}`
}

const fetchData = async (forceRefresh = false) => {
  loading.value = true;
  try {
    const response = await axios.get(`/api/gold-prices`, { 
      params: { 
        days: timeRange.value // 添加时间范围参数
      } 
    });
    
    // 保存原始数据，不进行排序
    goldData.value = response.data.map(item => ({
      date: new Date(item.timestamp).toLocaleDateString(),
      price: item.price,
      timestamp: item.timestamp
    }));
  } catch (error) {
    console.error('获取数据失败:', error);
    const errorMessage = error.response?.data?.message || error.message;
    ElMessage.error(`获取数据失败: ${errorMessage}`);
  } finally {
    loading.value = false;
  }
}

// 新增函数：刷新数据
const refreshData = async (forceRefresh = false) => {
  loading.value = true;
  try {
    // 获取最新价格
    const latestResponse = await axios.get(`/api/latest-gold-price`, {
      params: { forceRefresh }
    });
    if (latestResponse.data.length > 0) {
      const latest = latestResponse.data[0];
      currentPrice.value = latest.price;
    }

    // 刷新图表和表格数据
    await fetchData();
  } catch (error) {
    console.error('刷新数据失败:', error);
    const errorMessage = error.response?.data?.message || error.message;
    ElMessage.error(`刷新数据失败: ${errorMessage}`);
  } finally {
    loading.value = false;
  }
}

watch(timeRange, () => {
  fetchData()
})

onMounted(async () => {
  // 在组件挂载时获取最新价格
  await refreshData();
})

// 添加购买处理函数
const handleBuy = () => {
  // PC端和移动端使用不同的URL
  const buyUrl = isMobile.value
    ? 'https://lsjr.ccb.com/msmp/ecpweb/page/internet/dist/preciousMetalsDetail.html?CCB_EmpID=81578565&PM_PD_ID=261100101&ASPD_ID=10200290&ASPD_Nm=投资金条(50克)&Org_Inst_Rgon_Cd=JS&Br_Sell_Prc=647.2&PD_Dstrn_MtdCd=02&page=preciousMetalsDetail&CLData=10031&Pblc_Parm_ID=cs-81578565-8eg8oj9&encem=ynEbY11UL8cOmG-3QrmdDQ'
    : 'https://gold1.ccb.com/chn/home/gold_new/cpjs/swgjs/flsx/cpxq/index.shtml?PM_PD_ID=261100101&ASPD_ID=10200290&Hdl_InsID=110000000&Org_Inst_Rgon_Cd=BJ'

  window.open(buyUrl, '_blank')
}
</script>

<style scoped>
.dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.time-range-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.range-label {
  color: #606266;
  font-size: 14px;
}

.price-card {
  margin-bottom: 20px;
}

.current-price {
  font-size: 2.5em;
  color: #409EFF;
  text-align: center;
  font-weight: bold;
  padding: 20px 0;
}

.no-data {
  text-align: center;
  color: #909399;
  font-size: 1.2em;
  padding: 20px 0;
}

.chart-card {
  margin-bottom: 20px;
}

.chart-wrapper {
  width: 100%;
  height: 400px; /* 设置固定高度 */
  position: relative;
}

.table-card {
  margin-bottom: 20px;
  overflow-x: hidden; /* 防止水平滚动 */
}

.price-up {
  color: #f56c6c;
}

.price-down {
  color: #67c23a;
}

/* 表格内容居中 */
:deep(.el-table td) {
  text-align: center;
}

:deep(.el-table th) {
  text-align: center;
  background-color: #f5f7fa;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-title-wrapper {
  display: flex;
  align-items: center;
}

.time-range-wrapper {
  display: flex;
  align-items: center;
}

.time-range-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .chart-title-wrapper {
    width: 100%;
    margin-bottom: 8px;
  }

  .time-range-wrapper {
    width: 100%;
  }

  .time-range-selector {
    width: 100%;
    justify-content: flex-start;
    gap: 8px;
  }

  .range-label {
    white-space: nowrap;
  }

  :deep(.el-radio-group) {
    display: flex;
    flex-wrap: nowrap;
  }

  :deep(.el-radio-button) {
    flex-shrink: 0;
  }

  :deep(.el-table) {
    font-size: 13px; /* 减小字体大小 */
  }

  :deep(.el-table .cell) {
    padding-left: 5px;
    padding-right: 5px;
  }

  :deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
    background-color: transparent; /* 移动端禁用悬停效果 */
  }

  .current-price {
    font-size: 2em; /* 调整当前价格字体大小 */
  }

  /* 调整表格内容的间距 */
  :deep(.el-table td), :deep(.el-table th) {
    padding: 8px 0;
  }

  /* 优化表格标题显示 */
  :deep(.el-table th) {
    font-size: 13px;
    font-weight: bold;
  }

  /* 确保价格和涨跌列的数字对齐 */
  :deep(.el-table .cell) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dashboard {
    padding: 10px; /* 减小外边距 */
  }

  /* 调整表格容器的内边距 */
  .table-card {
    margin-bottom: 20px;
  }

  :deep(.el-card__body) {
    padding: 12px !important; /* 调整卡片内边距 */
  }

  /* 调整表格样式 */
  :deep(.el-table) {
    font-size: 14px; /* 增大字体大小 */
  }

  /* 调整表格单元格内边距 */
  :deep(.el-table .cell) {
    padding: 0 8px; /* 增加单元格左右内边距 */
  }

  /* 调整表格列宽 */
  :deep(.el-table-column--date) {
    width: 40% !important; /* 日期列占 40% */
  }

  :deep(.el-table-column--price) {
    width: 35% !important; /* 价格列占 35% */
  }

  :deep(.el-table-column--change) {
    width: 25% !important; /* 涨跌列占 25% */
  }

  /* 确保单元格内容不会换行 */
  :deep(.el-table .cell) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 4px; /* 减小内边距以适应更窄的列宽 */
  }

  /* 优化价格和涨跌的显示 */
  .price-up, .price-down {
    min-width: 45px; /* 调整最小宽度 */
    padding: 0 2px; /* 添加小边距 */
  }

  /* 移除移动端的多余边距 */
  :deep(.el-row) {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  :deep(.el-col) {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  /* 调整卡片在移动端的边距 */
  :deep(.el-card) {
    margin: 0;
    border-radius: 4px;
  }

  :deep(.el-card__body) {
    padding: 12px !important;
  }

  /* 确保表格填满容器 */
  :deep(.el-table) {
    width: 100% !important;
    margin: 0;
  }

  /* 调整表格容器样式 */
  .table-card {
    margin-bottom: 20px;
    width: 100%;
  }

  /* 确保列宽度合理分配 */
  :deep(.el-table-column--date) {
    width: 35% !important;
  }

  :deep(.el-table-column--price) {
    width: 35% !important;
  }

  :deep(.el-table-column--change) {
    width: 30% !important;
  }

  .button-group {
    width: 100%;
    justify-content: space-between;
  }

  :deep(.el-button) {
    flex: 1;
    padding: 8px 15px;
    font-size: 14px;
  }

  .chart-wrapper {
    height: 300px; /* 移动端稍微降低高度 */
  }
}

/* PC端保持原样 */
@media screen and (min-width: 769px) {
  .card-header {
    flex-direction: row;
  }

  .button-group {
    justify-content: flex-end;
  }
}

/* 确保表格不会超出屏幕但保持适当间距 */
.table-card {
  margin: 0 auto;
  max-width: 100%;
  overflow-x: hidden;
}

:deep(.el-table__inner-wrapper) {
  overflow-x: hidden;
}

/* 调整表格列的样式 */
:deep(.el-table .cell) {
  padding: 0 10px;
}

/* 优化表格标题显示 */
:deep(.el-table th) {
  background-color: #f5f7fa;
  font-weight: bold;
  padding: 12px 0;
}

/* 调整行高 */
:deep(.el-table td) {
  height: 40px;
}

@media screen and (max-width: 768px) {
  :deep(.el-table td) {
    height: 35px; /* 移动端稍微降低行高 */
  }
}

.button-group {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style> 