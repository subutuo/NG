require('dotenv').config({ path: process.env.DOTENV })

const puppeteer = require('puppeteer')

// const ORIGIN = 'https://papago.naver.com/'
const ORIGIN = 'https://papago.naver.com/'
const oracledb = require('oracledb')

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
      select a.KEY_LEVEL, a.KEY_ID, a.LANG_CD, a.COUNTRY_CD, a.KEY_TEXT
      FROM tlan151 a
         , (
            select *
              FROM tlan151 t
             where 1=1
               AND t.LANG_CD = 'en'
               AND t.COUNTRY_CD = 'US'
               AND regexp_like(t.KEY_TEXT, '[가-힣]')
               /* 괄호 없는것만 햇엇음
               AND NOT regexp_like(t.KEY_TEXT, '[''"\\(\\)\\[]')
               */

               /* 임시
               AND NOT REGEXP_LIKE(T.KEY_TEXT, '[''"\[]')
               AND NOT regexp_like(t.KEY_TEXT, '[' || chr(10) || chr(13) || ']')
               AND t.KEY_TEXT NOT LIKE '%\\n%'
               */

               AND t.KEY_LEVEL = 'tsys005'
           ) b
     WHERE 1=1
       AND a.KEY_LEVEL = b.key_level
       AND a.KEY_ID = b.KEY_ID
       AND a.LANG_CD = 'ko'
       AND a.COUNTRY_CD = 'KR'
     ORDER BY KEY_LEVEL, KEY_ID
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

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1920,
      height: 1080
    },
    devtools: true,
    args: ['--window-size=1920,1080', '--window-position=-1920,0']
  })
  await browser.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36')

  try {
    const page = (await browser.pages())[0]

    page.on('dialog', async (dialog) => {
      console.log('dialog =>', dialog.message())
      await dialog.accept()
    })

    console.log(['KEY_LEVEL', 'KEY_ID', 'LANG_CD', 'COUNTRY_CD', 'KEY_TEXT', '변경 후'].join(','))
    for (let [index, rowObj] of targetList.entries()) {
      const {KEY_LEVEL, KEY_ID, KEY_TEXT, LANG_CD, COUNTRY_CD} = rowObj
      let searchText = KEY_TEXT.replace(/^ko_KR/, '')
      let splitTexts = KEY_TEXT.split('|')
      if (splitTexts.length > 1) {
        for ([index, splitText] of splitTexts.entries()) {
          searchText = splitText
          await Promise.all([page.goto(ORIGIN + `?sk=ko&tk=en&st=${encodeURI(searchText)}`), page.waitForResponse((res) => res.url().includes('translate'))])

          await page.waitForSelector('#txtTarget > span')
          splitTexts[index] = await page.evaluate(() => document.querySelector('#txtTarget > span').innerText)
        }
        const translatedText = splitTexts.join('|')
        console.log([KEY_LEVEL, KEY_ID, LANG_CD, COUNTRY_CD, KEY_TEXT, translatedText].join(','))

        let result = await connection.execute(
          `
        UPDATE tlan151 t
        SET t.KEY_TEXT = :translatedText
          , t.CHKDATE = SYSDATE
          , t.CHKID = 'papago'
          , t.PAPAGO_YN = 'Y'
      WHERE 1=1
        AND t.KEY_LEVEL = :KEY_LEVEL
        AND t.KEY_ID = :KEY_ID
        AND t.LANG_CD = 'en'
        AND t.COUNTRY_CD = 'US'
        `,
          {KEY_LEVEL, KEY_ID, translatedText},
          {autoCommit: true}
        )
        // console.log("Rows updated: " + result.rowsAffected);
      } else {
        await Promise.all([page.goto(ORIGIN + `?sk=ko&tk=en&st=${encodeURI(searchText)}`), page.waitForResponse((res) => res.url().includes('translate'))])

        await page.waitForSelector('#txtTarget > span')
        const translatedText = await page.evaluate(() => document.querySelector('#txtTarget > span').innerText)
        // console.log(`${++index}. ${KEY_TEXT}`)
        // console.log('=>', translatedText)

        console.log([KEY_LEVEL, KEY_ID, LANG_CD, COUNTRY_CD, KEY_TEXT, translatedText].join(','))

        let result = await connection.execute(
          `
        UPDATE tlan151 t
        SET t.KEY_TEXT = :translatedText
          , t.CHKDATE = SYSDATE
          , t.CHKID = 'papago'
          , t.PAPAGO_YN = 'Y'
      WHERE 1=1
        AND t.KEY_LEVEL = :KEY_LEVEL
        AND t.KEY_ID = :KEY_ID
        AND t.LANG_CD = 'en'
        AND t.COUNTRY_CD = 'US'
        `,
          {KEY_LEVEL, KEY_ID, translatedText},
          {autoCommit: true}
        )
        // console.log("Rows updated: " + result.rowsAffected);
      }
    }
  } catch (err) {
    console.error(err)
  } finally {
    await browser.close()
    await connection.close()
  }
}
