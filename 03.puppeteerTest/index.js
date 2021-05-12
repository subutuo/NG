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
    devtools: true,
    args: ['--window-size=1920,1080', '--window-position=-1920,0']
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
    await page.type('#loginUserId', process.env.NK_ID)
    await page.type('#loginPassword', process.env.NK_PASSWORD)

    // 로그인 버튼 클릭
    await Promise.all([page.click('#btnLogin'), page.waitForNavigation()])

    // 임직원 공통 클릭
    await Promise.all([page.evaluate(() => $($('#authList1 a').splice(-1)[0]).trigger('click')), page.waitForNavigation()])

    console.log('Main.do 이동')
    await Promise.all([
      page.evaluate(() => {
        document.querySelector('#majorMenu1 > li > a').click()
      }),
      page.waitForNavigation()
    ])

    await Promise.all([page.click('#viewMenuCd'), page.waitForSelector('iframe[src="/SearchMenuLayer.do?cmd=viewSearchMenuLayer"]')])

    const frame = await (await page.$('iframe[src="/SearchMenuLayer.do?cmd=viewSearchMenuLayer"]')).contentFrame()

    await frame.type('#searchText', '%')
    await Promise.all([frame.click('#btnSearch'), frame.click('#btnSearch'), page.waitForResponse((res) => res.url().includes('getSearchMenuLayerList'))])

    console.log('팝업 숨김')
    await page.evaluate(() => {
      document.querySelector('body > div.grLayer-pop').style.visibility = 'hidden'
    })

    const rowCount = await frame.evaluate(() => sheet1.RowCount())
    console.log('rowCount', rowCount)

    // 접근 가능 화면당 루프
    for (let i = 0; i < rowCount; i++) {
      let searchPath = await frame.evaluate((i) => sheet1.GetCellValue(i + 1, 'searchPath'), i)
      console.log(i + 1, searchPath)
      await frame.evaluate((i) => {
        console.log(`sheet1_OnClick(i + 1, 2)`)
        sheet1_OnClick(i + 1, 2)
      }, i)

      await page.waitForTimeout(3000)

      // searchPath = searchPath.replace(/[\\\/\:\*\?\"\>\<]/g, ' ')
      // await page.screenshot({path: `${path.join(folderPath, `${i.toString().padStart(3, '0')}. ${searchPath}`)}.png`});

      const tabFrame = await (await page.evaluateHandle(() => $('iframe[name*=tabs-]').splice(-1)[0])).contentFrame()

      await tabFrame.evaluate(async () => {
        function getTargetInnerTextExceptChild(el) {
          var child = el.firstChild
          var texts = []

          while (child) {
            if (child.nodeType == 3) {
              texts.push(child.data)
            } else {
              // 개행 태그는 무시하지 않고 적용함 (아이비시트 내용에서 개행 적용 위함)
              if (child.tagName === 'BR') {
                texts.push('\n') //
              }
            }
            child = child.nextSibling
          }

          return texts.join('')
        }

        // 엘리먼트를 스트링으로 변환하기
        function elToString(targetElement, isDeep) {
          var _isDeep = isDeep === false ? false : true
          if (!targetElement || !targetElement.tagName) return ''
          var el = document.createElement('div')
          el.appendChild(targetElement.cloneNode(false))
          var txt = el.innerHTML
          if (_isDeep) {
            var ax = txt.indexOf('>') + 1
            txt = txt.substring(0, ax) + targetElement.innerHTML + txt.substring(ax)
          }
          el = null
          return txt
        }

        // 어휘관리 화면 팝업으로 띄우기
        function openDictMgr(keyLevel, keyId) {
          var url = '/DictMgr.do?cmd=viewDict'
          var args = {}
          args['keyLevel'] = keyLevel
          args['keyId'] = keyId
          openPopup(url, args, '1450', '590')
        }

        // 텍스트에 태그정보가 포함되어 있으면 팝업 띄우기
        function tagExistsAtText(text, keyLevel, source) {
          const regexp = RegExp(source)
          if (regexp.test(text)) {
            var keyId = text.match(regexp)[1]
            console.log('keyLevel =', keyLevel)
            console.log('keyId =', keyId)
            openDictMgr(keyLevel, keyId)
            return true
          } else {
            return false
          }
        }

        // 태그라이브러리 문자 만들기
        function getTagLibText(targetEl, tagLibElName, mid, mdef, isCopyAttr) {
          var tagLibEl = document.createElement(tagLibElName)

          // 기존 태그의 어트리뷰트 복사하기
          if (isCopyAttr === true) {
            targetEl.getAttributeNames().forEach(function (name) {
              var value = targetEl.getAttribute(name)
              if (name === 'class') {
                name = 'css'
              }
              tagLibEl.setAttribute(name, value)
            })
          }

          tagLibEl.setAttribute('mid', '#MID#')
          tagLibEl.setAttribute('mdef', '#MDEF#')

          var resultText = elToString(tagLibEl)
          resultText = resultText.replace(/"#MID#"/g, "'" + mid + "'")
          resultText = resultText.replace(/"#MDEF#"/g, "'" + mdef + "'")
          resultText = resultText.substring(0, resultText.indexOf('>')) + '/>'

          return resultText
        }

        // TLAN150테이블에 데이터 있는지 확인
        function getLangData(targetEl, keyLevel, keyText) {
          var data = ajaxCall('/LangId.do?cmd=getKeyInfo', 'keyLevel=' + keyLevel + '&keyText=' + encodeURIComponent(keyText), false)
          if (!data) {
            throw 'error'
          }

          if (data.map) {
            var rtnKeyLevel = data.map.keyLevel
            var rtnKkeyId = data.map.keyId
            var rtnKkeyText = data.map.keyText

            var tagLibElName
            switch (rtnKeyLevel) {
              case 'btn':
                tagLibElName = 'btn:a'
                break
              case 'sht':
                tagLibElName = 'sht:txt'
                break
              case 'tit':
                tagLibElName = 'tit:txt'
                break
              case 'sch':
                tagLibElName = 'sch:txt'
                break
            }

            var resultText = getTagLibText(targetEl, tagLibElName, rtnKkeyId, rtnKkeyText, rtnKeyLevel === 'btn' ? true : false)
            return resultText
          }
        }

        function setLangData(targetEl, keyLevel, keyText) {
          var data = ajaxCall('/LangId.do?cmd=callP_SYS_NG_LANG_INS', 'keyLevel=' + keyLevel + '&keyText=' + encodeURIComponent(keyText), false)
          if (!data) {
            throw 'error'
          }

          if (data.map) {
            var rtnKeyLevel = data.map.keyLevel
            var rtnKkeyId = data.map.keyId
            var rtnKkeyText = data.map.keyText

            var tagLibElName
            switch (rtnKeyLevel) {
              case 'btn':
                tagLibElName = 'btn:a'
                break
              case 'sht':
                tagLibElName = 'sht:txt'
                break
              case 'tit':
                tagLibElName = 'tit:txt'
                break
              case 'sch':
                tagLibElName = 'sch:txt'
                break
            }

            var resultText = getTagLibText(targetEl, tagLibElName, rtnKkeyId, rtnKkeyText, rtnKeyLevel === 'btn' ? true : false)
            return resultText
          }
        }

        console.log(Array.from(document.querySelectorAll('*')).length)
        for ([index, targetEl] of Array.from(document.querySelectorAll('*')).entries()) {
          var tagName = targetEl.tagName

          if (tagName === 'INPUT') continue
          if (targetEl.style.display === 'none') continue
          if (targetEl.style.visibility === 'hidden') continue

          var innerText = getTargetInnerTextExceptChild(targetEl)
          innerText = innerText && innerText.trim()
          if (!/[가-힣]/.test(innerText)) continue
          if (!innerText) continue

          /* 태그라이브러리 검증할 내용 추가하는 부분 Start */
          if (tagExistsAtText(innerText, 'tit', '/\\(tit\\.(.*)\\)$/')) continue
          if (tagExistsAtText(innerText, 'btn', '/\\(btn\\.(.*)\\)$/')) continue
          if (tagExistsAtText(innerText, 'sht', '/\\(sht\\.(.*)\\)$/')) continue
          if (tagExistsAtText(innerText, 'sch', '/\\(sch\\.(.*)\\)$/')) continue
          /* 태그라이브러리 검증할 내용 추가하는 부분 End */

          // 아이비시트
          if ($(targetEl).closest('table.GMMainTable').length) {
            if ($(targetEl).hasClass('GMHeaderText')) {
              var keyLevel = 'sht'
              try {
                var tagLibText = getLangData(targetEl, keyLevel, innerText)
                if (!tagLibText) {
                  // 테이블에 있을 경우 출력
                  if (!confirm('자동생성하기')) continue
                  var data = setLangData(targetEl, keyLevel, innerText)
                  console.log(data)
                }
              } catch (e) {
                continue
              }
            }

            continue
          }

          if (tagName === 'A') {
            // 버튼
            if (!!$(targetEl).parent().hasClass('btn')) {
              var keyLevel = 'btn'
              try {
                var tagLibText = getLangData(targetEl, keyLevel, innerText)
                if (!tagLibText) {
                  // 테이블에 있을 경우 출력
                  if (!confirm('자동생성하기')) continue
                  var data = setLangData(targetEl, keyLevel, innerText)
                  console.log(data)
                }
              } catch (e) {
                continue
              }

              continue
            }
          } else if (tagName === 'TD' || tagName === 'TH') {
            var keyLevel = 'tit'
            try {
              var tagLibText = getLangData(targetEl, keyLevel, innerText)
              if (!tagLibText) {
                // 테이블에 있을 경우 출력
                if (!confirm('자동생성하기')) continue
                var data = setLangData(targetEl, keyLevel, innerText)
                console.log(data)
              }
            } catch (e) {
              continue
            }

            continue
          } else if (tagName === 'LI') {
            // 그리드 헤더 텍스트
            if ($(targetEl).hasClass('txt')) {
              var keyLevel = 'tit'
              try {
                var tagLibText = getLangData(targetEl, keyLevel, innerText)
                if (!tagLibText) {
                  // 테이블에 있을 경우 출력
                  if (!confirm('자동생성하기')) continue
                  var data = setLangData(targetEl, keyLevel, innerText)
                  console.log(data)
                }
              } catch (e) {
                continue
              }

              continue
            }
          } else if (tagName === 'SPAN') {
            // 부모에 돋보기 이미지가 있는 경우, sch태그 사용하도록
            if ($(targetEl).closest('.sheet_search').length) {
              var keyLevel = 'sch'
              try {
                var tagLibText = getLangData(targetEl, keyLevel, innerText)
                if (!tagLibText) {
                  // 테이블에 있을 경우 출력
                  if (!confirm('자동생성하기')) continue
                  var data = setLangData(targetEl, keyLevel, innerText)
                  console.log(data)
                }
              } catch (e) {
                continue
              }

              continue
            } else {
              var keyLevel = 'tit'
              try {
                var tagLibText = getLangData(targetEl, keyLevel, innerText)
                if (!tagLibText) {
                  // 테이블에 있을 경우 출력
                  if (!confirm('자동생성하기')) continue
                  var data = setLangData(targetEl, keyLevel, innerText)
                  console.log(data)
                }
              } catch (e) {
                continue
              }
            }
          }
        }
      })
    }
  } catch (err) {
    console.error(err)
  } finally {
    //   await browser.close();
  }
}
