const express = require('express');
const request = require('request');
const app = express();
const PORT = 4000; // 서버가 실행될 포트 번호

// CORS를 허용하는 미들웨어
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS 메서드 요청은 바로 응답
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// 프록시 엔드포인트
app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url; // 클라이언트가 요청한 URL

    if (!targetUrl) {
        return res.status(400).send('url parameter is required');
    }

    // 외부 URL에 요청
    request(
        { url: targetUrl, encoding: null }, // encoding: null로 설정해 바이너리 데이터 유지
        (error, response, body) => {
            if (error) {
                return res.status(500).send('Error fetching image');
            }

            // CORS 헤더 추가
            res.set('Content-Type', response.headers['content-type']);
            res.send(body);
        }
    );
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`CORS proxy server running at http://localhost:${PORT}`);
});
