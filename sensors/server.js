const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ تفعيل CORS بشكل متقدم للسماح لـ Frontend بالاتصال
app.use(cors({
    origin: [
        'https://livocare-frontend.onrender.com',
        'https://livocare-fronend.vercel.app',
        'https://livocare-frontend.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000',
        // ✅ إضافة رابط Frontend الحالي
        'https://livocare-fronend.onrender.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// ✅ دعم preflight requests (OPTIONS)
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));

// تخزين القراءات
let readings = [];
let lastReadTime = null;

// ✅ استقبال البيانات من ESP32
app.post('/api/readings', (req, res) => {
    console.log('📥 Received body:', req.body);
    
    const bpm = req.body.bpm || req.body.heart_rate || req.body.heartRate;
    const spo2 = req.body.spo2 || req.body.oxygen;
    
    console.log(`📊 Extracted - BPM: ${bpm}, SpO2: ${spo2}`);
    
    if (!bpm || !spo2) {
        console.log('❌ Missing bpm or spo2');
        return res.status(400).json({ 
            status: 'error', 
            message: 'Missing bpm or spo2',
            received: req.body
        });
    }
    
    // التحقق من صحة القيم
    const bpmNum = parseInt(bpm);
    const spo2Num = parseInt(spo2);
    
    if (isNaN(bpmNum) || isNaN(spo2Num)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Invalid numeric values',
            bpm, spo2
        });
    }
    
    if (bpmNum < 30 || bpmNum > 220) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'BPM out of range (30-220)',
            value: bpmNum
        });
    }
    
    if (spo2Num < 50 || spo2Num > 100) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'SpO2 out of range (50-100)',
            value: spo2Num
        });
    }

    const newReading = {
        id: readings.length + 1,
        bpm: bpmNum,
        spo2: spo2Num,
        timestamp: new Date().toISOString()
    };

    readings.push(newReading);
    
    // الاحتفاظ بآخر 100 قراءة فقط لتوفير الذاكرة
    if (readings.length > 100) {
        readings = readings.slice(-100);
    }
    
    lastReadTime = new Date();
    
    console.log(`✅ Saved: BPM: ${bpmNum}, SpO2: ${spo2Num}%`);
    console.log(`📦 Total readings: ${readings.length}`);

    res.status(200).json({ 
        status: 'success', 
        data: newReading 
    });
});

// ✅ آخر قراءة (محسّن)
app.get('/api/readings/latest', (req, res) => {
    console.log('📖 GET /api/readings/latest');
    
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
        data: latest,
        lastUpdate: lastReadTime
    });
});

// ✅ جميع القراءات (مع دعم pagination)
app.get('/api/readings/all', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const paginatedReadings = readings.slice(-limit - offset, readings.length - offset);
    
    console.log(`📖 GET /api/readings/all - limit: ${limit}, offset: ${offset}`);
    
    res.json({ 
        status: 'success', 
        count: readings.length,
        returned: paginatedReadings.length,
        data: paginatedReadings.reverse() // الأحدث أولاً
    });
});

// ✅ إحصائيات القراءات
app.get('/api/readings/stats', (req, res) => {
    if (readings.length === 0) {
        return res.json({ 
            status: 'success', 
            data: null,
            message: 'No readings available'
        });
    }
    
    const bpmValues = readings.map(r => r.bpm);
    const spo2Values = readings.map(r => r.spo2);
    
    const avgBpm = Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length);
    const avgSpo2 = Math.round(spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length);
    
    const minBpm = Math.min(...bpmValues);
    const maxBpm = Math.max(...bpmValues);
    const minSpo2 = Math.min(...spo2Values);
    const maxSpo2 = Math.max(...spo2Values);
    
    res.json({
        status: 'success',
        data: {
            total: readings.length,
            avgBpm, avgSpo2,
            minBpm, maxBpm,
            minSpo2, maxSpo2,
            latest: readings[readings.length - 1],
            lastUpdate: lastReadTime
        }
    });
});

// ✅ صحة الخدمة
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        totalReadings: readings.length,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ✅ مسح جميع القراءات (للإدارة)
app.delete('/api/readings', (req, res) => {
    const deletedCount = readings.length;
    readings = [];
    lastReadTime = null;
    console.log(`🗑️ Deleted ${deletedCount} readings`);
    res.json({ status: 'success', deletedCount });
});

// ✅ معالجة الأخطاء العامة
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({ 
        status: 'error', 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ✅ تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ ESP32 Sensor Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 POST readings: http://localhost:${PORT}/api/readings`);
});