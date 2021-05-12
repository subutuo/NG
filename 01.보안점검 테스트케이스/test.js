const puppeteer = require("puppeteer");
const qs = require('querystring')
const axios = require("axios");
require('colors');
const ORIGIN = 'http://localhost:8080';
(async function setUserMgrPwdInit() {
  const POSTFIX = `/UserMgr.do?cmd=setUserMgrPwdInit`;
  const URL = ORIGIN + POSTFIX;

  let params = qs.stringify({ sabun:'82222127' })

  try {
    const res = await axios.post(URL, params, {
      headers: {
        'Cookie': `JSESSIONID=8AD81C36CE39E53B30E205233DB864BB`,
        'Referer': "http://localhost:8080/PsnalBasic.do?cmd=viewPsnalBasic",
      },
    }); 
 
  } catch(e) { 
  }
})()