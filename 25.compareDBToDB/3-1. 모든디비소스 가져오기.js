var oracledb = require('oracledb')
const fs = require('fs')
const path = require('path')
const JsDiff = require('diff')
const hljs = require('highlight.js')
const opn = require('opn')
const md = require('markdown-it')({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch (__) {}
    }
    return '' // use external default escaping
  }
})
md.use(require('markdown-it-anchor')) // Optional, but makes sense as you really want to link to something
md.use(require('markdown-it-table-of-contents'))

const server = [
  {
    serverAlias: 'QA',
    user: 'EHR_NG',
    password: 'EHR_NG',
    connectString: '10.63.11.9:1521/NOHZ',
  },
  {
    serverAlias: 'PROD',
    user: 'EHR_NG',
    password: 'eHR$$123',
    connectString: '10.63.20.33:1521/NOHL',
  },
]

// const server = [
//   {
//     serverAlias: 'DEV',
//     user: 'EHR_NG',
//     password: 'EHR_NG',
//     connectString: '10.63.11.9:1521/NOHQ',
//   },
//   {
//     serverAlias: 'QA',
//     user: 'EHR_NG',c
//     password: 'EHR_NG',
//     connectString: '10.63.11.9:1521/NOHZ',
//   },
// ]

// 받을 오브젝트 타입
const objLists = ['VIEW', 'FUNCTION', 'PROCEDURE', 'PACKAGE', 'TRIGGER', 'TABLE', 'CONSTRAINT'] // ['TABLE', 'VIEW', 'SEQUENCE', 'FUNCTION', 'PROCEDURE', 'PACKAGE', 'INDEX']

async function fetchFiles(index) {
  const {user, password, connectString, serverAlias} = server[index]
  const connection = await oracledb.getConnection({
    user,
    password,
    connectString
  })
  console.log('Successfully connected to Oracle!', serverAlias)

  try {
    const inClause = objLists.map((obj) => `'${obj}'`).join(', ')

    await connection.execute(`
    DECLARE
    BEGIN
      DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM,'STORAGE',false);
      DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'CONSTRAINTS',false);
      DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'REF_CONSTRAINTS',false);
      DBMS_METADATA.set_transform_param (DBMS_METADATA.session_transform, 'PRETTY', TRUE);
      DBMS_METADATA.set_transform_param (DBMS_METADATA.session_transform, 'SQLTERMINATOR', true);
    END;`)

    const constraintSql = `
    UNION ALL
            SELECT 'CONSTRAINT' AS TYPE
                  ,CONSTRAINT_NAME AS NAME
                  ,DBMS_METADATA.GET_DDL('CONSTRAINT', T.CONSTRAINT_NAME) AS SOURCE
                  ,TO_CHAR(t.LAST_CHANGE, 'YYYY/MM/DD HH24:MI:SS') AS CHKDATE
              FROM USER_CONSTRAINTS T
             WHERE t.CONSTRAINT_NAME NOT LIKE 'BIN$%'
    `

    let results = await connection.execute(
      ` 
      SELECT *
      FROM (SELECT OBJECT_TYPE AS TYPE
                  ,OBJECT_NAME AS NAME
                  ,DBMS_METADATA.GET_DDL(OBJECT_TYPE, OBJECT_NAME) AS SOURCE
                  ,TO_CHAR(t.LAST_DDL_TIME, 'YYYY/MM/DD HH24:MI:SS') AS CHKDATE
              FROM USER_OBJECTS T
             WHERE T.OBJECT_TYPE IN (${inClause})
             ${objLists.includes('CONSTRAINT') ? constraintSql : ""}
            )
     ORDER BY 1
             ,2
            `,
      [],
      {fetchInfo: {SOURCE: {type: oracledb.STRING}}}
    )

    const data = results.rows.map((row) => {
      let r = {}
      row.forEach((data, index) => {
        r[results.metaData[index].name] = data
      })
      return r
    })

    console.log('인출 행 개수 :', data.length, serverAlias)

    for (let {TYPE, NAME, SOURCE} of data) {
      let etc // 확장자

      // 타입 별 파일 확장자 매핑
      switch (TYPE) {
        case 'FUNCTION':
          etc = 'fnc'
          break
        case 'PROCEDURE':
          etc = 'prc'
          break
        case 'PACKAGE':
          etc = 'pck'
          break
        default:
          etc = 'sql'
          break
      }

      if (NAME.includes('/')) {
        NAME = NAME.replace('/', '') + ' (파일 명명규칙에 의해 수정됨)'
      }

      // 파일 생성
      fs.writeFileSync(`./${serverAlias}/${TYPE}/${NAME}.${etc}`, SOURCE || '', {
        encoding: 'utf-8'
      })
    }
    console.log('완료', serverAlias)
  } catch (err) {
    console.log('Error: ', err)
    if (connection) {
      await connection.close()
      return
    }
  } finally {
    if (connection) {
      await connection.close()
    }
  }
}

function createMD() {
  const fr = server[0].serverAlias
  const to = server[1].serverAlias
  const filenames = {}

  function findInDir(dir) {
    const files = fs.readdirSync(dir)

    files.forEach((file) => {
      const filePath = path.join(dir, file)
      const fileStat = fs.lstatSync(filePath)

      if (fileStat.isDirectory()) {
        findInDir(filePath) // 파일 찾을 때 까지 Recursive
      } else {
        const dir = filePath.substring(0, filePath.indexOf('\\'))
        const filename = filePath.substr(filePath.lastIndexOf('\\') + 1).toUpperCase()
        const text = fs.readFileSync(filePath, {encoding: 'utf-8'})

        if (!filenames[filename]) {
          filenames[filename] = {} // 파일명에 해당하는 객체 만들기
        }

        filenames[filename][dir] = text
      }
    })
  }
  findInDir(fr), findInDir(to)

  fs.truncateSync('./test.md')
  fs.appendFileSync('./test.md', `# ${fr} & ${to} 비교\r\n[[toc]]\r\n`, {encoding: 'utf-8'})

  Object.keys(filenames).forEach((filename) => {
    const frText = filenames[filename][fr]
    const toText = filenames[filename][to]

    if (frText && toText) {
      fn_LineDifferWidthNewLineToken(filename, frText, toText)
    }
  })
  fs.copyFileSync('./template.html', 'test.html')

  fs.appendFileSync('./test.html', `<div class="main">`, {encoding: 'utf-8'})
  const text = fs.readFileSync('./test.md', {encoding: 'utf-8'})
  const result = md.render(text)
  fs.appendFileSync('./test.html', result, {encoding: 'utf-8'})
  fs.appendFileSync('./test.html', `</div>`, {encoding: 'utf-8'})
  fs.appendFileSync('./test.html', `</body>`, {encoding: 'utf-8'})
  fs.appendFileSync('./test.html', `</html>`, {encoding: 'utf-8'})

  opn(path.join(__dirname, './test.html'))

  function fn_LineDifferWidthNewLineToken(filename, frText, toText) {
    frText = frText.replace(/(NON)?EDITIONABLE/gi, "");
    toText = toText.replace(/(NON)?EDITIONABLE/gi, "");

    var diff = JsDiff.diffLines(frText, toText, {
      // newlineIsToken: true,
      ignoreWhitespace: true
    })
// EDITIONABLE
    if (diff.filter((line) => (line.added || line.removed) && /[^ \r\n]/.test(line.value)).length) {
      fs.appendFileSync('./test.md', `# ${filename}\r\n\r\n`, {
        encoding: 'utf-8'
      })

      fs.appendFileSync('./test.md', '```diff\r\n', {encoding: 'utf-8'})
      diff.forEach(function (line) {
        const sign = line.added ? '+' : line.removed ? '-' : '|'

        const normalText = line.value.replace(/^/gm, `${sign} `)
        fs.appendFileSync('./test.md', `${normalText}\r\n`, {
          encoding: 'utf-8'
        })
      })
      fs.appendFileSync('./test.md', '```\r\n---\r\n', {encoding: 'utf-8'})
    }
  }
}

async function doStart() {
  await Promise.all(
    server.map(async ({ serverAlias }) => {
      if (fs.existsSync(serverAlias)) {
        fs.rmdirSync(serverAlias, {recursive: true}) // 하위폴더 모두 삭제
      }
    })
  )
  await Promise.all(
    server.map(async ({ serverAlias }, index) => {
      if (!fs.existsSync(serverAlias)) {
        fs.mkdirSync(serverAlias)
      }

      objLists.forEach((dirname) => {
        const fpath = path.join(serverAlias, dirname)
        if (!fs.existsSync(fpath)) {
          fs.mkdirSync(fpath)
        }
      })

      await fetchFiles(index)
    })
  )

  console.log('md 작성 시작')
  createMD()
  console.log('md 작성 종료')
}
doStart()
