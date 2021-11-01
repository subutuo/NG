const puppeteer = require('puppeteer')
const ChromeCookie = require('chrome-cookie');
const fs = require('fs')
const CCookie = new ChromeCookie();

;(async () => {
  // Reading cookie
  const cookie = await CCookie.getCookie('localhost');

  let jsessionid = cookie.filter(i => i.name === "JSESSIONID")[0].encrypted_value

  jsessionid = JSON.parse(jsessionid).data
  console.log(jsessionid);

  var buf = Buffer.from(jsessionid, 'utf8');
  console.log(buf);

  fs.writeFileSync('./test', buf, {encoding: 'utf-8'})

  
  
  console.log(buf2);
  

  // const browser = puppeteer.launch({
  //   headless: false,
  //   defaultViewport: {
  //     width: 1920,
  //     height: 1080
  //   }
  // })


})()