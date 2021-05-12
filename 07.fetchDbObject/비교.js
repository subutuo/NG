const fs = require('fs')
const path = require('path')

const x = 'ehr_bak_20200820'
const y = 'ehr_ktm_bak_20200826'

dirs = fs.readdirSync(x)

console.log(dirs)

dirs.forEach((dir) => {
  const curPath = path.join(x, dir)

  const a = fs.readdirSync(curPath)

  a.forEach((filename) => {
    const filepath1 = path.join(x, dir, filename)
    const filepath2 = path.join(y, dir, filename)
    console.log(filepath1, filepath2)
    let stat1, stat2;
    try {
       stat1 = fs.statSync(filepath1)
       stat2 = fs.statSync(filepath2)
    }catch(e) {
      console.log('없음', filepath1)
      return;
    }
    console.log(stat1.size, stat2.size, (stat1.size -2)  === stat2.size)
  })
})
