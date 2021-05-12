require('dotenv').config({path: process.env.DOTENV})

const nodemailer = require('nodemailer')
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env['nodemailer.username'], // gmail 계정 아이디를 입력
    pass: process.env['nodemailer.password'] // gmail 계정의 비밀번호를 입력
  }
})

let mailOptions = {
  from: 'subutuo@gmail.com', // 발송 메일 주소 (위에서 작성한 gmail 계정 아이디)
  to: 'subutuo@gmail.com', // 수신 메일 주소
  subject: 'Sending Email using Node.js', // 제목
  text: 'That was easy!' // 내용
}

transporter.sendMail(mailOptions, function (error, info) {
  if (error) {
    console.log(error)
  } else {
    console.log('Email sent: ' + info.response)
  }
})

return
// async..await is not allowed in global scope, must use a wrapper
async function main() {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  let testAccount = await nodemailer.createTestAccount()

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass // generated ethereal password
    }
  })

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    //to: "xafekar979@dvdoto.com", // list of receivers
    to: 'subutuo@naver.com, subutuo@gmail.com', // list of receivers
    // to: "bar@example.com, baz@example.com", // list of receivers
    subject: 'Hello ✔', // Subject line
    text: 'Hello world?', // plain text body
    html: '<b>Hello world?</b>' // html body
  })

  console.log('Message sent: %s', info.messageId)
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

main().catch(console.error)
