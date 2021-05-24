require('colors')

const {execSync} = require('child_process')
const basePath = `D:\\20_IDE\\workspace\\ISU\\EHR_NG`
const path = require('path')
const SVN_URL = `https://akcnapwvihrad01.novelis.biz/svn/NG_DEV`
const Diff = require('diff')
const ExcelJS = require('exceljs')
const iconv = require('iconv-lite')

let workbook = new ExcelJS.Workbook()

const normalFont = {
  size: 11,
  color: { argb: 'FF595959' },
  name: '맑은 고딕',
  family: 3,
  charset: 129,
  scheme: 'minor'
}
const removedFont = {
  size: 11,
  color: { argb: 'FFE40066' },
  name: '맑은 고딕',
  family: 3,
  charset: 129,
  scheme: 'minor'
}
const blueFont = {
  size: 11,
  color: { argb: 'FF345995' },
  name: '맑은 고딕',
  family: 3,
  charset: 129,
  scheme: 'minor'
}

// SVN 최신상태로 UPDATE
function svnUpdate() {
  execSync(`svn update ${basePath}`, {encoding: 'utf-8'})
}

// 기간에 속한 리비전 가져오기
function getPeriodRevisions(from, to) {
  let output = execSync(`svn log -r {"${from}"}:{"${to}"} ${basePath}`) // from to 반대인 경우 내림차순 정렬
  output = iconv.decode(output, 'euc-kr')
  return output.match(/^r\d+/gm).map((i) => i.substr(1))
}

//
function getLogWithVerbose(revision) {
  const cmd = `svn log --verbose -r ${revision} ${basePath}`
  console.log(cmd);
  let output = execSync(cmd)
  output = iconv.decode(output, 'euc-kr')
  const lines = output.split(/\r?\n/)
  // 상단줄 제거
  lines.splice(0, 1)
  // 하단줄 제거
  lines.splice(-2)

  let [_, author, date, __] = lines[0].split('|').map((i) => i && i.trim())
  date = date.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)[0]

  const changedList = []
  let cursor = 2
  while (true) {
    if (!lines[cursor] || !lines[cursor].trim()) {
      break
    }
    const [_, type, filePath] = lines[cursor].match(/([A-z]+) (.*)/)
    changedList.push({
      type,
      filePath
    })
    cursor++
  }
  const comment = lines.slice(++cursor).join('\r\n')

  return {
    revision,
    author,
    date,
    comment,
    changedList
  }
}

;(() => {
  // 한글
  // execSync(`chcp 949`)
  // execSync(`chcp 65001`)

  // SVN 최신상태로 UPDATE
  svnUpdate()
  
  // 기간에 속한 리비전 가져오기
  const revisions = getPeriodRevisions(from = '2021-05-10 10:00', to = '2021-05-10 00:00')

  for (const revision of revisions) {
    // 리비전 정보 조회
    const info = getLogWithVerbose(revision)
    console.log(info)

    // 
    for (const [index, {type, filePath}] of info.changedList.entries()) {
      console.log(revision, type, filePath, 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      if (path.extname(filePath) && type === 'M') {
        if (path.extname(filePath) === '.mrd') continue;

        prevRevision = revision - 1
        const curCmd = `svn cat -r ${revision} "${SVN_URL}${filePath}"`
        const prevCmd = `svn cat -r ${prevRevision} "${SVN_URL}${filePath}"`
        console.log('curCmd :', curCmd);
        console.log('prevCmd :', prevCmd);
        const curText = execSync(curCmd, {encoding: 'utf-8'})
        const prevText = execSync(prevCmd, {encoding: 'utf-8'})

        const diff = Diff.diffChars(prevText, curText)

        const worksheet = workbook.addWorksheet(`${index} - ${revision}`)
        const richText = []

        diff.forEach((part) => {
          richText.push({
            text: part.value,
            font: part.added ? blueFont : part.removed ? removedFont : normalFont
          })
          // const color = part.added ? 'green' : part.removed ? 'red' : 'grey'
          // process.stderr.write(part.value[color])
        })

        const cell = worksheet.getCell(1,1)
        cell.value = { richText }
        console.log(richText)
      }
    }
  }

  workbook.xlsx.writeFile('test.xlsx')
})()
