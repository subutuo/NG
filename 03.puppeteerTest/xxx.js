const namer = require('korean-name-generator')
const faker = require('faker');


console.log(faker.date.recent(365).toISOString().split('T')[0].replace(/-/g, ''))

// new Array(100).fill(null).forEach(i => console.log(namer.generate()))
