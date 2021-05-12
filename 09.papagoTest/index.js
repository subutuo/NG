require('dotenv').config({path: process.env.DOTENV})
const axios = require('axios')
const oracledb = require('oracledb')

const EHR_NK = {
  user: process.env['NG_USERNAME'],
  password: process.env['NG_PASSWORD'],
  connectString: process.env['NG_URL']
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
      select a.KEY_LEVEL, a.KEY_ID, a.LANG_CD, a.COUNTRY_CD, a.KEY_TEXT
      FROM tlan151 a
         , (
            select *
              FROM tlan151 t
             where 1=1
               AND t.LANG_CD = 'en'
               AND t.COUNTRY_CD = 'US'
               AND regexp_like(t.KEY_TEXT, '[가-힣]')
           ) b
     WHERE 1=1
       AND a.KEY_LEVEL = b.key_level
       AND a.KEY_ID = b.KEY_ID
       AND a.LANG_CD = 'ko'
       AND a.COUNTRY_CD = 'KR'
     ORDER BY KEY_LEVEL, KEY_ID
            `,
      [],
      {fetchInfo: {SOURCE: {type: oracledb.STRING}}, outFormat: oracledb.OUT_FORMAT_OBJECT}
    )

    let data = result.rows

    console.log('인출 행 개수 :', data.length)

    for (const [index, rowObj] of data.entries()) {
      const {KEY_LEVEL, KEY_ID, LANG_CD, COUNTRY_CD, KEY_TEXT} = rowObj
      /* 476. of 18720 정도 완료 */
      /* 1일한도 넘을 경우 : Error: Request failed with status code 429 */
      console.log(`${index + 1}. of ${data.length}`)
      try {
        const url = 'https://openapi.naver.com/v1/papago/n2mt'
        const res = await axios({
          url: url,
          method: 'post',
          headers: {
            'X-Naver-Client-Id': process.env['X-Naver-Client-Id'],
            'X-Naver-Client-Secret': process.env['X-Naver-Client-Secret']
          },
          data: {
            source: 'ko',
            target: 'en',
            text: KEY_TEXT
          }
        })

        const data = res.data
        console.log(KEY_TEXT, ' =>', data.message.result.translatedText)
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
