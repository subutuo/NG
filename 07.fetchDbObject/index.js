require('dotenv').config({ path: process.env.DOTENV })
var oracledb = require('oracledb')
const fs = require('fs')
const path = require('path')

const date = new Date()
postFix = `_${date.getFullYear()}${("0" + (date.getMonth()+1)).substr(-2)}${("0" + date.getDate()).substr(-2)}`

const server = {
    ehr_ng_bak: {
        user: process.env.NG_USERNAME,
        password: process.env.NG_PASSWORD,
        connectString: process.env.NG_URL,
    },
}
const objLists = ['VIEW', 'FUNCTION', 'PROCEDURE', 'PACKAGE', 'SEQUENCE', 'TABLE', 'TYPE', 'INDEX'] //

Object.keys(server).forEach(async (servername) => {

    if(!fs.existsSync(servername + postFix)) {
        fs.mkdirSync(servername + postFix)
    }

    objLists.forEach((dirname) => {
        const fpath = path.join(servername + postFix, dirname)
        if(!fs.existsSync(fpath)) {
            fs.mkdirSync(fpath)
        }
    })

    await start(servername)
})

async function start(servername) {
    const { user, password, connectString } = server[servername]
    const connection = await oracledb.getConnection({
        user,
        password,
        connectString,
    })
    console.log("Successfully connected to Oracle!", servername)

    try {
        let results = await connection.execute(
            ` SELECT object_type                                     AS TYPE
                    ,object_name                                     AS NAME
                    ,dbms_metadata.get_ddl(object_type, object_name) AS SOURCE
                FROM user_objects t
               WHERE t.object_type IN (${objLists.map(obj => `'${obj}'`).join(', ')})
                 AND t.OBJECT_NAME NOT LIKE 'SYS_PLSQL%'
            `, [], { fetchInfo: {"SOURCE": {type: oracledb.STRING}} }
        )
           
        const data = results.rows.map(row => {
            let r = {};
            row.forEach((data, index) => {
                r[results.metaData[index].name] = data;
            });
            return r
        });

        console.log('인출 행 개수 :', data.length, servername)

        data.forEach(({ TYPE, NAME, SOURCE }) => {
            let etc
            switch(TYPE) {
                case "FUNCTION" :
                    etc = 'fnc'
                    break
                case "PROCEDURE" :
                    etc = 'prc'
                    break
                case "PACKAGE" :
                    etc = 'pck'
                    break
                default :
                    etc = 'sql'
                    break
            }

            if(NAME.includes('/')) {
                console.log(NAME,'(명명규칙에 의해 수정됨)');
                NAME = NAME.replace('/', '') + ' (명명규칙에 의해 수정됨)'
            }

            /**
             * 패키지일 경우 슬래쉬(/) 구분자 넣어서 디비 툴 인식
             */
            if (TYPE === 'PACKAGE') {
                const regex = new RegExp('(END.*' + NAME + '.*;)', 'ig')
                SOURCE = SOURCE.replace(regex, '$1\r\n/')
            }

            /**
             * 시퀀스일 경우 START WITH 값 임의 설정
             */
            if (TYPE === 'SEQUENCE') {
                // const regex = new RegExp('(START WITH )\\d+', 'i')
                // let startNumber = 3000000
                // SOURCE = SOURCE.replace(regex, '$1' + startNumber)
            }
            
            fs.writeFileSync(`./${servername + postFix}/${TYPE}/${NAME}.${etc}`, SOURCE, { encoding: 'utf-8' })
            // console.log(`완료.. ./${servername}/${TYPE}/${NAME}.${etc}`)
        })
        console.log('완료', servername + postFix)
    } catch(err) {
        console.log("Error: ", err)
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
