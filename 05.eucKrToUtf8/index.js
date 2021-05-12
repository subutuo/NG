const iconv = require('iconv-lite')
const fs = require('fs')
const path = require('path')
const FROM_DIR = 'origin'
const TO_DIR = 'convertedToUtf8'
const dirs = fs.readdirSync(FROM_DIR)

for (const [_, dir] of dirs.entries()) {
  let fullDir = path.join(FROM_DIR, dir)
  const basename = path.basename(fullDir)
  if (fs.statSync(fullDir).isFile()) {
    const content = fs.readFileSync(fullDir)
    const utf8Str = iconv.decode(content, 'euc-kr')
    // utf-8 text로 저장
    fs.writeFileSync(path.join(TO_DIR, basename), utf8Str, {encoding: 'utf8'})
    console.log(fullDir)
  }
}
