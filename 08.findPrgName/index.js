require('dotenv').config({ path: process.env.DOTENV })
const fs = require('fs')
const find = require('find')
const path = require('path')
const oracledb = require("oracledb")
const ExcelJS = require("exceljs")

let workbook = new ExcelJS.Workbook()
let connection;
let results = []

const BASE_DIR = `D:/20_IDE/workspace/ISU/EHR_NG`

const EHR_NG = {
  user: process.env['NG_USERNAME'],
  password: process.env['NG_PASSWORD'],
  connectString: process.env['NG_URL']
}
const ENTER_CD = 'NK_DEV'

// Controller
const controllerFiles = find.fileSync(/Controller\.java$/, path.join(BASE_DIR, `src`))

// Jsp
const jspFilePaths = find.fileSync(/\.jsp$/, path.join(BASE_DIR, `WebContent/WEB-INF/jsp`))
const jspBelowPath = jspFilePaths.map(file => file.replace(/\\/g, '/').replace(/.*jsp\/(.*)/, '$1'))

async function findJspToPrg(jspBelowPath) {
  const fileName = jspBelowPath.substring(0, jspBelowPath.indexOf('.'))
  const jspName = path.basename(jspBelowPath)
  // console.log(fileName)
  for (const [_, controllerFile] of controllerFiles.entries()) {
    const controllerName = path.basename(controllerFile)
    const data = fs.readFileSync(controllerFile, { encoding: 'utf-8'})
    if (data.includes(fileName)) {
      // console.log(file)

      if (!data.match(/@RequestMapping.*?(\w+\.do)/) || !data.match(new RegExp('@RequestMapping.*?(cmd=\\b\\w+\\b)[^]*' + fileName + '";'))) {
        results.push({
          jspName,
          breadcrumb: 'controller X',
          controllerName,
          urlPath: 'controller X',
          jspPath: jspBelowPath,
          mainMenuNm: 'controller X',
          gubun: '3',
          seq: '70000'
        })

        continue
      }
      const doName = data.match(/@RequestMapping.*?(\w+\.do)/)[1]
      const command = data.match(new RegExp('@RequestMapping.*?(cmd=\\b\\w+\\b)[^]*' + fileName + '";'))[1]
      const prgCd = doName + "?" + command
      // console.log(prgCd);
      let { MENU_NM, BREADCRUMB, RNUM, GUBUN } = await getBreadCrumb(ENTER_CD, prgCd)
      if (MENU_NM) {
        console.log(jspBelowPath, prgCd, `${MENU_NM} > ${BREADCRUMB}`)
      } else {
        for (const a of jspFilePaths) {
          const text = fs.readFileSync(a, {encoding: 'utf-8'})
          if (text.includes(prgCd)) {
            MENU_NM = '화면에서 호출';
            BREADCRUMB = '화면에서 호출';
            break;
          }
        }
      }
      results.push({
        jspName,
        breadcrumb: GUBUN == '1' ? `${MENU_NM} > ${BREADCRUMB}` : BREADCRUMB,
        controllerName,
        urlPath: prgCd,
        jspPath: jspBelowPath,
        mainMenuNm: MENU_NM,
        gubun: GUBUN,
        seq: RNUM || 60000
      })

      return;
    }
  }
}

async function getBreadCrumb(enterCd, prgCd) {
  try {
    let result = await connection.execute(
      `
      SELECT (SELECT MAIN_MENU_NM
        FROM tsys309 x
      WHERE x.enter_cd = t.enter_cd
        AND x.main_menu_cd = t.main_menu_cd
    ) AS MENU_NM
  , t.BREADCRUMB
  , '1' as gubun
  , t.RNUM
FROM (
    SELECT '1' || lpad(ROWNUM, 4, '0') AS RNUM
         , T.*
      FROM (
            SELECT LTRIM(SYS_CONNECT_BY_PATH(MENU_NM, ' > '), ' > ') AS BREADCRUMB
                 , t.*
              from tsys303 t
             WHERE 1=1
               and t.ENTER_CD = :enterCd
              START WITH t.PRIOR_MENU_CD = '0'
            CONNECT BY PRIOR t.ENTER_CD = t.ENTER_CD
                   AND PRIOR t.MAIN_MENU_CD = t.MAIN_MENU_CD
                   AND PRIOR t.MENU_CD = t.PRIOR_MENU_CD
              ORDER SIBLINGS BY t.SEQ
           ) T
   ) t
WHERE 1=1 
AND t.TYPE <> 'S'
AND (t.PRG_CD = :prgCd OR t.PRG_CD = '/' || :prgCd)
UNION ALL
SELECT t.appl_nm  AS MENU_NM
     , '신청결재' AS breadcrumb
     , '2' as gubun
     ,  '2' || lpad(ROWNUM, 4, '0') AS RNUM
  FROM (
        SELECT *
          from thri101 t
         WHERE 1=1
           AND t.ENTER_CD = :enterCd
         ORDER BY SEQ
       ) t
 WHERE 1=1
   AND (t.DETAIL_PRG_CD = :prgCd OR t.DETAIL_PRG_CD = '/' || :prgCd)
            `,
      {
        enterCd,
        prgCd,
      },
      {fetchInfo: {SOURCE: {type: oracledb.STRING}}, outFormat: oracledb.OUT_FORMAT_OBJECT}
    );

    let data = result.rows;

    // console.log("인출 행 개수 :", data.length)
    return data.length ? data[0] : {}
  } catch (err) {
    console.log("Error: ", err);
  } finally {
    // if (connection) {
    //   await connection.close();
    // }
  }
}


// Start
;(async () => {
  const {user, password, connectString} = EHR_NG;
  connection = await oracledb.getConnection({
    user,
    password,
    connectString
  });
  try {
    console.log(jspBelowPath.length)
    for (jspName of jspBelowPath) {
      // console.log(jspName)
      await findJspToPrg(jspName)
    }
    results.sort((a, b) => a.seq - b.seq)
    results = results.map(item => {
      for (key in item) {
        if(!item[key] || !item[key].toString().trim()) {
          item[key] = '-'
        }
      }
      return item
    })
    console.table(results)
    fs.writeFileSync('test.json', JSON.stringify(results, (key, value) => typeof value === 'undefined' ? null : value, 2), { encoding: 'utf-8' })
    
    workbook = await workbook.xlsx.readFile("test.xlsx")
    const worksheet = workbook.addWorksheet()

    worksheet.columns = Object.keys(results[0]).map((key) => ({
      header: key,
      key: key,
      width: 30
    }));
  
    worksheet.getRow(1).eachCell((cell, num) => {
      if (cell.value) {
        cell.alignment = {vertical: "middle", horizontal: "center" };
        cell.border = {top: {style: "thin"}, right: {style: "thin"}, bottom: {style: "thin"}, left: {style: "thin"}};
      }
    })
    worksheet.addRows(results, "i");
  
    worksheet.getRow(1).eachCell((cell, num) => {
      if (cell.value) {
        cell.font = {bold: true};
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {argb: "ffbbbbbb"}
        };
      }
    })
  
    worksheet.columns.forEach(function (column, i) {
      var maxLength = 0;
      column["eachCell"]({ includeEmpty: true }, function (cell) {
          var columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength ) {
              maxLength = columnLength;
          }
      });
      column.width = maxLength < 15 ? 15 : maxLength;
    });
  
    await workbook.xlsx.writeFile("test.xlsx");
  } catch(e) {
    console.error(e)
    if (connection) {
      await connection.close();
    }
  }
})()