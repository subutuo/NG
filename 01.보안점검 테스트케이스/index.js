const puppeteer = require("puppeteer");
const qs = require('querystring')
const axios = require("axios");
require('colors');

let USERS = [
  {
    id: '82222127',
    password: '1082716',
    name: 'targetA',
    sessionId: '',
    role: 'user',
    editAuth: false,
  },
  {
    id: '82117908',
    password: 'new1234!@',
    name: 'targetB',
    sessionId: '',
    role: 'admin',
    editAuth: true,
  }
]

const TARGET_SABUNS = [
  '82117956', // 임시범
  '82117917', // 임성빈
  '82144068', // 김유미
  '82199737', // 박병기
]

const ORIGIN = 'http://localhost:8080';
//const ORIGIN = 'http://183.98.158.251';
// const ORIGIN = 'http://ktmhr.servicezone.co.kr/';

async function run(groupName, func) {
  console.group(groupName)
  await func()
  console.groupEnd(groupName)
}

(async () => {
  console.group('Test Start !')

  await run('GET JSESSIONID', getSessionId);
  await run('2. 인사정보 조회 - 사원 임의 변경 Test', runTestCase2);
  await run('3. 이미지 가져오기 - 세션 검증 Test', runTestCase3);
  await run('4. 권한 없는 화면의 기능 사용 - 권한 매트릭스 Test', runTestCase4);
  
  console.groupEnd()
})();

async function getSessionId() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1649,
      height: 827,
    },
  });

  for ([_, user] of USERS.entries()) {
    const page = await browser.newPage();
    try {
  
      page.on('dialog', async dialog => {
        console.log(dialog.message());
        await dialog.accept();
      });
  
      await page.goto(`${ORIGIN}/Login.do`);
      await page.waitForSelector("#btnLogin");
  
      await page.evaluate((user) => {
        $("#loginUserId").val(user.id);
        $("#loginPassword").val(user.password);
      }, user)
      // await page.type("#loginUserId", user.id);
      // await page.type("#loginPassword", user.password);
      await Promise.all([
        page.click("#btnLogin"),
        page.waitForNavigation({ timeout: 0 })
      ]);

  
      const cookies = await page.cookies();
      
      JSESSIONID = cookies && cookies.filter(({ name }) => name === "JSESSIONID")[0].value;

      await page.deleteCookie({
        name: 'JSESSIONID'
      })

      USERS = USERS.map(item => {
        if (item.id == user.id) {
          item.sessionId = JSESSIONID;
        }
        return item;
      })

    } catch (e) {
      console.error(e);
    } finally {
      await page.close();
    }
  }
  console.log(USERS);
  await browser.close();
}


async function runTestCase2() {
  for ([_, user] of USERS.entries()) {
    console.group(`role: ${user.role} - ${user.name}`)

    await run('본인 조회', async () => await getPsnalBasicList(user.id, user));

    await run('그 외 조회', async () => {
      for ([_, sabun] of TARGET_SABUNS.entries()) {
        await getPsnalBasicList(sabun, user);
      }
    });

    console.groupEnd();
  }
}

async function runTestCase3() {
  const sessionId = USERS.filter(item => item.role != 'admin')[0].sessionId;
  
  await run('세션 O && referer 있음', async () => {
    await getImage({
      headers: {
        'Cookie': `JSESSIONID=${sessionId}`,
        'Referer': "http://localhost:8080/randomName",
      },
    }, true);
  });

  await run('세션 O && referer 없음', async () => {
    await getImage({
      headers: {
        'Cookie': `JSESSIONID=${sessionId}`,
        'Referer': "http://localhost:8080/randomName",
      },
    }, true);
  });
  
  await run('세션 X && referer 있음', async () => {
    await getImage({
      headers: {
        'Referer': "http://localhost:8080/RdIframe.do", // "RdIframe.do",
      },
    }, false);
  });
  
  await run('세션 X && referer 없음', async () => {
    await getImage({
      headers: {
        'Referer': "randomReferer",
      },
    }, false);
  });
}

async function runTestCase4() {
  
  for ([_, user] of USERS.entries()) {
    console.group(`role: ${user.role}, editAuth : ${user.editAuth} - ${user.name}`)

    if (user.role != 'admin') { // admin은 비밀번호 초기화하면 안됨
      await setUserMgrPwdInit(user.id, user);
    }

    for ([_, sabun] of TARGET_SABUNS.entries()) {
      await setUserMgrPwdInit(sabun, user);
    }

    console.groupEnd();
  }
}

async function getPsnalBasicList (sabun, user) {
  const POSTFIX = `/PsnalBasic.do?cmd=getPsnalBasicList`;
  const URL = ORIGIN + POSTFIX;

  let params = qs.stringify({ sabun })

  try {
    const res = await axios.post(URL, params, {
      headers: {
        'Cookie': `JSESSIONID=${user.sessionId}`,
        'Referer': "http://localhost:8080/PsnalBasic.do?cmd=viewPsnalBasic",
      },
    });
    const data = res.data;
    const DATA = data && data.DATA
    if (DATA && DATA.length) {
      const { sabun, resNo } = DATA[0]
      if (user.role == 'admin' || user.id == sabun ) {
        console.log(`타겟사번 ${sabun} 값 보임 ${JSON.stringify({sabun, resNo: resNo.replace(/(\d{6})(\d{7})/, '$1-$2')})}`.green);
      } else {
        console.log(`타겟사번 ${sabun} 값 보임 ${JSON.stringify({sabun, resNo: resNo.replace(/(\d{6})(\d{7})/, '$1-$2') })}`.red);
      }
    } else {
      if (user.role == 'admin' || user.id == sabun ) {
        console.log(`타겟사번 ${sabun} 값 안보임`.red);
      } else {
        console.log(`타겟사번 ${sabun} 값 안보임`.green);
      }
    }

  } catch(e) {
    console.error(e.response.status);
  }
}

async function getImage(options, bool) {
  const URL = ORIGIN + `/EmpPhotoOut.do?enterCd=KTM&searchKeyword=82195501`;
  try {
    const res = await axios.get(URL, options);
    if (res.status === 200 && res.data) {
      if (bool) {
        console.log('Fetch 성공'.green)
      } else {
        console.log('Fetch 성공'.red)
      }
    }
  } catch(e) {
    if (e.response.status !== 200) { // 905 992
      if (bool) {
        console.log('Fetch 실패'.red, e.response.status)
      } else {
        console.log('Fetch 실패'.green, e.response.status)
      }
    } else {
      console.error(e.response);
    }
  }
}

async function setUserMgrPwdInit(sabun, user) {
  const POSTFIX = `/UserMgr.do?cmd=setUserMgrPwdInit`;
  const URL = ORIGIN + POSTFIX;

  let params = qs.stringify({ sabun })

  try {
    const res = await axios.post(URL, params, {
      headers: {
        'Cookie': `JSESSIONID=${user.sessionId}`,
        'Referer': "http://localhost:8080/PsnalBasic.do?cmd=viewPsnalBasic",
      },
    });
    const data = res.data;

    const map = data && data.map;

    if (map) {
      if (user.editAuth) {
        console.log(`초기화 성공, 타겟사번: ${sabun} ${JSON.stringify(map)}`.green);
      } else {
        console.log(`초기화 실패, 타겟사번: ${sabun} ${JSON.stringify(map)}`.red);
      }
    }
  } catch(e) {
    if (user.editAuth) {
      console.log(`초기화 실패, 타겟사번: ${sabun} ${e.response.status}`.red);
    } else {
      console.log(`초기화 실패, 타겟사번: ${sabun} ${e.response.status}`.green);
    }
  }
}