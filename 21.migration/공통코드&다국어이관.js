require('dotenv').config({path: process.env.DOTENV})
const fs = require('fs')
const oracledb = require('oracledb')
const ENTER_CD = 'NK_DEV'
const EHR_NG = {
  user: process.env['NG_USERNAME'],
  password: process.env['NG_PASSWORD'],
  connectString: process.env['NG_URL']
}

const raw = fs.readFileSync('./이관데이터.txt', {encoding: 'utf-8'})
const DATA = raw.split(/\r?\n/).map((i) => i.split('\t'))
const GROUP_LIST = [...new Set(DATA.map(i => i[0]))]
let connection

;(async () => {
  // 1. 디비 연결
  const {user, password, connectString} = EHR_NG
  connection = await oracledb.getConnection({
    user,
    password,
    connectString
  })

  try {
    // 그룹코드만큼 루프
    for (const GRCODE_CD of GROUP_LIST) {
      // 2. TSYS005 테이블 데이터 지우기
      console.log('deleteTsys005');
      await deleteTsys005({ ENTER_CD, GRCODE_CD })
      // 3. tlan150 에서 key_id like '그룹코드.%'
      console.log('deleteTlan150');
      await deleteTlan150({ GRCODE_CD })
      // 4. tlan151 에서 key_id like '그룹코드.%'
      console.log('deleteTlan151');
      await deleteTlan151({ GRCODE_CD })
    }
    // ISU	구분	분류코드	상세코드	상세코드명	X	비고	정렬순서	사용여부	참고1	참고2	참고3
    for (const [GRCODE_CD, GRCODE_NM, _, CODE, CODE_NM, CODE_ENG_NM, MEMO, SEQ, USE_YN, NOTE1, NOTE2, NOTE3] of DATA) {
      try {
        const LANGUAGE_CD = GRCODE_CD + "." + CODE
        // 5. tsys005 Insert
        console.log('insertTsys005');
        await insertTsys005({ ENTER_CD, GRCODE_CD, CODE, CODE_NM, SEQ, USE_YN, NOTE1, NOTE2, NOTE3, MEMO, LANGUAGE_CD })
        // 6. tlan150 Insert
        console.log('insertTlan150');
        await insertTlan150({ CODE_NM, GRCODE_NM, LANGUAGE_CD })
        // 7. tlan151 Insert (한글 영문)
        console.log('insertTlan151');
        await insertTlan151({ 
          LANG_CD: 'ko',
          COUNTRY_CD: 'KR',
          KEY_TEXT: CODE_NM,
          LANGUAGE_CD
        })
        await insertTlan151({ 
          LANG_CD: 'en',
          COUNTRY_CD: 'US',
          KEY_TEXT: CODE_ENG_NM,
          LANGUAGE_CD
        })
      } catch(e) {
        console.log([GRCODE_CD, GRCODE_NM, _, CODE, CODE_NM, CODE_ENG_NM, MEMO, SEQ, USE_YN, NOTE1, NOTE2, NOTE3]);
        throw(e)
      }
    }
    await connection.commit()
  } catch (err) {
    console.log('Error: ', err)
  } finally {
    if (connection) {
      await connection.close()
    }
  }
})()

// 2. TSYS005 테이블 데이터 지우기
async function deleteTsys005(params) {
  const result = await connection.execute(
    `
    DELETE FROM tsys005 t
    WHERE t.enter_cd = :ENTER_CD
      AND t.GRCODE_CD = :GRCODE_CD
  `,
    params, // {autoCommit: true}
  )

  console.log(result);
}

// 3. tlan150 에서 key_id like '그룹코드.%'
async function deleteTlan150(params) {
  const result = await connection.execute(
    `
    DELETE FROM tlan150 t
   where 1=1
     AND t.KEY_LEVEL = 'tsys005'
     AND t.KEY_ID LIKE '%' || :GRCODE_CD || '.%'
  `,
    params, // {autoCommit: true}
  )

  console.log(result);
}

 // 4. tlan151 에서 key_id like '그룹코드.%'
async function deleteTlan151(params) {
  const result = await connection.execute(
    `
    DELETE FROM tlan151 t
   where 1=1
     AND t.KEY_LEVEL = 'tsys005'
     AND t.KEY_ID LIKE '%' || :GRCODE_CD || '.%'
  `,
    params, // {autoCommit: true}
  )

  console.log(result);
}

// 5. tsys005 Insert
async function insertTsys005(params) {
  const result = await connection.execute(
    `
    INSERT INTO tsys005 (
      ENTER_CD        -- 회사구분(TORG900)
    , GRCODE_CD       -- 그룹코드(TSYS001)
    , CODE            -- 세부코드
    , CODE_NM         -- 세부코드명
    , CODE_FULL_NM    -- 세부코드전체명
    , CODE_ENG_NM     -- 세부코드영문명
    , SEQ             -- 순서
    , VISUAL_YN       -- 보여주기여부(Y/N)
    , USE_YN          -- 사용여부
    , NOTE1           -- 비고1
    , NOTE2           -- 비고2
    , NOTE3           -- 비고3
    , NUM_NOTE        -- 비고(숫자형)
    , MEMO            -- 코드설명
    , CHKDATE         -- 최종수정시간
    , CHKID           -- 최종수정자
    , ERP_CODE        -- ERP코드
    , NOTE4           -- 비고4
    , LANGUAGE_CD     -- 어휘코드
    , NOTE5           --
) VALUES (
      :ENTER_CD        -- 회사구분(TORG900)
    , :GRCODE_CD       -- 그룹코드(TSYS001)
    , :CODE            -- 세부코드
    , :CODE_NM         -- 세부코드명
    , NULL            -- 세부코드전체명 -- 안
    , NULL            -- 세부코드영문명 -- 안씀
    , :SEQ             -- 순서
    , 'Y'             -- 보여주기여부(Y/N) -- 마이그레이션 대상 아님
    , :USE_YN          -- 사용여부
    , :NOTE1           -- 비고1
    , :NOTE2           -- 비고2
    , :NOTE3           -- 비고3
    , NULL            -- 비고(숫자형) -- 마이그레이션 대상 아님
    , :MEMO            -- 코드설명 -- 디비 상에서만 사용하는 컬럼
    , SYSDATE         -- 최종수정시간
    , 'MIG_' || TO_CHAR(SYSDATE, 'YYYYMMDD')  -- 최종수정자
    , NULL            -- ERP코드 -- 안씀
    , NULL            -- 비고4 -- 마이그레이션 대상 아님
    , :LANGUAGE_CD    -- 어휘코드 -- 그룹코드.세부코드
    , NULL            -- 비고5 -- 마이그레이션 대상 아님
)
  `,
    params, // {autoCommit: true}
  )

  console.log(result);
}


// 6. tlan150 Insert
async function insertTlan150(params) {
  const result = await connection.execute(
    `
    INSERT INTO tlan150 (
      KEY_LEVEL         -- 레벨
    , KEY_ID            -- 어휘ID
    , KEY_TEXT          -- 어휘의미
    , KEY_NOTE          -- 비고
    , KEY_READ          -- 메모리등록여부(0:등록,1:미등록)
    , CHKDATE           -- 작성일자
    , CHKID             -- 작성자
    , TARGET_TXT        --
    , REPLACE_TXT       --
) VALUES (
      'tsys005'         -- 레벨
    , :LANGUAGE_CD      -- 어휘ID
    , :CODE_NM          -- 어휘의미
    , :GRCODE_NM        -- 비고
    , '0'               -- 메모리등록여부(0:등록,1:미등록)
    , SYSDATE           -- 작성일자
    , 'MIG_' || TO_CHAR(SYSDATE, 'YYYYMMDD')    -- 작성자
    , NULL              -- 안씀
    , NULL              -- 안씀
)
  `,
    params, // {autoCommit: true}
  )

  console.log(result);
}

// 7. tlan151 Insert (한글 영문)
async function insertTlan151(params) {
  const result = await connection.execute(
    `
    INSERT INTO tlan151 (
      KEY_LEVEL        -- 레벨
    , KEY_ID           -- 어휘ID
    , LANG_CD          -- 언어코드(L00100)
    , COUNTRY_CD       -- 국가코드(H20295)
    , KEY_TEXT         -- 어휘의미
    , KEY_READ         -- 메모리등록여부(0:등록,1:미등록)
    , CHKDATE          -- 작성일자
    , CHKID            -- 작성자
    , PAPAGO_YN        -- 파파고 자동번역 여부
) VALUES (
      'tsys005'        -- 레벨
    , :LANGUAGE_CD     -- 어휘ID
    , :LANG_CD         -- 언어코드(L00100)
    , :COUNTRY_CD      -- 국가코드(H20295)
    , :KEY_TEXT        -- 어휘의미
    , '0'              -- 메모리등록여부(0:등록,1:미등록)
    , SYSDATE          -- 작성일자
    , 'MIG_' || TO_CHAR(SYSDATE, 'YYYYMMDD')   -- 작성자
    , 'N'              -- 파파고 자동번역 여부
)
  `,
    params, // {autoCommit: true}
  )

  console.log(result);

  
}