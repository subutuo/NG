require('colors')

const {execSync} = require('child_process')
const basePath = `D:\\20_IDE\\workspace\\ISU\\EHR_NG`
const path = require('path')
const SVN_URL = `https://akcnapwvihrad01.novelis.biz/svn/NG_DEV`
const Diff = require('diff')
const ExcelJS = require('exceljs')
const iconv = require('iconv-lite')

;(() => {
  // 한글
  // execSync(`chcp 65001`)
  execSync(`chcp 949`)
  // var curText = execSync(`echo 한글"`, {encoding: 'utf-8'})

  // console.log(curText);
  
  var curText = execSync(`svn log --verbose -r 1781 D:\\20_IDE\\workspace\\ISU\\EHR_NG`)

  // var curText = execSync(`svn cat -r 1781 "https://akcnapwvihrad01.novelis.biz/svn/NG_DEV/EHR_NG/DB_Object/VIEW/인사_인사기본_기준일.vw"`, {encoding: 'utf-8'})

  // iconv.encode('한글', 'utf-8')
  console.log(curText);
  console.log(iconv.decode(curText, 'euc-kr'));
})()
