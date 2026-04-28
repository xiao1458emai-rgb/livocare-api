const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// ✅ قراءة المتغيرات من البيئة
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const DJANGO_API_URL = process.env.DJANGO_API_URL || 'https://livocare-backend.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://livocare-frontend.onrender.com';

// ✅ التحقق من وجود المتغيرات الأساسية
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

const googleClient = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ مسار رئيسي
app.get('/', (req, res) => {
    res.send('Google Auth Service is running! Use /auth/google to login');
});

// ✅ مسار للتحقق من صحة الخدمة
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. بدء تسجيل الدخول
app.get('/auth/google', (req, res) => {
    const url = googleClient.generateAuthUrl({
        access_type: 'online',
        scope: ['profile', 'email'],
        state: req.query.state || '/'
    });
    res.redirect(url);
});

// 2. معالجة callback (نقطة الوصول بعد تسجيل الدخول من Google)
app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    
    // ✅ التحقق من وجود الكود
    if (!code) {
        console.error('❌ No code provided in callback');
        return res.redirect(`${FRONTEND_URL}/login?error=missing_code`);
    }
    
    try {
        console.log('📥 Received code from Google');
        
        const { tokens } = await googleClient.getToken(code);
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        console.log('✅ Google user:', payload.email);
        
        const response = await axios.post(`${DJANGO_API_URL}/api/auth/google/`, {
            email: payload.email,
            name: payload.name,
            google_id: payload.sub,
            picture: payload.picture
        });
        
        const token = response.data?.access;
        
        if (!token) {
            throw new Error('No access token from Django');
        }
        
        console.log('✅ Authentication successful, redirecting...');
        res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
        
    } catch (error) {
        console.error('❌ Google auth error:', error.response?.data || error.message);
        res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Google Auth Service running on port ${PORT}`);
    console.log(`📍 Health: https://google-auth-service-h5m6.onrender.com/health`);
    console.log(`📍 Auth: https://google-auth-service-h5m6.onrender.com/auth/google`);
});