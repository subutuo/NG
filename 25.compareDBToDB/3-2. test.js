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

function createMD() {
  const fr = 'dev'
  const to = 'qa'
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
  fs.appendFileSync('./test.md', `# fr & to 비교\r\n[[toc]]\r\n`, {encoding: 'utf-8'})

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
  console.log('md 작성 시작')
  createMD()
  console.log('md 작성 종료')
}
doStart()
