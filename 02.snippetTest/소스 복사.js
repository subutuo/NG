require('dotenv').config({ path: process.env.DOTENV })

const fs = require('fs')
const Case = require('case')
const path = require('path')

const JSP_BASE_PATH = process.env['JSP_BASE_PATH']
const SRC_BASE_PATH = process.env['SRC_BASE_PATH']

/**
 * 필수 파라미터
 */
const F_FileName = 'perPayYearStd'
const F_EXACT_PASCAL_FileName = ''
const F_EXACT_CAMEL_FileName = ''
const F_GUBUN = 'cpn/basisConfig/perPayYearStd'

const T_FileName = 'extraEleMgr'
const T_EXACT_PASCAL_FileName = ''
const T_EXACT_CAMEL_FileName = ''
const T_GUBUN = 'cpn/element/extraEleMgr'

const IsOverwrite = true // 동일파일명 덮어쓰기 여부
const OnlyJsp = false // jsp 파일 하나만 생성 여부

const logs = {F: [], T: []}

/**
 * 실행
 */
;(function execute() {
  try {
    getJsp()
    if (OnlyJsp === false) {
      getController()
      getService()
      getXml()
    }
    console.log('출처')
    for (const item of logs['F']) {
      console.log(item)
    }
    console.log('복사')
    for (const item of logs['T']) {
      console.log(item)
    }
  } catch (e) {
    console.error(e)
  }
})()

/**
 *
 * @param {스크립트} data
 */
function getReplaceData(data) {
  const F_PascalName = F_EXACT_PASCAL_FileName || Case.pascal(F_FileName)
  const T_PascalName = T_EXACT_PASCAL_FileName || Case.pascal(T_FileName)
  const F_camelName = F_EXACT_CAMEL_FileName || Case.camel(F_FileName)
  const T_camelName = T_EXACT_CAMEL_FileName || Case.camel(T_FileName)

  data = data.replace(new RegExp('(?<!package.*)' + F_PascalName, 'g'), T_PascalName) // 패키지부분은 따로 명칭변경
  data = data.replace(new RegExp('(?<!package.*)' + F_camelName, 'g'), T_camelName) // 패키지부분은 따로 명칭변경
  data = data.replace(new RegExp(F_GUBUN, 'g'), T_GUBUN)
  data = data.replace(new RegExp(F_GUBUN.split('/').join('.'), 'g'), T_GUBUN.split('/').join('.')) // 패키지부분 명칭 변경

  return data
}

/**
 *
 * @param {구분} gubun
 * @param {시점} point
 */
function getPath(gubun, point) {
  let result
  const PascalName = Case.pascal(eval(`${point}_FileName`))
  const camelName = Case.camel(eval(`${point}_FileName`))

  switch (gubun) {
    case 'jsp':
      result = path.join(JSP_BASE_PATH, eval(`${point}_GUBUN`), camelName + '.jsp')
      break
    case 'controller':
      result = path.join(SRC_BASE_PATH, eval(`${point}_GUBUN`), PascalName + 'Controller.java')
      break
    case 'service':
      result = path.join(SRC_BASE_PATH, eval(`${point}_GUBUN`), PascalName + 'Service.java')
      break
    case 'xml':
      result = path.join(SRC_BASE_PATH, eval(`${point}_GUBUN`), PascalName + '-mapping-query.xml')
      break
  }
  logs[point].push(result)
  return result
}

/**
 * JSP
 */
function getJsp() {
  const F_PATH = getPath('jsp', 'F')

  let fData = fs.readFileSync(F_PATH, {encoding: 'utf-8'})
  let tData = getReplaceData(fData)

  const path = getPath('jsp', 'T')
  if (fs.existsSync(path) && IsOverwrite == false) {
    return console.log('생성 실패', path)
  }
  writeFile(path, tData)
}

/**
 * CONTROLLER
 */
function getController() {
  const F_PATH = getPath('controller', 'F')

  let fData = fs.readFileSync(F_PATH, {encoding: 'utf-8'})
  let tData = getReplaceData(fData)

  const path = getPath('controller', 'T')
  if (fs.existsSync(path) && IsOverwrite == false) {
    return console.log('생성 실패', path)
  }
  writeFile(path, tData)
}

/**
 * SERVICE
 */
function getService() {
  const F_PATH = getPath('service', 'F')

  let fData = fs.readFileSync(F_PATH, {encoding: 'utf-8'})
  let tData = getReplaceData(fData)

  const path = getPath('service', 'T')
  if (fs.existsSync(path) && IsOverwrite == false) {
    return console.log('생성 실패', path)
  }
  writeFile(path, tData)
}

/**
 * XML
 */
function getXml() {
  const F_PATH = getPath('xml', 'F')

  let fData = fs.readFileSync(F_PATH, {encoding: 'utf-8'})
  let tData = getReplaceData(fData)

  const path = getPath('xml', 'T')
  if (fs.existsSync(path) && IsOverwrite == false) {
    return console.log('생성 실패', path)
  }
  writeFile(path, tData)
}

function writeFile(filepath, data) {
  const {dir} = path.parse(filepath)

  fs.mkdirSync(dir, {recursive: true}) // folder 생성
  fs.writeFileSync(filepath, data, {encoding: 'utf-8'}) // 파일 생성
}
