const fs = require('fs')
const data = require('./testData')
const { copy } = require("copy-paste");
const KEYWORD = `REACT`

let reactData = data
  .filter(({ technologyStack }) => {
    return technologyStack.find(tech => ~tech.toLocaleUpperCase().indexOf(KEYWORD))
  })
//
let technologyStacks = []
let requirementsInfos = []
let preferenceInfos = []

reactData = reactData.forEach(({technologyStack,
  requirementsInfo,
  preferenceInfo}) => {
    technologyStacks = [...technologyStacks, ...technologyStack]
    requirementsInfos = [...requirementsInfos, ...requirementsInfo]
    preferenceInfos = [...preferenceInfos, ...preferenceInfo]
  })

unique = [...new Set(technologyStacks)]
// copy(JSON.stringify(technologyStacks, null, 2))
unique = unique.map(stack => ({
  [stack]: technologyStacks.filter(i => i == stack).length
})).sort((a, b) => Object.values(b)[0] - Object.values(a)[0])
requirementsInfos = [...new Set(requirementsInfos)]
preferenceInfos = [...new Set(preferenceInfos)]

console.log(unique);
console.log(requirementsInfos);
console.log(preferenceInfos);

fs.writeFileSync(`${KEYWORD}_technologyStacks.txt`, JSON.stringify(unique, null, 2), { encoding: 'utf-8'});
fs.writeFileSync(`${KEYWORD}_requirementsInfos.txt`, JSON.stringify(requirementsInfos, null, 2), { encoding: 'utf-8'});
fs.writeFileSync(`${KEYWORD}_preferenceInfos.txt`, JSON.stringify(preferenceInfos, null, 2), { encoding: 'utf-8'});

