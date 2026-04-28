const express = require('express');
const cors = require('cors');

const app = express();

// ✅ حل جذري لمشكلة CORS - يسمح لأي نطاق
app.use((req, res, next) => {
    // السماح لأي نطاق بالوصول
    res.header('Access-Control-Allow-Origin', '*');
    // السماح بالطرق المطلوبة
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    // السماح بالهيدرات المطلوبة
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // معالجة طلبات OPTIONS المسبقة (preflight)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

// تخزين القراءات مؤقتاً في الذاكرة
let readings = [];

// ✅ مسار استقبال البيانات من ESP32 (POST)
app.post('/api/readings', (req, res) => {
    console.log('📥 POST /api/readings');
    console.log('📦 Body:', req.body);
    
    const bpm = req.body.bpm;
    const spo2 = req.body.spo2;
    
    if (bpm === undefined || spo2 === undefined) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Missing bpm or spo2' 
        });
    }
    
    const reading = {
        bpm: parseInt(bpm),
        spo2: parseInt(spo2),
        timestamp: new Date().toISOString()
    };
    
    readings.push(reading);
    if (readings.length > 50) readings.shift();  // احتفظ بآخر 50 قراءة فقط
    
    console.log(`✅ Saved: BPM=${reading.bpm}, SpO2=${reading.spo2}`);
    console.log(`📊 Total readings: ${readings.length}`);
    
    res.status(200).json({ 
        status: 'success', 
        message: 'Data received',
        data: reading 
    });
});

// ✅ مسار جلب آخر قراءة (GET)
app.get('/api/readings/latest', (req, res) => {
    console.log('📖 GET /latest');
    
    if (readings.length === 0) {
        return res.json({ 
            status: 'success', 
            data: null, 
            message: 'No readings available yet' 
        });
    }
    
    const latest = readings[readings.length - 1];
    res.json({ 
        status: 'success', 
        data: latest 
    });
});

// ✅ مسار جلب جميع القراءات (GET)
app.get('/api/readings/all', (req, res) => {
    console.log('📖 GET /all');
    res.json({ 
        status: 'success', 
        count: readings.length, 
        data: readings 
    });
});

// ✅ صفحة رئيسية بسيطة للتحقق
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>ESP32 Sensor API</title></head>
        <body>
            <h1>🫀 ESP32 Sensor API</h1>
            <p>Status: ✅ Running</p>
            <p>Total readings: ${readings.length}</p>
            <p>Latest: ${readings.length > 0 ? `${readings[readings.length-1].bpm} BPM, ${readings[readings.length-1].spo2}%` : 'None'}</p>
            <p><a href="/api/readings/latest">Latest Reading</a></p>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ CORS enabled for all origins`);
});