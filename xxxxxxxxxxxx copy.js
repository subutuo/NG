require('dotenv').config({path: process.env.DOTENV})
var oracledb = require('oracledb')

const server = {
  user: process.env.NG_USERNAME,
  password: process.env.NG_PASSWORD,
  connectString: process.env.NG_URL
}
;(async function start() {
  new Array(5).fill(null).forEach(async(_, index) => {
    var vpnName = 'novvpn03'
    console.time(`${index + 1} ${vpnName}`)

    const {user, password, connectString} = server
    const connection = await oracledb.getConnection({
      user,
      password,
      connectString
    })
    console.log('Successfully connected to Oracle!')

    try {
      await connection.execute(` select * from dual  `, [], {fetchInfo: {SOURCE: {type: oracledb.STRING}}})
      console.timeEnd(`${index + 1} ${vpnName}`)
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
  })
})()
