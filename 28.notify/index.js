var oracledb = require('oracledb')
const fs = require('fs')
const notifier = require('node-notifier')

const server = {
  serverAlias: 'PROD',
  user: 'EHR_NG',
  password: 'eHR$$123',
  connectString: '10.63.20.33:1521/NOHL'
}

async function doStart() {
  const {user, password, connectString, serverAlias} = server
  const connection = await oracledb.getConnection({
    user,
    password,
    connectString
  })
  console.log('Successfully connected to Oracle!', serverAlias)

  try {
    let results = await connection.execute(
      ` 
      select to_char(t.chkdate, 'yyyy-mm-dd') AS Ymd, t.*
      FROM tsys903 t
     WHERE t.chkdate >= TRUNC(Sysdate)
       AND INSTR(t.err_log, 'ORA-') > 0
     ORDER BY chkdate DESC
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

    console.log(data)

    // // String
    // notifier.notify('Message')

    // // Object
    // notifier.notify({
    //   title: 'My notification',
    //   message: 'Hello, there!'
    // })
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

doStart()
