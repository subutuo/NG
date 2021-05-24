const chai = require('chai')
const { expect } = chai

describe('Puppeteer Test', function () {
  it('Puppeteer Launched && Logged In', async function () {
    console.log(await browser.version(), JSESSIONID);
    expect(await browser.version()).to.be.ok
    expect(JSESSIONID).to.be.ok
  });

  it('Go to Hr.do', async () => {
    await Promise.all([page.goto('http://localhost:8080/Hr.do'), page.waitForNavigation()])
  })

  it('Loop Menu', async() => {
    await Promise.all([page.goto('http://localhost:8080/Hr.do'), page.waitForNavigation()])

    const iframeSelector = 'iframe[src="/SearchMenuAllLayer.do?cmd=viewSearchMenuAllLayer"]'

    await page.waitForSelector(iframeSelector)
    // await page.waitForResponse(res => res.url().includes("SearchMenuAllLayer.do?cmd=getSearchMenuAllLayerList"))
    await page.waitFor(3000)

    const frame = await (await page.$(iframeSelector)).contentFrame()

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

      continue
      await frame.evaluate((event) => {
        eval(event)
      }, event)

      await page.waitForTimeout(3000)

      title = title.replace(/[\\\/\:\*\?\"\>\<]/g, ' ')
      await page.screenshot({path: `${path.join(folderPath, `${i.toString().padStart(3, '0')}. ${title}`)}.png`})
    }
  })
});