const express = require('express');
const cors = require('cors');

const app = express();

// ✅ التكوين الصحيح لـ CORS
app.use(cors({
    origin: '*',  // مؤقتاً للاختبار - اسمح للجميع
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ بديل أكثر أماناً (للإنتاج):
// app.use(cors({
//     origin: ['https://livocare-frontend.onrender.com', 'https://livocare-backend.onrender.com'],
//     methods: ['GET', 'POST'],
//     allowedHeaders: ['Content-Type']
// }));

app.use(express.json());

let readings = [];

// ✅ مسار استقبال البيانات من ESP32
app.post('/api/readings', (req, res) => {
    const { bpm, spo2 } = req.body;
    
    if (bpm === undefined || spo2 === undefined) {
        return res.status(400).json({ status: 'error', message: 'Missing bpm or spo2' });
    }
    
    const reading = {
        bpm: parseInt(bpm),
        spo2: parseInt(spo2),
        timestamp: new Date().toISOString()
    };
    
    readings.push(reading);
    if (readings.length > 50) readings.shift();
    
    console.log(`✅ Saved: BPM=${reading.bpm}, SpO2=${reading.spo2}`);
    res.json({ status: 'success', data: reading });
});

// ✅ مسار جلب آخر قراءة
app.get('/api/readings/latest', (req, res) => {
    if (readings.length === 0) {
        return res.json({ status: 'success', data: null });
    }
    const latest = readings[readings.length - 1];
    res.json({ status: 'success', data: latest });
});

// ✅ مسار جلب جميع القراءات
app.get('/api/readings/all', (req, res) => {
    res.json({ status: 'success', count: readings.length, data: readings });
});

// ✅ معالجة طلبات OPTIONS مسبقاً
app.options('*', cors());

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`CORS enabled for all origins (temporary)`);
});