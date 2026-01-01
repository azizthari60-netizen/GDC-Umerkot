const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'frontend');
const port = process.env.PORT || 8000;

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2'
};

http.createServer((req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(root, reqPath);
    if (!filePath.startsWith(root)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }
    fs.stat(filePath, (err, stat) => {
      if (err) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      if (stat.isDirectory()) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
      const stream = fs.createReadStream(filePath);
      stream.on('error', () => {
        res.statusCode = 500;
        res.end('Server error');
      });
      stream.pipe(res);
    });
  } catch (e) {
    res.statusCode = 500;
    res.end('Server error');
  }
}).listen(port, () => console.log(`Serving frontend at http://localhost:${port}`));
