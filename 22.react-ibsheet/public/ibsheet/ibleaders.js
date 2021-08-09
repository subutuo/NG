/*
 * http://www.ibleaders.co.kr
 * Call (02)2621-2288~9
 *
 *  Copyright 2016 IB LEADERS CO. LTD.
 */
var ibleaders;
ibleaders = ibleaders || {};

ibleaders = {
    /**
     * licenseType
     *
     * enum [ "file", "value" ] default 'value'
     *
     * file로 사용할 경우 licenseType 을 명시하고 해당 프로퍼티 value로 "file" 을 설정한다.
     *
     */
    licenseType: "value",
    /**
     * license
     *
     * licenseType이 "value" 일 경우 라이선스 값을 기입한다.
     * licenseType이 "file" 일 경우 라이선스 파일 명을 기입한다.
     */
    license: "W2FtSztPKCRzZDYxYjJxbn8Ra0I6Rj93ODlnejVjLWEjNQQyXXMVaW0ocWU5QBZYeiQkTz4OMF4mPGZjMWY=", // ~ 2022-03-16
    /*
     * iborg license value
     *
     * ibleaders.js의 ibleaders.license 를 공용으로 사용할 환경이 되지 않을 경우
     * iborg를 위한 개별 license 를 이곳에 지정한다.
     *
     */
    iborg: {
        /**
         * license
         *
         * licenseType이 "value" 일 경우 라이선스 값을 기입한다.
         * licenseType이 "file" 일 경우 라이선스 파일 명을 기입한다.
         */
		license: "W2FtSztPKCZwbzcyYjJxbn9UKR1qEGYleWR5ezx/dzluNQEyA3QSfSo9YGs9LHsreyx5BSJKMEEmNXlgOWUsdiApfGxGIgd8E3xgdxtGHGxzbSN9dUs/USQXZGc="  //2020.06.23
    }
};