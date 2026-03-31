const http = require('http');

http.get('http://localhost:3000/api/proxy-pdf?url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = [];
  res.on('data', chunk => data.push(chunk));
  res.on('end', () => console.log('Downloaded bytes:', Buffer.concat(data).length));
}).on('error', console.error);
