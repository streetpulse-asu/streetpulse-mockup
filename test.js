const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

const server = http.createServer((req, res) => {
  let p = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (fs.existsSync(p)) {
    res.writeHead(200, {'Content-Type': mime[path.extname(p)] || 'text/plain'});
    res.end(fs.readFileSync(p));
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(3000, async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  
  // Navigate to map
  await page.goto('http://localhost:3000/');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/home/icyma/Desktop/screenshot_map.png' });
  
  // Click first POI in list
  const resRows = await page.$$('.res-row');
  if (resRows.length > 0) {
    await resRows[0].click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: '/home/icyma/Desktop/screenshot_poi.png' });
    
    // Click filters on map
    await page.click('.chip-filters');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: '/home/icyma/Desktop/screenshot_filters.png' });
    
    // Test the back to list / close
    await page.click('.btn-back');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: '/home/icyma/Desktop/screenshot_list_after_filters.png' });
  }
  
  await browser.close();
  server.close();
});
