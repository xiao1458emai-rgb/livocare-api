const express = require('express');
const cors = require('cors');

const app = express();

// ✅ إعدادات CORS الصحيحة
app.use(cors({
    origin: [
        'https://livocare-frontend.onrender.com',
        'https://livocare-backend.onrender.com',
        'http://localhost:3000',
        'http://localhost:5173'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

app.use(express.json());

// تخزين القراءات
let readings = [];

// ✅ مسار استقبال البيانات من ESP32
app.post('/api/readings', (req, res) => {
    console.log('📥 POST /api/readings');
    console.log('📦 Body:', req.body);
    
    const { bpm, spo2 } = req.body;
    
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
    
    // الاحتفاظ بآخر 50 قراءة فقط
    if (readings.length > 50) readings.shift();
    
    console.log(`✅ Saved: BPM=${reading.bpm}, SpO2=${reading.spo2}`);
    
    res.status(200).json({ 
        status: 'success', 
        message: 'Data received',
        data: reading 
    });
});

// ✅ مسار جلب آخر قراءة
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

// ✅ مسار جلب جميع القراءات
app.get('/api/readings/all', (req, res) => {
    res.json({ 
        status: 'success', 
        count: readings.length, 
        data: readings 
    });
});

// ✅ مسار OPTIONS للتحقق من CORS (مهم)
app.options('*', cors());

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 CORS enabled for: https://livocare-frontend.onrender.com`);
});