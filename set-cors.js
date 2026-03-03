// Run: node set-cors.js
// Sets CORS on Firebase Storage bucket using @google-cloud/storage

const { Storage } = require('@google-cloud/storage');

const storage = new Storage({ projectId: 'real-time-chat-applicati-91215' });

const corsConfig = [
    {
        origin: ['*'],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
        responseHeader: ['Content-Type', 'Access-Control-Allow-Origin', 'Authorization'],
        maxAgeSeconds: 3600,
    },
];

async function setCors() {
    const bucket = storage.bucket('real-time-chat-applicati-91215.firebasestorage.app');
    await bucket.setCorsConfiguration(corsConfig);
    console.log('✅ CORS configuration applied successfully!');
}

setCors().catch(console.error);
