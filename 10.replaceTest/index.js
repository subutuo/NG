require('dotenv').config({path: process.env.DOTENV})

const replace = require('replace-in-file')
const oracledb = require('oracledb')

const EHR_NK = {
  user: process.env['NG_USERNAME'],
  password: process.env['NG_PASSWORD'],
  connectString: process.env.NG_URL
}

;(async () => {
  const {user, password, connectString} = EHR_NK
  const connection = await oracledb.getConnection({
    user,
    password,
    connectString
  })
  try {
    let result = await connection.execute(
      `
      SELECT MAX(t.TARGET_TXT) KEEP(DENSE_RANK FIRST ORDER BY t.CHKDATE DESC) AS TARGET_TXT
      , MAX(t.REPLACE_TXT) KEEP(DENSE_RANK FIRST ORDER BY t.CHKDATE DESC) AS REPLACE_TXT
   FROM TLAN150 T
  WHERE 1=1
    AND t.TARGET_TXT IS NOT NULL
    AND t.REPLACE_TXT is not NULL
    AND t.KEY_LEVEL IN ('sht', 'tit')
    /* tit의 REPLACE_TXT의 앞뒤 큰따옴표는 제거 후 치환작업을 해야함. */
  GROUP BY t.KEY_LEVEL
         , t.KEY_TEXT
            `,
      [],
      {fetchInfo: {SOURCE: {type: oracledb.STRING}}, outFormat: oracledb.OUT_FORMAT_OBJECT}
    )

    let data = result.rows

    console.log('인출 행 개수 :', data.length)

    for (const [index, rowObj] of data.entries()) {
      const {TARGET_TXT, REPLACE_TXT} = rowObj
      console.log(`${index + 1}. of ${data.length}`)
      try {
        const options = {
          files: [
            `D:/20_IDE/workspace/ISU/EHR_NG/WebContent/**/*.jsp`
          ],
          from: TARGET_TXT, // [/foo/g, /baz/g],
          to: REPLACE_TXT
        }
        const results = await replace(options)

        if (results.find((i) => i.hasChanged)) {
          changedData = results.filter((i) => i.hasChanged).map((i) => i.file)
          console.log('before====', TARGET_TXT)
          console.log('after=====', REPLACE_TXT)
          console.log('Replacement results:', changedData)
        }
      } catch (error) {
        console.error('Error occurred:', error)
      }
    }
  } catch (err) {
    console.log('Error: ', err)
  } finally {
    if (connection) {
      await connection.close()
    }
  }
})()
