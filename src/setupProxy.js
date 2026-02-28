/**
 * setupProxy.js — React CRA dev proxy for NVIDIA NIM API
 * Proxies /api/nvidia/* → https://integrate.api.nvidia.com/v1/*
 * This bypasses CORS because the request is made server-side.
 */
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
    app.use(
        "/api/nvidia",
        createProxyMiddleware({
            target: "https://integrate.api.nvidia.com",
            changeOrigin: true,
            pathRewrite: { "^/api/nvidia": "/v1", "^/": "/v1/" }, // rewrite both full and stripped payloads

            on: {
                proxyReq: (proxyReq, req) => {
                    // Forward Authorization header as-is
                    if (req.headers["authorization"]) {
                        proxyReq.setHeader("Authorization", req.headers["authorization"]);
                    }
                    proxyReq.setHeader("Content-Type", "application/json");
                    proxyReq.setHeader("Accept", "application/json");
                },
                error: (err, req, res) => {
                    console.error("NVIDIA Proxy error:", err.message);
                    res.status(502).json({ error: "Proxy error: " + err.message });
                },
            },
        })
    );
};
