const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const path = require('path')
const crypto = require ("crypto");

const algorithm = "aes-256-cbc"; 

// generate 16 bytes of random data
const initVector = crypto.randomBytes(16);

// protected data
const message = "This is a secret message";

// secret key generate 32 bytes of random data
const Securitykey = crypto.randomBytes(32);

// the cipher function
const cipher = crypto.createCipheriv(algorithm, Securitykey, initVector);

// encrypt the message
// input encoding
// output encoding
let encryptedData = cipher.update(message, "utf-8", "hex");

encryptedData += cipher.final("hex");

console.log("Encrypted message: " + encryptedData);

// the decipher function
const decipher = crypto.createDecipheriv(algorithm, Securitykey, initVector);

let decryptedData = decipher.update(encryptedData, "hex", "utf-8");

decryptedData += decipher.final("utf8");

console.log("Decrypted message: " + decryptedData);
console.log();

return 



const cookieDBPath = path.join(process.env.APPDATA, '../Local/Google/Chrome/User Data/Default', './Cookies')
// console.log(cookieDBPath);
var db = new sqlite3.Database(cookieDBPath)

db.serialize(function () {
  db.each(`SELECT host_key, name, value, encrypted_value FROM cookies where host_key = 'localhost' `, function (err, row) {
    if (row.name == 'JSESSIONID') {
      // 349FC392B053E9F414E9CF2484BBABC3
      const { encrypted_value } = row
      console.log(encrypted_value);

      // decrypted_value = win32crypt.CryptUnprotectData(encrypted_value, None, None, None, 0)[1].decode('utf-8') or value or 0
      console.log(encrypted_value.toString('base64'))
      const decrypted = dpapi.unprotectData(encrypted_value.toString('base64'), null, 'CurrentUser')
      console.log(decrypted)
      // fs.writeFileSync('test', encrypted_value.toString("base64"), {encoding: 'ascii'})
      //console.log(encrypted_value.toString("utf8"))
    }
  })
})

db.close()
