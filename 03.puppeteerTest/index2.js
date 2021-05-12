require('dotenv').config({ path: process.env.DOTENV })

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
let existDialog

const date = new Date()
const postFix = `_${date.getFullYear()}${('0' + (date.getMonth() + 1)).substr(-2)}${('0' + date.getDate()).substr(-2)}`
const folderPath = path.join('./', 'image' + postFix)

const ORIGIN = 'http://localhost:8080'

;(async () => {
  await makeFolder()
  await runPuppeteer()
})()

async function makeFolder() {
  if (fs.existsSync(folderPath)) {
    fs.rmdirSync(folderPath, {recursive: true})
  }
  fs.mkdirSync(folderPath)
}

async function runPuppeteer() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1920,
      height: 1080
    },
    devtools: true
    // args: ["--window-size=1920,1080", "--window-position=-1920,0"],
  })

  try {
    const page = (await browser.pages())[0]

    page.on('dialog', async (dialog) => {
      console.log('dialog =>', dialog.message())
      existDialog = true
      await dialog.accept()
    })

    await Promise.all([page.goto(`${ORIGIN}/Login.do`), page.waitForNavigation()])

    await page.evaluate(() => $('#companyList').val('NK_DEV').trigger('change'))
    console.log(process.env.NK_ID, process.env.NK_PASSWORD)
    await page.type('#loginUserId', process.env.NK_ID)
    await page.type('#loginPassword', process.env.NK_PASSWORD)

    // 로그인 버튼 클릭
    await Promise.all([page.click('#btnLogin'), page.waitForNavigation()])

    // 임직원 공통 클릭
    // await Promise.all([
    //   page.evaluate(() => $($('#authList1 a').splice(-1)[0]).trigger('click')),
    //   page.waitForNavigation()
    // ])

    console.log('Main.do 이동')
    await Promise.all([
      page.evaluate(() => {
        document.querySelector('#majorMenu1 > li > a').click()
      }),
      page.waitForNavigation()
    ])

    console.log(1)
    await page.waitForSelector('iframe[src="/SearchMenuAllLayer.do?cmd=viewSearchMenuAllLayer"]')
    console.log(2)
    // await page.waitForResponse(res => res.url().includes("SearchMenuAllLayer.do?cmd=getSearchMenuAllLayerList"))

    const frame = await (await page.$('iframe[src="/SearchMenuAllLayer.do?cmd=viewSearchMenuAllLayer"]')).contentFrame()

    console.log('팝업 숨김')
    await page.evaluate(() => {
      document.querySelector('body > div.grLayer-pop').style.visibility = 'hidden'
    })

    const prgList = await frame.evaluate(() => {
      return Array.from(document.querySelectorAll('#fragment-0 > table > tbody > tr > td:nth-child(5) > ul > li > a')).map((el) => ({
        title: el.textContent,
        event: el.getAttribute('onclick')
      }))
    })

    // 접근 가능 화면당 루프
    for (const [i, prgObj] of prgList.entries()) {
      let {title, event} = prgObj
      console.log(title)

      await frame.evaluate((event) => {
        eval(event)
      }, event)

      await page.waitForTimeout(3000)

      title = title.replace(/[\\\/\:\*\?\"\>\<]/g, ' ')
      await page.screenshot({path: `${path.join(folderPath, `${i.toString().padStart(3, '0')}. ${title}`)}.png`})
    }
  } catch (err) {
    console.error(err)
  } finally {
    await browser.close()
  }
}
