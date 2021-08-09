const oracledb = require('oracledb')
require('dotenv').config({path: process.env.DOTENV})
const puppeteer = require('puppeteer')
const axios = require('axios')
const fs = require('fs')

const EHR_NG = {
  user: process.env['NG_USERNAME'],
  password: process.env['NG_PASSWORD'],
  connectString: process.env['NG_URL']
}

let targetList
;(async () => {
  await getTargetList()
  await runPuppeteer()
})()

async function getTargetList() {
  const {user, password, connectString} = EHR_NG
  const connection = await oracledb.getConnection({
    user,
    password,
    connectString
  })

  try {
    let result = await connection.execute(
      `
      SELECT sabun
      , NAME
      , name_us
   FROM (SELECT t2.sabun
              , T2.name
              , t2.NAME_US
           FROM THRM100 T2
               ,THRM151 T3
          WHERE T2.ENTER_CD = T3.ENTER_CD
            AND T2.SABUN = T3.SABUN
            AND TO_CHAR(SYSDATE, 'YYYYMMDD') BETWEEN T3.SDATE AND NVL(T3.EDATE, '99991231')
            AND T2.ENTER_CD = 'YJ_DEV'
            AND (T3.ENTER_CD, T3.SABUN, T3.SDATE) =
                (SELECT /*+ INDEX_DESC(THRM151 PK_HRM151)*/
                  ENTER_CD
                 ,SABUN
                 ,SDATE
                   FROM THRM151
                  WHERE ENTER_CD = T2.ENTER_CD
                    AND SABUN = T2.SABUN
                    AND SDATE <= TO_CHAR(SYSDATE, 'YYYYMMDD')
                    AND STATUS_CD <> 'RAA'
                    AND ROWNUM = 1)
            AND T3.STATUS_CD <> 'RAA'
            AND T3.STATUS_CD != 'RA') A
  WHERE 1 = 1
            `,
      [],
      {fetchInfo: {SOURCE: {type: oracledb.STRING}}, outFormat: oracledb.OUT_FORMAT_OBJECT}
    )

    let data = result.rows

    console.log('인출 행 개수 :', data.length)

    targetList = data
    return
  } catch (err) {
    console.log('Error: ', err)
  } finally {
    if (connection) {
      await connection.close()
    }
  }
}

async function runPuppeteer() {
  const {user, password, connectString} = EHR_NG
  const connection = await oracledb.getConnection({
    user,
    password,
    connectString
  })

  const args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-infobars', '--window-position=0,0', '--ignore-certifcate-errors', '--ignore-certifcate-errors-spki-list', '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"']

  const options = {
    args,
    headless: false,
    ignoreHTTPSErrors: true,
    // userDataDir: './tmp',
    timeout: 60000
  }

  const browser = await puppeteer.launch(options)

  try {
    let results = []
    while (true) {
      const list = targetList.splice(0, 10)
      if (!list.length) break
      await Promise.all(list.map(async (target, index) => {
        if (!target['NAME_US']) {
          const page = await browser.newPage()
          const url = `https://translate.google.co.kr/?hl=en&tab=wT&sl=auto&tl=en&text=${target['NAME']}&op=translate`
          console.log(url)
          await page.goto(url)
          try {
            await page.waitForFunction(() => document.querySelector('div[aria-hidden="true"][data-location="1"][jsaction][jscontroller][jsname] > div[jsname]:nth-child(1)').textContent, { timeout: 60000})
            
            const usName = await page.evaluate(() => document.querySelector('div[aria-hidden="true"][data-location="1"][jsaction][jscontroller][jsname] > div[jsname]:nth-child(1)').textContent)
            console.log(index, target['NAME'], '=>', usName)
            target['NAME_US'] = usName
            list[index]['NAME_US'] = usName
          } catch(e) {} finally {
            await page.close()
          }
        }

        const ws = fs.createWriteStream(`picture/${target['SABUN']}.jpg`)
        const res = await axios.get(`https://ui-avatars.com/api/?name=${target['NAME_US'] || ''}&background=random&length=3&rounded=true&bold=true`, { responseType: 'stream' })
        res.data.pipe(ws)      
        await new Promise((res, rej) => {
          ws.on('finish', res())
          ws.on('error', rej())
        })
      }))
      results = [...results, ...list]
    }

    console.log(results)
  } catch (err) {
    console.error(err)
  } finally {
    await browser.close()
    await connection.close()
  }
}

// ;(async() => {
//   const result = await axios.get('https://ui-avatars.com/api/?name=jangseong-eun&background=random&length=3&rounded=true&bold=true')
//   console.log(result.data);
// })()
