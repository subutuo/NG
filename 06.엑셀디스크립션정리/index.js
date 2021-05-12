require('dotenv').config({ path: process.env.DOTENV })
const fs = require('fs')

const path = require('path')
const oracledb = require("oracledb")
const ExcelJS = require("exceljs")

let workbook = new ExcelJS.Workbook()
let connection;

const EHR_NG = {
  user: process.env['NG_USERNAME'],
  password: process.env['NG_PASSWORD'],
  connectString: process.env['NG_URL']
}

async function getTableDescription() {
  const {user, password, connectString} = EHR_NG;
  connection = await oracledb.getConnection({
    user,
    password,
    connectString
  });

  try {
    let result = await connection.execute(
      `
      SELECT a.TABLE_NAME                               AS TABLE_NAME
      , b.COMMENTS                                 AS TABLE_COMMENTS
      , c.COLUMN_NAME                              AS COLUMN_NAME
      , c.DATA_TYPE || '(' || c.DATA_LENGTH || ')' AS TYPE
      , c.NULLABLE                                 AS NULLABLE
      , c.data_default                             AS DFLTS
      , d.COMMENTS                                 AS COLUMN_COMMENTS
   FROM user_tables a
      , USER_TAB_COMMENTS b
      , USER_TAB_COLUMNS c
      , USER_COL_COMMENTS d
  WHERE 1=1
    AND a.STATUS = 'VALID'
    AND a.TABLE_NAME = b.TABLE_NAME (+)
    AND a.TABLE_NAME = c.TABLE_NAME (+)
    AND c.TABLE_NAME = d.TABLE_NAME (+)
    AND c.COLUMN_NAME = d.COLUMN_NAME (+)
    
    -- Test
    -- AND a.table_name IN ('THRM100', 'TCPN201', 'THRI103', 'TTIM120')
  ORDER BY a.TABLE_NAME
         , c.COLUMN_ID
            `,
      {},
      {fetchInfo: {SOURCE: {type: oracledb.STRING}}, outFormat: oracledb.OUT_FORMAT_OBJECT}
    );

    let data = result.rows;
    console.log("인출 행 개수 :", data.length)
    return data.length ? data : []
  } catch (err) {
    console.log("Error: ", err);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}


// Start
;(async () => {
  let data = await getTableDescription();
  data = data.map(item => {
    for (key in item) {
      if(!item[key] || !item[key].toString().trim()) {
        item[key] = ' '
      }
    }
    return item
  })

  await drawSheet2(data)
})()

// 테이블 별 탭으로 정리
async function drawSheet2(data) {
  try {
    // workbook = await workbook.xlsx.readFile("test.xlsx")

    const tableList = data
      .sort((a, b) => a.TABLE_NAME - b.TABLE_NAME)
      .reduce((acc, cur) => {
        if (acc.length === 0) {
          acc.push(cur.TABLE_NAME)
        } else if (acc[acc.length-1] !== cur.TABLE_NAME) {
          acc.push(cur.TABLE_NAME)
        }
        return acc
      }, [])
    console.log('tableList', tableList);

    (() => {
      console.log('drawing Index');
      const worksheet = workbook.addWorksheet('index')
      worksheet.columns = [{ header: 'TABLE_LIST', key: 'TABLE_LIST', width: 30 }]

      // internal link
      worksheet.getColumn('TABLE_LIST').values = tableList.map(item => ({ text: item, hyperlink: `#\'${item}\'!A1`}))
    })()
    
    for (let[index, tableName] of tableList.entries()) {
      console.log(`${index+1} drawing ${tableName}`);
      const worksheet = workbook.addWorksheet(tableName)

      const targetData = data.filter(i => i.TABLE_NAME === tableName)

      worksheet.columns = Object
        .keys(targetData[0])
        .filter(key => {
          if (key === 'TABLE_NAME' || key === 'TABLE_COMMENTS') {
            return false;
          } else {
            return true;
          }
        })
        .map((key) => ({
        header: key,
        key: key,
        width: 30
      }));
      worksheet.insertRow(1, [`${targetData[0].TABLE_NAME} (${targetData[0].TABLE_COMMENTS})`]);
      worksheet.mergeCells('A1:C1');

      worksheet.getRow(2).eachCell((cell, num) => {
        if (cell.value) {
          cell.alignment = {vertical: "middle", horizontal: "center" };
          cell.border = {top: {style: "thin"}, right: {style: "thin"}, bottom: {style: "thin"}, left: {style: "thin"}};
        }
      })
      worksheet.addRows(targetData, "i");
    
      worksheet.getRow(2).eachCell((cell, num) => {
        if (cell.value) {
          cell.font = {bold: true};
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {argb: "ffbbbbbb"}
          };
        }
      })
    
      // worksheet.columns.forEach(function (column, i) {
      //   var maxLength = 0;
      //   column["eachCell"]({ includeEmpty: true }, function (cell) {
      //       var columnLength = cell.value ? cell.value.toString().length : 10;
      //       if (columnLength > maxLength ) {
      //           maxLength = columnLength;
      //       }
      //   });
      //   column.width = maxLength < 10 ? 10 : maxLength;
      // });
    }
    await workbook.xlsx.writeFile("test.xlsx")
  } catch(e) {
    console.error(e)
    if (connection) {
      await connection.close();
    }
  }
}

// 기본
async function drawSheet(data) {
  try {
    workbook = await workbook.xlsx.readFile("test.xlsx")
    const worksheet = workbook.addWorksheet()

    worksheet.columns = Object.keys(data[0]).map((key) => ({
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
    worksheet.addRows(data, "i");
  
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
}