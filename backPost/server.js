const fetch = require('node-fetch');
const mysql = require('mysql');
const cron = require('node-cron');
const config = require('./config');
const express = require('express');

// 创建数据库连接
const connection = mysql.createConnection(config.database);

connection.connect((err) => {
    if (err) {
        console.error('数据库连接失败:', err);
        return;
    }
    console.log('数据库连接成功');
});

// 爬虫函数
async function fetchGoldPrice() {
    const url = 'https://lsjr.ccb.com/clst/v1/preciousMetal/batchQueryDetail';
    const requestBody = {
        "app-key": "1c51e643f97c3e59",
        "reqData": {
            "head": {
                "newFormat": "1",
                "SYS_TX_CODE": "public"
            },
            "data": {
                "products": [{
                    "PM_PD_ID": "261100101",
                    "Org_Inst_Rgon_Cd": "JS",
                    "Hdl_InsID": "320000000",
                    "AlSal_Ind": "1",
                    "Txn_Itt_Chnl_TpCd": "0006"
                }]
            }
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        // 检查返回的数据结构
        if (data && data.data && data.data.length > 0) {
            const goldPrice = parseFloat(data.data[0].Br_Sell_Prc); // 从 Br_Sell_Prc 字段获取价格
            const timestamp = Date.now();
            const date = new Date().toISOString().split('T')[0];

            // 将价格插入数据库
            const query = 'INSERT INTO gold_prices (price, timestamp, date) VALUES (?, ?, ?)';
            connection.query(query, [goldPrice, timestamp, date], (error, results) => {
                if (error) {
                    console.error('插入数据失败:', error);
                    return;
                }
                console.log('Gold price inserted:', results.insertId);
            });
        } else {
            console.error('Unexpected data structure:', data);
        }

    } catch (error) {
        console.error('Error fetching gold price:', error);
    }
}

// 每小时执行一次爬虫任务
cron.schedule('0 * * * *', fetchGoldPrice);

// 启动时立即执行一次
fetchGoldPrice();

// 提供API接口
const app = express();
const port = config.server.port;

// 获取指定天数内的最低价格
app.get('/api/gold-prices', (req, res) => {
    const { days } = req.query;

    let query = `
        SELECT date, MIN(price) as lowest_price
        FROM gold_prices
    `;

    if (days) {
        query += ` WHERE date >= CURDATE() - INTERVAL ? DAY `;
    }

    query += ` GROUP BY date ORDER BY date DESC `;

    connection.query(query, [parseInt(days)], (error, results) => {
        if (error) {
            console.error('Error retrieving data:', error);
            res.status(500).send('Error retrieving data');
            return;
        }
        if (results.length === 0) {
            res.status(404).send('No data found');
            return;
        }

        // 格式化返回数据
        const formattedResults = results.map(row => ({
            timestamp: new Date(row.date).getTime(),
            price: row.lowest_price
        }));

        res.json(formattedResults);
    });
});

// 获取最新价格
app.get('/api/latest-gold-price', async (req, res) => {
    const { forceRefresh } = req.query;

    try {
        if (forceRefresh === 'true') {
            await fetchGoldPrice();
        }

        const query = `
            SELECT timestamp, price
            FROM gold_prices
            ORDER BY timestamp DESC
            LIMIT 1
        `;

        connection.query(query, (error, results) => {
            if (error) {
                console.error('Error retrieving latest price:', error);
                res.status(500).send('Error retrieving latest price');
                return;
            }
            if (results.length === 0) {
                res.status(404).send('No data found');
                return;
            }

            // 格式化返回数据
            const formattedResult = results.map(row => ({
                timestamp: row.timestamp,
                price: row.price
            }));

            res.json(formattedResult);
        });

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Error processing request');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
