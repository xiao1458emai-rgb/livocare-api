const express = require('express');
const cors = require('cors');

const app = express();

// ✅ حل جذري لـ CORS - يسمح لأي نطاق بالاتصال
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

let readings = [];

// ✅ استقبال البيانات من ESP32
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

// ✅ جلب آخر قراءة
app.get('/api/readings/latest', (req, res) => {
    if (readings.length === 0) {
        return res.json({ status: 'success', data: null });
    }
    const latest = readings[readings.length - 1];
    res.json({ status: 'success', data: latest });
});

// ✅ جلب جميع القراءات
app.get('/api/readings/all', (req, res) => {
    res.json({ status: 'success', count: readings.length, data: readings });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ CORS enabled - Accepting requests from any origin`);
});