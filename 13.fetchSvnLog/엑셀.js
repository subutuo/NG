require('dotenv').config({path: process.env.DOTENV})
const ExcelJS = require('exceljs')
const util = require('util')

let workbook = new ExcelJS.Workbook()
const redFont = {
    size: 11,
    color: { argb: 'FFFF0000' },
    name: '맑은 고딕',
    family: 3,
    charset: 129,
    scheme: 'minor'
}
const blueFont = {
    size: 11,
    color: { argb: 'FF0000FF' },
    name: '맑은 고딕',
    family: 3,
    charset: 129,
    scheme: 'minor'
}

richText = [
  {},
  {text: '', font: ''}
]

// Start
;(async () => {
  workbook = await workbook.xlsx.readFile('test2.xlsx')
  const worksheet = workbook.getWorksheet(1)
  
  const cell = worksheet.getCell(1,2)

  cell.value = {
    richText: [
      { text: '테스트'},
      { text: ' 빨강', font: redFont},
      { text: ' 파랑', font: blueFont},
    ]
  }

  workbook.xlsx.writeFile('test2.xlsx')
  
  //console.log(util.inspect(worksheet.getCell(1,1).value, false, null, true /* enable colors */))
})()

// 테이블 별 탭으로 정리
async function drawSheet2() {
  try {
    return

    // (() => {
    //   console.log('drawing Index');
    //   const worksheet = workbook.addWorksheet('index')
    //   worksheet.columns = [{ header: 'TABLE_LIST', key: 'TABLE_LIST', width: 30 }]

    //   // internal link
    //   worksheet.getColumn('TABLE_LIST').values = tableList.map(item => ({ text: item, hyperlink: `#\'${item}\'!A1`}))
    // })()

    for (let [index, tableName] of tableList.entries()) {
      console.log(`${index + 1} drawing ${tableName}`)
      const worksheet = workbook.addWorksheet(tableName)

      const targetData = data.filter((i) => i.TABLE_NAME === tableName)
      worksheet.columns = Object.keys(targetData[0])
        .filter((key) => {
          if (key === 'TABLE_NAME' || key === 'TABLE_COMMENTS') {
            return false
          } else {
            return true
          }
        })
        .map((key) => ({
          header: key,
          key: key,
          width: 30
        }))
      worksheet.insertRow(1, [`${targetData[0].TABLE_NAME} (${targetData[0].TABLE_COMMENTS})`])
      worksheet.mergeCells('A1:C1')

      worksheet.getRow(2).eachCell((cell, num) => {
        if (cell.value) {
          cell.alignment = {vertical: 'middle', horizontal: 'center'}
          cell.border = {top: {style: 'thin'}, right: {style: 'thin'}, bottom: {style: 'thin'}, left: {style: 'thin'}}
        }
      })
      worksheet.addRows(targetData, 'i')

      worksheet.getRow(2).eachCell((cell, num) => {
        if (cell.value) {
          cell.font = {bold: true}
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {argb: 'ffbbbbbb'}
          }
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
    await workbook.xlsx.writeFile('test2.xlsx')
  } catch (e) {}
}

// 기본
async function drawSheet(data) {
  try {
    workbook = await workbook.xlsx.readFile('test.xlsx')
    const worksheet = workbook.addWorksheet()

    worksheet.columns = Object.keys(data[0]).map((key) => ({
      header: key,
      key: key,
      width: 30
    }))

    worksheet.getRow(1).eachCell((cell, num) => {
      if (cell.value) {
        cell.alignment = {vertical: 'middle', horizontal: 'center'}
        cell.border = {top: {style: 'thin'}, right: {style: 'thin'}, bottom: {style: 'thin'}, left: {style: 'thin'}}
      }
    })
    worksheet.addRows(data, 'i')

    worksheet.getRow(1).eachCell((cell, num) => {
      if (cell.value) {
        cell.font = {bold: true}
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {argb: 'ffbbbbbb'}
        }
      }
    })

    worksheet.columns.forEach(function (column, i) {
      var maxLength = 0
      column['eachCell']({includeEmpty: true}, function (cell) {
        var columnLength = cell.value ? cell.value.toString().length : 10
        if (columnLength > maxLength) {
          maxLength = columnLength
        }
      })
      column.width = maxLength < 15 ? 15 : maxLength
    })

    await workbook.xlsx.writeFile('test.xlsx')
  } catch (e) {
    console.error(e)
    if (connection) {
      await connection.close()
    }
  }
}
