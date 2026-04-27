const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ تخزين القراءات
let readings = [];

// ✅ مسار استقبال البيانات من ESP32
app.post('/api/readings', (req, res) => {
    console.log('📥 POST /api/readings');
    console.log('📦 Body:', req.body);
    
    const bpm = req.body.bpm;
    const spo2 = req.body.spo2;
    
    // ✅ التحقق من وجود البيانات
    if (bpm === undefined || spo2 === undefined) {
        console.log('❌ Missing data');
        return res.status(400).json({ 
            status: 'error', 
            message: 'Missing bpm or spo2' 
        });
    }
    
    // ✅ تخزين القراءة
    const reading = {
        bpm: parseInt(bpm),
        spo2: parseInt(spo2),
        timestamp: new Date().toISOString()
    };
    
    readings.push(reading);
    
    // الاحتفاظ بآخر 50 قراءة
    if (readings.length > 50) readings.shift();
    
    console.log(`✅ Saved: BPM=${reading.bpm}, SpO2=${reading.spo2}`);
    console.log(`📊 Total readings: ${readings.length}`);
    
    // ✅ إرسال رد واضح (هذا مهم جداً!)
    res.status(200).json({ 
        status: 'success', 
        message: 'Data received',
        data: reading 
    });
});

// ✅ جلب آخر قراءة
app.get('/api/readings/latest', (req, res) => {
    console.log('📖 GET /latest');
    
    if (readings.length === 0) {
        return res.json({ 
            status: 'success', 
            data: null, 
            message: 'No readings available yet' 
        });
    }
    
    res.json({ 
        status: 'success', 
        data: readings[readings.length - 1] 
    });
});

// ✅ جلب جميع القراءات
app.get('/api/readings/all', (req, res) => {
    res.json({ 
        status: 'success', 
        count: readings.length, 
        data: readings 
    });
});

// ✅ صفحة رئيسية
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

// ✅ تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
});