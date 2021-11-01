const fs = require('fs')
const Path = require('path')

const BASE_DIR = `hrfile/YEA_INCOME`
const enterList = fs.readdirSync(BASE_DIR)
const logs = []
for (const enterCd of enterList) {
  const years = fs.readdirSync(Path.join(BASE_DIR, enterCd))
  for (const year of years) {
    const filenames = fs.readdirSync(Path.join(BASE_DIR, enterCd, year))
    for (const filename of filenames) {
      /*
      * example
      * filename => 20201365884.pdf
      * sabun => 365884
      */
      const sabun = Path.basename(filename, Path.extname(filename)).substr(5)
      const dirPath = Path.join(BASE_DIR, enterCd, year).replace(/\\/g, '/')
      const insertSql = `
        INSERT INTO TYEA105 t 
            (ENTER_CD, SABUN, WORK_YY, ADJUST_TYPE, FILE_TYPE, FILE_SEQ, UPLOAD_DATE, FILE_PATH, FILE_NAME, ATTR1, ATTR2, ATTR3, ATTR4, CHKDATE, CHKID)
          VALUES
            ('${enterCd}', '${sabun}', '${year}', '1', '1', '1', SYSDATE, '/${dirPath}', '${filename}', '${filename}', NULL, NULL, NULL, SYSDATE, 'MIG');
        `
      // console.log(insertSql)
      logs.push(insertSql)
    }
  }
}

fs.writeFileSync('result.sql', logs.join('\n'), {encoding: 'utf-8'})



