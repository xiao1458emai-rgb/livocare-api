const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ تأكد من قراءة JSON
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ تخزين القراءات
let readings = [];

// ✅ مسار استقبال البيانات (الأهم)
app.post('/api/readings', (req, res) => {
    console.log('📥 POST received!');
    console.log('📦 Headers:', req.headers);
    console.log('📦 Body:', req.body);
    
    const bpm = req.body.bpm;
    const spo2 = req.body.spo2;
    
    if (!bpm || !spo2) {
        console.log('❌ Missing bpm or spo2');
        return res.status(400).json({ error: 'Missing bpm or spo2', received: req.body });
    }
    
    const newReading = {
        bpm: parseInt(bpm),
        spo2: parseInt(spo2),
        timestamp: new Date().toISOString()
    };
    
    readings.push(newReading);
    
    // احتفظ بآخر 50 قراءة فقط
    if (readings.length > 50) readings.shift();
    
    console.log(`✅ Saved: BPM=${newReading.bpm}, SpO2=${newReading.spo2}`);
    console.log(`📊 Total readings: ${readings.length}`);
    
    res.json({ success: true, data: newReading });
});

// ✅ جلب آخر قراءة
app.get('/api/readings/latest', (req, res) => {
    console.log('📖 GET /latest - Total readings:', readings.length);
    
    if (readings.length === 0) {
        return res.json({ status: 'success', data: null, message: 'No readings available yet' });
    }
    
    const latest = readings[readings.length - 1];
    res.json({ status: 'success', data: latest });
});

// ✅ جلب جميع القراءات
app.get('/api/readings/all', (req, res) => {
    res.json({ status: 'success', count: readings.length, data: readings });
});

// ✅ فحص صحة الخادم
app.get('/health', (req, res) => {
    res.json({ status: 'ok', totalReadings: readings.length, uptime: process.uptime() });
});

// ✅ صفحة رئيسية للاختبار
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>ESP32 Sensor API</title></head>
        <body style="font-family: Arial; padding: 20px;">
            <h1>🫀 ESP32 Sensor API</h1>
            <p>Status: <span style="color: green;">✅ Running</span></p>
            <p>Total readings: <strong>${readings.length}</strong></p>
            <p>Latest: ${readings.length > 0 ? `${readings[readings.length-1].bpm} BPM, ${readings[readings.length-1].spo2}%` : 'None'}</p>
            <hr>
            <p><a href="/api/readings/latest">📊 Latest Reading</a> | <a href="/api/readings/all">📋 All Readings</a></p>
        </body>
        </html>
    `);
});

// ✅ تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ ESP32 Sensor Server running on port ${PORT}`);
    console.log(`📍 URL: https://esp32-sensor-api.onrender.com`);
});