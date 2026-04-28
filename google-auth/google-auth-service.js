const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const cors = require('cors');

const app = express();

// ✅ المنفذ يجب أن يكون رقماً فقط
const PORT = process.env.PORT || 3002;

// ✅ المتغيرات الأخرى
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const DJANGO_API_URL = process.env.DJANGO_API_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

console.log('🔧 Configuration:');
console.log('PORT:', PORT);
console.log('GOOGLE_REDIRECT_URI:', GOOGLE_REDIRECT_URI);

// ✅ التحقق من وجود المتغيرات
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    process.exit(1);
}

const googleClient = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Google Auth Service is running! Use /auth/google to login');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/auth/google', (req, res) => {
    const url = googleClient.generateAuthUrl({
        access_type: 'online',
        scope: ['profile', 'email'],
    });
    res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.redirect(`${FRONTEND_URL}/login?error=missing_code`);
    }
    
    try {
        const { tokens } = await googleClient.getToken(code);
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        
        const response = await axios.post(`${DJANGO_API_URL}/api/auth/google/`, {
            email: payload.email,
            name: payload.name,
            google_id: payload.sub,
        });
        
        const token = response.data?.access;
        
        if (!token) {
            throw new Error('No token from Django');
        }
        
        res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
        
    } catch (error) {
        console.error('Callback error:', error.message);
        res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
    }
});

// ✅ الاستماع على المنفذ الصحيح
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Google Auth Service running on port ${PORT}`);
});