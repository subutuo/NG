require('dotenv').config({ path: process.env.DOTENV })
const puppeteer = require('puppeteer')
const {expect} = require('chai')
const _ = require('lodash')
const globalVariables = _.pick(global, ['browser', 'expect'])
const ORIGIN = 'http://localhost:8080'
const JSESSIONID = 'JSESSIONID'

// puppeteer options
const opts = {
  headless: true,
  slowMo: 10,
  timeout: 10000,
  defaultViewport: {
    width: 1920,
    height: 1080
  },
  args: ["--window-size=1920,1080", "--window-position=-1920,0"],
}
// const opts = {
//   headless: false,
//   slowMo: 100,
//   timeout: 10000,
//   defaultViewport: {
//     width: 1920,
//     height: 1080
//   },
//   args: ["--window-size=1920,1080", "--window-position=-1920,0"],
// }

// expose variables
before(async () => {
  console.log('before')
  global.expect = expect
  global.browser = await puppeteer.launch(opts)

  const page = (await global.browser.pages())[0]

  page.on('dialog', async (dialog) => {
    console.log('dialog =>', dialog.message())
    await dialog.accept()
  })

  await Promise.all([page.goto(`${ORIGIN}/Login.do`), page.waitForNavigation()])

  await page.evaluate(() => $('#companyList').val('NK_DEV').trigger('change'))
  await page.type('#loginUserId', process.env.NK_ID)
  await page.type('#loginPassword', process.env.NK_PASSWORD)

  // 로그인 버튼 클릭
  await Promise.all([page.click('#btnLogin'), page.waitForNavigation()])
  const cookies = await page.cookies()
  global.JSESSIONID = cookies.find(i => i.name === JSESSIONID).value
  await page.close()
})

beforeEach(async () => {
  console.log('beforeEach')
  global.page = await global.browser.newPage()
  global.page.on('dialog', async (dialog) => {
    console.log('dialog =>', dialog.message())
    await dialog.accept()
  })
})

afterEach(async () => {
  console.log('afterEach')
  const pages = await global.browser.pages()
  for (page of pages) {
    await page.close()
  }
})

// close browser and reset global variables
after(function () {
  browser.close()

  global.browser = globalVariables.browser
  global.expect = globalVariables.expect
})
