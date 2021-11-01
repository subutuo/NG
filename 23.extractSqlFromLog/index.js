const fs = require('fs')
const { format } = require('sql-formatter');
const { copy, paste } = require("copy-paste");
const logs = []

// const log = fs.readFileSync('./tmp.log', { encoding: 'utf-8'})
const log = paste()

const regexp = /(■■■■■■■■■ \[ queryId[^=]+)(?:============ start query ===============)([^]*?)(?:============ end query ===============)/g
const queryLogs = log.match(regexp)

let data = queryLogs.map(queryLog => {
  const queryId = queryLog.match(/■■■■■■■■■ \[ queryId :([^ ]+)/)[1]
  const query = queryLog.match(/(?:============ start query ===============)([^]*?)(?:============ end query ===============)/)[1]
  return {
    queryId,
    query: query, // format(query)
  }
})

const INCLUDE_COMMON_CODE = false

data = data.filter(({ queryId }) => (queryId !== "getDecryptUrl" && queryId !== "getHelpPopupMap" && (INCLUDE_COMMON_CODE || queryId !== "getCommonCodeList")))

data.forEach(({ queryId, query}) => {
  const comment = `-- ${queryId}`
  logs.push(`-- ${queryId}
${query}
  ;`)
})

const logMessage = logs.join("\n\n")

console.log(logMessage);
copy(logMessage)