const cmd = require('node-cmd')
const Path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const archiver = require('archiver')
const moment = require('moment')
const extract = require('extract-zip')
moment.locale('ko')

const SVN_WORKSPACE = 'C:\\Users\\subut\\Desktop\\svnDeployTest\\EHR_NG'
const STD_FROM_DATE = '2021-10-28 18:00' // 기준일자 YYYY-MM-DD HH24:MI

const YYYYMMDD = moment().format('YYYYMMDD') // YYYYMMDD
const DAY_OF_WEEK = moment().format('dddd') // x요일
const STD_TO_DATE = moment().add(1, 'minute').format('YYYY-MM-DD HH:mm') // 1분 후 시간

const BASE = `운영 반영 파일/운영 반영 파일_${YYYYMMDD}`
const FOLDER_NAME = '웹소스'
const SRC_DIR = 'C:\\Users\\subut\\Desktop\\svnDeployTest\\EHR_NG\\target\\ROOT'
const DEST_DIR = Path.join(BASE, FOLDER_NAME)

const deleteList = [] // 삭제 리스트
const exceptList = [] // 제외 리스트
const applyList = [] // 추가/변경 리스트
const outputLog = [] // Output Log
const APPLY_CLASS_YN = 'Y' // 클래스 반영여부
console.log(`클래스반영 : ${APPLY_CLASS_YN}`)
;(async () => {
  try {
    console.time('처리시간')
    log(`------ Start (From) ${STD_FROM_DATE} (To) ${STD_TO_DATE} ------`)

    // 0. dest 폴더 존재시 삭제
    if (fse.existsSync(BASE)) {
      console.log('기존 폴더 삭제')
      fse.rmdirSync(BASE, {recursive: true})
    }

    runCmd(`svn update ${SVN_WORKSPACE}`)

    fse.copySync(Path.resolve(__dirname, './build'), Path.join(SVN_WORKSPACE, 'build'))

    fse.removeSync(Path.join(SVN_WORKSPACE, 'target/ROOT.war'))
    fse.removeSync(Path.join(SVN_WORKSPACE, 'target/ROOT'))
    runCmd(`ant -f ${SVN_WORKSPACE}/build.prod.xml`)

    try {
      await extract(Path.join(SVN_WORKSPACE, 'target/ROOT.war'), {dir: Path.join(SVN_WORKSPACE, 'target/ROOT')})
      console.log('Extraction complete')
    } catch (err) {
      throw err
    }

    // 1. 기준시점부터 변경내역 가져오기
    const script = `svn diff -r {"${STD_FROM_DATE}"}:{"${STD_TO_DATE}"} ${SVN_WORKSPACE} --summarize`
    const logs = runCmd(script)

    // 2. 데이터 파싱
    let data = parsingLog(logs)

    // 2.5 과거 클래스파일이라 반영못한 데이터 확인
    if (APPLY_CLASS_YN == 'Y' && fs.existsSync('./미반영리스트.json')) {
      var unappliedDataList = fs.readFileSync('./미반영리스트.json', {encoding: 'utf-8'})

      if (unappliedDataList) {
        unappliedDataList = JSON.parse(unappliedDataList)
        unappliedDataList = unappliedDataList.map((item) => ({...item, nextPath: getWarPath(DEST_DIR, item.svnPath)}))

        unappliedDataList.forEach((item) => {
          var bool = data.some((d) => d.prevPath == item.prevPath)

          // 과거 반영안된 데이터가 이번에도 수정내역이 있어 데이터가 두개일 경우
          if (bool) {
            console.log('과거 반영못한 데이터가 수정된 내역이 있으므로 제외', data.prevPath)
          } else {
            data.push(item)
          }
        })
      }
    }

    // 2.7 data JSON으로 로그 생성
    fs.writeFileSync(`./dataLog/dataLog_${moment().format('YYYY-MM-DD_HHmmss')}.txt`, JSON.stringify(data, null, 2), {encoding: 'utf-8'})

    log('-----------------SVN 리스트-----------------')

    // 3. 물리적 파일 복사
    for (const [_, obj] of data.entries()) {
      const {type, prevPath, nextPath} = obj

      log(`${type} ${nextPath}`.replace(new RegExp(`(\\w{1})?.*${FOLDER_NAME}(.*)`, 'mg'), '$1 $2') + (obj.unapplied ? `                  미반영 파일(${obj.regDate})` : ''))

      // class 파일 제외시킴
      if (APPLY_CLASS_YN == 'N') {
        if (nextPath.match(/\.class$/)) {
          exceptList.push(obj)
          continue
        }

        if (nextPath.match(/classes\\spring/)) {
          exceptList.push(obj)
          continue
        }
      }

      // if (nextPath.match(/opti\.properties/)) {
      //   exceptList.push(obj)
      //   continue
      // }

      // if (nextPath.match(/rdPopupIframe.jsp/)) {
      //   exceptList.push(obj)
      //   continue
      // }

      if (type === 'D') {
        deleteList.push(obj)
        continue
      }
      applyList.push(obj)
      fse.copySync(prevPath, nextPath)
    }
    printTypeCnt(data)

    // 4. 추가/변경/삭제 이력 집계 Log
    if (exceptList.length) {
      log('-----------------제외 리스트-----------------')
      exceptList.forEach((item) => {
        log(item.nextPath.replace(new RegExp(`.*${FOLDER_NAME}(.*)`, 'mg'), '$1'))
      })
      printTypeCnt(exceptList)
    }

    if (applyList.length) {
      log('-----------------추가/변경 리스트-----------------')
      applyList.forEach((item) => {
        log(item.nextPath.replace(new RegExp(`.*${FOLDER_NAME}(.*)`, 'mg'), '$1'))
      })

      printTypeCnt(applyList)
    }

    if (deleteList.length) {
      log('-----------------삭제 리스트-----------------')
      deleteList.forEach((item) => {
        log(item.nextPath.replace(new RegExp(`.*${FOLDER_NAME}(.*)`, 'mg'), '$1'))
      })
      printTypeCnt(deleteList)
    }

    // 5 미반영 리스트 파일 생성
    let tempData = exceptList.length ? exceptList.map((item) => ({...item, unapplied: true, regDate: STD_TO_DATE})) : []

    ///// 30
    if (fs.existsSync('./미반영리스트.json')) {
      var unappliedDataList = fs.readFileSync('./미반영리스트.json', {encoding: 'utf-8'})
      if (unappliedDataList) {
        unappliedDataList = JSON.parse(unappliedDataList)
        tempData = tempData.concat(unappliedDataList)

        tempData.sort((a, b) => {
          x = a['svnPath'] > b['svnPath'] ? '1' : '0'
          y = b['regDate'] > a['regDate'] ? '1' : '0'
          return x + y
        })

        tempData = tempData.reduce((acc, cur, i) => {
          if (i === 0) {
            acc.push(cur)
            return acc
          }

          if (acc[acc.length - 1]['type'] !== cur['type'] || acc[acc.length - 1]['svnPath'] !== cur['svnPath']) {
            acc.push(cur)
          }
          return acc
        }, [])
      }
    }
    ///// 30

    if (tempData.length) {
      fs.writeFileSync(`./미반영리스트.json`, JSON.stringify(tempData, null, 2), {
        encoding: 'utf-8'
      })

      log('-----------------과거포함 미반영 리스트-----------------')
      tempData.forEach((item) => {
        log(item.nextPath.replace(new RegExp(`.*${FOLDER_NAME}(.*)`, 'mg'), '$1'))
      })
      printTypeCnt(tempData)
    }

    // 5.5 로그파일 생성
    fs.writeFileSync(Path.join(BASE, './log.txt'), outputLog.join('\r\n'), {
      encoding: 'utf-8'
    })

    // 6. 웹소스 Zip으로 압축
    const output = fs.createWriteStream(Path.join(BASE, `노벨리스코리아 웹소스_${YYYYMMDD}.zip`))
    const archive = archiver('zip')

    output.on('close', function () {
      console.log(archive.pointer() + ' total bytes')
      console.log('archiver has been finalized and the output file descriptor has closed.')
      fs.appendFileSync('반영생성 log.txt', `${STD_TO_DATE}\r\n`, {encoding: 'utf-8'})
      console.timeEnd('처리시간')
    })

    archive.on('error', function (err) {
      throw err
    })

    archive.pipe(output)

    archive.directory(DEST_DIR, false)
    archive.finalize()
  } catch (e) {
    console.error(e)
  }

  function runCmd(command) {
    log('run Cmd ::: ' + command)
    const {err, data, stderr} = cmd.runSync(command)
    // console.log(err, data, stderr);
    if (err) {
      throw err
    }
    if (stderr) {
      throw stderr
    }

    return data && data.trim()
  }

  // war 패스경로로 변경
  function getWarPath(base, path) {
    var warPath = path.replace(SVN_WORKSPACE, '')
    // src/com... -> WEB-INF/classes/com...
    if (warPath.indexOf('\\src') == 0) {
      warPath = warPath.replace('\\src', '') // src 경로 삭제
      warPath = '\\WEB-INF\\classes' + warPath
    } else if (warPath.indexOf('\\WebContent') == 0) {
      // /WebContent/common... -> /common...
      warPath = warPath.replace('\\WebContent', '')
    } else if (warPath.indexOf('\\resources') == 0) {
      // /resources/spring... -> /WEB-INF/classes/spring...
      warPath = warPath.replace('\\resources', '')
      warPath = '\\WEB-INF\\classes' + warPath
    }

    warPath = warPath.replace(/\.java$/, '.class') // java파일명칭 클래스로 변경함

    return Path.join(base, warPath.substr(1))
  }

  function printTypeCnt(obj) {
    const allCnt = 'ALL : ' + obj.length
    const aCnt = 'A : ' + obj.filter((item) => item.type == 'A').length
    const mCnt = 'M : ' + obj.filter((item) => item.type == 'M').length
    const dCnt = 'D : ' + obj.filter((item) => item.type == 'D').length

    log('')
    log([allCnt, aCnt, mCnt, dCnt].join('  '))
    log('')
  }

  function log(text, color) {
    console.log(color ? text[color] : text)
    outputLog.push(text)
  }

  function parsingLog(logs) {
    return logs
      .split('\n')
      .map((item) => {
        var type = item.substr(0, 1).trim()
        var svnPath = item.substr(1).trim()
        var prevPath = getWarPath(SRC_DIR, svnPath)
        var nextPath = getWarPath(DEST_DIR, svnPath)
        return {
          type,
          svnPath,
          prevPath,
          nextPath
        }
      })
      .filter((item) => {
        // 대상이 디렉토리인지 확인
        try {
          if (item.type != 'D' && fse.lstatSync(item.prevPath).isDirectory()) {
            return false
          } else {
            return true
          }
        } catch (e) {
          return false
        }
      })
  }
})()
