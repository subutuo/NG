const oracledb = require('oracledb')
require('dotenv').config({path: process.env.DOTENV})
const fs = require('fs')


const EHR_NG = {
  user: process.env['NG_USERNAME'],
  password: process.env['NG_PASSWORD'],
  connectString: process.env['NG_URL']
}

;(async () => {
  // const enterCd = 'YJ_DEV'
  // const filenames = fs.readdirSync('picture')
  // const enterCd = 'NVK'
  // const filenames = fs.readdirSync('D:/20_IDE/workspace/ISU/EHR_NG/WebContent/hrfile/NVK/picture')
  // const enterCd = 'UAL'
  // const filenames = fs.readdirSync('D:/20_IDE/workspace/ISU/EHR_NG/WebContent/hrfile/UAL/picture')
  await getTargetList(enterCd, filenames)
})()

async function getTargetList(enterCd, filenames) {
  const {user, password, connectString} = EHR_NG
  const connection = await oracledb.getConnection({
    user,
    password,
    connectString
  })
  
  try {
    for (const filename of filenames) {
      const sabun = filename.split('.')[0]
      const seq = (
        await connection.execute(`SELECT F_COM_GET_SEQ('FILE') AS SEQ FROM DUAL`,
          {},
          {fetchInfo: {SOURCE: {type: oracledb.STRING}}, outFormat: oracledb.OUT_FORMAT_OBJECT}
        )
      ).rows[0].SEQ

      let result1 = await connection.execute(
        `INSERT INTO tsys200 (
  enter_cd,
  file_seq,
  file_path,
  chkid,
  chkdate
) VALUES (
  :enterCd,
  :seq,
  '/picture',
  'MIG2021',
  SYSDATE
)`,
        {enterCd, seq},
        {fetchInfo: {SOURCE: {type: oracledb.STRING}}, outFormat: oracledb.OUT_FORMAT_OBJECT}
      )

      console.log(filename, sabun, seq)
      let result2 = await connection.execute(
        `
INSERT INTO TSYS201
    (ENTER_CD 
    ,FILE_SEQ
    ,SEQ_NO
    ,S_FILE_NM
    ,R_FILE_NM
    ,FILE_SIZE
    ,CHKID
    ,CHKDATE
    )
VALUES
    (:enterCd
    ,:seq
    ,0
    ,:filename
    ,:filename
    ,NULL
    ,'MIG2021'
    ,SYSDATE)

            `,
        {enterCd, filename, seq},
        {fetchInfo: {SOURCE: {type: oracledb.STRING}}, outFormat: oracledb.OUT_FORMAT_OBJECT}
      )

      // console.log(result) // { lastRowid: 'AABL8tAAQAABx7fAAm', rowsAffected: 1 }

      let result3 = await connection.execute(
        `
      MERGE INTO thrm911 S
      USING DUAL
         ON (S.ENTER_CD = :enterCd AND S.SABUN = :sabun)
  WHEN MATCHED THEN
      UPDATE 
         set filename = :filename
           , file_seq = :seq
           , chkid = 'MIG2021'
           , chkdate = SYSDATE
  WHEN NOT MATCHED THEN
      INSERT (
          enter_cd,
          sabun,
          image_type,
          filename,
          SIGN,
          chkdate,
          chkid,
          file_seq,
          seq_no
      ) VALUES (
          :enterCd,
          :sabun,
          '1', -- image_type,
          :filename,
          NULL, -- SIGN,
          sysdate, -- chkdate,
          'MIG2021', -- chkid,
          :seq,
          0
      )
            `,
        {enterCd, sabun, filename, seq},
        {fetchInfo: {SOURCE: {type: oracledb.STRING}}, outFormat: oracledb.OUT_FORMAT_OBJECT}
      )

      // console.log(result3) // { lastRowid: 'AABL8tAAQAABx7fAAm', rowsAffected: 1 }
    }
    await connection.commit()
  } catch (err) {
    console.log('Error: ', err)
  } finally {
    if (connection) {
      await connection.close()
    }
  }
}
