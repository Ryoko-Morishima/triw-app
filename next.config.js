/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    // 開発中に 127.0.0.1 でアクセスする警告を抑制
    allowedDevOrigins: ['http://127.0.0.1:3000'],
  },
};
