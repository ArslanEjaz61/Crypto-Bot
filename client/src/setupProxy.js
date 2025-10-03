const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:5000",
      changeOrigin: true,
      secure: false,
      logLevel: "debug",
      pathRewrite: {
        "^/api": "/api" // Keep the /api prefix
      },
      onError: (err, req, res) => {
        console.error("Proxy error:", err);
        res.status(500).json({ error: "Proxy error occurred" });
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log("Proxying request:", req.method, req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log("Proxy response:", proxyRes.statusCode, req.url);
      }
    })
  );
};
