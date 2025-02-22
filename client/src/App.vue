<template>
  <div id="app">
    <el-container>
      <el-header>
        <h2 class="app-title">建行实物黄金价格追踪</h2>
      </el-header>
      <el-main>
        <Dashboard />
      </el-main>
      <el-footer>
        <p>© 2024 Gold Price Tracker</p>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import Dashboard from './pages/Dashboard.vue'
</script>

<style>
body {
  margin: 0;
  padding: 0;
}

#app {
  width: 100%;
  height: 100vh;
}

.el-header {
  background-color: #409EFF;
  color: white;
  line-height: 60px;
  text-align: center;
  padding: 0;
}

.app-title {
  margin: 0;
  line-height: 60px;
}

.el-main {
  background-color: #f0f2f5;
  min-height: calc(100vh - 120px);
}

.el-footer {
  text-align: center;
  color: #666;
  line-height: 60px;
}
</style> 