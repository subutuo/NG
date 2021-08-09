require('dotenv').config({path: process.env.DOTENV})
const namer = require('korean-name-generator')
const faker = require('faker')

const puppeteer = require('puppeteer')
const ORIGIN = 'http://localhost:8080'
const ENTER_CD = `YJ_DEV`
let MENU_LIST = []
let browser, page, menuSearchFrame
// const orgCdList = ['F1A', 'F3C', 'F1C', 'F3E'] // F1A 인사, F3C 회계, F1C 총무, F3E 자금
const orgCdList = require('./orgCdList')
const targetDataList = new Array(100).fill(null).map(item => {
  const enterYmd = faker.date.recent(60).toISOString().split('T')[0].replace(/-/g, '')
  const birthDay = faker.date.between(new Date(2011, 0, 2), new Date(1990, 0, 2)).toISOString().split('T')[0].replace(/-/g, '')
  return {
    name: namer.generate(),
    resNo: `${birthDay.substr(2)}1111111`,
    regYmd: enterYmd,
    ordDetailCd: 'A01', // 발령 : 입사
    orgCd: orgCdList[Math.floor(Math.random() * orgCdList.length)], // 소속코드
    jikchakCd: '60', // 직책 : 팀원
    jikweeCd: '60', // 직위 대리
    workType: '000100', // 직군 일반직군
    manageCd: 'A20', // 사원구분 일반직
    payType: 'A', // 급여유형 연봉제
    gempYmd: enterYmd, // 그룹입사일
    empYmd: enterYmd // 입사일
  }
})
// console.log(targetDataList)

;(async () => {
  await runPuppeteer()
})()

function waitForGrid(page) {
  return page.evaluate(async () => {
    await new Promise(res => {
      setInterval(() => {
        const bool = Array
          .from($("#procimg"))
          .every(i => !i.offsetParent)
        if (bool) setTimeout(() => res(), 1000)
      }, 100)
    })
  })  
}

async function runPuppeteer() {
  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1920,
      height: 1080
    },
    timeout: 30000,
    // devtools: true,
    args: ['--window-size=1920,1080', '--window-position=-1920,0']
  })

  try {
    page = (await browser.pages())[0]

    page.on('dialog', async (dialog) => {
      console.log('dialog =>', dialog.message())
      existDialog = true
      await dialog.accept()
    })

    await Promise.all([page.goto(`${ORIGIN}/Login.do`), page.waitForNavigation()])

    await page.evaluate((ENTER_CD) => $('#companyList').val(ENTER_CD).trigger('change'), ENTER_CD)
    await page.type('#loginUserId', process.env.NK_ID)
    await page.type('#loginPassword', process.env.NK_PASSWORD)

    // 로그인 버튼 클릭
    await Promise.all([page.click('#btnLogin'), page.waitForNavigation()])

    console.log('Main.do 이동')
    await Promise.all([page.evaluate(() => document.querySelector('#majorMenu1 > li > a').click()), page.waitForNavigation()])

    await page.waitForSelector('iframe[src="/SearchMenuAllLayer.do?cmd=viewSearchMenuAllLayer"]')

    menuSearchFrame = await (await page.$('iframe[src="/SearchMenuAllLayer.do?cmd=viewSearchMenuAllLayer"]')).contentFrame()

    // console.log('팝업 숨김')
    await page.evaluate(() => {
      document.querySelector('body > div.grLayer-pop').style.visibility = 'hidden'
    })

    MENU_LIST = await page.evaluate(() => {
      var data = ajaxCall('/SearchMenuAllLayer.do?cmd=getSearchMenuAllLayerList', 'localeCd=ko_KR', false)
      if (data && data.DATA) {
        return data.DATA.filter((i) => !!i.prgCd)
      }
    })

    console.group('채용기본사항등록')
    await 채용기본사항등록()
    console.groupEnd()

    
    console.group('채용발령내용등록')
    await 채용발령내용등록()
    console.groupEnd()

    console.group('사번생성_가발령')
    await 사번생성_가발령()
    console.groupEnd()

    console.group('발령처리')
    await 발령처리()
    console.groupEnd()
    
    await page.waitFor(300000)
  } catch (err) {
    console.error(err)
  } finally {
    await browser.close()
  }
}

// 화면이동
async function goToPrgByName(prgName) {
  const prgInfo = MENU_LIST.filter((i) => i.menuNm === prgName)[0]

  // 화면이동
  await menuSearchFrame.evaluate(({mainMenuCd, prgCd}) => onMenuOpen(mainMenuCd, prgCd), prgInfo)

  const href = await page.evaluate(({menuNm}) => {
    return $('a[href*=tabs-]')
      .filter(function () {
        if ($(this).text() === menuNm) {
          return true
        }
      })
      .attr('href')
  }, prgInfo)

  await page.waitForSelector(`${href} iframe`)
  const frame = await (await page.$(`${href} iframe`)).contentFrame()
  await frame.waitForNavigation({waitUntil: 'networkidle2'})
  return frame
}

async function 채용기본사항등록() {
  const frame = await goToPrgByName('채용기본사항등록')

  for (const targetData of targetDataList) {
    console.log(`Insert name : ${targetData.name}, orgCd : ${targetData.orgCd}`);
    await frame.evaluate(() => doAction1('Insert'))
  
    await new Promise(async (res) => {
      if ((await browser.pages()).length > 1) res()
    })
    const popup = (await browser.pages()).splice(-1)[0]
  
    await popup.waitForSelector(`iframe#iPublicFrame`)
    const pFrame = await (await popup.$(`iframe#iPublicFrame`)).contentFrame()
    await pFrame.waitForSelector(`.popup_main`)
    await pFrame.evaluate(({name, resNo, regYmd}) => {
      $('#regYmd').val(regYmd) // 입력일
      $('#name').val(name) // 성명
      $('#resNo1').val(resNo.match(/(\d{6})-?(\d{7})/)[1]) // 주민앞
      $('#resNo2').val(resNo.match(/(\d{6})-?(\d{7})/)[2]) // 주민뒤
      setSheetData() // 확인
    }, targetData)

    await frame.evaluate(() => {
      sheet1.SetCellValue(sheet1.GetSelectRow(), 'sabunType', '3')
    })
  }
  
  // await frame.evaluate(() => {
  //   const codes = sheet1.GetComboInfo(sheet1.GetSelectRow(), 'sabunType', 'code').split('|')
  //   const names = sheet1.GetComboInfo(sheet1.GetSelectRow(), 'sabunType', 'text').split('|')
  // }, '인턴/계약/일용')

  await frame.evaluate(() => {
    doAction1('Save')
  })

  await waitForGrid(frame)

  for (const targetData of targetDataList) {
    const receiveNo = await frame.evaluate((targetData) => {
      let targetIndex = -1
      if (sheet1.RowCount()) {
        for (let i = sheet1.GetDataFirstRow(); i <= sheet1.GetDataLastRow(); i++) {
          if (sheet1.GetCellValue(i, 'name') === targetData.name && sheet1.GetCellValue(i, 'resNo') === targetData.resNo) {
            targetIndex = i
            break
          }
        }
      }
      return receiveNo = sheet1.GetCellValue(targetIndex, 'receiveNo')
    }, targetData)
    targetData['receiveNo'] = receiveNo // 일련번호
  }
}

async function 채용발령내용등록() {
  const frame = await goToPrgByName('채용발령내용등록')
  await waitForGrid(frame)

  for (const targetData of targetDataList) {
    await frame.evaluate((targetData) => {
      alert(`targetData name : ${targetData.name}`)
      let targetIndex = -1
      if (sheet1.RowCount()) {
        for (let i = sheet1.GetDataFirstRow(); i <= sheet1.GetDataLastRow(); i++) {
          if (sheet1.GetCellValue(i, 'receiveNo') == targetData.receiveNo) {
            targetIndex = i
            break
          }
        }
      }
      if (~targetIndex) {
        alert(`targetIndex: ${targetIndex}`)
        sheet1.SetCellValue(targetIndex, 'ordDetailCd', targetData.ordDetailCd)
        sheet1.SetCellValue(targetIndex, 'orgCd', targetData.orgCd)
        sheet1.SetCellValue(targetIndex, 'jikchakCd', targetData.jikchakCd)
        sheet1.SetCellValue(targetIndex, 'jikweeCd', targetData.jikweeCd)
        sheet1.SetCellValue(targetIndex, 'workType', targetData.workType)
        sheet1.SetCellValue(targetIndex, 'manageCd', targetData.manageCd)
        sheet1.SetCellValue(targetIndex, 'payType', targetData.payType)
        sheet1.SetCellValue(targetIndex, 'gempYmd', targetData.gempYmd)
        sheet1.SetCellValue(targetIndex, 'empYmd', targetData.empYmd)
      }
    }, targetData)
  }
  await frame.evaluate(() => doAction1('Save'))
  await waitForGrid(frame)
}

async function 사번생성_가발령() {
  const frame = await goToPrgByName('사번생성/가발령')
  await waitForGrid(frame)

  for (const targetData of targetDataList) {
    await frame.evaluate((targetData) => {
      let targetIndex = -1
      if (sheet1.RowCount()) {
        for (let i = sheet1.GetDataFirstRow(); i <= sheet1.GetDataLastRow(); i++) {
          if (sheet1.GetCellValue(i, 'receiveNo') == targetData.receiveNo) {
            targetIndex = i
            break
          }
        }
      }
      sheet1.SetCellValue(targetIndex, 'checkSabun', 1) // 사번생성 선택
    }, targetData)
  }
  await frame.evaluate(() => doAction1('SabunCre'))
  await waitForGrid(frame)

  for (const targetData of targetDataList) {
    await frame.evaluate((targetData) => {
      let targetIndex = -1
      if (sheet1.RowCount()) {
        for (let i = sheet1.GetDataFirstRow(); i <= sheet1.GetDataLastRow(); i++) {
          if (sheet1.GetCellValue(i, 'receiveNo') == targetData.receiveNo) {
            targetIndex = i
            break
          }
        }
      }
      sheet1.SetCellValue(targetIndex, 'sabunYn', 1) // 사번확정 선택
    }, targetData)
  }
  await frame.evaluate(() => doAction1('Save'))
  await waitForGrid(frame)

  for (const targetData of targetDataList) {
    await frame.evaluate((targetData) => {
      let targetIndex = -1
      if (sheet1.RowCount()) {
        for (let i = sheet1.GetDataFirstRow(); i <= sheet1.GetDataLastRow(); i++) {
          if (sheet1.GetCellValue(i, 'receiveNo') == targetData.receiveNo) {
            targetIndex = i
            break
          }
        }
      }
      sheet1.SetCellValue(targetIndex, 'prePostYn', 1) // 가발령 적용 선택
    }, targetData)
  }
  await frame.evaluate(() => doAction1('Save'))
  await waitForGrid(frame)

  for (const targetData of targetDataList) {
    const sabun = await frame.evaluate((targetData) => {
      let targetIndex = -1
      if (sheet1.RowCount()) {
        for (let i = sheet1.GetDataFirstRow(); i <= sheet1.GetDataLastRow(); i++) {
          if (sheet1.GetCellValue(i, 'receiveNo') == targetData.receiveNo) {
            targetIndex = i
            break
          }
        }
      }
      return sabun = sheet1.GetCellValue(targetIndex, 'sabun')
    }, targetData)
    targetData['sabun'] = sabun // 일련번호
  }
}

async function 발령처리() {
  const frame = await goToPrgByName('발령처리')
  await waitForGrid(frame)

  await frame.evaluate(() => {
    $("#ordYmdFrom").val("20000101")
    doAction1('Search')
  })
  await waitForGrid(frame)

  for (const targetData of targetDataList) {
    await frame.evaluate((targetData) => {
      let targetIndex = -1
      if (sheet1.RowCount()) {
        for (let i = sheet1.GetDataFirstRow(); i <= sheet1.GetDataLastRow(); i++) {
          if (sheet1.GetCellValue(i, 'sabun') == targetData.sabun) {
            targetIndex = i
            break
          }
        }
      }
      sheet1.SetCellValue(targetIndex, 'ordYn', 1) // 발령확정
    }, targetData)
  }
  await frame.evaluate(() => doAction1('Save'))

  await waitForGrid(frame)

  for (const targetData of targetDataList) {
    await frame.evaluate((targetData) => {
      let targetIndex = -1
      if (sheet1.RowCount()) {
        for (let i = sheet1.GetDataFirstRow(); i <= sheet1.GetDataLastRow(); i++) {
          if (sheet1.GetCellValue(i, 'sabun') == targetData.sabun) {
            targetIndex = i
            break
          }
        }
      }
      sheet1.SetCellValue(targetIndex, 'checkOrd', 1) // 발령처리선택
    }, targetData)
  }
  await frame.evaluate(() => doAction1('ProcAppr'))
  await waitForGrid(frame)
}
