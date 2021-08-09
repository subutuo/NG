require('dotenv').config({ path: process.env.DOTENV })
var oracledb = require('oracledb') 

const server = {
    user: process.env.NG_USERNAME,
    password: process.env.NG_PASSWORD,
    connectString: process.env.NG_URL,
}

const rawText = `F_COM_GET_CAREER_CNT(K.ENTER_CD, K.SABUN, 'W', 'YYMM', '1', NULL, '') AS "근속기간"
        F_COM_GET_CAREER_CNT(K.ENTER_CD, K.SABUN, 'Y', 'YYMM', '1', NULL, '') AS "근속기간경력포함"
        F_COM_GET_MAP_CD(K.ENTER_CD, '100', K.SABUN, '') AS "급여사업장코드"
        F_COM_GET_MAP_NM(K.ENTER_CD, '100', K.SABUN, '') AS "급여사업장명"
        F_COM_GET_MAP_ORGLEVEL_CD(K.ENTER_CD, '100', K.SABUN, '') AS "사업장코드"
        F_COM_GET_MAP_ORGLEVEL_NM(K.ENTER_CD, '100', K.SABUN, '') AS "사업장명"
        F_COM_GET_MAP_CD(K.ENTER_CD, '300', K.SABUN, '') AS "코스트센터코드"
        F_COM_GET_MAP_NM(K.ENTER_CD, '300', K.SABUN, '') AS "코스트센터명"
        F_COM_GET_MAP_CD(K.ENTER_CD, '500', K.SABUN, '') AS "근무조코드"
        F_COM_GET_MAP_NM(K.ENTER_CD, '500', K.SABUN, '') AS "근무조명"
        F_COM_GET_MAP_CD(K.ENTER_CD, '600', K.SABUN, '') AS "LOCATION코드"
        F_COM_GET_MAP_NM(K.ENTER_CD, '600', K.SABUN, '') AS "LOCATION명"
        F_COM_GET_MAP_CD(K.ENTER_CD, '700', K.SABUN, '') AS "조직유형코드"
        F_COM_GET_MAP_NM(K.ENTER_CD, '700', K.SABUN, '') AS "조직유형명"
        F_COM_GET_MAP_CD(K.ENTER_CD, '800', K.SABUN, '') AS "근무지코드"
        F_COM_GET_MAP_NM(K.ENTER_CD, '800', K.SABUN, '') AS "근무지명"
        F_COM_GET_JOB_NM(C.ENTER_CD, C.SABUN, C.SDATE, '') AS "직무"
        TO_CHAR(TO_DATE(F_COM_GET_CURR_JIKGUB_YMD(K.ENTER_CD, K.SABUN, TO_CHAR(SYSDATE, 'YYYYMMDD')), 'YYYYMMDD'), 'YYYY-MM-DD') AS "현JOB_BAND승진일"
        TO_CHAR(TO_DATE(F_COM_GET_CURR_PERSONAL_BAND_YMD(K.ENTER_CD, K.SABUN, TO_CHAR(SYSDATE, 'YYYYMMDD')), 'YYYYMMDD'), 'YYYY-MM-DD') AS "현PERSONAL_BAND승진일"
        TO_CHAR(TO_DATE(F_COM_GET_CURR_POSITION_BAND_YMD(K.ENTER_CD, K.SABUN, TO_CHAR(SYSDATE, 'YYYYMMDD')), 'YYYYMMDD'), 'YYYY-MM-DD') AS "현POSITION_BAND승진일"
        TO_CHAR(TO_DATE(F_COM_GET_CURR_JIKWEE_YMD(K.ENTER_CD, K.SABUN, TO_CHAR(SYSDATE, 'YYYYMMDD')), 'YYYYMMDD'), 'YYYY-MM-DD') AS "현KOREAN_TITLE승진일"
        TO_CHAR(TO_DATE(F_COM_GET_CURR_JIKCHAK_YMD(K.ENTER_CD, K.SABUN, TO_CHAR(SYSDATE, 'YYYYMMDD')), 'YYYYMMDD'), 'YYYY-MM-DD') AS "현TITLE승진일"
        TO_CHAR(TO_DATE(F_COM_GET_CURR_POSITION_TITLE_YMD(K.ENTER_CD, K.SABUN, TO_CHAR(SYSDATE, 'YYYYMMDD')), 'YYYYMMDD'), 'YYYY-MM-DD') AS "현POSITION_TITLE승진일"
        F_COM_GET_CAREER_CNT(K.ENTER_CD, K.SABUN, 'G', 'YYMM', '1', NULL, '') AS "그룹근속기간"
        F_COM_GET_CONT_ADDRESS(K.ENTER_CD, K.SABUN, 'OT') AS "사내전화번호"
        F_COM_GET_CONT_ADDRESS(K.ENTER_CD, K.SABUN, 'HT') AS "집전화번호"
        F_COM_GET_CONT_ADDRESS(K.ENTER_CD, K.SABUN, 'HP') AS "회사핸드폰"
        F_COM_GET_CONT_ADDRESS(K.ENTER_CD, K.SABUN, 'PH') AS "개인핸드폰"
        F_COM_GET_CONT_ADDRESS(K.ENTER_CD, K.SABUN, 'ET') AS "해외전화"
        F_COM_GET_CONT_ADDRESS(K.ENTER_CD, K.SABUN, 'IM') AS "메일주소"
        NVL(F_HRM_UNION_MEMBER_YN(K.ENTER_CD, K.SABUN, TO_CHAR(SYSDATE, 'YYYYMMDD')), 'N') AS "노조가입여부"`
const selectQueries = rawText
  .split(/\r?\n/)
  .filter(i => !!i)
  .map(i => i.trim())
const a = console.log
const results = []
console.log = function() {
  if (arguments[1] && arguments[2]) {
    results.push({
      functionName: arguments[1],
      time: arguments[2]
    })
  }
  a(...arguments)
}
;(async function start() {
    const { user, password, connectString } = server
    const connection = await oracledb.getConnection({
        user,
        password,
        connectString,
    })
    console.log("Successfully connected to Oracle!")

    try {
        for ([_, selectQuery] of selectQueries.entries()) {
          console.time(selectQuery)
          await connection.execute(
              ` 
              SELECT ${selectQuery}
                FROM THRM100 K
                INNER JOIN THRM151 C
                  ON C.ENTER_CD = K.ENTER_CD
                  AND C.SABUN = K.SABUN
                  AND TO_CHAR(SYSDATE, 'YYYYMMDD') BETWEEN C.SDATE AND NVL(C.EDATE, '99991231')
                  AND K.ENTER_CD = 'NK_DEV'
              `, [], { fetchInfo: {"SOURCE": {type: oracledb.STRING}} }
          )
          console.timeEnd(selectQuery)
        }

        results.sort((a, b) => {
          return b.time.replace(/[^\d.]*/g, "") - a.time.replace(/[^\d.]*/g, "")
        })
        console.table(results)
        const sum = results.reduce((acc, cur) => {
          acc += Number(cur.time.replace(/[^\d.]*/g, ""))
          return acc
        }, 0)
        console.log(`Total Spend Time : ${sum}ms`)
    } catch(err) {
        console.log("Error: ", err)
        if (connection) {
            await connection.close()
            return
        }
    } finally {
        if (connection) {
          await connection.close()
        }
    }
    
})()