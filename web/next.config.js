/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites(){
    return [
      { source: '/', destination: '/index.html' },
      { source: '/students', destination: '/student.html' },
      { source: '/class', destination: '/class.html' }
    ];
  }
};
module.exports = nextConfig;
