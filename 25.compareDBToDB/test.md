# QA & PROD 비교
[[toc]]
# F_COM_GET_SEQ.FNC

```diff
| 
| CREATE OR REPLACE  FUNCTION "EHR_NG"."F_COM_GET_SEQ" (
| 
| 
| P_FLAG      IN VARCHAR2   DEFAULT NULL
| )
| RETURN VARCHAR2
| IS
| /********************************************************************************/
| /*  FUNCTION NAME : F_COM_GET_SEQ                                               */
| /*         생성한 Sequence에 날짜를 붙여 가져오는 Function을 만들어                 */
| /*         Function을 이용해 키를 입력한다                                           */
| /*         시퀀스는 매일 12시에 Job을 통해서 1로 초기화 한다.                        */
| /*         P_COM_SET_SEQ을 JOB 에서 호출                                            */
| /*         SEQUENCE 추가할 경우 JOB에도 추가 해야함                                */
| /********************************************************************************/
| 
| v_next_no       VARCHAR2(200);
| BEGIN
| v_next_no := null;
| IF P_FLAG = 'FILE' THEN
| SELECT
| TO_CHAR(SYSDATE, 'YYYYMMDD')  || LPAD(FILE_SEQ.NEXTVAL,5,0)
| INTO v_next_no
| FROM DUAL;
| ELSIF P_FLAG = 'APPL' THEN
| SELECT
| TO_CHAR(SYSDATE, 'YYYYMMDD')  || LPAD(APPROVAL_SEQ.NEXTVAL,5,0)
| INTO v_next_no
| FROM DUAL;
| ELSIF P_FLAG = 'MAIL' THEN
| SELECT
| TO_CHAR(SYSDATE, 'YYYYMMDD')  || LPAD(MAIL_SEQ.NEXTVAL,5,0)
| INTO v_next_no
| FROM DUAL;
| ELSIF P_FLAG = 'BBS' THEN
| SELECT
| TO_CHAR(SYSDATE, 'YYYYMMDD')  || LPAD(BBS_SEQ.NEXTVAL,5,0)
| INTO v_next_no
| FROM DUAL;
| ELSIF P_FLAG = 'ETC' THEN
| SELECT
| TO_CHAR(SYSDATE, 'YYYYMMDD')  || LPAD(ETC_SEQ.NEXTVAL,5,0)
| INTO v_next_no
| FROM DUAL;
| ELSIF P_FLAG = 'LANG' THEN
| SELECT
| 
- 'NG_QA' || TO_CHAR(SYSDATE, 'YYYYMMDD')  || LPAD(LANG_SEQ.NEXTVAL,5,0)
- 
+ 'NG' || TO_CHAR(SYSDATE, 'YYYYMMDD')  || LPAD(LANG_SEQ.NEXTVAL,5,0)
+ 
| INTO v_next_no
| FROM DUAL;
| ELSIF P_FLAG = 'EDU' THEN
| SELECT
| TO_CHAR(SYSDATE, 'YYYY')  || LPAD(EDU_SEQ.NEXTVAL,5,0)
| INTO v_next_no
| FROM DUAL;
| ELSIF P_FLAG = 'EDUORG' THEN --교육기관코드 (TTRA001.EDU_ORG_CD) 2020.07.23
| SELECT
| 'TR' || LPAD(S_TTRA001.NEXTVAL,5,0)
| INTO v_next_no
| FROM DUAL;
| 
| 
| END IF;
| 
| RETURN v_next_no;
| 
| END F_COM_GET_SEQ;
| 
| 
| /
```
---
# F_CPN_BASE_MON_NK.FNC

```diff
| 
| CREATE OR REPLACE  FUNCTION "EHR_NG"."F_CPN_BASE_MON_NK" (
| P_ENTER_CD          IN  VARCHAR2 -- 회사코드
| ,P_PAY_ACTION_CD     IN  VARCHAR2 --급여년월
| ,P_SABUN             IN  VARCHAR2 -- 사번
| )
| RETURN NUMBER
| IS
| /********************************************************************************/
| /*                    (c) Copyright ISU System Inc. 2004                        */
| /*                           All Rights Reserved                                */
| /********************************************************************************/
| /*  FUNCTION NAME : F_CPN_BASE_MON_UDF                                          */
| /*                  근태  비율   Return.                                          */
| /********************************************************************************/
| /*  [ 참조 TABLE ]                                                               */
| /*               TTIM403(근태)                                                   */
| /********************************************************************************/
| /*  [ FNC 개요 ]                                                                */
| /********************************************************************************/
| /*  [ PRC,FNC 호출 ]                                                            */
| /*       수당 계산식 에서 사용                                              */
| /********************************************************************************/
| /* Date        In Charge       Description                                      */
| /*------------------------------------------------------------------------------*/
| /* 2020-08-26  Kosh            Initial Release                                  */
| /********************************************************************************/
| -- Local Variables
| ln_mon         NUMBER := 0; -- Return 근무일수
| ln_ex_mon         NUMBER := 0;
| 
+ ln_work_hour      NUMBER := 0;
+ 
| ln_ex_yn         VARCHAR2(1) := 'N';
| ln_pay_cd    TCPN201.PAY_CD%TYPE;
| l_ord_symd     varchar2(8);
| L_EMP_TYPE     VARCHAR2(1) := 'B';
| 
+ l_time_ym      varchar2(6);
+ 
| 
| BEGIN
| 
| 
- select ord_symd
- into l_ord_symd
- 
+ select ord_symd , b.time_ym
+ into l_ord_symd, l_time_ym
+ 
| from tcpn201 b
| where b.enter_cd = P_ENTER_CD
| and b.pay_action_cd = P_PAY_ACTION_CD;
| 
| /* 일반직 , 기능직여부  */
| BEGIN
| select f_com_get_grcode_note_val(a.enter_cd,'H10030',a.manage_cd,2)
| INTO L_EMP_TYPE
| from thrm151 a
| where a.enter_cd = P_ENTER_CD
| and a.sabun = P_SABUN
| and l_ord_symd between a.sdate and a.edate;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| L_EMP_TYPE := 'B'    ;
| END;
| 
| IF L_EMP_TYPE = 'B' THEN  -- 일반직
| BEGIN  -- 일반직 기본급 구하기
| SELECT d.element_mon / to_char(last_day(to_date(l_ord_symd,'yyyymmdd')),'dd')
| into ln_mon
| FROM TCPN403 C, TCPN404 D
| WHERE c.enter_cd = d.enter_cd
| and c.sabun = d.sabun
| and c.sdate = d.sdate
| and C.ENTER_CD = P_ENTER_CD
| and c.sabun = P_SABUN
| and d.element_cd IN ('100','15')
| and l_ord_symd between c.sdate and NVL(c.edate,'99991231') ;   -- 연봉제 100, 월급제 15
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| ln_mon :=   0  ;
| END;
| 
- ELSE
- BEGIN  -- 기능직 기본급 구하기
- SELECT sum(d.element_mon) * 8 --* to_char(last_day(l_ord_symd),'dd')
- into ln_mon
- FROM TCPN403 C, TCPN404 D
- WHERE c.enter_cd = d.enter_cd
- and c.sabun = d.sabun
- and c.sdate = d.sdate
- and C.ENTER_CD = P_ENTER_CD
- and c.sabun = P_SABUN
- and d.element_cd in ('11','12'',13','14')
- and l_ord_symd between c.sdate and NVL(c.edate,'99991231') ;
- EXCEPTION
- WHEN NO_DATA_FOUND THEN
- ln_mon :=  0   ;
- END;
- END IF;
- 
| 
| 
+ 
+ 
| BEGIN
| SELECT SUM(DAILY_MON*RATE)
| INTO ln_mon
| FROM (
| SELECT SUN_DATE, RATE
| , CASE WHEN ln_ex_yn = 'Y' THEN ln_ex_mon
| WHEN F_CPN_PSNL_EX_ELE_MON(P_ENTER_CD, SUN_DATE, '101', SABUN) IS NOT NULL THEN F_CPN_PSNL_EX_ELE_MON(P_ENTER_CD, SUN_DATE, '101', SABUN)
| --ELSE NVL(G.SAL_MON,0)
| ELSE CASE WHEN F_CPN_GET_PEAK_MON(P_ENTER_CD, PEAK_SEQ, ln_mon) = 0 THEN ln_mon ELSE F_CPN_GET_PEAK_MON(P_ENTER_CD, PEAK_SEQ, ln_mon)  END
| END AS DAILY_MON
| FROM (
| 
| SELECT B.SUN_DATE, (100 - NVL((SELECT MINUS_RATE
| FROM TTIM405 X, TCPN008 Y, TTIM301 Z, THRI103 W
| WHERE X.ENTER_CD = Y.ENTER_CD
| AND X.GNT_CD = Y.GNT_CD
| AND F.ORD_EYMD BETWEEN Y.SDATE AND NVL(Y.EDATE, '99991231')
| AND X.ENTER_CD = Z.ENTER_CD
| AND X.APPL_SEQ = Z.APPL_SEQ
| AND X.ENTER_CD = W.ENTER_CD
| AND X.APPL_SEQ = W.APPL_SEQ
| AND W.APPL_STATUS_CD = '99'
| AND X.ENTER_CD = F.ENTER_CD
| AND Y.PAY_CD = F.PAY_CD
| AND X.YMD = B.SUN_DATE
| AND X.SABUN = A.SABUN
| ),0)) / 100 AS RATE
| , A.SABUN
| , ln_mon
| , (SELECT  F_COM_GET_GRCODE_NOTE_VAL(A.ENTER_CD, 'C90510', PEAK_CD, 4) AS PEAK_SEQ
| FROM TCPN129
| WHERE ENTER_CD = A.ENTER_CD
| AND B.SUN_DATE BETWEEN SDATE AND NVL(EDATE, '99991231')
| AND SABUN = A.SABUN
| ) AS PEAK_SEQ
| FROM THRM151 A, TSYS007 B, TCPN203 C, THRM100 D, TCPN201 F
| WHERE B.SUN_DATE BETWEEN A.SDATE AND NVL(A.EDATE, '99991231')
| AND B.SUN_DATE BETWEEN C.WORK_SYMD AND C.WORK_EYMD
| AND A.ENTER_CD = C.ENTER_CD
| AND A.SABUN = C.SABUN
| AND A.ENTER_CD = D.ENTER_CD
| AND A.SABUN = D.SABUN
| AND C.ENTER_CD = F.ENTER_CD
| AND C.PAY_ACTION_CD= F.PAY_ACTION_CD
| AND A.STATUS_CD = 'AA'
| AND A.ENTER_CD = P_ENTER_CD
| AND C.PAY_ACTION_CD = P_PAY_ACTION_CD
| AND A.SABUN = P_SABUN
| AND B.SUN_DATE BETWEEN D.EMP_YMD AND NVL(D.RET_YMD, '99991231')
| )
| )
| ;
| 
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| ln_mon := 0;
| WHEN OTHERS THEN
| ln_mon := 0;
| END;
| 
+ ELSE
+ BEGIN  -- 기능직 기본급 구하기
+ SELECT sum(d.element_mon)--* to_char(last_day(l_ord_symd),'dd')
+ into ln_mon
+ FROM TCPN403 C, TCPN404 D
+ WHERE c.enter_cd = d.enter_cd
+ and c.sabun = d.sabun
+ and c.sdate = d.sdate
+ and C.ENTER_CD = P_ENTER_CD
+ and c.sabun = P_SABUN
+ and d.element_cd in ('11','12','13','14')
+ and l_ord_symd between c.sdate and NVL(c.edate,'99991231') ;
+ EXCEPTION
+ WHEN NO_DATA_FOUND THEN
+ ln_mon :=  0   ;
+ END;
+ 
| 
| 
+ -- 월근무 업로드
+ BEGIN
+ SELECT SUM(nvl(work_hour ,0))
+ INTO ln_work_hour
+ FROM TTIM870 A, TTIM009 B, TTIM015 C
+ WHERE A.ENTER_CD   = B.ENTER_CD
+ AND A.ENTER_CD   = C.ENTER_CD
+ AND A.WORK_CD    = B.WORK_CD
+ AND A.WORK_CD    = C.WORK_CD
+ AND A.ENTER_CD   = P_ENTER_CD
+ AND A.SABUN      = P_SABUN
+ AND B.ELEMENT_CD = '100'
+ AND A.YM         = L_TIME_YM
+ ;
+ 
+ EXCEPTION
+ WHEN NO_DATA_FOUND THEN
+ ln_work_hour := 0;
+ WHEN OTHERS THEN
+ ln_work_hour := 0;
+ END;
+ 
+ ln_mon := ln_mon * ln_work_hour;
+ 
+ 
+ 
+ 
+ 
+ END IF;
+ 
+ 
+ 
| RETURN ln_mon;
| 
| EXCEPTION
| WHEN OTHERS THEN
| RETURN 0;
| END;
| 
| 
| /
```
---
# F_CPN_HOLIYDAY_MON_NK.FNC

```diff
| 
| CREATE OR REPLACE  FUNCTION "EHR_NG"."F_CPN_HOLIYDAY_MON_NK" (
| P_ENTER_CD          IN  VARCHAR2 -- 회사코드
| ,P_PAY_ACTION_CD     IN  VARCHAR2 --급여년월
| ,P_SABUN             IN  VARCHAR2 -- 사번
| )
| RETURN NUMBER
| IS
| /********************************************************************************/
| /*                    (c) Copyright ISU System Inc. 2004                        */
| /*                           All Rights Reserved                                */
| /********************************************************************************/
| /*  FUNCTION NAME : F_CPN_BASE_MON_UDF                                          */
| /*                  주휴수당   Return.                                          */
| /********************************************************************************/
| /*  [ 참조 TABLE ]                                                               */
| /*               TTIM403(근태)                                                   */
| /********************************************************************************/
| /*  [ FNC 개요 ]                                                                */
| /********************************************************************************/
| /*  [ PRC,FNC 호출 ]                                                            */
| /*       수당 계산식 에서 사용                                              */
| /********************************************************************************/
| /* Date        In Charge       Description                                      */
| /*------------------------------------------------------------------------------*/
| /* 2020-08-26  Kosh            Initial Release                                  */
| /********************************************************************************/
| -- Local Variables
| ln_mon         NUMBER := 0; -- Return 근무일수
| L_CNT         NUMBER := 0;
| ln_ex_yn         VARCHAR2(1) := 'N';
| ln_pay_cd    TCPN201.PAY_CD%TYPE;
| l_ord_symd     varchar2(8);
| 
+ L_time_ym      varchar2(6);
+ 
| L_EMP_TYPE     VARCHAR2(1) := 'B';
| 
| BEGIN
| 
| 
- select ord_symd
- into l_ord_symd
- 
+ select ord_symd , b.time_ym
+ into l_ord_symd, L_time_ym
+ 
| from tcpn201 b
| where b.enter_cd = P_ENTER_CD
| and b.pay_action_cd = P_PAY_ACTION_CD;
| 
| /* 일반직 , 기능직여부  */
| BEGIN
| select f_com_get_grcode_note_val(a.enter_cd,'H10030',a.manage_cd,2)
| INTO L_EMP_TYPE
| from thrm151 a
| where a.enter_cd = P_ENTER_CD
| and a.sabun = P_SABUN
| and l_ord_symd between a.sdate and a.edate;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| L_EMP_TYPE := 'B'    ;
| END;
| 
| IF L_EMP_TYPE = 'B' THEN  -- 일반직
| ln_mon :=   0  ;
| ELSE
| BEGIN  -- 기능직 기본급 구하기
| 
- SELECT sum(d.element_mon) * 8 --* to_char(last_day(l_ord_symd),'dd')
- 
+ SELECT sum(d.element_mon)--* to_char(last_day(l_ord_symd),'dd')
+ 
| into ln_mon
| FROM TCPN403 C, TCPN404 D
| WHERE c.enter_cd = d.enter_cd
| and c.sabun = d.sabun
| and c.sdate = d.sdate
| and C.ENTER_CD = P_ENTER_CD
| and c.sabun = P_SABUN
| 
- and l_ord_symd between c.sdate and c.edate
- and d.element_cd in ('11','12') ;
- 
+ and d.element_cd in ('11','12','13','14')
+ and l_ord_symd between c.sdate and NVL(c.edate,'99991231') ;
+ 
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| ln_mon :=  0   ;
| END;
| 
| 
+ /*  -- 교대근무자는 주휴일수를 교대근무제외자는 일요일을 주휴일수로 산정한다.
+ IF substr(F_COM_GET_MAP_CD(P_ENTER_CD,'500',P_SABUN),1,1,) = '3' then
+ 
| BEGIN
| SELECT count(a.TIME_CD)
| INTO L_CNT
| from TTIM120_V A
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.SABUN  = P_SABUN
| AND substr(A.YMD,1,6) = substr(l_ord_symd,1,6)
| AND A.TIME_CD in ('30015','30107');
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| L_CNT :=  0   ;
| END;
| 
+ ELSE
+ 
| 
| 
+ END IF;*/
+ -- 상근근무자는
+ L_CNT := F_TIM_WEEK_HOILDAY(P_ENTER_CD,P_SABUN,L_time_ym);
+ 
+ 
+ 
| IF L_CNT > 0 then
| 
- ln_mon := ln_mon * L_CNT;
- 
+ ln_mon := round((ln_mon * 8 )* L_CNT,1);
+ 
| ELSE
| ln_mon := 0;
| END IF;
| 
| 
| 
| END IF;
| 
| RETURN ln_mon;
| 
| EXCEPTION
| WHEN OTHERS THEN
| RETURN 0;
| END;
| 
| 
| /
```
---
# F_CPN_OT_HOUR_MON_UDF.FNC

```diff
| 
| CREATE OR REPLACE  FUNCTION "EHR_NG"."F_CPN_OT_HOUR_MON_UDF" (
| P_ENTER_CD        IN  VARCHAR2 -- 회사코드
| ,P_PAY_ACTION_CD   IN VARCHAR2 --급여년월
| ,P_ELEMENT_CD      IN VARCHAR2 --수당코드
| ,P_SABUN           IN  VARCHAR2 -- 사번
| )
| RETURN NUMBER
| IS
| /********************************************************************************/
| /*                    (c) Copyright ISU System Inc. 2004                        */
| /*                           All Rights Reserved                                */
| /********************************************************************************/
| /*  FUNCTION NAME : F_CPN_OT_HOUR_MON_UDF                                            */
| /*                  근태  비율   Return.                                   */
| /********************************************************************************/
| /*  [ 참조 TABLE ]                                                              */
| /*               TTIM403(근태)                                               */
| /********************************************************************************/
| /*  [ FNC 개요 ]                                                                */
| /********************************************************************************/
| /*  [ PRC,FNC 호출 ]                                                            */
| /*       수당 계산식 에서 사용                                              */
| /********************************************************************************/
| /* Date        In Charge       Description                                      */
| /*------------------------------------------------------------------------------*/
| /* 2020-08-26  Kosh            Initial Release                                  */
| /********************************************************************************/
| -- Local Variables
| ln_mon         NUMBER := 0; -- Return 근무일수
| ln_ordinary_mon NUMBER := 0;  -- 통상임금(기본일급 제외)
| ln_ordinary_mon1 NUMBER := 0;  -- 통상임금(기본일급 제외)
| ln_ex_mon         NUMBER := 0;
| ln_ex_yn         VARCHAR2(1) := 'N';
| L_COM_MON        NUMBER := 0;
| l_ord_symd       varchar2(8);
| l_manage_cd      varchar2(8);
| 
+ L_TIME_YM        varchar2(6);
+ L_apply_rate     NUMBER ;
+ ln_add_work_hour NUMBER := 0;
+ 
| 
| BEGIN
| 
| /* 일급 예외 여부 */
| BEGIN
| 
- select b.ord_symd , c.manage_cd
- into l_ord_symd, l_manage_cd
- 
+ select b.ord_symd , c.manage_cd, B.TIME_YM
+ into l_ord_symd, l_manage_cd, L_TIME_YM
+ 
| from tcpn201 b, tcpn203 C
| where b.enter_cd = c.enter_cd
| and b.enter_cd = P_ENTER_CD
| and b.pay_action_cd = c.pay_action_cd
| and b.pay_action_cd = P_PAY_ACTION_CD
| and c.sabun = P_SABUN;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| l_ord_symd := to_char(sysdate,'yyyymmdd');
| WHEN OTHERS THEN
| l_ord_symd := to_char(sysdate,'yyyymmdd');
| END
| ;
| 
| --     (시급+교대시급+(가족+직책+근속+용탕+자기개발+자격+상근정비기술수당+보전수당+기능장수당+조정수당+((시급+교대시급)*240+가족+근속+직책+용탕+자기개발)*6/12)/209)
| 
| BEGIN  -- 기능직 기본시급 구하기
| SELECT sum(d.element_mon)
| into ln_mon
| FROM TCPN403 C, TCPN404 D
| WHERE c.enter_cd = d.enter_cd
| and c.sabun = d.sabun
| and c.sdate = d.sdate
| and C.ENTER_CD = P_ENTER_CD
| and c.sabun = P_SABUN
| and l_ord_symd between c.sdate and nvl(c.edate,'99991231')
| AND d.element_cd in ('11','12','13','14');
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| ln_mon :=  0   ;
| END;
| 
| 
| 
- 
- 
| /*통상시급(상여분) 으로 산출*/
| BEGIN
| SELECT SUM(BASIC_MON)
| INTO ln_ordinary_mon
| FROM TCPN205 A, TCPN072 B, TCPN203 C
| WHERE A.ENTER_CD = B.ENTER_CD
| AND A.ELEMENT_CD = B.ELEMENT_CD
| AND A.ENTER_CD = C.ENTER_CD
| AND A.PAY_ACTION_CD = C.PAY_ACTION_CD
| AND A.SABUN = C.SABUN
| AND A.ENTER_CD = P_ENTER_CD
| AND A.PAY_ACTION_CD = P_PAY_ACTION_CD
| AND A.SABUN = P_SABUN
| AND B.ELEMENT_SET_CD = '00'
| AND B.RESULT_YN = 'Y'
| GROUP BY C.PAY_TYPE
| ;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| ln_ordinary_mon := 0;
| WHEN OTHERS THEN
| ln_ordinary_mon := 0;
| END
| ;
| /*통상시급(급여분) 으로 산출*/
| BEGIN
| SELECT SUM(BASIC_MON)
| INTO ln_ordinary_mon1
| FROM TCPN205 A, TCPN072 B, TCPN203 C
| WHERE A.ENTER_CD = B.ENTER_CD
| AND A.ELEMENT_CD = B.ELEMENT_CD
| AND A.ENTER_CD = C.ENTER_CD
| AND A.PAY_ACTION_CD = C.PAY_ACTION_CD
| AND A.SABUN = C.SABUN
| AND A.ENTER_CD = P_ENTER_CD
| AND A.PAY_ACTION_CD = P_PAY_ACTION_CD
| AND A.SABUN = P_SABUN
| AND B.ELEMENT_SET_CD = '01'
| AND B.RESULT_YN = 'Y'
| GROUP BY C.PAY_TYPE
| ;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| ln_ordinary_mon1 := 0;
| WHEN OTHERS THEN
| ln_ordinary_mon1 := 0;
| END
| ;
| 
| -- 통상시급구하기
| IF l_manage_cd = '243' THEN  -- 현장관리직은 상여미지급
| L_COM_MON := (ln_mon+(ln_ordinary_mon1)/209);
| ELSE
| L_COM_MON := (ln_mon+(ln_ordinary_mon1+((ln_mon)*240+ln_ordinary_mon)*6/12)/209);
| END IF;
| 
| 
+ 
+ -- 월근무 업로드
+ 
| BEGIN
| 
+ SELECT nvl(work_hour  ,0), b.apply_rate
+ INTO ln_add_work_hour , L_apply_rate
+ FROM TTIM870 A, TTIM009 B, TTIM015 C
+ WHERE A.ENTER_CD   = B.ENTER_CD
+ AND A.ENTER_CD   = C.ENTER_CD
+ AND A.WORK_CD    = B.WORK_CD
+ AND A.WORK_CD    = C.WORK_CD
+ AND A.ENTER_CD   = P_ENTER_CD
+ AND A.SABUN      = P_SABUN
+ AND B.ELEMENT_CD = P_ELEMENT_CD
+ AND A.YM         = L_TIME_YM;
+ EXCEPTION
+ WHEN NO_DATA_FOUND THEN
+ ln_add_work_hour := 0;
+ WHEN OTHERS THEN
+ ln_add_work_hour := 0;
+ END;
+ 
| 
| 
+ 
+ IF ln_add_work_hour > 0 THEN
+ ln_mon := round(trunc(L_COM_MON * L_apply_rate,1) *ln_add_work_hour,0);
+ ELSE
+ ln_add_work_hour := F_CPN_GET_OT_WORK_HOUR_NK(P_ENTER_CD,L_TIME_YM,P_ELEMENT_CD,P_SABUN);
+ 
+ ln_mon := round(trunc(L_COM_MON * L_apply_rate,1) *ln_add_work_hour,0);
+ 
+ /*BEGIN
+ 
+ 
| SELECT SUM(L_COM_MON*RATE*OT_HOUR)
| --      SELECT SUM((DAILY_MON+ln_ordinary_mon)/8*RATE*OT_HOUR)
| INTO ln_mon
| FROM (
| SELECT SUN_DATE, RATE
| , CASE WHEN ln_ex_yn = 'Y' THEN ln_ex_mon
| WHEN F_CPN_PSNL_EX_ELE_MON(P_ENTER_CD, SUN_DATE, '101', SABUN) IS NOT NULL THEN F_CPN_PSNL_EX_ELE_MON(P_ENTER_CD, SUN_DATE, '101', SABUN)
| --ELSE NVL(G.SAL_MON,0)
| ELSE CASE WHEN F_CPN_GET_PEAK_MON(P_ENTER_CD, PEAK_SEQ, L_COM_MON) = 0 THEN L_COM_MON ELSE F_CPN_GET_PEAK_MON(P_ENTER_CD, PEAK_SEQ, L_COM_MON)  END
| END AS DAILY_MON
| , OT_HOUR
| FROM (
| SELECT B.SUN_DATE, (100 - NVL((SELECT MINUS_RATE
| FROM TTIM405 X, TCPN008 Y, TTIM301 Z, THRI103 W
| WHERE X.ENTER_CD = Y.ENTER_CD
| AND X.GNT_CD = Y.GNT_CD
| AND F.ORD_EYMD BETWEEN Y.SDATE AND NVL(Y.EDATE, '99991231')
| AND X.ENTER_CD = Z.ENTER_CD
| AND X.APPL_SEQ = Z.APPL_SEQ
| AND X.ENTER_CD = W.ENTER_CD
| AND X.APPL_SEQ = W.APPL_SEQ
| AND W.APPL_STATUS_CD = '99'
| AND X.ENTER_CD = F.ENTER_CD
| AND Y.PAY_CD = F.PAY_CD
| AND X.YMD = B.SUN_DATE
| AND X.SABUN = A.SABUN
| ),0)) / 100 AS RATE
| , A.SABUN
| --     , G.SAL_MON
| , F_CPN_GET_OT_WORK_HOUR_BS(P_ENTER_CD, B.SUN_DATE, P_ELEMENT_CD,  A.SABUN ) AS OT_HOUR
| , (SELECT  F_COM_GET_GRCODE_NOTE_VAL(A.ENTER_CD, 'C90510', PEAK_CD, 4) AS PEAK_SEQ
| FROM TCPN129
| WHERE ENTER_CD = A.ENTER_CD
| AND B.SUN_DATE BETWEEN SDATE AND NVL(EDATE, '99991231')
| AND SABUN = A.SABUN
| ) AS PEAK_SEQ
| FROM THRM151 A, TSYS007 B, TCPN203 C, THRM100 D, TCPN201 F--, TCPN002 G
| WHERE B.SUN_DATE BETWEEN A.SDATE AND NVL(A.EDATE, '99991231')
| AND B.SUN_DATE BETWEEN C.WORK_SYMD AND C.WORK_EYMD
| AND A.ENTER_CD = C.ENTER_CD
| AND A.SABUN = C.SABUN
| AND A.ENTER_CD = D.ENTER_CD
| AND A.SABUN = D.SABUN
| AND C.ENTER_CD = F.ENTER_CD
| AND C.PAY_ACTION_CD= F.PAY_ACTION_CD
| --AND C.ENTER_CD = G.ENTER_CD(+)
| --AND C.JIKGUB_CD = G.JIKGUB_CD(+)
| --AND C.SAL_CLASS = G.SAL_CLASS(+)
| --AND A.ENTER_CD = G.ENTER_CD(+)
| --AND A.JIKGUB_CD = G.JIKGUB_CD(+)
| --AND A.SAL_CLASS = G.SAL_CLASS(+)
| AND A.STATUS_CD = 'AA'
| AND A.ENTER_CD = P_ENTER_CD
| AND C.PAY_ACTION_CD = P_PAY_ACTION_CD
| AND A.SABUN = P_SABUN
| AND B.SUN_DATE BETWEEN D.EMP_YMD AND NVL(D.RET_YMD, '99991231')
| )
| )
| ;
| 
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| ln_mon := 0;
| WHEN OTHERS THEN
| ln_mon := 0;
| 
- END;
- 
+ END;*/
+ END IF;
+ 
| 
| RETURN ln_mon;
| 
| EXCEPTION
| WHEN OTHERS THEN
| RETURN 0;
| END;
| 
| 
| /
```
---
# F_TIM_WORK_INFO_TEMP.FNC

```diff
| 
| CREATE OR REPLACE  FUNCTION "EHR_NG"."F_TIM_WORK_INFO_TEMP" (
| P_ENTER_CD   IN    VARCHAR2 -- 회사코드
| , P_SABUN      IN    VARCHAR2 -- 사원번호
| , P_YMD        IN    VARCHAR2 -- 기준일자
| , P_SHM        IN    VARCHAR2 -- 시작시간
| , P_EHM        IN    VARCHAR2 -- 종료시간
| , P_WORK_CD    IN    VARCHAR2 -- 근무코드
| , P_SYMD       VARCHAR2 := NULL -- 출근일자(Default : 기준일자)
| ) RETURN VARCHAR2
| IS
| /********************************************************************************/
| /*                    (c) Copyright ISU System Inc. 2004                        */
| /*                           All Rights Reserved                                */
| /********************************************************************************/
| /*  FUNCTION NAME : F_TIM_WORK_INFO_TEMP                                        */
| /*                  해당일자의 근무정보  Return.                                       */
| /********************************************************************************/
| /*  [ 참조 TABLE ]                                                               */
| /*              TTIM081 (근태부서관리)                                              */
| /********************************************************************************/
| /* Date        In Charge       Description                                      */
| /*------------------------------------------------------------------------------*/
| /* 2014-11-23  Ko.s.h           Initial Release                                 */
| /********************************************************************************/
| 
| LV_HHMM                 VARCHAR2(10) := '';
| LN_HOUR                 NUMBER;
| LV_BIZ_CD               TSYS903.BIZ_CD%TYPE := 'TIM';
| LV_OBJECT_NM            TSYS903.OBJECT_NM%TYPE := 'F_TIM_WORK_INFO_TEMP';
| 
| 
| LV_LATE_CD              TTIM015.WORK_CD%TYPE := '0090'; /*지각코드(고정값)*/
| LV_LEAVE_CD             TTIM015.WORK_CD%TYPE := '0110'; /*조퇴코드(고정값)*/
| 
| LV_DAY_TYPE             VARCHAR2(10); -- 근무종류
| 
| LV_YMD                  VARCHAR2(8);
| LV_SYMD                 VARCHAR2(8);
| LV_HOL_YN               VARCHAR2(1) := 'N';
| LV_TIME_CD              TTIM017.TIME_CD%TYPE;
| LV_WORKDAY_STD          NUMBER;
| LV_STD_S_YYYYMMDD_HM    VARCHAR2(16);
| LV_STD_E_YYYYMMDD_HM    VARCHAR2(16);
| LV_S_YYYYMMDD_HM        VARCHAR2(16);
| LV_E_YYYYMMDD_HM        VARCHAR2(16);
| 
| LV_WORK_YN              VARCHAR2(1) := 'N';          -- 근로일여부
| LV_GNT_CD_YN            VARCHAR2(1) := 'N';         -- 근태발생여부
| LV_GNT_CD               VARCHAR2(10) := '';         -- 근태코드
| LV_EX_WORK_YN           VARCHAR2(1) := 'N';         -- 시간외근무신청 발생여부
| LV_EXEC_YN              VARCHAR2(1) := 'N';          -- 근무예외자여부
| 
| LV_STD_APPLY_HOUR       NUMBER;                      /*근태에 의한 적용근무시간*/
| LV_EX_APPLY_HOUR        NUMBER;                      /*차감 적용근무시간*/
| LV_PRODUCT_YN           VARCHAR2(1) := 'N';      /* 생산직 여부 */
| LV_PAID_HOLIDAY_YN      VARCHAR2(1) := 'N';      /* 유휴여부(사용안함) */
| LV_REQUEST_USE_TYPE     TTIM014.REQUEST_USE_TYPE%TYPE;
| 
| LV_OT_HHMM              VARCHAR2(10) := '';
| LN_OT_HOUR              NUMBER;
| 
| LN_GNT_AM_YN            VARCHAR2(1) := 'N';      /* 근태신청 오전반차 여부 2020.01.13 */
| LN_GNT_PM_YN            VARCHAR2(1) := 'N';      /* 근태신청 오후반차 여부 2020.01.13*/
| 
| LV_APPLY_YN             TTIM017.APPLY_YN%TYPE;  /* 연장근무신청 필요여부 2020.02.03 */
| 
| LV_LOG                  VARCHAR2(1000);
| 
| LV_HHMM_NT              VARCHAR2(10) := ''; --심야 근무시간 2020.09.11
| LN_HOUR_NT              NUMBER;   --심야 근무시간 2020.09.11
| LN_HOUR_ADD             NUMBER;   --연장근무추가 2020.09.11
| 
- LV_holiday_yn           VARCHAR2(1) := 'N';  -- 휴일여부
- LV_hol_time_cd          VARCHAR2(1);  -- 휴일코드 (명절,특별)
- 
| 
| BEGIN
| 
| LV_LOG := 'P_SABUN:' || P_SABUN || ', P_YMD:' || P_YMD || ', P_SHM:' || P_SHM || ', P_EHM:' || P_EHM || ', P_WORK_CD:' || P_WORK_CD;
| 
| --DBMS_OUTPUT.PUT_LINE(LV_LOG);
| LV_SYMD := NVL(P_SYMD, P_YMD);
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-1',LV_LOG, P_SABUN);
| 
| --[벽산] 생산직 여부 직군 (A:사무직, B:생산직)  2020.08.18
| IF F_COM_GET_WORKTYPE(P_ENTER_CD, P_SABUN, P_YMD) = 'A' THEN
| LV_PRODUCT_YN := 'N';
| ELSE
| LV_PRODUCT_YN := 'Y';
| END IF;
| 
| 
| -- 생산직 여부 (생산직이 아니면 관리직) 직종의 비고2 값으로 판단함
| /*
| BEGIN
| SELECT B.NOTE2
| INTO  LV_PRODUCT_YN
| FROM THRM151 A, TSYS005 B
| WHERE A.ENTER_CD = B.ENTER_CD
| AND A.WORK_TYPE = B.CODE
| AND A.ENTER_CD = P_ENTER_CD
| AND B.GRCODE_CD = 'H10050'
| AND A.SABUN = P_SABUN
| AND P_YMD BETWEEN A.SDATE AND NVL(A.EDATE, 'YYYYMMDD')
| ;
| EXCEPTION
| WHEN OTHERS THEN
| LV_PRODUCT_YN := 'N';
| END
| ;*/
| 
| ---------------------------------------------------
| -- 일근무제외자 여부 (근무제외자 이면 기본근무시간으로 적용함)
| ---------------------------------------------------
| LV_EXEC_YN := 'N';
| LV_STD_APPLY_HOUR := 0;
| BEGIN
| SELECT NVL(MAX('Y'), 'N'), NVL(MAX(A.STD_APPLY_HOUR) KEEP(DENSE_RANK FIRST ORDER BY A.SDATE DESC),0)
| INTO LV_EXEC_YN, LV_STD_APPLY_HOUR
| FROM TTIM309 A
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.SABUN    = P_SABUN
| AND A.WORK_CD  = P_WORK_CD
| AND P_YMD BETWEEN A.SDATE AND NVL(A.EDATE, '99991231') ;
| EXCEPTION
| WHEN OTHERS THEN
| LV_EXEC_YN := 'N';
| LV_STD_APPLY_HOUR := 0;
| LV_WORK_YN := 'Y';
| END;
| 
| -- 근무제외자로 등록 시 등록된 인정근무시간을 리턴
| IF LV_EXEC_YN = 'Y' THEN
| IF LV_STD_APPLY_HOUR > 0 THEN
| RETURN LPAD(TRUNC(LV_STD_APPLY_HOUR),2,'0') || LPAD(MOD(LV_STD_APPLY_HOUR, 1)*60, 2, '0');
| ELSE
| RETURN '';
| END IF;
| 
| END IF;
| 
| ---------------------------------------------------
| -- 근무종류
| ---------------------------------------------------
| BEGIN
| SELECT DAY_TYPE
| INTO LV_DAY_TYPE
| FROM TTIM015 A
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.WORK_CD  = P_WORK_CD ;
| EXCEPTION
| WHEN OTHERS THEN
| LV_DAY_TYPE := '';
| END;
| 
| 
| ---------------------------------------------------
| --근태신청으로 인한 근무시간 발생
| ---------------------------------------------------
| LV_GNT_CD_YN := 'N';
| LV_GNT_CD := '999';
| BEGIN
| SELECT MAX(GNT_CD)
| INTO LV_GNT_CD
| FROM TTIM301 A
| WHERE A.ENTER_CD = P_ENTER_CD
| AND P_YMD BETWEEN A.S_YMD AND A.E_YMD
| AND A.SABUN = P_SABUN
| AND NVL(A.UPDATE_YN,'N') = 'N'
| AND EXISTS ( SELECT 1
| FROM THRI103 X
| WHERE X.ENTER_CD = A.ENTER_CD
| AND X.APPL_SEQ = A.APPL_SEQ
| AND X.APPL_STATUS_CD = '99' ) ;
| EXCEPTION
| WHEN OTHERS THEN
| LV_GNT_CD := '999';
| END;
| IF LV_GNT_CD IS NULL OR LV_GNT_CD = '999' THEN
| LV_GNT_CD_YN := 'N';
| LV_GNT_CD := '999';
| ELSE
| LV_GNT_CD_YN := 'Y';
| END IF;
| IF (P_SHM IS NULL OR P_EHM IS NULL) AND LV_GNT_CD_YN = 'N' THEN
| IF LV_DAY_TYPE NOT IN ( '201', '203', '205') THEN -- [벽산] 휴일은 출퇴근 시간이  없음
| RETURN LV_HHMM;
| END IF;
| END IF;
| 
| ---------------------------------------------------
| -- 근태신청이 있을경우 오전,오후 반차인지 여부 체크
| -- 해당일에 여러개 근태가 있을 경우 MAX로 가져오기 때문에 LV_GNT_CD로 판단할 수 없음
| ---------------------------------------------------
| LN_GNT_PM_YN := 'N';
| LN_GNT_AM_YN := 'N';
| IF LV_GNT_CD != '999' THEN
| BEGIN
| SELECT MAX(DECODE(B.REQUEST_USE_TYPE ,'AM', 'Y', NULL))
| , MAX(DECODE(B.REQUEST_USE_TYPE ,'PM', 'Y', NULL))
| INTO LN_GNT_AM_YN, LN_GNT_PM_YN
| FROM TTIM301 A, TTIM014 B
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.ENTER_CD = B.ENTER_CD
| AND A.GNT_CD   = B.GNT_CD
| AND B.REQUEST_USE_TYPE IN ('AM', 'PM')  -- 오전반차, 오후반차
| AND P_YMD BETWEEN A.S_YMD AND A.E_YMD
| AND A.SABUN = P_SABUN
| AND NVL(A.UPDATE_YN,'N') = 'N'
| AND EXISTS ( SELECT 1
| FROM THRI103 X
| WHERE X.ENTER_CD = A.ENTER_CD
| AND X.APPL_SEQ = A.APPL_SEQ
| AND X.APPL_STATUS_CD = '99' ) ;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| LN_GNT_AM_YN := 'N';
| LN_GNT_PM_YN := 'N';
| WHEN OTHERS THEN
| LN_GNT_AM_YN := 'N';
| LN_GNT_PM_YN := 'N';
| END;
| IF LN_GNT_AM_YN IS NULL THEN
| LN_GNT_AM_YN := 'N';
| END IF;
| 
| IF LN_GNT_PM_YN IS NULL THEN
| LN_GNT_PM_YN := 'N';
| END IF;
| 
| END IF;
| LV_LOG := LV_LOG || ', AM,PM:' || LN_GNT_AM_YN || ',' || LN_GNT_PM_YN;
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-2',LV_LOG, P_SABUN);
| 
| -- 관리직인원의 공휴일근무(토,일제외)시 기본근무 10시간 처리 <- 일단 확인 필요 2018.06.19 고승한
| --선택근무의 인정시간 발생시켜야 함
| /*
| IF LV_PRODUCT_YN = 'N' THEN
| BEGIN
| SELECT 'Y'
| INTO LV_PAID_HOLIDAY_YN
| FROM TTIM120_V A, TSYS007 B
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.SABUN = P_SABUN
| AND A.YMD = P_YMD
| AND A.YMD = B.SUN_DATE
| AND A.WORK_YN = 'Y'
| --AND A.WORK_YN = 'N'
| AND B.DAY_NM NOT IN ('토', '일')
| ;
| EXCEPTION
| WHEN OTHERS THEN
| LV_PAID_HOLIDAY_YN := 'N';
| END
| ;
| 
| IF LV_PAID_HOLIDAY_YN = 'Y'  THEN
| IF P_WORK_CD = '0010' THEN
| LV_HHMM := '1000';
| END IF
| ;
| RETURN LV_HHMM;
| END IF;
| END IF
| ;*/
| 
| ---------------------------------------------------
| -- 휴일여부, 근무시간코드
| ---------------------------------------------------
| BEGIN
| 
- SELECT A.WORK_YN, A.TIME_CD, B.APPLY_YN, A.holiday_yn , A.HOLIDAY_GUBUN
- INTO LV_HOL_YN, LV_TIME_CD, LV_APPLY_YN, LV_holiday_yn, LV_hol_time_cd
- 
+ SELECT A.WORK_YN, A.TIME_CD, B.APPLY_YN
+ INTO LV_HOL_YN, LV_TIME_CD, LV_APPLY_YN
+ 
| FROM TTIM120_V A, TTIM017 B
| WHERE A.ENTER_CD = B.ENTER_CD
| AND A.TIME_CD   = B.TIME_CD
| AND A.ENTER_CD = P_ENTER_CD
| AND A.SABUN    = P_SABUN
| AND A.YMD      = P_YMD;
| EXCEPTION
| WHEN OTHERS THEN
| LV_HOL_YN := 'N';
| END;
| 
| 
| 
| -- LV_LOG := LV_LOG || ', LEAVE_CD:' || LV_LEAVE_CD ;
| -- P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-3',LV_LOG, P_SABUN);
| ---------------------------------------------------------------------------------------------------------------------------------------------------------
| -- 지각 / 조퇴에 대한 처리
| ---------------------------------------------------------------------------------------------------------------------------------------------------------
| --IF P_WORK_CD IN (LV_LATE_CD, LV_LEAVE_CD) AND (LV_GNT_CD NOT IN ('15', '16')) THEN
| IF P_WORK_CD IN (LV_LATE_CD, LV_LEAVE_CD) THEN
| 
| IF P_SHM IS NULL OR P_EHM IS NULL THEN   -- 출퇴근 시간이 없으면 지각,조퇴 판정하지 않음
| RETURN '';
| END IF;
| 
| IF P_WORK_CD = LV_LEAVE_CD AND LN_GNT_PM_YN = 'Y' THEN   -- 조퇴, 오후반차
| RETURN '';
| END IF;
| 
| IF P_WORK_CD = LV_LATE_CD AND LN_GNT_AM_YN = 'Y' THEN   -- 지각, 오전반차
| RETURN '';
| END IF;
| 
| 
| BEGIN
| SELECT YMD
| , YMD||WORK_SHM AS S_YYYYMMDD_HM
| , (CASE WHEN WORK_SHM > WORK_EHM THEN TO_CHAR(TO_DATE(YMD, 'YYYYMMDD')+1,'YYYYMMDD') ELSE YMD END)||WORK_EHM AS E_YYYYMMDD_HM
| INTO LV_YMD
| , LV_STD_S_YYYYMMDD_HM
| , LV_STD_E_YYYYMMDD_HM
| FROM (SELECT P_YMD AS YMD --당일
| , CASE WHEN LN_GNT_AM_YN = 'Y' THEN A.HALF_HOLIDAY1 --오전반차인 경우엔 13:00가 출근시간
| ELSE WORK_SHM END AS WORK_SHM
| , CASE WHEN LN_GNT_PM_YN = 'Y' THEN A.HALF_HOLIDAY2  --오후반차인 경우엔 12:00가 퇴근시간
| ELSE WORK_EHM END AS WORK_EHM
| /*, CASE WHEN LV_GNT_CD = '15' THEN A.HALF_HOLIDAY1 --오전반차인 경우엔 13:00가 출근시간
| ELSE WORK_SHM END AS WORK_SHM
| , CASE WHEN LV_GNT_CD = '16' THEN A.HALF_HOLIDAY2  --오후반차인 경우엔 12:00가 퇴근시간
| ELSE WORK_EHM END AS WORK_EHM */
| FROM TTIM017 A
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.TIME_CD  = LV_TIME_CD
| AND CASE WHEN P_WORK_CD = LV_LATE_CD THEN A.LATE_CHECK_YN
| ELSE A.LEAVE_CHECK_YN END = 'Y' /*지각, 조퇴 판정여부 */
| ) ;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| LV_HHMM := '';
| WHEN OTHERS THEN
| LV_HHMM := '';
| END;
| 
| --LV_S_YYYYMMDD_HM := P_YMD||P_SHM;
| LV_S_YYYYMMDD_HM := LV_SYMD||P_SHM;
| LV_E_YYYYMMDD_HM := P_YMD||P_EHM;
| 
| IF P_SHM > P_EHM THEN
| LV_E_YYYYMMDD_HM := TO_CHAR(TO_DATE(P_YMD,'YYYYMMDD')+1, 'YYYYMMDD')||P_EHM;
| END IF;
| 
| /*지각일때*/
| IF P_WORK_CD = LV_LATE_CD THEN
| 
| IF LV_S_YYYYMMDD_HM > LV_STD_S_YYYYMMDD_HM THEN
| BEGIN
| SELECT SUBSTR(TRUNC(MOD((TO_DATE(LV_S_YYYYMMDD_HM, 'YYYYMMDDHH24MI') - TO_DATE(LV_STD_S_YYYYMMDD_HM, 'YYYYMMDDHH24MI')),1)*24)+100||'',2) ||
| SUBSTR(MOD((TO_DATE(LV_S_YYYYMMDD_HM, 'YYYYMMDDHH24MI') - TO_DATE(LV_STD_S_YYYYMMDD_HM, 'YYYYMMDDHH24MI'))*24,1)*60+100||'',2)
| INTO LV_HHMM
| FROM DUAL ;
| END;
| END IF ;
| 
| /*조퇴일때*/
| ELSIF P_WORK_CD = LV_LEAVE_CD THEN
| IF LV_E_YYYYMMDD_HM < LV_STD_E_YYYYMMDD_HM THEN
| LV_HHMM := SUBSTR(TRUNC(MOD((TO_DATE(LV_STD_E_YYYYMMDD_HM, 'YYYYMMDDHH24MI') - TO_DATE(LV_E_YYYYMMDD_HM, 'YYYYMMDDHH24MI')),1)*24)+100||'',2) ||
| SUBSTR(MOD((TO_DATE(LV_STD_E_YYYYMMDD_HM, 'YYYYMMDDHH24MI') - TO_DATE(LV_E_YYYYMMDD_HM, 'YYYYMMDDHH24MI'))*24,1)*60+100||'',2)
| ;
| END IF;
| 
| END IF;
| 
| /*지각, 조퇴를 30분 단위로 인정 ( 사용할 경우 주석 풀 것 ) */
| IF P_ENTER_CD = 'TEST' THEN
| BEGIN
| SELECT
| SUBSTR(((SUBSTR(LV_HHMM,1,2)+
| CASE WHEN SUBSTR(LV_HHMM,3,2) > 0 AND SUBSTR(LV_HHMM,3,2) <= 30 THEN  0
| WHEN SUBSTR(LV_HHMM,3,2) > 30 THEN  1
| END)+100)||'',2,2)
| ||
| CASE WHEN SUBSTR(LV_HHMM,3,2) > 0 AND SUBSTR(LV_HHMM,3,2) <= 30 THEN  '30'
| WHEN SUBSTR(LV_HHMM,3,2) > 30 THEN  '00'
| END
| INTO LV_HHMM
| FROM DUAL
| ;
| END
| ;
| END IF;
| RETURN LV_HHMM;
| END IF;
| 
| 
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-0','LV_DAY_TYPE:'||LV_DAY_TYPE||', LV_TIME_CD:'||LV_TIME_CD, P_SABUN);
| ---------------------------------------------------------------------------------------------------------------------------------------------------------
| -- 근무코드(WORK_CD) 별 근무시간 합산
| -- 정규근무시간 안에 심야가 있을 경우 출퇴근 시간이 아닌 정규 근무시간에서 심야근무시간을 계산  2020.09.11
| -- 정규근무시간 외의 심야근무는 연장근무신청을 해야 인정함... 2020.09.11
| ---------------------------------------------------------------------------------------------------------------------------------------------------------
| BEGIN
| --인정시간계산 함수로 분리, 연장근무신청 시 사용 2020.06.25
| SELECT F_TIM_FMT_TIME(WORK_HOUR,0, '')
| , WORK_HOUR
| INTO LV_HHMM, LN_HOUR
| FROM (  SELECT F_TIM_WORK_INFO_TEMP_HOUR(P_ENTER_CD, P_SABUN, P_YMD, P_SHM, P_EHM, P_WORK_CD )  AS WORK_HOUR
| FROM DUAL
| WHERE LV_DAY_TYPE <> '103'  -- 심야
| UNION
| SELECT F_TIM_WORK_INFO_TEMP_HOUR(P_ENTER_CD, P_SABUN, P_YMD, SUBSTR(S_TIME,9), SUBSTR(E_TIME,9), P_WORK_CD )  AS WORK_HOUR  -- 2020.09.11
| FROM (  -- 정규근무시간 안에서 심야근무시간 계산..
| SELECT CASE WHEN EHM < WORK_SHM THEN ''
| WHEN SHM > WORK_EHM THEN ''
| WHEN SHM > WORK_SHM THEN SHM
| ELSE WORK_SHM  END AS S_TIME
| , CASE WHEN EHM < WORK_SHM THEN ''
| WHEN SHM > WORK_EHM THEN ''
| WHEN EHM > WORK_EHM THEN WORK_EHM
| ELSE EHM END AS E_TIME
| FROM (
| SELECT CASE WHEN P_SHM       >= A.BEGIN_SHM THEN P_YMD ELSE TO_CHAR(TO_DATE(P_YMD, 'yyyymmdd')+1, 'yyyymmdd') END || P_SHM      AS SHM
| , CASE WHEN P_EHM       >  A.BEGIN_SHM THEN P_YMD ELSE TO_CHAR(TO_DATE(P_YMD, 'yyyymmdd')+1, 'yyyymmdd') END || P_EHM      AS EHM
| , CASE WHEN A.WORK_SHM  >= A.BEGIN_SHM THEN P_YMD ELSE TO_CHAR(TO_DATE(P_YMD, 'yyyymmdd')+1, 'yyyymmdd') END || A.WORK_SHM AS WORK_SHM
| , CASE WHEN A.WORK_EHM  >  A.BEGIN_SHM THEN P_YMD ELSE TO_CHAR(TO_DATE(P_YMD, 'yyyymmdd')+1, 'yyyymmdd') END || A.WORK_EHM AS WORK_EHM
| FROM TTIM017 A
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.TIME_CD  = LV_TIME_CD
| AND LV_DAY_TYPE = '103'   --심야
| )
| )
| );
| 
| 
| 
| 
| LV_HHMM_NT := LV_HHMM; -- 심야근무시간..  2020.09.11
| LN_HOUR_NT := LN_HOUR; -- 심야근무시간..  2020.09.11
| 
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-2','LV_TIME_CD:'||LV_TIME_CD||', LV_HHMM_NT:'||LV_HHMM_NT, P_SABUN);
| 
| /*
| SELECT LPAD(SUM(HH) + TRUNC(SUM(MM)/60),2,'0')||LPAD(MOD(SUM(MM),60),2,'0')
| , SUM(WORK_HOUR)
| INTO LV_HHMM, LN_HOUR
| FROM (SELECT TRUNC(CASE WHEN STD_MIN IS NOT NULL AND STD_MIN > MM THEN 0
| WHEN UNIT IS NOT NULL THEN MM-MOD(MM, UNIT)
| ELSE MM END / 60) AS HH
| , MOD(CASE WHEN STD_MIN IS NOT NULL AND STD_MIN > MM THEN 0
| WHEN UNIT IS NOT NULL THEN MM-MOD(MM, UNIT)
| ELSE MM END , 60) AS MM
| , WORK_CD
| , MM AS WORK_HOUR
| FROM (
| SELECT STD_MIN
| , UNIT
| , WORK_CD
| , F_COM_GET_HH24MI_GAP(S_TIME, E_TIME) AS MM
| FROM (
| SELECT STD_MIN
| , UNIT
| , WORK_CD
| , CASE WHEN EHM < IN_HM THEN ''
| WHEN SHM > OUT_HM THEN ''
| WHEN SHM > IN_HM THEN SHM
| ELSE IN_HM END AS S_TIME
| , CASE WHEN EHM < IN_HM THEN ''
| WHEN SHM > OUT_HM THEN ''
| WHEN EHM > OUT_HM THEN OUT_HM
| ELSE EHM END AS E_TIME
| FROM (
| SELECT A.STD_MIN
| , A.UNIT
| , A.WORK_CD
| --, C.YMD||A.SHM AS SHM  -- 2020.05.26 주석처리 Kosh
| , CASE WHEN ADD_DAYS = 1 THEN TO_CHAR(TO_DATE(C.YMD, 'YYYYMMDD')+1, 'YYYYMMDD') ||A.SHM ELSE C.YMD||A.SHM END AS SHM
| --, CASE WHEN A.EHM < A.SHM THEN TO_CHAR(TO_DATE(C.YMD, 'YYYYMMDD')+1, 'YYYYMMDD') ELSE C.YMD END || A.EHM AS EHM  -- 2020.05.26 주석처리 Kosh
| , CASE WHEN A.EHM < A.SHM OR ADD_DAYS = 1  THEN TO_CHAR(TO_DATE(C.YMD, 'YYYYMMDD')+1, 'YYYYMMDD') ELSE C.YMD END || A.EHM AS EHM
| --, C.YMD||C.IN_HM AS IN_HM
| , LV_SYMD||C.IN_HM AS IN_HM
| , CASE WHEN C.OUT_HM < C.IN_HM  THEN TO_CHAR(TO_DATE(C.YMD, 'YYYYMMDD')+1, 'YYYYMMDD')
| WHEN LV_SYMD > C.YMD THEN LV_SYMD
| ELSE C.YMD END || C.OUT_HM  AS OUT_HM
| FROM
| --TTIM018 A  -- 2020.05.26 주석처리 Kosh
| (SELECT BB.*, CASE WHEN WORK_SHM > SHM THEN 1 ELSE 0 END AS ADD_DAYS
| FROM (
| SELECT AA.* , BB.WORK_SHM
| FROM TTIM018 AA, TTIM017 BB
| WHERE AA.ENTER_CD = BB.ENTER_CD
| AND AA.TIME_CD = BB.TIME_CD
| ) BB
| ) A  -- 수정 2020.05.26 Kosh (당일 21:00 ~ 00:00 기본근무,  00:00 ~ 01:00 휴식, 01:00 ~ 04:00 기본근무 일때 1시부터 4시까지의 기본근무가 산정이 안되므로 익일을 판단하기 위한 구문 추가
| , (SELECT P_SABUN      AS SABUN
| , ''           AS GNT_CD
| , LV_TIME_CD   AS TIME_CD
| , P_YMD        AS YMD
| , P_SHM        AS IN_HM
| , P_EHM        AS OUT_HM
| FROM DUAL
| ) C
| , TTIM017 D
| WHERE A.ENTER_CD = D.ENTER_CD
| AND A.TIME_CD  = D.TIME_CD
| AND A.ENTER_CD = P_ENTER_CD
| AND A.WORK_CD  = P_WORK_CD
| AND A.TIME_CD  = C.TIME_CD
| )
| )
| )
| )
| WHERE WORK_HOUR > 0;
| */
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| LV_HHMM := '';
| WHEN OTHERS THEN
| LV_HHMM := '';
| END;
| 
| 
| --[대한솔루션] 특이사항 : 선택근로제 인원이 휴일근무시 10시간 이상한경우 휴일근무 8시간, 휴일연장 2시간으로 발생
| /*
| IF P_ENTER_CD = 'DHSC' AND LV_PRODUCT_YN = 'N'  AND LV_HOL_YN = 'Y' THEN
| IF P_WORK_CD = '0070' AND LV_HHMM > '0800' THEN
| LV_HHMM := '0800';
| END IF
| ;
| 
| IF P_WORK_CD = '0075' THEN
| BEGIN
| IF P_EHM <> '0000' THEN
| SELECT SUBSTR(TRUNC(MOD((TO_DATE(CASE WHEN P_SHM > P_EHM THEN TO_CHAR(TO_DATE(P_YMD,'YYYYMMDD')+1, 'YYYYMMDD')
| ELSE P_YMD END||P_EHM, 'YYYYMMDDHH24MI') - TO_DATE(P_YMD||P_SHM, 'YYYYMMDDHH24MI')),1)*24)+100||'',2) ||
| SUBSTR(MOD((TO_DATE(CASE WHEN P_SHM > P_EHM THEN TO_CHAR(TO_DATE(P_YMD,'YYYYMMDD')+1, 'YYYYMMDD')
| ELSE P_YMD END||P_EHM, 'YYYYMMDDHH24MI') - TO_DATE(P_YMD||P_SHM, 'YYYYMMDDHH24MI'))*24,1)*60+100||'',2)
| INTO LV_HHMM
| FROM DUAL ;
| END IF;
| END;
| 
| IF LV_HHMM > '0800' THEN
| -- 휴일근무가 8시간을 넘어가면 넘어간 시간은 휴일연장으로 등록
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'x-2','P_YMD : '||P_YMD||'/ LV_HHMM : '||LV_HHMM, NULL);
| LV_HHMM := SUBSTR(TRUNC(MOD((TO_DATE(P_YMD||LV_HHMM, 'YYYYMMDDHH24MI') - TO_DATE(P_YMD||'0800', 'YYYYMMDDHH24MI')),1)*24)+100||'',2) ||
| SUBSTR(MOD((TO_DATE(P_YMD||LV_HHMM, 'YYYYMMDDHH24MI') - TO_DATE(P_YMD||'0800', 'YYYYMMDDHH24MI'))*24,1)*60+100||'',2)
| ;
| -- 30분 단위로 변경
| BEGIN
| SELECT
| SUBSTR((SUBSTR(LV_HHMM,1,2)+100)||'',2,2)
| ||
| CASE WHEN SUBSTR(LV_HHMM,3,2) > 0 AND SUBSTR(LV_HHMM,3,2) < 30 THEN  '00'
| WHEN SUBSTR(LV_HHMM,3,2) >= 30 THEN  '30'
| END
| INTO LV_HHMM
| FROM DUAL
| ;
| END;
| --ELSE
| --  LV_HHMM := '0000';
| END IF;
| 
| END IF;
| 
| --select * from tsys903 order by chkdate desc
| 
| 
| END IF;
| */
| --select * from tsys903 order by chkdate desc
| 
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-1','LV_HHMM:'||LV_HHMM, P_SABUN);
| 
| ---------------------------------------------------------------------------------------------------------------------------------------------------------
| -- 시간외근무(연장근무) 신청으로 인한 근무시간 발생
| -- 105 : 연장근무, 103 :심야근무
| 
- -- 201 : 휴일근무, 203 : 휴일연장, 205 : 휴일야간, 210 : 특별근무, 212 : 특별연장  301 : 명절근무  305 명절연장
- 
+ -- 201 : 휴일근무, 203 : 휴일연장, 205 : 휴일야간
+ 
| -- [벽산] 연장(휴일)근무는 신청이 있을 때만 인정
| -- [벽산] 사무직은 신청시간 그대로 인정, 생산직은 출퇴근 시간에서 인정시간 계산.
| ---------------------------------------------------------------------------------------------------------------------------------------------------------
| 
- IF ( LV_HOL_YN = 'N' AND LV_DAY_TYPE IN ( '105', '103' ) ) OR
- ( LV_HOL_YN = 'Y' AND LV_DAY_TYPE IN ( '203')  ) THEN
- 
+ IF ( LV_HOL_YN = 'N' AND LV_DAY_TYPE IN ( '105', '103' ) )
+ OR ( LV_HOL_YN = 'Y' AND LV_DAY_TYPE IN ( '201', '203', '205')  ) THEN
+ 
| LV_OT_HHMM := '';
| LN_OT_HOUR := 0;
| 
| 
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-1','TIME_CD:'||LV_TIME_CD, P_SABUN);
| --연장근무신청여부가 'Y' 인 경우에만 연장근무신청내역을 확인함
| IF LV_APPLY_YN = 'Y' THEN
| BEGIN
| --인정시간계산 함수로 분리, 연장근무신청 시 사용 2020.08.18
| SELECT F_TIM_FMT_TIME(WORK_HOUR,0, '')
| , WORK_HOUR
| INTO LV_OT_HHMM, LN_OT_HOUR
| 
- FROM (  SELECT sum(F_TIM_WORK_INFO_TEMP_HOUR(P_ENTER_CD, P_SABUN, P_YMD, SUBSTR(IN_HM,9), SUBSTR(OUT_HM,9), P_WORK_CD )) - SUM(NVL(decode(meal_yn,'Y',1),0))  AS WORK_HOUR
- 
+ FROM (  SELECT F_TIM_WORK_INFO_TEMP_HOUR(P_ENTER_CD, P_SABUN, P_YMD, SUBSTR(IN_HM,9), SUBSTR(OUT_HM,9), P_WORK_CD )  AS WORK_HOUR
+ 
| FROM (
| SELECT CASE WHEN LV_PRODUCT_YN = 'N' THEN A.REQ_S_HM   -- [벽산]사무직은 신청시간으로
| WHEN A.IN_HM > A.REQ_S_HM THEN A.IN_HM        -- [벽산]신청시간과 실 출근시간 중 큰 값으로 인정
| ELSE A.REQ_S_HM  END AS IN_HM  -- 출근시간
| , CASE WHEN LV_PRODUCT_YN = 'N' THEN A.REQ_E_HM   -- [벽산]사무직은 신청시간으로
| WHEN A.OUT_HM < A.REQ_E_HM THEN A.OUT_HM        --[벽산]신청시간과 실 출근시간 중 큰 값으로 인정
| ELSE A.REQ_E_HM  END AS OUT_HM  -- 퇴근시간
| 
- , a.meal_yn     -- 식사시간 한시간제외처리
- 
+ 
+ 
| FROM (SELECT CASE WHEN REQ_S_HM    >= BEGIN_SHM THEN P_YMD ELSE TO_CHAR(TO_DATE(P_YMD, 'yyyymmdd')+1, 'yyyymmdd') END || REQ_S_HM    AS REQ_S_HM
| , CASE WHEN REQ_E_HM    >  BEGIN_SHM THEN P_YMD ELSE TO_CHAR(TO_DATE(P_YMD, 'yyyymmdd')+1, 'yyyymmdd') END || REQ_E_HM    AS REQ_E_HM
| , CASE WHEN P_SHM       >= BEGIN_SHM THEN P_YMD ELSE TO_CHAR(TO_DATE(P_YMD, 'yyyymmdd')+1, 'yyyymmdd') END || P_SHM       AS IN_HM
| , CASE WHEN P_EHM       >  BEGIN_SHM THEN P_YMD ELSE TO_CHAR(TO_DATE(P_YMD, 'yyyymmdd')+1, 'yyyymmdd') END || P_EHM       AS OUT_HM
| 
- , a.meal_yn                                                                                                               AS meal_yn
- 
| FROM (
| 
- SELECT REQ_S_HM AS REQ_S_HM  -- 신청구분(B:사전, A:사후)
- , REQ_E_HM AS REQ_E_HM  -- 신청구분(B:사전, A:사후)
- , B.BEGIN_SHM AS BEGIN_SHM  -- 근무시작 기준시간
- , meal_yn
- 
+ SELECT MAX(REQ_S_HM) KEEP(DENSE_RANK FIRST ORDER BY APPL_GUBUN ) AS REQ_S_HM  -- 신청구분(B:사전, A:사후)
+ , MAX(REQ_E_HM) KEEP(DENSE_RANK FIRST ORDER BY APPL_GUBUN ) AS REQ_E_HM  -- 신청구분(B:사전, A:사후)
+ , MAX(B.BEGIN_SHM) KEEP(DENSE_RANK FIRST ORDER BY APPL_GUBUN ) AS BEGIN_SHM  -- 근무시작 기준시간
+ 
| FROM TTIM601 A, TTIM017 B -- 연장근무 신청
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.YMD      = P_YMD
| AND A.SABUN    = P_SABUN
| AND EXISTS ( SELECT 1
| FROM THRI103 X
| WHERE X.ENTER_CD = A.ENTER_CD
| AND X.APPL_SEQ = A.APPL_SEQ
| AND X.APPL_STATUS_CD = '99' )
| 
| AND A.ENTER_CD = B.ENTER_CD
| AND B.TIME_CD  = LV_TIME_CD
| ) A
| WHERE BEGIN_SHM IS NOT NULL
| ) A
| )
| );
| EXCEPTION
| WHEN OTHERS THEN
| LV_OT_HHMM := '';
| LN_OT_HOUR := 0;
| END;
| 
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-122','LN_OT_HOUR:'||LN_OT_HOUR||', LN_HOUR_NT:'||LN_HOUR_NT, P_SABUN);
| ELSE
| BEGIN
| SELECT F_TIM_FMT_TIME(WORK_HOUR,0, '')
| , WORK_HOUR
| INTO LV_OT_HHMM, LN_OT_HOUR
| FROM (  SELECT F_TIM_WORK_INFO_TEMP_HOUR(P_ENTER_CD, P_SABUN, P_YMD, P_SHM, P_EHM, P_WORK_CD )  AS WORK_HOUR
| FROM DUAL)
| ;
| END
| ;
| END IF
| ;
| 
| -- 연장신청에 심야근무시간이 없고 기본근무가 심야근무이면 심야근무시간 리턴  2020.09.11
| IF LV_DAY_TYPE = '103' AND LN_OT_HOUR = 0 AND LN_HOUR_NT > 0 THEN
| LV_HHMM := LV_HHMM_NT; -- 심야근무시간..  2020.09.11
| LN_HOUR := LN_HOUR_NT; -- 심야근무시간..  2020.09.11
| ELSE
| LV_HHMM :=  LV_OT_HHMM;
| LN_HOUR :=  LN_OT_HOUR;
| END IF;
| 
| 
| ------------------------------------------------------------------------------------------------------------------------
| -- [벽산] 연장근무추가 신청
| -- 퇴근 후 추가근무시간 발생 시 연장근무시간에 적용. ( 근무시간산정 안하고 신청한 시간 그대로 적용)
| -- 휴일은 제외
| ------------------------------------------------------------------------------------------------------------------------
| /*   LN_HOUR_ADD := 0;
| BEGIN
| SELECT NVL(B.REQUEST_HOUR,0)
| INTO LN_HOUR_ADD
| FROM TTIM611 A, TTIM612 B
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.YMD      = P_YMD
| AND A.SABUN    = P_SABUN
| AND EXISTS ( SELECT 1 FROM THRI103 X
| WHERE X.ENTER_CD = A.ENTER_CD
| AND X.APPL_SEQ = A.APPL_SEQ
| AND X.APPL_STATUS_CD = '99' )
| AND A.ENTER_CD = B.ENTER_CD
| AND A.APPL_SEQ = B.APPL_SEQ
| AND B.WORK_CD  = P_WORK_CD;
| 
| EXCEPTION
| WHEN OTHERS THEN
| LN_HOUR_ADD := 0;
| END;
| 
| IF LN_HOUR_ADD > 0 THEN
| LN_HOUR :=  LN_HOUR + LN_HOUR_ADD;
| LV_HHMM :=  F_TIM_FMT_TIME(LN_HOUR,0, '') ;
| END IF;*/
| 
- -- 201 : 휴일근무, 203 : 휴일연장, 205 : 휴일야간, 210 : 특별근무, 212 : 특별연장  301 : 명절근무  305 명절연장
- -- LV_holiday_yn 휴일여부 , LV_hol_time_cd (A 명절, B 특별)
- ELSIF    (LV_HOL_YN = 'Y' AND LV_DAY_TYPE IN ( '201', '205')) OR (LV_holiday_yn = 'Y' AND LV_hol_time_cd = 'A' AND LV_DAY_TYPE IN ( '301', '305') )
- OR (LV_holiday_yn = 'Y' AND LV_hol_time_cd = 'B' AND LV_DAY_TYPE IN ( '210', '212') ) THEN
- LV_OT_HHMM := '';
- LN_OT_HOUR := 0;
- 
| 
| 
- 
- --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-1','TIME_CD:'||LV_TIME_CD, P_SABUN);
- --연장근무신청여부가 'Y' 인 경우에만 연장근무신청내역을 확인함
- IF LV_APPLY_YN = 'Y' THEN
- BEGIN
- --인정시간계산 함수로 분리, 연장근무신청 시 사용 2020.08.18
- SELECT F_TIM_FMT_TIME(WORK_HOUR,0, '')
- , WORK_HOUR
- INTO LV_OT_HHMM, LN_OT_HOUR
- FROM (  SELECT sum(F_TIM_WORK_INFO_TEMP_HOUR1(P_ENTER_CD, P_SABUN, P_YMD, SUBSTR(IN_HM,9), SUBSTR(OUT_HM,9), P_WORK_CD )) - SUM(NVL(decode(meal_yn,'Y',1),0))  AS WORK_HOUR
- FROM (
- SELECT  A.REQ_S_HM   AS IN_HM  -- 출근시간
- ,  A.REQ_E_HM   AS OUT_HM  -- 퇴근시간
- ,  a.meal_yn
- FROM (SELECT P_YMD || REQ_S_HM    AS REQ_S_HM
- , P_YMD || REQ_E_HM    AS REQ_E_HM
- , CASE WHEN P_SHM       >= BEGIN_SHM THEN P_YMD ELSE TO_CHAR(TO_DATE(P_YMD, 'yyyymmdd')+1, 'yyyymmdd') END || P_SHM       AS IN_HM
- , CASE WHEN P_EHM       >  BEGIN_SHM THEN P_YMD ELSE TO_CHAR(TO_DATE(P_YMD, 'yyyymmdd')+1, 'yyyymmdd') END || P_EHM       AS OUT_HM
- , a.meal_yn
- FROM (
- SELECT REQ_S_HM AS REQ_S_HM  -- 신청구분(B:사전, A:사후)
- , REQ_E_HM AS REQ_E_HM  -- 신청구분(B:사전, A:사후)
- , B.BEGIN_SHM AS BEGIN_SHM  -- 근무시작 기준시간
- , meal_yn
- FROM TTIM601 A, TTIM017 B -- 연장근무 신청
- WHERE A.ENTER_CD = P_ENTER_CD
- AND A.YMD      = P_YMD
- AND A.SABUN    = P_SABUN
- AND EXISTS ( SELECT 1
- FROM THRI103 X
- WHERE X.ENTER_CD = A.ENTER_CD
- AND X.APPL_SEQ = A.APPL_SEQ
- AND X.APPL_STATUS_CD = '99' )
- 
- AND A.ENTER_CD = B.ENTER_CD
- AND B.TIME_CD  = LV_TIME_CD
- ) A
- WHERE BEGIN_SHM IS NOT NULL
- ) A
- )
- );
- EXCEPTION
- WHEN OTHERS THEN
- LV_OT_HHMM := '';
- LN_OT_HOUR := 0;
- END;
- 
- 
- 
- 
- --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-122','LN_OT_HOUR:'||LN_OT_HOUR||', LN_HOUR_NT:'||LN_HOUR_NT, P_SABUN);
- ELSE
- BEGIN
- SELECT F_TIM_FMT_TIME(WORK_HOUR,0, '')
- , WORK_HOUR
- INTO LV_OT_HHMM, LN_OT_HOUR
- FROM (  SELECT F_TIM_WORK_INFO_TEMP_HOUR(P_ENTER_CD, P_SABUN, P_YMD, P_SHM, P_EHM, P_WORK_CD )  AS WORK_HOUR
- FROM DUAL)
- ;
- END
- ;
- END IF
- ;
- 
- -- 201 : 휴일근무, 203 : 휴일연장, 205 : 휴일야간, 210 : 특별근무, 212 : 특별연장  301 : 명절근무  305 명절연장
- 
- -- 연장신청에 심야근무시간이 없고 기본근무가 심야근무이면 심야근무시간 리턴  2020.09.11
- IF LV_DAY_TYPE IN ('201','210','301') AND LN_OT_HOUR > 8 THEN
- LV_HHMM := F_TIM_FMT_TIME(8,0, '') ; -- 심야근무시간..  2020.09.11
- LN_HOUR := 8; -- 심야근무시간..  2020.09.11
- ELSIF LV_DAY_TYPE IN ('205','212','305') AND LN_OT_HOUR > 8 THEN
- LV_HHMM := F_TIM_FMT_TIME(LN_OT_HOUR - 8,0, '') ; -- 심야근무시간..  2020.09.11
- LN_HOUR := LN_OT_HOUR - 8; -- 심야근무시간..  2020.09.11
- ELSE
- LV_HHMM :=  LV_OT_HHMM;
- LN_HOUR :=  LN_OT_HOUR;
- 
| END IF;
| 
| 
| 
| 
- END IF;
- 
- 
- 
- 
| ---------------------------------------------------------------------------------------------------------------------------------------------------------
| IF LV_HHMM = '0000' THEN
| LV_HHMM := '';
| END IF;
| 
| 
| ---------------------------------------------------------------------------------------------------------------------------------------------------------
| -- 추가 근무시간
| -- 해당근무일에 발생한 근태
| -- 해당근무일에 근태가 존재하는 경우 근태에 대한 적용근무시간을 추가적으로 표시함
| -- 예외인정근무시간(TTIM081) 에 인정시간이 있을 경우 해당 인정시간으로.. 2020.01.13
| ---------------------------------------------------------------------------------------------------------------------------------------------------------
| IF LV_GNT_CD_YN = 'Y' THEN
| LV_REQUEST_USE_TYPE := '';
| BEGIN
| --SELECT CASE WHEN LV_PRODUCT_YN = 'N' THEN NVL(B.STD_APPLY_HOUR,0) ELSE NVL(B.STD_APPLY_HOUR2,0) END , REQUEST_USE_TYPE
| SELECT NVL(NVL(C.STD_APPLY_HOUR,B.STD_APPLY_HOUR),0), B.REQUEST_USE_TYPE
| INTO LV_STD_APPLY_HOUR, LV_REQUEST_USE_TYPE
| FROM TTIM405 A, TTIM014 B, TTIM081 C --예외인정근무시간
| WHERE A.ENTER_CD = B.ENTER_CD
| AND A.GNT_CD   = B.GNT_CD
| AND A.ENTER_CD = C.ENTER_CD(+)
| AND A.GNT_CD   = C.GNT_CD(+)
| AND LV_TIME_CD = C.TIME_CD(+)
| AND B.WORK_CD  = C.WORK_CD(+)
| AND A.ENTER_CD = P_ENTER_CD
| AND A.YMD      = P_YMD
| AND A.SABUN    = P_SABUN
| AND B.WORK_CD  = P_WORK_CD
| ;
| EXCEPTION
| WHEN OTHERS THEN
| LV_HHMM := LV_HHMM;
| END;
| 
| LV_LOG := LV_LOG || ', STD_APPLY_HOUR:' || LV_STD_APPLY_HOUR  || ', REQUEST_USE_TYPE:' || LV_REQUEST_USE_TYPE ;
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-5',LV_LOG, P_SABUN);
| 
| 
| IF LV_STD_APPLY_HOUR > 0 THEN
| IF LV_HHMM IS NULL THEN
| LV_HHMM := '0000';
| END IF;
| 
| --종일단위 근태 발생시에는 출퇴근시간 있어도 감안하지 않음
| IF LV_REQUEST_USE_TYPE = 'D' THEN
| LV_HHMM := '0000';
| END IF
| ;
| 
| --LV_HHMM :=  SUBSTR((SUBSTR(LV_HHMM,1,2)+100+LV_STD_APPLY_HOUR)||'',2)||SUBSTR(LV_HHMM,3,2);
| LV_HHMM :=  LPAD(SUBSTR((SUBSTR(LV_HHMM,1,2)+100+(TRUNC(LV_STD_APPLY_HOUR)+(CASE WHEN SUBSTR(LV_HHMM,3,2)+MOD(LV_STD_APPLY_HOUR,1)*60 > 60 THEN 1 ELSE 0 END)))||'',2),2,'0')
| ||(CASE WHEN SUBSTR(LV_HHMM,3,2)+MOD(LV_STD_APPLY_HOUR,1)*60 > 60 THEN LPAD(((SUBSTR(LV_HHMM,3,2)+MOD(LV_STD_APPLY_HOUR,1)*60)-60)||'' ,2,'0')
| ELSE LPAD(((SUBSTR(LV_HHMM,3,2)+MOD(LV_STD_APPLY_HOUR,1)*60))||'',2,'0') END)
| ;
| 
| END IF
| ;
| END IF;
| 
| 
| RETURN LV_HHMM;
| 
| EXCEPTION
| WHEN OTHERS THEN
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'100',SQLERRM||'P_YMD : '||P_YMD||'/ P_WORK_CD : '||P_WORK_CD||'/ P_SABUN : '||P_SABUN||' / P_SHM : '||P_SHM||' / P_EHM : '||P_EHM||' / '||LV_E_YYYYMMDD_HM||' / '||LV_STD_E_YYYYMMDD_HM, NULL);
| RETURN NULL;
| END F_TIM_WORK_INFO_TEMP;
| 
| 
| /
```
---
# F_TIM_WORK_INFO_TEMP_TYPE.FNC

```diff
| 
| CREATE OR REPLACE  FUNCTION "EHR_NG"."F_TIM_WORK_INFO_TEMP_TYPE" (
| P_ENTER_CD   IN    VARCHAR2 -- 회사코드
| , P_SABUN      IN    VARCHAR2 -- 사원번호
| , P_YMD        IN    VARCHAR2 -- 기준일자
| , P_SHM        IN    VARCHAR2 -- 시작시간
| , P_EHM        IN    VARCHAR2 -- 종료시간
| , P_DAY_TYPE   IN    VARCHAR2 -- 근무구분(T10017)
| ) RETURN NUMBER
| IS
| /********************************************************************************/
| /*                    (c) Copyright ISU System Inc. 2004                        */
| /*                           All Rights Reserved                                */
| /********************************************************************************/
| /*  FUNCTION NAME : F_TIM_WORK_INFO_TEMP_TYPE                                   */
| /*                  해당일자의 근무구분별 근무시간 합산  Return.
| 연장근무 신청 시 신청시간 계산 시 사용                      */
| /********************************************************************************/
| /*  [ 참조 TABLE ]                                                              */
| /********************************************************************************/
| /* Date        In Charge       Description                                      */
| /*------------------------------------------------------------------------------*/
| /* 2020.08.18                   Initial Release                                 */
| /********************************************************************************/
| /*
| 근무구분(T10017)
| 105    연장근무
| 201    휴일근무
| 205    휴일연장근무
| 
| */
| LV_HOUR                 NUMBER;
| 
| LV_BIZ_CD               TSYS903.BIZ_CD%TYPE := 'TIM';
| LV_OBJECT_NM            TSYS903.OBJECT_NM%TYPE := 'F_TIM_WORK_INFO_TEMP_TYPE';
| 
| LV_WORK_TYPE           THRM151.WORK_TYPE%TYPE;
| BEGIN
| 
| LV_HOUR := 0;
| 
| -- 연장근무신청시엔 기존 로직으로 체크
| IF P_DAY_TYPE = '105' THEN
| 
| BEGIN
| 
| SELECT SUM(HH) + TRUNC(SUM(MM)/60)+MOD(SUM(MM),60)/60
| INTO LV_HOUR
| FROM (SELECT TRUNC(CASE WHEN STD_MIN IS NOT NULL AND STD_MIN > MM THEN 0
| WHEN UNIT IS NOT NULL THEN MM-MOD(MM, UNIT)
| ELSE MM END / 60) AS HH
| , MOD(CASE WHEN STD_MIN IS NOT NULL AND STD_MIN > MM THEN 0
| WHEN UNIT IS NOT NULL THEN MM-MOD(MM, UNIT)
| ELSE MM END , 60) AS MM
| , WORK_CD
| , MM AS WORK_HOUR
| FROM (
| SELECT STD_MIN
| , UNIT
| , WORK_CD
| , F_COM_GET_HH24MI_GAP(S_TIME, E_TIME) AS MM
| FROM (
| SELECT STD_MIN
| , UNIT
| , WORK_CD
| , CASE WHEN holiday_yn = 'Y'  THEN ''
| WHEN EHM < IN_HM  AND EHM_BF < IN_HM THEN ''
| WHEN SHM > OUT_HM  AND SHM_BF > OUT_HM   THEN ''
| WHEN SHM > IN_HM AND SHM_BF > IN_HM THEN SHM
| ELSE IN_HM END AS S_TIME
| , CASE WHEN holiday_yn = 'Y'  THEN ''
| WHEN EHM < IN_HM AND EHM_BF < IN_HM THEN ''
| WHEN SHM > OUT_HM AND SHM_BF > OUT_HM THEN ''
| WHEN EHM > OUT_HM AND EHM_BF > IN_HM THEN OUT_HM
| WHEN EHM > OUT_HM  THEN OUT_HM
| ELSE EHM END AS E_TIME
| FROM (
| SELECT A.STD_MIN, A.UNIT, A.WORK_CD, c.work_yn, c.holiday_yn
| , CASE WHEN A.SHM    >= D.BEGIN_SHM THEN
| C.YMD
| ELSE
| TO_CHAR(TO_DATE(C.YMD, 'yyyymmdd')+1, 'yyyymmdd')
| END || A.SHM     AS SHM
| , CASE WHEN A.EHM    >  D.BEGIN_SHM THEN
| C.YMD
| ELSE
| TO_CHAR(TO_DATE(C.YMD, 'yyyymmdd')+1, 'yyyymmdd')
| END || A.EHM     AS EHM
| ,
| C.YMD || '0000'     AS SHM_BF
| , C.YMD || (select f.work_shm from TTIM017 F where f.enter_cd = a.enter_cd and f.time_cd = c.time_cd)
| AS EHM_BF
| , CASE WHEN C.IN_HM  >= D.BEGIN_SHM THEN
| C.YMD
| ELSE
| C.YMD
| END || C.IN_HM   AS IN_HM
| , CASE WHEN C.OUT_HM >  D.BEGIN_SHM THEN
| C.YMD
| ELSE
| CASE WHEN C.IN_HM < D.BEGIN_SHM THEN
| C.YMD
| ELSE
| TO_CHAR(TO_DATE(C.YMD, 'yyyymmdd')+1, 'yyyymmdd')
| END
| END || C.OUT_HM  AS OUT_HM
| FROM TTIM018 A
| , TTIM015 B
| , (SELECT SABUN
| , ''           AS GNT_CD
| , YMD
| , P_SHM        AS IN_HM
| , P_EHM        AS OUT_HM
| , TIME_CD
| , work_yn
| , holiday_yn
| FROM TTIM120_V
| WHERE ENTER_CD = P_ENTER_CD
| AND SABUN    = P_SABUN
| AND YMD     = P_YMD
| ) C
| , TTIM017 D
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.TIME_CD  = C.TIME_CD
| AND A.ENTER_CD = B.ENTER_CD
| AND A.WORK_CD  = B.WORK_CD
| AND B.DAY_TYPE = P_DAY_TYPE
| AND A.ENTER_CD = D.ENTER_CD
| AND A.TIME_CD  = D.TIME_CD
| )
| )
| )
| );
| EXCEPTION
| WHEN OTHERS THEN
| LV_HOUR := 0;
| END;
| ELSIF P_DAY_TYPE = '201' THEN
| 
| SELECT SUM(HH) + TRUNC(SUM(MM)/60)+MOD(SUM(MM),60)/60
| INTO LV_HOUR
| FROM (SELECT TRUNC(CASE WHEN STD_MIN IS NOT NULL AND STD_MIN > MM THEN 0
| WHEN UNIT IS NOT NULL THEN MM-MOD(MM, UNIT)
| ELSE MM END / 60) AS HH
| , MOD(CASE WHEN STD_MIN IS NOT NULL AND STD_MIN > MM THEN 0
| WHEN UNIT IS NOT NULL THEN MM-MOD(MM, UNIT)
| ELSE MM END , 60) AS MM
| , WORK_CD
| , MM AS WORK_HOUR
| FROM (
| SELECT STD_MIN
| , UNIT
| , WORK_CD
| , F_COM_GET_HH24MI_GAP(S_TIME, E_TIME) AS MM
| FROM (
| SELECT STD_MIN
| , UNIT
| , WORK_CD
| , CASE WHEN holiday_yn = 'Y'  THEN IN_HM
| WHEN work_yn = 'Y'  THEN IN_HM
| ELSE '' END AS S_TIME
| , CASE WHEN holiday_yn = 'Y'  THEN OUT_HM
| WHEN work_yn = 'Y'  THEN OUT_HM
| ELSE '' END AS E_TIME
| FROM (
| SELECT A.STD_MIN, A.UNIT, A.WORK_CD, c.work_yn, c.holiday_yn
| , CASE WHEN A.SHM    >= D.BEGIN_SHM THEN
| C.YMD
| ELSE
| TO_CHAR(TO_DATE(C.YMD, 'yyyymmdd')+1, 'yyyymmdd')
| END || A.SHM     AS SHM
| , CASE WHEN A.EHM    >  D.BEGIN_SHM THEN
| C.YMD
| ELSE
| TO_CHAR(TO_DATE(C.YMD, 'yyyymmdd')+1, 'yyyymmdd')
| END || A.EHM     AS EHM
| ,
| C.YMD || '0000'     AS SHM_BF
| , C.YMD || (select f.work_shm from TTIM017 F where f.enter_cd = a.enter_cd and f.time_cd = c.time_cd)
| AS EHM_BF
| , CASE WHEN C.IN_HM  >= D.BEGIN_SHM THEN
| C.YMD
| ELSE
| C.YMD
| END || C.IN_HM   AS IN_HM
| , CASE WHEN C.OUT_HM >  D.BEGIN_SHM THEN
| C.YMD
| ELSE
| CASE WHEN C.IN_HM < D.BEGIN_SHM THEN
| C.YMD
| ELSE
| TO_CHAR(TO_DATE(C.YMD, 'yyyymmdd')+1, 'yyyymmdd')
| END
| END || C.OUT_HM  AS OUT_HM
| FROM TTIM018 A
| , TTIM015 B
| , (SELECT SABUN
| , ''           AS GNT_CD
| , YMD
| , P_SHM        AS IN_HM
| , P_EHM        AS OUT_HM
| , TIME_CD
| , work_yn
| , holiday_yn
| FROM TTIM120_V
| WHERE ENTER_CD = P_ENTER_CD
| AND SABUN    = P_SABUN
| AND YMD     = P_YMD
| ) C
| , TTIM017 D
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.TIME_CD  = C.TIME_CD
| AND A.ENTER_CD = B.ENTER_CD
| AND A.WORK_CD  = B.WORK_CD
| 
- --    AND B.DAY_TYPE = P_DAY_TYPE
- 
+ --     AND B.DAY_TYPE = P_DAY_TYPE
+ 
| AND B.DAY_TYPE = '105'
| AND A.ENTER_CD = D.ENTER_CD
| AND A.TIME_CD  = D.TIME_CD
| )
| )
| )
| );
| 
| 
| END IF;
| 
| IF LV_HOUR IS NULL THEN
| LV_HOUR := 0;
| END IF;
| 
| RETURN LV_HOUR;
| EXCEPTION
| WHEN OTHERS THEN
| RETURN NULL;
| END;
| /
```
---
# PKG_CPN_PUMP_ETC_API.PCK

```diff
| 
| CREATE OR REPLACE  PACKAGE "EHR_NG"."PKG_CPN_PUMP_ETC_API" IS
| /********************************************************************************/
| /*                    (c) Copyright ISU System Inc. 2004                        */
| /*                           All Rights Reserved                                */
| /********************************************************************************/
| /*                                                                              */
| /* Package Name   : PKG_CPN_PUMP_ETC_API                                        */
| /* Description    : 급여실적 및 급여관련 데이타변환 Package                     */
| /*                                                                              */
| /* Change Request Number : 1.2.3.4.5                                            */
| /*                                                                              */
| /*------------------------------------------------------------------------------*/
| /*   Date       In Charge         Description                                   */
| /*------------------------------------------------------------------------------*/
| /* 2011-10-25   C.Y.G             Initial Release                               */
| /*                                                                              */
| /********************************************************************************/
| g_biz_cd       TSYS903.BIZ_CD%TYPE := 'CPN';
| 
| -- 급여실적자료 변환 Main
| PROCEDURE P_CPN_MTH_PUMP_ALL (
| P_SQLCODE          OUT VARCHAR2,  -- Error Code
| P_SQLERRM          OUT VARCHAR2,  -- Error Messages
| P_ENTER_CD         IN VARCHAR2,
| P_YEAR             IN VARCHAR2,
| P_PAY_CD           IN VARCHAR2,
| P_CHKID            IN VARCHAR2
| );
| 
| -- 급여실적자료 변환(급여일자별 작업)
| PROCEDURE P_CPN_MTH_PUMP (
| P_SQLCODE            OUT VARCHAR2,  -- Error Code
| P_SQLERRM            OUT VARCHAR2,  -- Error Messages
| P_ENTER_CD           IN  VARCHAR2,  -- 회사코드
| P_PAY_ACTION_CD      IN  VARCHAR2,  -- 급여계산코드
| P_CHKID              IN  VARCHAR2   -- 수정자
| );
| 
| END PKG_CPN_PUMP_ETC_API;
| 
| 
| 
| 
| 
| 
| 
| 
| /
| CREATE OR REPLACE  PACKAGE BODY "EHR_NG"."PKG_CPN_PUMP_ETC_API"
| IS
| 
| PROCEDURE P_CPN_MTH_PUMP_ALL (
| P_SQLCODE          OUT VARCHAR2,  -- Error Code
| P_SQLERRM          OUT VARCHAR2,  -- Error Messages
| P_ENTER_CD         IN VARCHAR2,
| P_YEAR             IN VARCHAR2,
| P_PAY_CD           IN VARCHAR2,
| P_CHKID            IN VARCHAR2
| )
| IS
| /********************************************************************************/
| /*                    (c) Copyright ISU System Inc. 2004                        */
| /*                           All Rights Reserved                                */
| /********************************************************************************/
| /*  PROCEDURE NAME : P_CPN_MTH_PUMP_ALL                                         */
| /*                   급여실적자료 변환 Main                                     */
| /********************************************************************************/
| /*  [ 생성 TABLE ]                                                              */
| /*                TCPN201                                                       */
| /********************************************************************************/
| /* Date        In Charge       Description                                      */
| /*------------------------------------------------------------------------------*/
| /* 2011-01-07  C.Y.G           Initial Release                                  */
| /********************************************************************************/
| lv_cpn201       TCPN201%ROWTYPE;
| 
| lv_object_nm    TSYS903.OBJECT_NM%TYPE := 'PKG_CPN_PUMP_ETC_API.P_CPN_MTH_PUMP_ALL';
| 
| /* 급여실적 갖어오기
| */
| CURSOR CSR_PAY IS
| 
- SELECT A.*, B.PAY_YM, B.PAYMENT_YMD
- 
+ SELECT A.*, B.PAY_YM, B.PAYMENT_YMD, B.work_admin
+ 
| FROM TCPN051 A
| ,(
| 
- SELECT DISTINCT PAY_YM, PAY_CD, PAYMENT_YMD
- 
+ SELECT DISTINCT PAY_YM, PAY_CD, PAYMENT_YMD, work_admin
+ 
| FROM TCPN_PUMP_TEMP
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_YM LIKE P_YEAR || '%'
| --   AND PAY_YM IN ('202010', '202011')
| AND DECODE(P_PAY_CD, NULL, '%', PAY_CD) = DECODE(P_PAY_CD, NULL, '%', P_PAY_CD)
| ) B
| WHERE A.PAY_CD = B.PAY_CD
| AND A.ENTER_CD = P_ENTER_CD
| ORDER BY B.PAYMENT_YMD, A.PAY_CD
| ;
| BEGIN
| p_sqlcode  := NULL;
| p_sqlerrm  := NULL;
| 
| BEGIN
| 
| DELETE FROM TCPN202
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_ACTION_CD IN (SELECT PAY_ACTION_CD
| FROM TCPN201
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_YM LIKE P_YEAR || '%'
| --         AND PAY_YM IN ('202010', '202011')
| AND DECODE(P_PAY_CD, NULL, '%', PAY_CD) = DECODE(P_PAY_CD, NULL, '%', P_PAY_CD)
| AND SUBSTR(PAY_CD,1,1) NOT IN ('S','Y'));
| 
| DELETE FROM TCPN203
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_ACTION_CD IN (SELECT PAY_ACTION_CD
| FROM TCPN201
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_YM LIKE P_YEAR || '%'
| --       AND PAY_YM IN ('202010', '202011')
| AND DECODE(P_PAY_CD, NULL, '%', PAY_CD) = DECODE(P_PAY_CD, NULL, '%', P_PAY_CD)
| AND SUBSTR(PAY_CD,1,1) NOT IN ('S','Y'));
| DELETE FROM TCPN303
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_ACTION_CD IN (SELECT PAY_ACTION_CD
| FROM TCPN201
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_YM LIKE P_YEAR || '%'
| --      AND PAY_YM IN ('202010', '202011')
| AND DECODE(P_PAY_CD, NULL, '%', PAY_CD) = DECODE(P_PAY_CD, NULL, '%', P_PAY_CD)
| AND SUBSTR(PAY_CD,1,1) NOT IN ('S','Y'));
| 
| DELETE FROM TCPN205
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_ACTION_CD IN (SELECT PAY_ACTION_CD
| FROM TCPN201
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_YM LIKE P_YEAR || '%'
| --      AND PAY_YM IN ('202010', '202011')
| AND DECODE(P_PAY_CD, NULL, '%', PAY_CD) = DECODE(P_PAY_CD, NULL, '%', P_PAY_CD)
| AND SUBSTR(PAY_CD,1,1) NOT IN ('S','Y'));
| DELETE FROM TCPN206
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_ACTION_CD IN (SELECT PAY_ACTION_CD
| FROM TCPN201
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_YM LIKE P_YEAR || '%'
| --      AND PAY_YM IN ('202010', '202011')
| AND DECODE(P_PAY_CD, NULL, '%', PAY_CD) = DECODE(P_PAY_CD, NULL, '%', P_PAY_CD)
| AND SUBSTR(PAY_CD,1,1) NOT IN ('S','Y'));
| 
| DELETE FROM TCPN981
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_ACTION_CD IN (SELECT PAY_ACTION_CD
| FROM TCPN201
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_YM LIKE P_YEAR || '%'
| --      AND PAY_YM IN ('202010', '202011')
| AND DECODE(P_PAY_CD, NULL, '%', PAY_CD) = DECODE(P_PAY_CD, NULL, '%', P_PAY_CD)
| AND SUBSTR(PAY_CD,1,1) NOT IN ('S','Y'));
| 
| 
| DELETE FROM TBEN991
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_ACTION_CD IN (SELECT PAY_ACTION_CD
| FROM TCPN201
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_YM LIKE P_YEAR || '%'
| --     AND PAY_YM IN ('202010', '202011')
| AND DECODE(P_PAY_CD, NULL, '%', PAY_CD) = DECODE(P_PAY_CD, NULL, '%', P_PAY_CD)
| );
| 
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := SQLCODE;
| P_SQLERRM := '급상여자료 삭제시 Error ' || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'10',P_SQLERRM, P_CHKID);
| END;
| 
| 
| BEGIN
| DELETE FROM TCPN201
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_YM LIKE P_YEAR || '%'
| --      AND PAY_YM IN ('202010', '202011')
| AND DECODE(P_PAY_CD, NULL, '%', PAY_CD) = DECODE(P_PAY_CD, NULL, '%', P_PAY_CD)
| AND SUBSTR(PAY_CD,1,1) NOT IN ('S','Y');
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := SQLCODE;
| P_SQLERRM := '급여계산일자 삭제시 Error ' || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'20',P_SQLERRM, P_CHKID);
| END;
| 
| FOR C_PAY IN CSR_PAY LOOP
| lv_cpn201 := NULL;
| BEGIN
| SELECT PAY_ACTION_CD
| INTO lv_cpn201.PAY_ACTION_CD
| FROM TCPN201
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_CD   = C_PAY.PAY_CD
| AND PAY_YM   = C_PAY.PAY_YM
| AND PAYMENT_YMD = C_PAY.PAYMENT_YMD;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| BEGIN
| SELECT C_PAY.PAY_YM || NVL(TRIM(TO_CHAR(MAX(TO_NUMBER(SUBSTR(PAY_ACTION_CD,7,3))) + 1,'099')),'001')
| INTO lv_cpn201.PAY_ACTION_CD
| FROM TCPN201
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_YM   = C_PAY.PAY_YM;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| lv_cpn201.PAY_ACTION_CD := C_PAY.PAY_YM || '001';
| END;
| lv_cpn201.PAYMENT_YMD := C_PAY.PAYMENT_YMD;
| lv_cpn201.ORD_SYMD := C_PAY.PAY_YM || '01' ;
| lv_cpn201.ORD_EYMD := TO_CHAR(LAST_DAY(TO_DATE(C_PAY.PAY_YM,'YYYYMM')),'YYYYMMDD');
| 
| IF C_PAY.RUN_TYPE IN ('00002','00003') THEN
| lv_cpn201.BON_SYMD := lv_cpn201.ORD_SYMD;
| lv_cpn201.BON_EYMD := lv_cpn201.ORD_EYMD;
| END IF;
| 
| -- 급여계산일자 등록
| BEGIN
| lv_cpn201.PAY_ACTION_NM := SUBSTR(lv_cpn201.PAYMENT_YMD,1,4) || '.' ||
| SUBSTR(lv_cpn201.PAYMENT_YMD,5,2) || '.' ||
| SUBSTR(lv_cpn201.PAYMENT_YMD,7,2) || ' ' || C_PAY.PAY_NM;
| 
| INSERT INTO TCPN201
| (
| ENTER_CD, PAY_ACTION_CD, PAY_ACTION_NM, PAY_YM,
| PAY_CD, PAYMENT_YMD, ORD_SYMD, ORD_EYMD,
| TIME_YM, CAL_TAX_METHOD, /*BON_SYMD, BON_EYMD,*/
| 
- PAYMENT_METHOD, CHKDATE, CHKID
- 
+ PAYMENT_METHOD, CHKDATE, CHKID,work_admin_cd
+ 
| )
| VALUES
| (
| P_ENTER_CD, lv_cpn201.PAY_ACTION_CD, lv_cpn201.PAY_ACTION_NM, C_PAY.PAY_YM,
| C_PAY.PAY_CD, lv_cpn201.PAYMENT_YMD, lv_cpn201.ORD_SYMD, lv_cpn201.ORD_EYMD,
| TO_CHAR(ADD_MONTHS(TO_DATE(C_PAY.PAY_YM||'01','YYYYMMDD'), -1),'YYYYMM'), 'B', /*lv_cpn201.BON_SYMD, lv_cpn201.BON_EYMD,*/
| 
- 'GIRO', SYSDATE, 'CONV'
- 
+ 'GIRO', SYSDATE, 'CONV',C_PAY.WORK_ADMIN
+ 
| );
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := SQLCODE;
| P_SQLERRM := '급여계산일자 등록시 Error  lv_cpn201.PAY_ACTION_CD= '||lv_cpn201.PAY_ACTION_CD || SQLERRM;
| dbms_output.put_line('급여계산일자 등록시 Error  lv_cpn201.PAY_ACTION_CD= ' || lv_cpn201.PAY_ACTION_CD || SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'65-1',P_SQLERRM, P_CHKID);
| END;
| 
| 
| END;
| --
| COMMIT;
| 
| -- 급여일자별 변환작업
| P_CPN_MTH_PUMP(
| P_SQLCODE
| ,P_SQLERRM
| ,P_ENTER_CD
| ,lv_cpn201.PAY_ACTION_CD
| ,P_CHKID);
| END LOOP;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := P_SQLCODE;
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'100',P_SQLERRM, P_CHKID);
| END P_CPN_MTH_PUMP_ALL;
| -------------------------
| 
| PROCEDURE P_CPN_MTH_PUMP (
| P_SQLCODE            OUT VARCHAR2,  -- Error Code
| P_SQLERRM            OUT VARCHAR2,  -- Error Messages
| P_ENTER_CD           IN  VARCHAR2,  -- 회사코드
| P_PAY_ACTION_CD      IN  VARCHAR2,  -- 급여계산코드
| P_CHKID              IN  VARCHAR2   -- 수정자
| )
| IS
| /********************************************************************************/
| /*                    (c) Copyright ISU System Inc. 2004                        */
| /*                           All Rights Reserved                                */
| /********************************************************************************/
| /*  PROCEDURE NAME : P_CPN_MTH_PUMP_ALL                                         */
| /*                   급여실적자료 변환(급여일자별 작업)                         */
| /********************************************************************************/
| /*  [ 생성 TABLE ]                                                              */
| /*                TCPN203, TCPN205, TCPN303 등                                  */
| /********************************************************************************/
| /* Date        In Charge       Description                                      */
| /*------------------------------------------------------------------------------*/
| /* 2011-01-07  C.Y.G           Initial Release                                  */
| /********************************************************************************/
| --------- Local 변수 선언 -------------
| TYPE tmp_a_data_mon IS TABLE OF TCPN205.RESULT_MON%TYPE
| INDEX BY BINARY_INTEGER;
| TYPE tmp_d_data_mon IS TABLE OF TCPN205.RESULT_MON%TYPE
| INDEX BY BINARY_INTEGER;
| TYPE tmp_a_ele_cd IS TABLE OF TCPN011.ELEMENT_CD%TYPE
| INDEX BY BINARY_INTEGER;
| TYPE tmp_d_ele_cd IS TABLE OF TCPN011.ELEMENT_CD%TYPE
| INDEX BY BINARY_INTEGER;
| 
| t_a_mon         tmp_a_data_mon;  -- 항목결과금액(지급)
| t_d_mon         tmp_d_data_mon;  -- 항목결과금액(지급)
| t_a_cd          tmp_a_ele_cd;    -- 항목코드(지급)
| t_d_cd          tmp_d_ele_cd;    -- 항목코드(공제)
| 
| lv_cpn201       TCPN201%ROWTYPE; -- 급여계산일자관리
| lv_cpn205       TCPN205%ROWTYPE; --
| lv_cpn303       TCPN303%ROWTYPE; --
| ln_ei_mon       NUMBER := 0; -- 건강보험
| ln_add_ei_mon   NUMBER := 0; -- 본인부담금_추가/환급
| ln_add_ei_mon2  NUMBER := 0; -- 노인장기요양보험
| 
| lv_object_nm    TSYS903.OBJECT_NM%TYPE := 'PKG_CPN_PUMP_ETC_API.P_CPN_MTH_PUMP';
| 
| /* PUMP 테이블 자료 등록
| C_DATA.BUSINESS_PLACE_CD := NVL(F_COM_GET_BP_CD(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.ORD_EYMD), '100');
| C_DATA.BUSINESS_PLACE_NM := NVL(F_COM_GET_BP_NM(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.ORD_EYMD), '본사');
| 
| */
| CURSOR CSR_DATA (C_PAYMENT_YMD VARCHAR2, C_PAY_YM VARCHAR2, C_PAY_CD VARCHAR2) IS
| SELECT  NVL(F_COM_GET_BP_CD(P_ENTER_CD, SABUN, PAYMENT_YMD), '100') AS  BUSINESS_PLACE_CD
| , NVL(F_COM_GET_BP_NM(P_ENTER_CD, SABUN, PAYMENT_YMD), '100') AS  BUSINESS_PLACE_NM
| , A.*
| FROM   (SELECT   ENTER_CD, PAY_YM, PAY_CD, SABUN, NAME,
| SUM(NVL(MON_1,0)) AS MON_1,
| SUM(NVL(MON_2,0)) AS MON_2,
| SUM(NVL(MON_3,0)) AS MON_3,
| SUM(NVL(MON_4,0)) AS MON_4,
| SUM(NVL(MON_5,0)) AS MON_5,
| SUM(NVL(MON_6,0)) AS MON_6,
| SUM(NVL(MON_7,0)) AS MON_7,
| SUM(NVL(MON_8,0)) AS MON_8,
| SUM(NVL(MON_9,0)) AS MON_9,
| SUM(NVL(MON_10,0)) AS MON_10,
| SUM(NVL(MON_11,0)) AS MON_11,
| SUM(NVL(MON_12,0)) AS MON_12,
| SUM(NVL(MON_13,0)) AS MON_13,
| SUM(NVL(MON_14,0)) AS MON_14,
| SUM(NVL(MON_15,0)) AS MON_15,
| SUM(NVL(MON_16,0)) AS MON_16,
| 
| SUM(NVL(MON_17,0)) AS MON_17,
| SUM(NVL(MON_18,0)) AS MON_18,
| SUM(NVL(MON_19,0)) AS MON_19,
| SUM(NVL(MON_20,0)) AS MON_20,
| SUM(NVL(MON_21,0)) AS MON_21,
| SUM(NVL(MON_22,0)) AS MON_22,
| SUM(NVL(MON_23,0)) AS MON_23,
| SUM(NVL(MON_24,0)) AS MON_24,
| SUM(NVL(MON_25,0)) AS MON_25,
| SUM(NVL(MON_26,0)) AS MON_26,
| SUM(NVL(MON_27,0)) AS MON_27,
| SUM(NVL(MON_28,0)) AS MON_28,
| SUM(NVL(MON_29,0)) AS MON_29,
| SUM(NVL(MON_30,0)) AS MON_30,
| SUM(NVL(MON_31,0)) AS MON_31,
| SUM(NVL(MON_32,0)) AS MON_32,
| SUM(NVL(MON_33,0)) AS MON_33,
| SUM(NVL(MON_34,0)) AS MON_34,
| SUM(NVL(MON_35,0)) AS MON_35,
| SUM(NVL(MON_36,0)) AS MON_36,
| SUM(NVL(MON_37,0)) AS MON_37,
| SUM(NVL(MON_38,0)) AS MON_38,
| SUM(NVL(MON_39,0)) AS MON_39,
| SUM(NVL(MON_40,0)) AS MON_40,
| SUM(NVL(MON_41,0)) AS MON_41,
| SUM(NVL(MON_42,0)) AS MON_42,
| SUM(NVL(MON_43,0)) AS MON_43,
| SUM(NVL(MON_44,0)) AS MON_44,
| SUM(NVL(MON_45,0)) AS MON_45,
| SUM(NVL(MON_46,0)) AS MON_46,
| SUM(NVL(MON_47,0)) AS MON_47,
| SUM(NVL(MON_48,0)) AS MON_48,
| SUM(NVL(MON_49,0)) AS MON_49,
| SUM(NVL(MON_50,0)) AS MON_50,
| SUM(NVL(MON_51,0)) AS MON_51,
| SUM(NVL(MON_52,0)) AS MON_52,
| SUM(NVL(MON_53,0)) AS MON_53,
| SUM(NVL(MON_54,0)) AS MON_54,
| SUM(NVL(MON_55,0)) AS MON_55,
| SUM(NVL(MON_56,0)) AS MON_56,
| SUM(NVL(MON_57,0)) AS MON_57,
| SUM(NVL(MON_58,0)) AS MON_58,
| SUM(NVL(MON_59,0)) AS MON_59,
| SUM(NVL(MON_60,0)) AS MON_60,
| SUM(NVL(MON_61,0)) AS MON_61,
| SUM(NVL(MON_62,0)) AS MON_62,
| SUM(NVL(MON_63,0)) AS MON_63,
| SUM(NVL(MON_64,0)) AS MON_64,
| SUM(NVL(MON_65,0)) AS MON_65,
| SUM(NVL(MON_66,0)) AS MON_66,
| SUM(NVL(MON_67,0)) AS MON_67,
| SUM(NVL(MON_68,0)) AS MON_68,
| SUM(NVL(MON_69,0)) AS MON_69,
| 
+ SUM(NVL(MON_70,0)) AS MON_70,
+ 
| 
| SUM(NVL(TOT_EARNING_MON,0)) AS TOT_EARNING_MON,
| SUM(NVL(TAXIBLE_EARN_MON,0)) AS TAXIBLE_EARN_MON,
| SUM(NVL(NOTAX_FOOD_MON,0)) AS NOTAX_FOOD_MON,
| SUM(NVL(NOTAX_BABY_MON,0)) AS NOTAX_BABY_MON,
| SUM(NVL(NOTAX_TOT_MON,0)) AS NOTAX_TOT_MON,
| SUM(NVL(DED_1,0)) AS DED_1,
| SUM(NVL(DED_2,0)) AS DED_2,
| SUM(NVL(DED_3,0)) AS DED_3,
| SUM(NVL(DED_4,0)) AS DED_4,
| SUM(NVL(DED_5,0)) AS DED_5,
| SUM(NVL(DED_6,0)) AS DED_6,
| SUM(NVL(DED_7,0)) AS DED_7,
| SUM(NVL(DED_8,0)) AS DED_8,
| SUM(NVL(DED_9,0)) AS DED_9,
| SUM(NVL(DED_10,0)) AS DED_10,
| SUM(NVL(DED_11,0)) AS DED_11,
| SUM(NVL(DED_12,0)) AS DED_12,
| SUM(NVL(DED_13,0)) AS DED_13,
| SUM(NVL(DED_14,0)) AS DED_14,
| SUM(NVL(DED_15,0)) AS DED_15,
| SUM(NVL(DED_16,0)) AS DED_16,
| SUM(NVL(DED_17,0)) AS DED_17,
| SUM(NVL(DED_18,0)) AS DED_18,
| SUM(NVL(DED_19,0)) AS DED_19,
| SUM(NVL(DED_20,0)) AS DED_20,
| SUM(NVL(DED_21,0)) AS DED_21,
| SUM(NVL(DED_22,0)) AS DED_22,
| SUM(NVL(DED_23,0)) AS DED_23,
| SUM(NVL(DED_24,0)) AS DED_24,
| SUM(NVL(DED_25,0)) AS DED_25,
| SUM(NVL(DED_26,0)) AS DED_26,
| SUM(NVL(DED_27,0)) AS DED_27,
| SUM(NVL(DED_28,0)) AS DED_28,
| SUM(NVL(DED_29,0)) AS DED_29,
| SUM(NVL(DED_30,0)) AS DED_30,
| SUM(NVL(DED_31,0)) AS DED_31,
| SUM(NVL(DED_32,0)) AS DED_32,
| SUM(NVL(DED_33,0)) AS DED_33,
| SUM(NVL(DED_34,0)) AS DED_34,
| SUM(NVL(DED_35,0)) AS DED_35,
| SUM(NVL(DED_36,0)) AS DED_36,
| 
+ SUM(NVL(DED_37,0)) AS DED_37,
+ 
| 
| SUM(NVL(TOT_DED_MON,0)) AS TOT_DED_MON,
| SUM(NVL(PAYMENT_MON,0)) AS PAYMENT_MON
| ,  PAYMENT_YMD
| , F_COM_GET_LOCATION_CD(X.ENTER_CD, X.SABUN, TO_CHAR(LAST_DAY(TO_DATE(PAY_YM, 'YYYYMM')),'YYYYMMDD') ) AS LOCATION_CD
| FROM TCPN_PUMP_TEMP X
| GROUP BY ENTER_CD, PAY_YM, PAY_CD, SABUN, NAME, PAYMENT_YMD
| ) A
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_YM   = C_PAY_YM
| AND PAY_CD   = C_PAY_CD
| AND PAYMENT_YMD = C_PAYMENT_YMD;
| BEGIN
| p_sqlcode  := NULL;
| p_sqlerrm  := NULL;
| 
| lv_cpn201 := F_CPN_GET_201_INFO(P_ENTER_CD,P_PAY_ACTION_CD);
| 
| 
| 
| BEGIN
| -- 지급항목
| SELECT A_ELE_CD_1
| ,A_ELE_CD_2
| ,A_ELE_CD_3
| ,A_ELE_CD_4
| ,A_ELE_CD_5
| ,A_ELE_CD_6
| ,A_ELE_CD_7
| ,A_ELE_CD_8
| ,A_ELE_CD_9
| ,A_ELE_CD_10
| ,A_ELE_CD_11
| ,A_ELE_CD_12
| ,A_ELE_CD_13
| ,A_ELE_CD_14
| ,A_ELE_CD_15
| ,A_ELE_CD_16
| ,A_ELE_CD_17
| ,A_ELE_CD_18
| ,A_ELE_CD_19
| ,A_ELE_CD_20
| ,A_ELE_CD_21
| ,A_ELE_CD_22
| ,A_ELE_CD_23
| ,A_ELE_CD_24
| ,A_ELE_CD_25
| ,A_ELE_CD_26
| ,A_ELE_CD_27
| ,A_ELE_CD_28
| ,A_ELE_CD_29
| ,A_ELE_CD_30
| ,A_ELE_CD_31
| ,A_ELE_CD_32
| ,A_ELE_CD_33
| ,A_ELE_CD_34
| ,A_ELE_CD_35
| ,A_ELE_CD_36
| ,A_ELE_CD_37
| ,A_ELE_CD_38
| ,A_ELE_CD_39
| ,A_ELE_CD_40
| ,A_ELE_CD_41
| ,A_ELE_CD_42
| ,A_ELE_CD_43
| ,A_ELE_CD_44
| ,A_ELE_CD_45
| ,A_ELE_CD_46
| ,A_ELE_CD_47
| ,A_ELE_CD_48
| ,A_ELE_CD_49
| ,A_ELE_CD_50
| ,A_ELE_CD_51
| ,A_ELE_CD_52
| ,A_ELE_CD_53
| ,A_ELE_CD_54
| ,A_ELE_CD_55
| ,A_ELE_CD_56
| ,A_ELE_CD_57
| ,A_ELE_CD_58
| ,A_ELE_CD_59
| ,A_ELE_CD_60
| ,A_ELE_CD_61
| ,A_ELE_CD_62
| ,A_ELE_CD_63
| ,A_ELE_CD_64
| ,A_ELE_CD_65
| ,A_ELE_CD_66
| ,A_ELE_CD_67
| ,A_ELE_CD_68
| ,A_ELE_CD_69
| 
+ ,A_ELE_CD_70
+ 
| 
| INTO
| t_a_cd(1)
| ,t_a_cd(2)
| ,t_a_cd(3)
| ,t_a_cd(4)
| ,t_a_cd(5)
| ,t_a_cd(6)
| ,t_a_cd(7)
| ,t_a_cd(8)
| ,t_a_cd(9)
| ,t_a_cd(10)
| ,t_a_cd(11)
| ,t_a_cd(12)
| ,t_a_cd(13)
| ,t_a_cd(14)
| ,t_a_cd(15)
| ,t_a_cd(16)
| ,t_a_cd(17)
| ,t_a_cd(18)
| ,t_a_cd(19)
| ,t_a_cd(20)
| ,t_a_cd(21)
| ,t_a_cd(22)
| ,t_a_cd(23)
| ,t_a_cd(24)
| ,t_a_cd(25)
| ,t_a_cd(26)
| ,t_a_cd(27)
| ,t_a_cd(28)
| ,t_a_cd(29)
| ,t_a_cd(30)
| ,t_a_cd(31)
| ,t_a_cd(32)
| ,t_a_cd(33)
| ,t_a_cd(34)
| ,t_a_cd(35)
| ,t_a_cd(36)
| ,t_a_cd(37)
| ,t_a_cd(38)
| ,t_a_cd(39)
| ,t_a_cd(40)
| ,t_a_cd(41)
| ,t_a_cd(42)
| ,t_a_cd(43)
| ,t_a_cd(44)
| ,t_a_cd(45)
| ,t_a_cd(46)
| ,t_a_cd(47)
| ,t_a_cd(48)
| ,t_a_cd(49)
| ,t_a_cd(50)
| ,t_a_cd(51)
| ,t_a_cd(52)
| ,t_a_cd(53)
| ,t_a_cd(54)
| ,t_a_cd(55)
| ,t_a_cd(56)
| ,t_a_cd(57)
| ,t_a_cd(58)
| ,t_a_cd(59)
| ,t_a_cd(60)
| ,t_a_cd(61)
| ,t_a_cd(62)
| ,t_a_cd(63)
| ,t_a_cd(64)
| ,t_a_cd(65)
| ,t_a_cd(66)
| ,t_a_cd(67)
| ,t_a_cd(68)
| ,t_a_cd(69)
| 
+ ,t_a_cd(70)
+ 
| 
| FROM TCPN_PUMP_ELE_CD
| WHERE ENTER_CD = P_ENTER_CD;
| 
| -- 공제항목
| SELECT  D_ELE_CD_1
| ,D_ELE_CD_2
| ,D_ELE_CD_3
| ,D_ELE_CD_4
| ,D_ELE_CD_5
| ,D_ELE_CD_6
| ,D_ELE_CD_7
| ,D_ELE_CD_8
| ,D_ELE_CD_9
| ,D_ELE_CD_10
| ,D_ELE_CD_11
| ,D_ELE_CD_12
| ,D_ELE_CD_13
| ,D_ELE_CD_14
| ,D_ELE_CD_15
| ,D_ELE_CD_16
| ,D_ELE_CD_17
| ,D_ELE_CD_18
| ,D_ELE_CD_19
| ,D_ELE_CD_20
| ,D_ELE_CD_21
| ,D_ELE_CD_22
| ,D_ELE_CD_23
| ,D_ELE_CD_24
| ,D_ELE_CD_25
| ,D_ELE_CD_26
| ,D_ELE_CD_27
| ,D_ELE_CD_28
| ,D_ELE_CD_29
| ,D_ELE_CD_30
| ,D_ELE_CD_31
| ,D_ELE_CD_32
| ,D_ELE_CD_33
| ,D_ELE_CD_34
| ,D_ELE_CD_35
| ,D_ELE_CD_36
| 
+ ,D_ELE_CD_37
+ 
| 
| INTO
| t_d_cd(1)
| ,t_d_cd(2)
| ,t_d_cd(3)
| ,t_d_cd(4)
| ,t_d_cd(5)
| ,t_d_cd(6)
| ,t_d_cd(7)
| ,t_d_cd(8)
| ,t_d_cd(9)
| ,t_d_cd(10)
| ,t_d_cd(11)
| ,t_d_cd(12)
| ,t_d_cd(13)
| ,t_d_cd(14)
| ,t_d_cd(15)
| ,t_d_cd(16)
| ,t_d_cd(17)
| ,t_d_cd(18)
| ,t_d_cd(19)
| ,t_d_cd(20)
| ,t_d_cd(21)
| ,t_d_cd(22)
| ,t_d_cd(23)
| ,t_d_cd(24)
| ,t_d_cd(25)
| ,t_d_cd(26)
| ,t_d_cd(27)
| ,t_d_cd(28)
| ,t_d_cd(29)
| ,t_d_cd(30)
| ,t_d_cd(31)
| ,t_d_cd(32)
| ,t_d_cd(33)
| ,t_d_cd(34)
| ,t_d_cd(35)
| ,t_d_cd(36)
| 
+ ,t_d_cd(37)
+ 
| 
| FROM TCPN_PUMP_ELE_CD
| WHERE ENTER_CD = P_ENTER_CD;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '변환 급여항목코드 정보가 존재하지 않습니다.' || chr(10) || sqlerrm;
| dbms_output.put_line('변환 급여항목코드 정보가 존재하지 않습니다.' || chr(10) || sqlerrm);
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'10',P_SQLERRM, P_CHKID);
| RETURN;
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '변환 급여항목코드 정보가 존재시 Error ==>' || chr(10) || sqlerrm;
| dbms_output.put_line('변환 급여항목코드 정보가 존재하지 않습니다.' || chr(10) || sqlerrm);
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'15',P_SQLERRM, P_CHKID);
| RETURN;
| END;
| 
| --------------------------------------
| -- 급여항목결과, 급여실적 자료 등록
| --------------------------------------
| FOR C_DATA IN CSR_DATA (C_PAYMENT_YMD => lv_cpn201.PAYMENT_YMD
| ,C_PAY_YM => lv_cpn201.PAY_YM
| ,C_PAY_CD => lv_cpn201.PAY_CD) LOOP
| lv_cpn303 := NULL;
| 
| BEGIN
| INSERT INTO TCPN203
| (
| ENTER_CD, PAY_ACTION_CD, SABUN,
| BUSINESS_PLACE_CD, BUSINESS_PLACE_NM,
| ORD_SYMD, ORD_EYMD, WORK_SYMD, WORK_EYMD, GNT_SYMD, GNT_EYMD,
| NAME, RES_NO, EMP_YMD, GEMP_YMD, STATUS_CD, STATUS_NM,
| ORG_CD, ORG_NM,
| JIKGUB_CD,JIKGUB_NM,
| SAL_CLASS,
| JIKCHAK_CD,JIKCHAK_NM,
| JIKWEE_CD,JIKWEE_NM,
| PAY_TYPE, PAY_TYPE_NM,
| WORK_TYPE, WORK_TYPE_NM,
| MANAGE_CD, MANAGE_NM,
| PAY_PEOPLE_STATUS, CHKDATE, CHKID, LOCATION_CD
| --,CC_CD
| )
| VALUES
| (
| P_ENTER_CD, P_PAY_ACTION_CD, C_DATA.SABUN,
| NVL(C_DATA.BUSINESS_PLACE_CD,'100'),
| NVL(C_DATA.BUSINESS_PLACE_NM,'본사'),
| lv_cpn201.ORD_SYMD,
| lv_cpn201.ORD_EYMD,
| TO_CHAR(ADD_MONTHS(TO_DATE(lv_cpn201.ORD_SYMD,'YYYYMMDD'),-1),'YYYYMM')||'01',
| TO_CHAR(LAST_DAY(TO_DATE(TO_CHAR(ADD_MONTHS(TO_DATE(lv_cpn201.ORD_SYMD,'YYYYMMDD'),-1),'YYYYMM')||'01','YYYYMMDD')),'YYYYMMDD'),
| TO_CHAR(ADD_MONTHS(TO_DATE(lv_cpn201.ORD_SYMD,'YYYYMMDD'),-1),'YYYYMM')||'01',
| TO_CHAR(LAST_DAY(TO_DATE(TO_CHAR(ADD_MONTHS(TO_DATE(lv_cpn201.ORD_SYMD,'YYYYMMDD'),-1),'YYYYMM')||'01','YYYYMMDD')),'YYYYMMDD'),
| C_DATA.NAME,
| (SELECT RES_NO FROM THRM100 WHERE SABUN = C_DATA.SABUN AND ENTER_CD=P_ENTER_CD),
| (SELECT EMP_YMD FROM THRM100 WHERE SABUN = C_DATA.SABUN AND ENTER_CD=P_ENTER_CD),
| (SELECT GEMP_YMD FROM THRM100 WHERE SABUN = C_DATA.SABUN AND ENTER_CD=P_ENTER_CD),
| F_COM_GET_STATUS_CD(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_STATUS_NM(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_ORG_CD(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_ORG_NM2(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_JIKGUB_CD(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| /*F_COM_GET_GRCODE_NAME(P_ENTER_CD, 'H20010', C_DATA.JIKGUB_CD),*/
| F_COM_GET_JIKGUB_NM(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| '',
| F_COM_GET_JIKCHAK_CD(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_JIKCHAK_NM(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_JIKWEE_CD(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_JIKWEE_NM(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_PAY_TYPE(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_PAY_TYPE_NM(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_WORKTYPE(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_WORKTYPE_NM(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_MANAGE_CD(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| F_COM_GET_MANAGE_NM(P_ENTER_CD, C_DATA.SABUN, lv_cpn201.PAYMENT_YMD),
| /*
| F_COM_GET_JIKCHAK_CD(P_ENTER_CD,C_DATA.SABUN,lv_cpn201.PAYMENT_YMD),
| F_COM_GET_JIKCHAK_NM(P_ENTER_CD,C_DATA.SABUN,lv_cpn201.PAYMENT_YMD),
| F_COM_GET_JIKWEE_CD(P_ENTER_CD,C_DATA.SABUN,lv_cpn201.PAYMENT_YMD),
| F_COM_GET_JIKWEE_NM(P_ENTER_CD,C_DATA.SABUN,lv_cpn201.PAYMENT_YMD),
| F_COM_GET_PAY_TYPE(P_ENTER_CD,C_DATA.SABUN,lv_cpn201.PAYMENT_YMD),
| F_COM_GET_PAY_TYPE_NM(P_ENTER_CD,C_DATA.SABUN,lv_cpn201.PAYMENT_YMD),
| F_COM_GET_WORKTYPE(P_ENTER_CD,C_DATA.SABUN,lv_cpn201.PAYMENT_YMD),
| F_COM_GET_WORKTYPE_NM(P_ENTER_CD,C_DATA.SABUN,lv_cpn201.PAYMENT_YMD),
| F_COM_GET_MANAGE_CD(P_ENTER_CD,C_DATA.SABUN,lv_cpn201.PAYMENT_YMD),
| F_COM_GET_MANAGE_NM(P_ENTER_CD,C_DATA.SABUN,lv_cpn201.PAYMENT_YMD),
| */
| 'P', SYSDATE, P_CHKID, C_DATA.LOCATION_CD
| --, C_DATA.CC_CD
| );
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '급여대상자 Insert Error' || chr(10) || sqlerrm;
| dbms_output.put_line('급여대상자 Insert Error' || chr(10) || sqlerrm);
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'60','lv_cpn201.PAY_YM : '||lv_cpn201.PAY_YM||' / lv_cpn201.PAY_CD : '||lv_cpn201.PAY_CD||' / SABUN : '||C_DATA.SABUN||' / '||P_SQLERRM, P_CHKID);
| END;
| 
| t_a_mon(1)   :=   C_DATA.MON_1   ;
| t_a_mon(2)   :=   C_DATA.MON_2   ;
| t_a_mon(3)   :=   C_DATA.MON_3   ;
| t_a_mon(4)   :=   C_DATA.MON_4   ;
| t_a_mon(5)   :=   C_DATA.MON_5   ;
| t_a_mon(6)   :=   C_DATA.MON_6   ;
| t_a_mon(7)   :=   C_DATA.MON_7   ;
| t_a_mon(8)   :=   C_DATA.MON_8   ;
| t_a_mon(9)   :=   C_DATA.MON_9   ;
| t_a_mon(10)  :=   C_DATA.MON_10  ;
| t_a_mon(11)  :=   C_DATA.MON_11  ;
| t_a_mon(12)  :=   C_DATA.MON_12  ;
| t_a_mon(13)  :=   C_DATA.MON_13  ;
| t_a_mon(14)  :=   C_DATA.MON_14  ;
| t_a_mon(15)  :=   C_DATA.MON_15  ;
| t_a_mon(16)  :=   C_DATA.MON_16  ;
| 
| t_a_mon(17)  :=   C_DATA.MON_17  ;
| t_a_mon(18)  :=   C_DATA.MON_18  ;
| t_a_mon(19)  :=   C_DATA.MON_19  ;
| t_a_mon(20)  :=   C_DATA.MON_20  ;
| t_a_mon(21)  :=   C_DATA.MON_21  ;
| t_a_mon(22)  :=   C_DATA.MON_22  ;
| t_a_mon(23)  :=   C_DATA.MON_23  ;
| t_a_mon(24)  :=   C_DATA.MON_24  ;
| t_a_mon(25)  :=   C_DATA.MON_25  ;
| t_a_mon(26)  :=   C_DATA.MON_26  ;
| t_a_mon(27)  :=   C_DATA.MON_27  ;
| t_a_mon(28)  :=   C_DATA.MON_28  ;
| t_a_mon(29)  :=   C_DATA.MON_29  ;
| t_a_mon(30)  :=   C_DATA.MON_30  ;
| t_a_mon(31)  :=   C_DATA.MON_31  ;
| t_a_mon(32)  :=   C_DATA.MON_32  ;
| t_a_mon(33)  :=   C_DATA.MON_33  ;
| t_a_mon(34)  :=   C_DATA.MON_34  ;
| t_a_mon(35)  :=   C_DATA.MON_35  ;
| t_a_mon(36)  :=   C_DATA.MON_36  ;
| t_a_mon(37)  :=   C_DATA.MON_37  ;
| t_a_mon(38)  :=   C_DATA.MON_38  ;
| t_a_mon(39)  :=   C_DATA.MON_39  ;
| t_a_mon(40)  :=   C_DATA.MON_40  ;
| t_a_mon(41)  :=   C_DATA.MON_41  ;
| t_a_mon(42)  :=   C_DATA.MON_42  ;
| t_a_mon(43)  :=   C_DATA.MON_43  ;
| t_a_mon(44)  :=   C_DATA.MON_44  ;
| t_a_mon(45)  :=   C_DATA.MON_45  ;
| t_a_mon(46)  :=   C_DATA.MON_46  ;
| t_a_mon(47)  :=   C_DATA.MON_47  ;
| t_a_mon(48)  :=   C_DATA.MON_48  ;
| t_a_mon(49)  :=   C_DATA.MON_49  ;
| t_a_mon(50)  :=   C_DATA.MON_50  ;
| t_a_mon(51)  :=   C_DATA.MON_51  ;
| t_a_mon(52)  :=   C_DATA.MON_52  ;
| t_a_mon(53)  :=   C_DATA.MON_53  ;
| t_a_mon(54)  :=   C_DATA.MON_54  ;
| t_a_mon(55)  :=   C_DATA.MON_55  ;
| t_a_mon(56)  :=   C_DATA.MON_56  ;
| t_a_mon(57)  :=   C_DATA.MON_57  ;
| t_a_mon(58)  :=   C_DATA.MON_58  ;
| t_a_mon(59)  :=   C_DATA.MON_59  ;
| t_a_mon(60)  :=   C_DATA.MON_60  ;
| t_a_mon(61)  :=   C_DATA.MON_61  ;
| t_a_mon(62)  :=   C_DATA.MON_62  ;
| t_a_mon(63)  :=   C_DATA.MON_63  ;
| t_a_mon(64)  :=   C_DATA.MON_64  ;
| t_a_mon(65)  :=   C_DATA.MON_65  ;
| t_a_mon(66)  :=   C_DATA.MON_66  ;
| t_a_mon(67)  :=   C_DATA.MON_67  ;
| t_a_mon(68)  :=   C_DATA.MON_68  ;
| t_a_mon(69)  :=   C_DATA.MON_69  ;
| 
+ t_a_mon(70)  :=   C_DATA.MON_70  ;
+ 
| 
| 
| t_d_mon(1)   :=   C_DATA.DED_1   ;
| t_d_mon(2)   :=   C_DATA.DED_2   ;
| t_d_mon(3)   :=   C_DATA.DED_3   ;
| t_d_mon(4)   :=   C_DATA.DED_4   ;
| t_d_mon(5)   :=   C_DATA.DED_5   ;
| t_d_mon(6)   :=   C_DATA.DED_6   ;
| t_d_mon(7)   :=   C_DATA.DED_7   ;
| t_d_mon(8)   :=   C_DATA.DED_8   ;
| t_d_mon(9)   :=   C_DATA.DED_9   ;
| t_d_mon(10)  :=   C_DATA.DED_10  ;
| t_d_mon(11)  :=   C_DATA.DED_11  ;
| t_d_mon(12)  :=   C_DATA.DED_12  ;
| t_d_mon(13)  :=   C_DATA.DED_13  ;
| t_d_mon(14)  :=   C_DATA.DED_14  ;
| 
| t_d_mon(15)  :=   C_DATA.DED_15  ;
| t_d_mon(16)  :=   C_DATA.DED_16  ;
| t_d_mon(17)  :=   C_DATA.DED_17  ;
| t_d_mon(18)  :=   C_DATA.DED_18  ;
| t_d_mon(19)  :=   C_DATA.DED_19  ;
| t_d_mon(20)  :=   C_DATA.DED_20  ;
| t_d_mon(21)  :=   C_DATA.DED_21  ;
| t_d_mon(22)  :=   C_DATA.DED_22  ;
| t_d_mon(23)  :=   C_DATA.DED_23  ;
| t_d_mon(24)  :=   C_DATA.DED_24  ;
| t_d_mon(25)  :=   C_DATA.DED_25  ;
| t_d_mon(26)  :=   C_DATA.DED_26  ;
| t_d_mon(27)  :=   C_DATA.DED_27  ;
| t_d_mon(28)  :=   C_DATA.DED_28  ;
| t_d_mon(29)  :=   C_DATA.DED_29  ;
| t_d_mon(30)  :=   C_DATA.DED_30  ;
| t_d_mon(31)  :=   C_DATA.DED_31  ;
| t_d_mon(32)  :=   C_DATA.DED_32  ;
| t_d_mon(33)  :=   C_DATA.DED_33  ;
| t_d_mon(34)  :=   C_DATA.DED_34  ;
| t_d_mon(35)  :=   C_DATA.DED_35  ;
| t_d_mon(36)  :=   C_DATA.DED_36  ;
| 
+ t_d_mon(37)  :=   C_DATA.DED_37  ;
+ 
| 
| -- 개인별 항목별계산결과 등록
| -------------
| -- 수당항목
| -------------
| 
- FOR i IN 1..69 LOOP
- 
+ FOR i IN 1..70 LOOP
+ 
| lv_cpn205 := NULL;
| lv_cpn205.ELEMENT_CD := t_a_cd(i);
| lv_cpn205.TIME_UNIT:='M';
| lv_cpn205.BASIC_MON := t_a_mon(i);
| 
| IF lv_cpn205.BASIC_MON <> 0 THEN
| BEGIN
| INSERT INTO TCPN205
| (
| ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD,
| BUSINESS_PLACE_CD, TIME_UNIT, BASIC_MON,
| RESULT_MON, CHKDATE, CHKID
| )
| VALUES
| (
| P_ENTER_CD, P_PAY_ACTION_CD, C_DATA.SABUN,
| lv_cpn205.ELEMENT_CD,
| NVL(C_DATA.BUSINESS_PLACE_CD,'100'), lv_cpn205.TIME_UNIT, lv_cpn205.BASIC_MON,
| lv_cpn205.BASIC_MON, SYSDATE, P_CHKID
| );
| --P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'x-3','C_DATA.SABUN : '||C_DATA.SABUN||' / lv_cpn205.ELEMENT_CD : '||lv_cpn205.ELEMENT_CD||' / lv_cpn205.BASIC_MON : '||lv_cpn205.BASIC_MON, P_CHKID);
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := C_DATA.PAY_YM || ':' ||  C_DATA.SABUN ||  ':' || lv_cpn205.ELEMENT_CD || ' 급여항목결과 Insert Error' || chr(10) || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'30',P_SQLERRM, P_CHKID);
| END;
| 
| END IF;
| 
| END LOOP;
| 
| -------------
| -- 공제항목
| -------------
| 
- FOR i IN 1..36 LOOP
- 
+ FOR i IN 1..37 LOOP
+ 
| lv_cpn205 := NULL;
| lv_cpn205.ELEMENT_CD := t_d_cd(i);
| lv_cpn205.TIME_UNIT:='M';
| lv_cpn205.BASIC_MON := t_d_mon(i);
| 
| IF lv_cpn205.BASIC_MON <> 0 THEN
| BEGIN
| INSERT INTO TCPN205
| (
| ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD,
| BUSINESS_PLACE_CD, TIME_UNIT, BASIC_MON,
| RESULT_MON, CHKDATE, CHKID
| )
| VALUES
| (
| P_ENTER_CD, P_PAY_ACTION_CD, C_DATA.SABUN,
| lv_cpn205.ELEMENT_CD,
| NVL(C_DATA.BUSINESS_PLACE_CD,'100'), lv_cpn205.TIME_UNIT, lv_cpn205.BASIC_MON,
| lv_cpn205.BASIC_MON, SYSDATE, P_CHKID
| );
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := C_DATA.PAY_YM || ':' ||  C_DATA.SABUN ||  ':' || lv_cpn205.ELEMENT_CD || ' 급여항목결과 Insert Error' || chr(10) || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'30',P_SQLERRM, P_CHKID);
| END;
| END IF;
| 
| END LOOP;
| 
| --------------------------------------------------------
| -- 월급여실적 Update(공제총액, 실지급액)
| --------------------------------------------------------
| 
| 
| BEGIN
| 
| --           IF lv_cpn201.PAY_CD NOT IN ('10','12','14') THEN
| 
| -- 소득세총액
| BEGIN
| SELECT NVL(RESULT_MON,0)
| INTO lv_cpn303.ITAX_MON
| FROM TCPN205
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| AND SABUN = C_DATA.SABUN
| AND ELEMENT_CD = '1070';
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| lv_cpn303.ITAX_MON := 0;
| END;
| -- 주민세총액
| BEGIN
| SELECT NVL(RESULT_MON,0)
| INTO lv_cpn303.RTAX_MON
| FROM TCPN205
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| AND SABUN = C_DATA.SABUN
| AND ELEMENT_CD = '1080';
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| lv_cpn303.RTAX_MON := 0;
| END;
| 
| -- 고용보험총액, 국민연금총액, 건강보험총액
| ln_ei_mon := 0;
| ln_add_ei_mon := 0;
| ln_add_ei_mon2 := 0;
| 
| DECLARE
| CURSOR CSR_MON IS
| SELECT A.ATTRIBUTE_8, A.ELEMENT_CD, SUM(B.RESULT_MON) AS MON
| FROM TCPN011 A, TCPN205 B
| WHERE A.ENTER_CD   = B.ENTER_CD
| AND A.ELEMENT_CD = B.ELEMENT_CD
| AND B.ENTER_CD   = P_ENTER_CD
| AND B.PAY_ACTION_CD = P_PAY_ACTION_CD
| AND B.SABUN      = C_DATA.SABUN
| AND A.ATTRIBUTE_8 IN ('C010_01','C010_03','C010_05')
| GROUP BY A.ATTRIBUTE_8, A.ELEMENT_CD;
| BEGIN
| FOR C_MON IN CSR_MON LOOP
| EXIT WHEN CSR_MON%NOTFOUND;
| IF C_MON.ATTRIBUTE_8 = 'C010_05' THEN -- 고용보험
| lv_cpn303.EI_EE_MON := NVL(lv_cpn303.EI_EE_MON,0) + C_MON.MON;
| ELSIF C_MON.ATTRIBUTE_8 = 'C010_01' THEN -- 국민연금
| lv_cpn303.NP_EE_MON := NVL(lv_cpn303.NP_EE_MON,0) + C_MON.MON;
| ELSIF C_MON.ATTRIBUTE_8 = 'C010_03' THEN -- 건강보험
| lv_cpn303.HI_EE_MON := NVL(lv_cpn303.HI_EE_MON,0) + C_MON.MON;
| IF C_MON.ELEMENT_CD = '1010' THEN -- 노인장기요양보험
| ln_add_ei_mon2 := nvl(ln_add_ei_mon2,0) + C_MON.MON;
| ELSIF C_MON.ELEMENT_CD = 'DA110' THEN -- 정산분
| ln_add_ei_mon := nvl(ln_add_ei_mon,0) + C_MON.MON;
| ELSE
| ln_ei_mon := nvl(ln_ei_mon,0) + C_MON.MON;
| END IF;
| END IF;
| END LOOP;
| END;
| 
| 
| --            END IF;
| 
| -- 월급여실적 등록
| BEGIN
| INSERT INTO TCPN303
| (
| ENTER_CD, PAY_ACTION_CD, SABUN, NAME,
| RES_NO ,  EMP_YMD, GEMP_YMD,
| BUSINESS_PLACE_CD, ORG_CD,JIKGUB_CD, JIKWEE_CD, JIKCHAK_CD,
| TOT_EARNING_MON, EX_TOT_MON,
| NOTAX_TOT_MON, NOTAX_ABROAD_MON, NOTAX_WORK_MON,
| NOTAX_FOOD_MON, NOTAX_CAR_MON, NOTAX_ETC_MON, NOTAX_FORN_MON,
| NOTAX_BABY_MON, NOTAX_STUDY_MON,
| TAXIBLE_EARN_MON, INCOME_DED_MON, INCOME_MON,
| TOT_MAN_DED_MON, TOT_SPC_DED_MON, TAX_BASE_MON,
| CAL_TAX_MON, INCTAX_DED_MON,
| ITAX_MON, RTAX_MON, TOT_DED_MON, PAYMENT_MON,
| EI_EE_MON, NP_EE_MON, HI_EE_MON,
| CHKDATE, CHKID
| )
| VALUES
| (
| P_ENTER_CD, P_PAY_ACTION_CD, C_DATA.SABUN, C_DATA.NAME,
| (SELECT RES_NO FROM THRM100 WHERE SABUN = C_DATA.SABUN AND ENTER_CD=P_ENTER_CD),
| (SELECT EMP_YMD FROM THRM100 WHERE SABUN = C_DATA.SABUN AND ENTER_CD=P_ENTER_CD),
| (SELECT GEMP_YMD FROM THRM100 WHERE SABUN = C_DATA.SABUN AND ENTER_CD=P_ENTER_CD),
| C_DATA.BUSINESS_PLACE_CD,
| F_COM_GET_ORG_CD(P_ENTER_CD, C_DATA.SABUN, C_DATA.PAYMENT_YMD),
| F_COM_GET_JIKGUB_CD(P_ENTER_CD, C_DATA.SABUN, C_DATA.PAYMENT_YMD),
| F_COM_GET_JIKWEE_CD(P_ENTER_CD, C_DATA.SABUN, C_DATA.PAYMENT_YMD),
| F_COM_GET_JIKCHAK_CD(P_ENTER_CD, C_DATA.SABUN, C_DATA.PAYMENT_YMD),
| C_DATA.TOT_EARNING_MON,
| lv_cpn303.EX_TOT_MON,
| C_DATA.NOTAX_TOT_MON,
| '',--C_DATA.NOTAX_ABROAD_MON,
| '', --C_DATA.NOTAX_WORK_MON,
| C_DATA.NOTAX_FOOD_MON,
| '', --C_DATA.NOTAX_CAR_MON,
| '', --C_DATA.NOTAX_ETC_MON,
| '', --C_DATA.NOTAX_FORN_MON,
| C_DATA.NOTAX_BABY_MON,
| '', --C_DATA.NOTAX_STUDY_MON,
| C_DATA.TAXIBLE_EARN_MON,
| '', --C_DATA.INCOME_DED_MON,
| '', --C_DATA.INCOME_MON,
| '', --C_DATA.TOT_MAN_DED_MON,
| '', --C_DATA.TOT_SPC_DED_MON,
| '', --C_DATA.TAX_BASE_MON,
| '', --C_DATA.CAL_TAX_MON,
| '', --C_DATA.INCTAX_DED_MON,
| lv_cpn303.ITAX_MON, lv_cpn303.RTAX_MON, C_DATA.TOT_DED_MON, C_DATA.PAYMENT_MON,
| lv_cpn303.EI_EE_MON, lv_cpn303.NP_EE_MON, lv_cpn303.HI_EE_MON,
| SYSDATE, P_CHKID
| );
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := SQLCODE;
| P_SQLERRM := C_DATA.PAY_YM || ':' ||  C_DATA.SABUN || '월급여실적 Insert Error ==> ' || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'50',P_SQLERRM, P_CHKID);
| END;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := SQLCODE;
| P_SQLERRM := C_DATA.PAY_YM || ':' ||  C_DATA.SABUN || '월급여실적(공제총액, 실지급액) 등록 시 Error ==> ' || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'60',P_SQLERRM, P_CHKID);
| END;
| 
| END LOOP;
| 
| 
| 
| -- 작업상태 작업완료(J) 등록
| BEGIN
| UPDATE TCPN203
| SET PAY_PEOPLE_STATUS = 'J'
| WHERE ENTER_CD = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := SQLCODE;
| P_SQLERRM := '급여대상자 작업Status Update Error ==> ' || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'110',P_SQLERRM, P_CHKID);
| END;
| 
| 
| BEGIN
| 
| DELETE
| FROM TCPN981
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD;
| 
| INSERT INTO TCPN981
| (
| ENTER_CD,  PAY_ACTION_CD,  CLOSE_YN, chkdate, chkid
| )
| VALUES
| (
| P_ENTER_CD,P_PAY_ACTION_CD, 'Y', SYSDATE, P_CHKID
| );
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| p_sqlcode := TO_CHAR(SQLCODE);
| p_sqlerrm := '20 ==> TCPN983 INSERT Error' || chr(10) || SQLERRM;
| END;
| 
| -- 복리후생마감관리 등록
| /*
| BEGIN
| DELETE
| FROM TBEN991
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD               = lv_cpn201.PAY_ACTION_CD;
| 
| INSERT INTO TBEN991
| SELECT A.ENTER_CD,lv_cpn201.PAY_ACTION_CD,A.CODE,'10005','1',NULL,SYSDATE,P_CHKID,lv_cpn201.PAY_YM
| FROM TSYS005 A
| WHERE ENTER_CD = P_ENTER_CD
| AND GRCODE_CD = 'S90001'
| AND USE_YN = 'Y'
| ORDER BY A.SEQ
| ;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| p_sqlcode := TO_CHAR(SQLCODE);
| p_sqlerrm := '20 ==> TCPN983 INSERT Error' || chr(10) || SQLERRM;
| END;
| */
| --
| COMMIT;
| --
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := P_SQLCODE;
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, g_biz_cd, lv_object_nm,'100',P_SQLERRM, P_CHKID);
| END P_CPN_MTH_PUMP;
| -------------------------
| 
| END PKG_CPN_PUMP_ETC_API;
| /
```
---
# PKG_MIG_EHR.PCK

```diff
| 
| CREATE OR REPLACE  PACKAGE "EHR_NG"."PKG_MIG_EHR" IS
| 
| -- Author  : sungmin.choe
| -- Created : 2021-09-14 오전 1:40:50
| -- Purpose : 신청서 Mig용
| 
| -- 근태신청 (THRI103)
| PROCEDURE P_THRI103(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2);
| 
| 
| -- 콘도신청 (TBEN491)
| PROCEDURE P_TBEN491(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2);
| 
| -- 동호회신청 (TBEN501)
| PROCEDURE P_TBEN501(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2);
| 
| -- 시간외근무신청 (TTIM601)
| PROCEDURE P_TTIM601(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2);
| 
| -- 학자금신청 (TBEN751)
| PROCEDURE P_TBEN751(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2);
| 
| -- 위탁보험료신청 (TBEN757)
| PROCEDURE P_TBEN757(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2);
| 
| -- 경조금신청 (TBEN471)
| PROCEDURE P_TBEN471(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2);
| 
+ 
+ -- 대출신청 (TBEN623)
+ PROCEDURE P_TBEN623(P_ENTER_CD IN VARCHAR2
+ ,P_SABUN    IN VARCHAR2);
+ 
+ 
+ -- 대출금상환신청 (TBEN627)
+ PROCEDURE P_TBEN627(P_ENTER_CD IN VARCHAR2
+ ,P_SABUN    IN VARCHAR2);
+ 
| END PKG_MIG_EHR;
| /
| CREATE OR REPLACE  PACKAGE BODY "EHR_NG"."PKG_MIG_EHR" IS
| -- 근태신청 (THRI103)
| /*
| 1. TRG_HRI_103 Trigger Disable 먼저 처리해야함
| 2. Detail Table Data 보정
| UPDATE TTIM405 A SET
| A.APPL_SEQ = A.APPL_SEQ * -1
| WHERE  CHKID = 'MIG'
| */
| PROCEDURE P_THRI103(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2) IS
| X_TOTAL_CNT  NUMBER DEFAULT 0;
| X_SUCC_CNT   NUMBER DEFAULT 0;
| X_FAIL_CNT   NUMBER DEFAULT 0;
| BEGIN
| FOR REC IN (SELECT A.ENTER_CD
| ,A.APPL_SEQ
| ,'근태신청' AS TITLE
| ,'22' AS APPL_CD
| ,A.S_YMD AS APPL_YMD
| ,A.SABUN AS APPL_SABUN
| ,A.SABUN AS APPL_IN_SABUN
| ,'99' AS APPL_STATUS_CD
| ,A.CHKID                          ,A.CHKDATE
| 
| FROM   TTIM301 A
| WHERE  1=1
| AND  A.CHKID = NVL(P_SABUN, 'MIG_V2')
| --AND appl_seq <= -913418
| --AND  A.ENTER_CD = NVL(P_ENTER_CD, 'NVK')
| )
| LOOP
| BEGIN
| INSERT INTO THRI103
| (ENTER_CD						--회사구분코드(TORG900)
| ,APPL_SEQ           --신청서순번(THRI103)
| ,TITLE              --제목
| ,APPL_CD            --신청서코드(THRI101)
| ,APPL_YMD           --신청일자
| ,APPL_SABUN         --신청자사번
| ,APPL_IN_SABUN      --신청입력자사번
| ,APPL_STATUS_CD     --신청서상태코드(R10010)
| ,CHKDATE            --최종수정시각
| ,CHKID              --최종수정자
| )
| VALUES
| (REC.ENTER_CD						--회사구분코드(TORG900)
| ,REC.APPL_SEQ           --신청서순번(THRI103)
| ,REC.TITLE              --제목
| ,REC.APPL_CD            --신청서코드(THRI101)
| ,REC.APPL_YMD           --신청일자
| ,REC.APPL_SABUN         --신청자사번
| ,REC.APPL_IN_SABUN      --신청입력자사번
| ,REC.APPL_STATUS_CD     --신청서상태코드(R10010)
| ,REC.CHKDATE            --최종수정시각
| ,REC.CHKID              --최종수정자
| );
| 
| X_SUCC_CNT := X_SUCC_CNT + 1;
| EXCEPTION
| WHEN OTHERS THEN
| X_FAIL_CNT := X_FAIL_CNT + 1;
| END;
| 
| X_TOTAL_CNT := X_TOTAL_CNT + 1;
| END LOOP;
| DBMS_OUTPUT.put_line('성공건수 : ' || X_SUCC_CNT);
| DBMS_OUTPUT.put_line('실패건수 : ' || X_FAIL_CNT);
| DBMS_OUTPUT.put_line('총 건수 : ' || X_TOTAL_CNT);
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| 
| END P_THRI103;
| 
| 
| -- 콘도신청 (TBEN491)
| /*
| 1. SEQ 보정 시작
| UPDATE TBEN491 A
| SET    A.APPL_SEQ = MIG_THRI103_SEQ.NEXTVAL * -1
| ,CHKID      = 'MIG';
| 
| 2. TRG_HRI_103 Trigger Disable 먼저 처리해야함
| */
| PROCEDURE P_TBEN491(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2) IS
| X_TOTAL_CNT  NUMBER DEFAULT 0;
| X_SUCC_CNT   NUMBER DEFAULT 0;
| X_FAIL_CNT   NUMBER DEFAULT 0;
| BEGIN
| FOR REC IN (SELECT A.ENTER_CD
| ,A.APPL_SEQ
| ,'리조트신청' AS TITLE
| ,'108' AS APPL_CD
| ,A.SDATE AS APPL_YMD
| ,A.SABUN AS APPL_SABUN
| ,A.SABUN AS APPL_IN_SABUN
| ,'99' AS APPL_STATUS_CD
| ,A.CHKID
| ,A.CHKDATE
| FROM   TBEN491 A
| WHERE  1=1
| AND  A.CHKID = NVL(P_SABUN, 'MIG')
| --AND  A.ENTER_CD = NVL(P_ENTER_CD, 'NVK')
| )
| LOOP
| BEGIN
| INSERT INTO THRI103
| (ENTER_CD						--회사구분코드(TORG900)
| ,APPL_SEQ           --신청서순번(THRI103)
| ,TITLE              --제목
| ,APPL_CD            --신청서코드(THRI101)
| ,APPL_YMD           --신청일자
| ,APPL_SABUN         --신청자사번
| ,APPL_IN_SABUN      --신청입력자사번
| ,APPL_STATUS_CD     --신청서상태코드(R10010)
| ,CHKDATE            --최종수정시각
| ,CHKID              --최종수정자
| )
| VALUES
| (REC.ENTER_CD						--회사구분코드(TORG900)
| ,REC.APPL_SEQ           --신청서순번(THRI103)
| ,REC.TITLE              --제목
| ,REC.APPL_CD            --신청서코드(THRI101)
| ,REC.APPL_YMD           --신청일자
| ,REC.APPL_SABUN         --신청자사번
| ,REC.APPL_IN_SABUN      --신청입력자사번
| ,REC.APPL_STATUS_CD     --신청서상태코드(R10010)
| ,REC.CHKDATE            --최종수정시각
| ,REC.CHKID              --최종수정자
| );
| 
| X_SUCC_CNT := X_SUCC_CNT + 1;
| EXCEPTION
| WHEN OTHERS THEN
| X_FAIL_CNT := X_FAIL_CNT + 1;
| END;
| 
| X_TOTAL_CNT := X_TOTAL_CNT + 1;
| END LOOP;
| DBMS_OUTPUT.put_line('성공건수 : ' || X_SUCC_CNT);
| DBMS_OUTPUT.put_line('실패건수 : ' || X_FAIL_CNT);
| DBMS_OUTPUT.put_line('총 건수 : ' || X_TOTAL_CNT);
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| 
| END P_TBEN491;
| 
| 
- -- 콘도신청 (TBEN501)
- 
+ -- 동호회신청 (TBEN501)
+ 
| /*
| 1. SEQ 보정 시작
| UPDATE TBEN501 A
| SET    A.APPL_SEQ = MIG_THRI103_SEQ.NEXTVAL * -1;
| 
| 2. TRG_HRI_103 Trigger Disable 먼저 처리해야함
| */
| PROCEDURE P_TBEN501(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2) IS
| X_TOTAL_CNT  NUMBER DEFAULT 0;
| X_SUCC_CNT   NUMBER DEFAULT 0;
| X_FAIL_CNT   NUMBER DEFAULT 0;
| BEGIN
| FOR REC IN (SELECT A.ENTER_CD
| ,A.APPL_SEQ
| ,'동호회가입/탈퇴신청' AS TITLE
| ,'710' AS APPL_CD
| ,A.SDATE AS APPL_YMD
| ,A.SABUN AS APPL_SABUN
| ,A.SABUN AS APPL_IN_SABUN
| ,'99' AS APPL_STATUS_CD
| ,A.CHKID
| ,A.CHKDATE
| FROM   TBEN501 A
| WHERE  1=1
| AND  A.CHKID = NVL(P_SABUN, 'MIG')
| --AND  A.ENTER_CD = NVL(P_ENTER_CD, 'NVK')
| )
| LOOP
| BEGIN
| INSERT INTO THRI103
| (ENTER_CD						--회사구분코드(TORG900)
| ,APPL_SEQ           --신청서순번(THRI103)
| ,TITLE              --제목
| ,APPL_CD            --신청서코드(THRI101)
| ,APPL_YMD           --신청일자
| ,APPL_SABUN         --신청자사번
| ,APPL_IN_SABUN      --신청입력자사번
| ,APPL_STATUS_CD     --신청서상태코드(R10010)
| ,CHKDATE            --최종수정시각
| ,CHKID              --최종수정자
| )
| VALUES
| (REC.ENTER_CD						--회사구분코드(TORG900)
| ,REC.APPL_SEQ           --신청서순번(THRI103)
| ,REC.TITLE              --제목
| ,REC.APPL_CD            --신청서코드(THRI101)
| ,REC.APPL_YMD           --신청일자
| ,REC.APPL_SABUN         --신청자사번
| ,REC.APPL_IN_SABUN      --신청입력자사번
| ,REC.APPL_STATUS_CD     --신청서상태코드(R10010)
| ,REC.CHKDATE            --최종수정시각
| ,REC.CHKID              --최종수정자
| );
| 
| X_SUCC_CNT := X_SUCC_CNT + 1;
| EXCEPTION
| WHEN OTHERS THEN
| X_FAIL_CNT := X_FAIL_CNT + 1;
| END;
| 
| X_TOTAL_CNT := X_TOTAL_CNT + 1;
| END LOOP;
| DBMS_OUTPUT.put_line('성공건수 : ' || X_SUCC_CNT);
| DBMS_OUTPUT.put_line('실패건수 : ' || X_FAIL_CNT);
| DBMS_OUTPUT.put_line('총 건수 : ' || X_TOTAL_CNT);
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| 
| END P_TBEN501;
| 
| -- 시간외근무신청 (P_TTIM601)
| /*
| 1. SEQ 보정 시작
| UPDATE TTIM601 A
| SET    A.APPL_SEQ = MIG_THRI103_SEQ.NEXTVAL * -1; --신규 Data인경우
| SET    A.APPL_SEQ = A.APPL_SEQ * -1 --MIG Data인경우
| WHERE  A.CHKID = 'MIG'
| 
| 2. TRG_HRI_103 Trigger Disable 먼저 처리해야함
| */
| PROCEDURE P_TTIM601(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2) IS
| X_TOTAL_CNT  NUMBER DEFAULT 0;
| X_SUCC_CNT   NUMBER DEFAULT 0;
| X_FAIL_CNT   NUMBER DEFAULT 0;
| BEGIN
| FOR REC IN (SELECT A.ENTER_CD
| ,A.APPL_SEQ
| ,'연장근무사전신청' AS TITLE
| ,'110' AS APPL_CD
| ,A.YMD AS APPL_YMD
| ,A.SABUN AS APPL_SABUN
| ,A.SABUN AS APPL_IN_SABUN
| ,'99' AS APPL_STATUS_CD
| ,A.CHKID
| ,A.CHKDATE
| FROM   TTIM601 A
| WHERE  1=1
| --AND  A.CHKID = NVL(P_SABUN, 'MIG')
| --AND  A.ENTER_CD = NVL(P_ENTER_CD, 'NVK')
| )
| LOOP
| BEGIN
| INSERT INTO THRI103
| (ENTER_CD						--회사구분코드(TORG900)
| ,APPL_SEQ           --신청서순번(THRI103)
| ,TITLE              --제목
| ,APPL_CD            --신청서코드(THRI101)
| ,APPL_YMD           --신청일자
| ,APPL_SABUN         --신청자사번
| ,APPL_IN_SABUN      --신청입력자사번
| ,APPL_STATUS_CD     --신청서상태코드(R10010)
| ,CHKDATE            --최종수정시각
| ,CHKID              --최종수정자
| )
| VALUES
| (REC.ENTER_CD						--회사구분코드(TORG900)
| ,REC.APPL_SEQ           --신청서순번(THRI103)
| ,REC.TITLE              --제목
| ,REC.APPL_CD            --신청서코드(THRI101)
| ,REC.APPL_YMD           --신청일자
| ,REC.APPL_SABUN         --신청자사번
| ,REC.APPL_IN_SABUN      --신청입력자사번
| ,REC.APPL_STATUS_CD     --신청서상태코드(R10010)
| ,REC.CHKDATE            --최종수정시각
| ,REC.CHKID              --최종수정자
| );
| 
| X_SUCC_CNT := X_SUCC_CNT + 1;
| EXCEPTION
| WHEN OTHERS THEN
| X_FAIL_CNT := X_FAIL_CNT + 1;
| END;
| 
| X_TOTAL_CNT := X_TOTAL_CNT + 1;
| END LOOP;
| DBMS_OUTPUT.put_line('성공건수 : ' || X_SUCC_CNT);
| DBMS_OUTPUT.put_line('실패건수 : ' || X_FAIL_CNT);
| DBMS_OUTPUT.put_line('총 건수 : ' || X_TOTAL_CNT);
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| 
| END P_TTIM601;
| 
| -- 학자금신청 (TBEN751)
| /*
| 1. SEQ 보정 시작
| UPDATE TBEN751 A
| SET    A.APPL_SEQ = MIG_THRI103_SEQ.NEXTVAL * -1;
| 
| 2. TRG_HRI_103 Trigger Disable 먼저 처리해야함
| */
| PROCEDURE P_TBEN751(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2) IS
| X_TOTAL_CNT  NUMBER DEFAULT 0;
| X_SUCC_CNT   NUMBER DEFAULT 0;
| X_FAIL_CNT   NUMBER DEFAULT 0;
| BEGIN
| FOR REC IN (SELECT A.ENTER_CD
| ,A.APPL_SEQ
| ,'학자금' AS TITLE
| ,'103' AS APPL_CD
| ,SUBSTR(A.PAYMENT_YMD,1,6) ||'01' AS APPL_YMD
| ,A.SABUN AS APPL_SABUN
| ,A.SABUN AS APPL_IN_SABUN
| ,'99' AS APPL_STATUS_CD
| ,A.CHKID
| ,A.CHKDATE
| FROM   TBEN751 A
| WHERE  1=1
| AND  A.CHKID = NVL(P_SABUN, 'MIG')
| --AND  A.ENTER_CD = NVL(P_ENTER_CD, 'NVK')
| )
| LOOP
| BEGIN
| INSERT INTO THRI103
| (ENTER_CD						--회사구분코드(TORG900)
| ,APPL_SEQ           --신청서순번(THRI103)
| ,TITLE              --제목
| ,APPL_CD            --신청서코드(THRI101)
| ,APPL_YMD           --신청일자
| ,APPL_SABUN         --신청자사번
| ,APPL_IN_SABUN      --신청입력자사번
| ,APPL_STATUS_CD     --신청서상태코드(R10010)
| ,CHKDATE            --최종수정시각
| ,CHKID              --최종수정자
| )
| VALUES
| (REC.ENTER_CD						--회사구분코드(TORG900)
| ,REC.APPL_SEQ           --신청서순번(THRI103)
| ,REC.TITLE              --제목
| ,REC.APPL_CD            --신청서코드(THRI101)
| ,REC.APPL_YMD           --신청일자
| ,REC.APPL_SABUN         --신청자사번
| ,REC.APPL_IN_SABUN      --신청입력자사번
| ,REC.APPL_STATUS_CD     --신청서상태코드(R10010)
| ,REC.CHKDATE            --최종수정시각
| ,REC.CHKID              --최종수정자
| );
| 
| X_SUCC_CNT := X_SUCC_CNT + 1;
| EXCEPTION
| WHEN OTHERS THEN
| X_FAIL_CNT := X_FAIL_CNT + 1;
| END;
| 
| X_TOTAL_CNT := X_TOTAL_CNT + 1;
| END LOOP;
| DBMS_OUTPUT.put_line('성공건수 : ' || X_SUCC_CNT);
| DBMS_OUTPUT.put_line('실패건수 : ' || X_FAIL_CNT);
| DBMS_OUTPUT.put_line('총 건수 : ' || X_TOTAL_CNT);
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| 
| END P_TBEN751;
| 
| -- 위탁보험료신청 (TBEN757)
| /*
| 1. SEQ 보정 시작
| UPDATE TBEN757 A
| SET    A.APPL_SEQ = MIG_THRI103_SEQ.NEXTVAL * -1;
| 
| 2. TRG_HRI_103 Trigger Disable 먼저 처리해야함
| */
| PROCEDURE P_TBEN757(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2) IS
| X_TOTAL_CNT  NUMBER DEFAULT 0;
| X_SUCC_CNT   NUMBER DEFAULT 0;
| X_FAIL_CNT   NUMBER DEFAULT 0;
| BEGIN
| FOR REC IN (SELECT A.ENTER_CD
| ,A.APPL_SEQ
| ,'위탁보육료신청' AS TITLE
| ,'321' AS APPL_CD
| ,PAY_SDATE AS APPL_YMD
| ,A.SABUN AS APPL_SABUN
| ,A.SABUN AS APPL_IN_SABUN
| ,'99' AS APPL_STATUS_CD
| ,A.CHKID
| ,A.CHKDATE
| FROM   TBEN757 A
| WHERE  1=1
| AND  A.CHKID = NVL(P_SABUN, 'MIG')
| --AND  A.ENTER_CD = NVL(P_ENTER_CD, 'NVK')
| )
| LOOP
| BEGIN
| INSERT INTO THRI103
| (ENTER_CD						--회사구분코드(TORG900)
| ,APPL_SEQ           --신청서순번(THRI103)
| ,TITLE              --제목
| ,APPL_CD            --신청서코드(THRI101)
| ,APPL_YMD           --신청일자
| ,APPL_SABUN         --신청자사번
| ,APPL_IN_SABUN      --신청입력자사번
| ,APPL_STATUS_CD     --신청서상태코드(R10010)
| ,CHKDATE            --최종수정시각
| ,CHKID              --최종수정자
| )
| VALUES
| (REC.ENTER_CD						--회사구분코드(TORG900)
| ,REC.APPL_SEQ           --신청서순번(THRI103)
| ,REC.TITLE              --제목
| ,REC.APPL_CD            --신청서코드(THRI101)
| ,REC.APPL_YMD           --신청일자
| ,REC.APPL_SABUN         --신청자사번
| ,REC.APPL_IN_SABUN      --신청입력자사번
| ,REC.APPL_STATUS_CD     --신청서상태코드(R10010)
| ,REC.CHKDATE            --최종수정시각
| ,REC.CHKID              --최종수정자
| );
| 
| X_SUCC_CNT := X_SUCC_CNT + 1;
| EXCEPTION
| WHEN OTHERS THEN
| X_FAIL_CNT := X_FAIL_CNT + 1;
| END;
| 
| X_TOTAL_CNT := X_TOTAL_CNT + 1;
| END LOOP;
| DBMS_OUTPUT.put_line('성공건수 : ' || X_SUCC_CNT);
| DBMS_OUTPUT.put_line('실패건수 : ' || X_FAIL_CNT);
| DBMS_OUTPUT.put_line('총 건수 : ' || X_TOTAL_CNT);
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| 
| END P_TBEN757;
| 
| --경조금신청 (TBEN471)
| /*
| 1. SEQ 보정 시작
| UPDATE TBEN471 A
| SET    A.APPL_SEQ = MIG_THRI103_SEQ.NEXTVAL * -1;
| 
| 2. TRG_HRI_103 Trigger Disable 먼저 처리해야함
| */
| PROCEDURE P_TBEN471(P_ENTER_CD IN VARCHAR2
| ,P_SABUN    IN VARCHAR2) IS
| X_TOTAL_CNT  NUMBER DEFAULT 0;
| X_SUCC_CNT   NUMBER DEFAULT 0;
| X_FAIL_CNT   NUMBER DEFAULT 0;
| BEGIN
| FOR REC IN (SELECT A.ENTER_CD
| ,A.APPL_SEQ
| ,'경조금' AS TITLE
| ,'104' AS APPL_CD
| ,OCC_YMD AS APPL_YMD
| ,A.SABUN AS APPL_SABUN
| ,A.SABUN AS APPL_IN_SABUN
| ,'99' AS APPL_STATUS_CD
| ,A.CHKID
| ,A.CHKDATE
| FROM   TBEN471 A
| WHERE  1=1
| AND  A.CHKID = NVL(P_SABUN, 'MIG')
| --AND  A.ENTER_CD = NVL(P_ENTER_CD, 'NVK')
| )
| LOOP
| BEGIN
| INSERT INTO THRI103
| (ENTER_CD						--회사구분코드(TORG900)
| ,APPL_SEQ           --신청서순번(THRI103)
| ,TITLE              --제목
| ,APPL_CD            --신청서코드(THRI101)
| ,APPL_YMD           --신청일자
| ,APPL_SABUN         --신청자사번
| ,APPL_IN_SABUN      --신청입력자사번
| ,APPL_STATUS_CD     --신청서상태코드(R10010)
| ,CHKDATE            --최종수정시각
| ,CHKID              --최종수정자
| )
| VALUES
| (REC.ENTER_CD						--회사구분코드(TORG900)
| ,REC.APPL_SEQ           --신청서순번(THRI103)
| ,REC.TITLE              --제목
| ,REC.APPL_CD            --신청서코드(THRI101)
| ,REC.APPL_YMD           --신청일자
| ,REC.APPL_SABUN         --신청자사번
| ,REC.APPL_IN_SABUN      --신청입력자사번
| ,REC.APPL_STATUS_CD     --신청서상태코드(R10010)
| ,REC.CHKDATE            --최종수정시각
| ,REC.CHKID              --최종수정자
| );
| 
| X_SUCC_CNT := X_SUCC_CNT + 1;
| EXCEPTION
| WHEN OTHERS THEN
| X_FAIL_CNT := X_FAIL_CNT + 1;
| END;
| 
| X_TOTAL_CNT := X_TOTAL_CNT + 1;
| END LOOP;
| DBMS_OUTPUT.put_line('성공건수 : ' || X_SUCC_CNT);
| DBMS_OUTPUT.put_line('실패건수 : ' || X_FAIL_CNT);
| DBMS_OUTPUT.put_line('총 건수 : ' || X_TOTAL_CNT);
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| 
| END P_TBEN471;
| 
+ 
+ --대출금신청 (TBEN623)
+ /*
+ 1. SEQ 보정 시작
+ UPDATE TBEN623 A
+ SET    A.APPL_SEQ = MIG_THRI103_SEQ.NEXTVAL * -1;
+ 
+ 2. TRG_HRI_103 Trigger Disable 먼저 처리해야함
+ */
+ PROCEDURE P_TBEN623(P_ENTER_CD IN VARCHAR2
+ ,P_SABUN    IN VARCHAR2) IS
+ X_TOTAL_CNT  NUMBER DEFAULT 0;
+ X_SUCC_CNT   NUMBER DEFAULT 0;
+ X_FAIL_CNT   NUMBER DEFAULT 0;
+ BEGIN
+ FOR REC IN (SELECT A.ENTER_CD
+ ,A.APPL_SEQ
+ ,'대출신청' AS TITLE
+ ,'101' AS APPL_CD
+ ,LOAN_REQ_YMD AS APPL_YMD
+ ,A.SABUN AS APPL_SABUN
+ ,A.SABUN AS APPL_IN_SABUN
+ ,'99' AS APPL_STATUS_CD
+ ,A.CHKID
+ ,A.CHKDATE
+ FROM   TBEN623 A
+ WHERE  1=1
+ AND  A.CHKID = NVL(P_SABUN, 'MON')
+ --AND  A.ENTER_CD = NVL(P_ENTER_CD, 'NVK')
+ )
+ LOOP
+ BEGIN
+ INSERT INTO THRI103
+ (ENTER_CD						--회사구분코드(TORG900)
+ ,APPL_SEQ           --신청서순번(THRI103)
+ ,TITLE              --제목
+ ,APPL_CD            --신청서코드(THRI101)
+ ,APPL_YMD           --신청일자
+ ,APPL_SABUN         --신청자사번
+ ,APPL_IN_SABUN      --신청입력자사번
+ ,APPL_STATUS_CD     --신청서상태코드(R10010)
+ ,CHKDATE            --최종수정시각
+ ,CHKID              --최종수정자
+ )
+ VALUES
+ (REC.ENTER_CD						--회사구분코드(TORG900)
+ ,REC.APPL_SEQ           --신청서순번(THRI103)
+ ,REC.TITLE              --제목
+ ,REC.APPL_CD            --신청서코드(THRI101)
+ ,REC.APPL_YMD           --신청일자
+ ,REC.APPL_SABUN         --신청자사번
+ ,REC.APPL_IN_SABUN      --신청입력자사번
+ ,REC.APPL_STATUS_CD     --신청서상태코드(R10010)
+ ,REC.CHKDATE            --최종수정시각
+ ,REC.CHKID              --최종수정자
+ );
+ 
+ X_SUCC_CNT := X_SUCC_CNT + 1;
+ EXCEPTION
+ WHEN OTHERS THEN
+ X_FAIL_CNT := X_FAIL_CNT + 1;
+ END;
+ 
+ X_TOTAL_CNT := X_TOTAL_CNT + 1;
+ END LOOP;
+ DBMS_OUTPUT.put_line('성공건수 : ' || X_SUCC_CNT);
+ DBMS_OUTPUT.put_line('실패건수 : ' || X_FAIL_CNT);
+ DBMS_OUTPUT.put_line('총 건수 : ' || X_TOTAL_CNT);
+ EXCEPTION
+ WHEN OTHERS THEN
+ ROLLBACK;
+ 
+ END P_TBEN623;
+ 
+ --대출금상환신청 (TBEN627)
+ /*
+ 1. SEQ 보정 시작
+ UPDATE TBEN627 A
+ SET    A.APPL_SEQ = MIG_THRI103_SEQ.NEXTVAL * -1;
+ 
+ 2. TRG_HRI_103 Trigger Disable 먼저 처리해야함
+ */
+ PROCEDURE P_TBEN627(P_ENTER_CD IN VARCHAR2
+ ,P_SABUN    IN VARCHAR2) IS
+ X_TOTAL_CNT  NUMBER DEFAULT 0;
+ X_SUCC_CNT   NUMBER DEFAULT 0;
+ X_FAIL_CNT   NUMBER DEFAULT 0;
+ BEGIN
+ FOR REC IN (SELECT A.ENTER_CD
+ ,A.APPL_SEQ
+ ,'대출상환신청' AS TITLE
+ ,'102' AS APPL_CD
+ ,REP_YMD AS APPL_YMD
+ ,A.SABUN AS APPL_SABUN
+ ,A.SABUN AS APPL_IN_SABUN
+ ,'99' AS APPL_STATUS_CD
+ ,A.CHKID
+ ,A.CHKDATE
+ FROM   TBEN627 A
+ WHERE  1=1
+ AND  A.CHKID = NVL(P_SABUN, 'MON')
+ --AND  A.ENTER_CD = NVL(P_ENTER_CD, 'NVK')
+ )
+ LOOP
+ BEGIN
+ INSERT INTO THRI103
+ (ENTER_CD						--회사구분코드(TORG900)
+ ,APPL_SEQ           --신청서순번(THRI103)
+ ,TITLE              --제목
+ ,APPL_CD            --신청서코드(THRI101)
+ ,APPL_YMD           --신청일자
+ ,APPL_SABUN         --신청자사번
+ ,APPL_IN_SABUN      --신청입력자사번
+ ,APPL_STATUS_CD     --신청서상태코드(R10010)
+ ,CHKDATE            --최종수정시각
+ ,CHKID              --최종수정자
+ )
+ VALUES
+ (REC.ENTER_CD						--회사구분코드(TORG900)
+ ,REC.APPL_SEQ           --신청서순번(THRI103)
+ ,REC.TITLE              --제목
+ ,REC.APPL_CD            --신청서코드(THRI101)
+ ,REC.APPL_YMD           --신청일자
+ ,REC.APPL_SABUN         --신청자사번
+ ,REC.APPL_IN_SABUN      --신청입력자사번
+ ,REC.APPL_STATUS_CD     --신청서상태코드(R10010)
+ ,REC.CHKDATE            --최종수정시각
+ ,REC.CHKID              --최종수정자
+ );
+ 
+ X_SUCC_CNT := X_SUCC_CNT + 1;
+ EXCEPTION
+ WHEN OTHERS THEN
+ X_FAIL_CNT := X_FAIL_CNT + 1;
+ END;
+ 
+ X_TOTAL_CNT := X_TOTAL_CNT + 1;
+ END LOOP;
+ DBMS_OUTPUT.put_line('성공건수 : ' || X_SUCC_CNT);
+ DBMS_OUTPUT.put_line('실패건수 : ' || X_FAIL_CNT);
+ DBMS_OUTPUT.put_line('총 건수 : ' || X_TOTAL_CNT);
+ EXCEPTION
+ WHEN OTHERS THEN
+ ROLLBACK;
+ 
+ END P_TBEN627;
+ 
| END PKG_MIG_EHR;
| /
```
---
# P_BEN_PAY_DATA_CREATE.PRC

```diff
| 
| CREATE OR REPLACE  PROCEDURE "EHR_NG"."P_BEN_PAY_DATA_CREATE" (
| P_SQLCODE           OUT VARCHAR2, -- ERROR CODE
| P_SQLERRM           OUT VARCHAR2, -- ERROR MESSAGES
| P_CNT               OUT VARCHAR2, -- 복사DATA수
| P_ENTER_CD          IN  VARCHAR2, -- 회사코드
| P_BENEFIT_BIZ_CD    IN  VARCHAR2, -- 복리후생업무구분코드(B10230)
| P_PAY_ACTION_CD     IN  VARCHAR2, -- 급여일자 구분코드
| P_BUSINESS_PLACE_CD IN  VARCHAR2, -- 사업장 구분코드
| P_CHKID             IN  VARCHAR2  -- 수정자
| )
| is
| /********************************************************************************/
| /*                                                                              */
| /*                    (c) Copyright ISU System Inc. 2004                        */
| /*                           All Rights Reserved                                */
| /*                                                                              */
| /********************************************************************************/
| /*  PROCEDURE NAME : P_BEN_PAY_DATA_CREATE                              */
| /*                                                                              */
| /*           마감코드별 복리후생 이력생성                                       */
| /*           10005    : 국민연금 공제자료 생성                                  */
| /*           10007    : 건강보험 공제자료 생성                                  */
| /********************************************************************************/
| /*  [ 참조 TABLE ]                                                              */
| /*      TCPN201 : 급여계산관리(급여일자관리). 급여지급일자(PAYMENT_YMD) 추출    */
| /*      TCPN203 : 급여대상자관리. 급여대상관리자의 SABUN 추출                   */
| /*      TBEN203 : 건강보험변동이력. 급여대상관리자의 건강보험 등급(GRADE) 추출  */
| /*      TBEN001 : 등급별 본인부담액(SELF_MON), 회사부담액(COMP_MON) 추출        */
| /*      TBEN009 : 등급별 추가 및 환급 부담액 추출                               */
| /********************************************************************************/
| /*  [ 생성 TABLE ]                                                              */
| /*                                                                              */
| /*    TBEN205 : 건강보험공제이력                                                */
| /*    TBEN105 : 국민연금공제이력                                                */
| /*        TCPN983 : 급여관련사항마감관리                                        */
| /********************************************************************************/
| /*  [ 삭제 TABLE ]                                                              */
| /*                                                                              */
| /*                                                                              */
| /********************************************************************************/
| /*  [ PRC 개요 ]                                                                */
| /*        < 10007    : 건강보험 공제자료 생성 >                                 */
| /*       건강보험공제자료 생성 조건에 해당하는 기존 자료 DELETE                 */
| /*                                                                              */
| /*       건강보험공제자료 생성 대상 사원 Query                                  */
| /*                해당 사원의 건강보험 등급 Query                               */
| /*          해당 등급의 본인부담액, 회사부담액 Query                            */
| /*          해당 사원의 추가본인부담액, 추가회사부담액 Query                    */
| /*          추가본인부담액에 따른 사회보험공제코드 지정                         */
| /*          건강보험공제이력에 데이터 추가                                      */
| /*       END;                                                                   */
| /*                                                                              */
| /*        < 10005    : 국민연금 공제자료 생성 >                                 */
| /*       국민연금공제자료 생성 조건에 해당하는 기존 자료 DELETE                 */
| /*                                                                              */
| /*       국민연금공제자료 생성 대상 사원 Query                                  */
| /*                해당 사원의 국민연금 등급 Query                               */
| /*          해당 등급의 본인부담액, 회사부담액 Query                            */
| /*          해당 사원의 추가본인부담액, 추가회사부담액 Query                    */
| /*          추가본인부담액에 따른 사회보험공제코드 지정                         */
| /*          국민연금공제이력에 데이터 추가                                      */
| /*       END;                                                                   */
| /*                                                                              */
| /*       급여관련사항마감관리 자료의 처리상태 코드를 작업으로 지정              */
| /*                                                                              */
| /********************************************************************************/
| /*  [ PRC 호출 ]                                                                */
| /*                                                                              */
| /*                                                                              */
| /********************************************************************************/
| /* Date        In Charge       Description                                      */
| /*------------------------------------------------------------------------------*/
| /* 2008-07-22  C.Y.G           Initial Release                                  */
| /********************************************************************************/
| 
| /* Local Variables */
| lv_cpn201          TCPN201%ROWTYPE;
| ln_rcnt            NUMBER := 0;
| lv_sdate           VARCHAR2(08);
| ln_max_seq         NUMBER := 0;
| ln_reward_tot_mon  TBEN203.REWARD_TOT_MON%TYPE; -- 보수월액
| ln_reduction_rate  NUMBER := 0;    -- 건강보험 감면율
| ln_reduction_rate2 NUMBER := 0;    -- 노인장기요양 감면율
| 
| ln_benefit_biz_cd   VARCHAR2(10); --복리후생업무구분코드(B10230)
| 
| ln_add_self_mon    NUMBER := 0;
| ln_add_comp_mon    NUMBER := 0;
| ln_return_self_mon NUMBER := 0;
| ln_return_comp_mon NUMBER := 0;
| ln_add_self_mon2   NUMBER := 0; -- 노인장기요양_본인_추가/환급
| ln_add_comp_mon2   NUMBER := 0; -- 노인장기요양_회사_추가/환급
| 
| ln_mon1            NUMBER := NULL;--건강보험_정산
| ln_mon2            NUMBER := NULL;--요양보험_정산
| ln_mon3            NUMBER := NULL;--건강보험_환급이자
| ln_mon4            NUMBER := NULL;--요양보험_환급이자
| 
| ln_mon5            NUMBER := NULL;
| ln_mon6            NUMBER := NULL;
| ln_mon7            NUMBER := NULL;
| ln_mon9            NUMBER := NULL; --월정급여에 추가적으로 더해질 고용보험분(정산분과 별개)
| 
| lr_ben205            TBEN205%ROWTYPE;  -- 건강보험공제이력
| lr_ben105            TBEN105%ROWTYPE;  -- 국민연금공제이력
| lr_ben305            TBEN305%ROWTYPE;  -- 고용보험공제이력
| 
| ln_loan_cnt        NUMBER := 0;          --대출이력생성수
| ln_jikwee_cnt      NUMBER;               --대상자 여부
| ln_invest_seq      NUMBER;               --대상자 납입횟수
| ln_jikwee_cd       VARCHAR2(10) := NULL; --대상자 직위
| ln_manage_cd       VARCHAR2(10) := NULL; --대상자 사원구분
| ln_jikwee_mon      NUMBER;               --직위별 출자금액
| lv_payment_ymd     VARCHAR2(8) := NULL;
| lv_pay_action_cd   VARCHAR2(50);
| ln_invest_cnt      NUMBER;
| 
| LV_CLOSE_CD        TCPN983.CLOSE_CD%TYPE; -- 마감코드(S90001)
| LV_CLOSE_ST        TCPN983.CLOSE_ST%TYPE; -- 마감상태(S90003)
| 
| lv_updown_type     VARCHAR2(10) := NULL; -- 이자를 계산할 때 끝자리 처리 방법(절상/절사/반올림 중 하나)
| ln_updown_unit     NUMBER := 0;   -- 이자를 계산할 때의 끝자리 단위 (1/10/100/...)
| ln_pay_except_gubun VARCHAR(01) :=NULL;  --지급공제구분
| 
| LV_PAY_CLOSE_YN  VARCHAR2(1); --급여마감상태
| LN_BIGO          VARCHAR2(4000);
| 
| LV_BIZ_CD          TSYS903.BIZ_CD%TYPE := 'BEN';
| LV_OBJECT_NM       TSYS903.OBJECT_NM%TYPE := 'P_BEN_PAY_DATA_CREATE';
| 
| -- 급여기준사업장별 작업
| CURSOR CSR_MAP IS
| SELECT X.MAP_CD AS BUSINESS_PLACE_CD
| FROM TORG109 X
| WHERE X.ENTER_CD = P_ENTER_CD
| AND X.MAP_TYPE_CD = '100' -- 급여기준사업장
| --AND X.MAP_CD='1'
| AND X.MAP_CD LIKE P_BUSINESS_PLACE_CD || '%';
| 
| -- 작업대상자 가져오기
| CURSOR CSR_CPN203 (C_BP_CD IN VARCHAR2) IS
| SELECT A.SABUN AS SABUN, A.ORD_EYMD AS PAYMENT_YMD, B.PAY_CD
| FROM TCPN203 A, TCPN201 B
| WHERE A.ENTER_CD          = P_ENTER_CD
| AND A.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND A.ENTER_CD          = B.ENTER_CD
| AND A.PAY_ACTION_CD     = B.PAY_ACTION_CD
| AND (A.BUSINESS_PLACE_CD = C_BP_CD OR A.BUSINESS_PLACE_CD IS NULL);
| BEGIN
| P_SQLCODE  := NULL;
| P_SQLERRM  := NULL;
| P_CNT      := '0';
| 
| --급여마감여부 확인하기
| BEGIN
| SELECT CLOSE_YN
| INTO LV_PAY_CLOSE_YN
| FROM TCPN981
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| ;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| LV_PAY_CLOSE_YN := 'N';
| WHEN OTHERS        THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := '급여일자코드 : '     || P_PAY_ACTION_CD
| || ' 의 급여마감(TCPN981)여부 검색시 Error =>' || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'10',P_SQLERRM, P_CHKID);
| END;
| 
| 
| --급여가 마감된 경우, 복리후생 마감업무 처리를 할 수 없음.
| IF LV_PAY_CLOSE_YN = 'Y' THEN
| P_SQLCODE  := '999';
| P_SQLERRM  := '해당 급여가 이미 마감되었습니다. 마감된 급여에 대한 마감은 진행할 수 없습니다. 급여 담당자와 해당 급여의 마감여부를 확인해보시기 바랍니다.';
| RETURN;
| END IF;
| 
| /* P_BENEFIT_BIZ_CD (복리후생업무구분코드(B10230))
| 10:국민연금,  15:건강보험, 20:고용보험, 120:귀성여비, 130:주거보조금, 135:이자보조금, 140:자녀학자금, 150:자녀학자금(대학), 180:대출금 */
| 
| -- 급여계산일자 정보가져오기
| lv_cpn201 := F_CPN_GET_201_INFO(P_ENTER_CD, P_PAY_ACTION_CD);
| 
| /* 급여사업장 별 작업 */
| FOR C_MAP IN CSR_MAP LOOP
| 
| BEGIN
| DELETE FROM TBEN777
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| AND BEN_GUBUN     = P_BENEFIT_BIZ_CD
| AND SABUN IN (SELECT X.SABUN
| FROM TCPN203 X
| WHERE X.ENTER_CD = P_ENTER_CD
| AND X.PAY_ACTION_CD = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD);
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := '급여일자코드 : ' || P_PAY_ACTION_CD || ' 복리후생공제이력 테이블(TBEN777) DELETE Error=>' || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'15',P_SQLERRM, P_CHKID);
| RETURN;
| END;
| 
| ln_benefit_biz_cd := P_BENEFIT_BIZ_CD;
| 
| --수당지급신청과 기타지급신청의 경우 신규생성되는 모든 코드를 나열하기 힘드니 급여마감항목관리에서 'Y'로 관리되는 항목은 모두 동일 로직 적용
| BEGIN
| SELECT MAX('ETC_PAY')
| INTO ln_benefit_biz_cd
| FROM TCPN980
| WHERE ENTER_CD      = P_ENTER_CD
| AND (NVL(ETC_PAY_YN, 'N') = 'Y' OR NVL(DEPT_PART_PAY_YN, 'N') ='Y')
| AND BENEFIT_BIZ_CD = P_BENEFIT_BIZ_CD
| ;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| ln_benefit_biz_cd := P_BENEFIT_BIZ_CD;
| END;
| 
| IF ln_benefit_biz_cd IS NULL THEN
| ln_benefit_biz_cd := P_BENEFIT_BIZ_CD;
| END IF;
| 
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm, 'VONG', 'benefit_biz_cd-'||ln_benefit_biz_cd, P_CHKID);
| 
| CASE ln_benefit_biz_cd
| --------------------
| -- 건강보험
| --------------------
| WHEN '15' THEN
| 
| -- 건강보험 공제자료 생성
| FOR c_cpn203 IN csr_cpn203 (C_BP_CD => c_map.BUSINESS_PLACE_CD) LOOP
| 
| BEGIN
| lr_ben205         := NULL;
| ln_max_seq        := 0;
| ln_reward_tot_mon := 0;
| ln_add_self_mon   := 0;
| ln_add_comp_mon   := 0;
| ln_return_self_mon:= 0;
| ln_return_comp_mon:= 0;
| ln_mon1           := 0;
| ln_mon2           := 0;
| LN_MON3           := 0;
| LN_MON4           := 0;
| LN_BIGO           := '';
| 
| /* 사번 및 지급일자를 기준으로 Date Track을 적용
| 이 중에서 MAX(SEQ)인 자료 중에서
| 건강보험불입상태(soc_state_cd)가 정상공제('A10')인 건강보험변동이력의 등급(grade)을 읽어온다.
| TBEN203 : 건강보험 변동 이력
| 등급,보수월액 추출 */
| BEGIN
| SELECT MAX(SEQ),MAX(SDATE)
| INTO ln_max_seq, lv_sdate
| FROM TBEN203
| WHERE enter_cd = p_enter_cd
| AND sabun    = c_cpn203.sabun
| AND sdate    = (SELECT MAX(sdate)
| FROM TBEN203
| WHERE enter_cd = p_enter_cd
| AND lv_cpn201.PAY_YM||'01' BETWEEN sdate AND NVL(edate, '99991231')
| AND sabun = c_cpn203.sabun
| )
| AND TRIM(NVL(soc_state_cd, 'A10')) IN ('A10', 'C40');    -- 정상공제일 경우
| --AND TRIM(NVL(soc_state_cd, 'A10'))  NOT IN ('B10', 'C90','B25');  -- 공제제외,휴직가 아닐 경우
| 
| -- 09.01.07 1일자 입사가 아닐경우 건강보험료를 생성하지 않는다.
| /*IF SUBSTR(lv_sdate,1,6) = lv_cpn201.pay_ym THEN
| IF SUBSTR(lv_sdate,7,2) <> '01' THEN
| ln_max_seq := NULL;
| END IF;
| END IF;*/
| --증권 성과급(기타)의 경우 생성되지 않게 처리
| IF P_ENTER_CD = 'A' AND lv_cpn201.pay_cd='47' THEN
| ln_max_seq := NULL;
| END IF;
| 
| -- 등급, 보수월액, 감면율 정보 구하기
| SELECT GRADE, NVL(REWARD_TOT_MON,0), NVL(REDUCTION_RATE, 0), NVL(REDUCTION_RATE2,0), MON4, MON5
| INTO lr_ben205.grade, ln_reward_tot_mon, ln_reduction_rate, ln_reduction_rate2, lr_ben205.SELF_MON, lr_ben205.SELF_MON2
| FROM TBEN203
| WHERE ENTER_CD = P_ENTER_CD
| AND SABUN    = c_cpn203.SABUN
| AND SEQ      = ln_max_seq
| AND SDATE    = lv_sdate;
| EXCEPTION
| WHEN OTHERS THEN
| lr_ben205.grade := '';
| ln_reward_tot_mon := 0;
| ln_reduction_rate := 0;
| END;
| 
| /* 본인부담액(self_mon) 산출
| 2007.01.01 부로 등급이 아닌 보수월액 * 건강보험요율 산정방식으로 변경 */
| IF lv_cpn201.ORD_EYMD < '20070101' THEN
| -- 본인부담액(self_mon), 회사부담액(comp_mon) 추출
| lr_ben205.self_mon := 0;
| lr_ben205.comp_mon := 0;
| ELSE
| lr_ben205.GRADE := NULL;
| /*변동이력상에 건강보험 공제금액이 없을경우*/
| IF lr_ben205.SELF_MON = 0 OR lr_ben205.SELF_MON IS NULL THEN
| lr_ben205.SELF_MON := F_BEN_HI_SELF_MON(
| P_ENTER_CD
| ,lv_cpn201.ORD_EYMD
| ,ln_reward_tot_mon);
| END IF;
| lr_ben205.COMP_MON := lr_ben205.SELF_MON;
| END IF;
| 
| /* 2008.07.01 부터 시행되는 노인장기요양보험에 대한 Logic 추가  cck */
| IF lv_cpn201.ORD_EYMD >= '20080701' THEN
| 
| lr_ben205.COMP_MON2 := 0;
| 
| /* 산출된 개인보험료에 요율을 적용하여 노인장기요양보험 산출
| 변동이력상에 장기요양보험 공제금액이 없을경우*/
| IF lr_ben205.SELF_MON2 = 0 OR lr_ben205.SELF_MON2 IS NULL THEN
| lr_ben205.SELF_MON2 := NVL(F_BEN_HI_LONGTERMCARE_MON(
| lv_cpn201.ENTER_CD
| ,lv_cpn201.ORD_EYMD
| ,F_BEN_HI_SELF_MON(P_ENTER_CD
| ,lv_cpn201.ORD_EYMD
| ,ln_reward_tot_mon)
| ),0);
| END IF;
| 
| -- 노인장기요양보험 감면율 적용(화면에 로직 적용되여 주석처리)
| 
- --lr_ben205.SELF_MON2 := lr_ben205.SELF_MON2 - ceil((lr_ben205.SELF_MON2 * (nvl(ln_reduction_rate2,0)/100))/10)*10;
- lr_ben205.COMP_MON2 := lr_ben205.SELF_MON2;
- 
+ lr_ben205.SELF_MON2 := lr_ben205.SELF_MON2 - ceil((lr_ben205.SELF_MON2 * (nvl(ln_reduction_rate2,0)/100))/10)*10;
+ --lr_ben205.COMP_MON2 := lr_ben205.SELF_MON2;
+ 
| 
| -- 건강보험 감면율 적용(10단위 절사)
| 
- /*--화면에 로직 적용되어 주석처리
- 
+ --화면에 로직 적용되어 주석처리
+ 
| IF NVL(ln_reduction_rate,0) <> 0 THEN
| lr_ben205.SELF_MON := TRUNC(lr_ben205.SELF_MON * (1 - (ln_reduction_rate / 100)),-1);
| END IF;
| 
- */
- 
+ 
+ 
| lr_ben205.SELF_MON1 := lr_ben205.SELF_MON;
| lr_ben205.COMP_MON1 := lr_ben205.COMP_MON;
| 
| lr_ben205.SELF_MON := lr_ben205.SELF_MON1 + lr_ben205.SELF_MON2;
| lr_ben205.COMP_MON := lr_ben205.COMP_MON1 + lr_ben205.COMP_MON2;
| END IF;
| 
| -- 추가본인부담액, 추가회사부담액, 환급본인부담액, 환금회사부담액 추출
| BEGIN
| 
| SELECT MON5, MON6 --건강보험료_월보험료, 요양보험료_월보험료
| ,MON1, MON2, MON3, MON4
| ,ADD_SELF_MON, ADD_COMP_MON
| ,RETURN_SELF_MON, RETURN_COMP_MON
| ,ADD_SELF_MON2, ADD_COMP_MON2, BIGO
| INTO ln_mon5, ln_mon6
| ,ln_mon1, ln_mon2, ln_mon3, ln_mon4
| ,ln_add_self_mon, ln_add_comp_mon
| ,ln_return_self_mon, ln_return_comp_mon
| ,ln_add_self_mon2, ln_add_comp_mon2, LN_BIGO
| FROM TBEN009
| WHERE ENTER_CD = P_ENTER_CD
| AND BENEFIT_BIZ_CD = '15'
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| AND SABUN = C_CPN203.SABUN;
| 
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| ln_add_self_mon := 0; ln_add_comp_mon := 0;
| ln_return_self_mon := 0; ln_return_comp_mon := 0;
| ln_add_self_mon2 := 0; ln_add_comp_mon2 := 0;
| WHEN OTHERS THEN
| ln_add_self_mon := 0; ln_add_comp_mon := 0;
| ln_return_self_mon := 0; ln_return_comp_mon := 0;
| ln_add_self_mon2 := 0; ln_add_comp_mon2 := 0;
| END;
| 
| /*메뉴가 건강보험 추가/환급관리인데 추가/환급액만 따로 업로드하고 싶어도 월보험료칸에 다시 한번 금액을 확인해서 업로드해야하는 불편함이 있음.
| 그래서 월보험료는 계산되지 않게 주석처리 함. vong 20180620
| --건강보험료_월보험료
| IF ln_mon5 IS NOT NULL THEN
| lr_ben205.SELF_MON1 := ln_mon5;
| END IF;
| 
| --요양보험료_월보험료
| IF ln_mon6 IS NOT NULL THEN
| lr_ben205.SELF_MON2 := ln_mon6;
| END IF;
| */
| IF ln_mon1 IS NOT NULL THEN
| lr_ben205.MON1 := ln_mon1;
| END IF;
| 
| IF ln_mon2 IS NOT NULL THEN
| lr_ben205.MON2 := ln_mon2;
| END IF;
| 
| IF ln_mon3 IS NOT NULL THEN
| lr_ben205.MON3 := ln_mon3;
| END IF;
| 
| IF ln_mon4 IS NOT NULL THEN
| lr_ben205.MON4 := ln_mon4;
| END IF;
| 
| -- 본인 추가/환급부담액 총액
| lr_ben205.add_self_mon := ln_add_self_mon + ln_add_self_mon2;
| 
| -- 본인 추가/환급부담액
| lr_ben205.ADD_SELF_MON1 := ln_add_self_mon;
| 
| -- 본인 노인장기요양보험 추가/환급부담액
| lr_ben205.ADD_SELF_MON2 := ln_add_self_mon2;
| 
| -- 회사 추가/환급부담액 총액
| lr_ben205.add_comp_mon := ln_add_comp_mon + ln_add_comp_mon2;
| 
| -- 회사 추가/환급부담액
| lr_ben205.ADD_COMP_MON1 := ln_add_comp_mon;
| 
| -- 회사 노인장기요양보험 추가/환급부담액
| lr_ben205.ADD_COMP_MON2 := ln_add_comp_mon2;
| 
| -- 최종 추가본인부담액이 0일 경우 사회보험공제처리코드값을 '10'(일반공제)로 한다.
| IF (lr_ben205.add_self_mon = 0) THEN
| lr_ben205.soc_deduct_cd := '10';
| -- 최종 추가본인부담액이 0보다 클 경우 사회보험공제처리코드값을 '25'(환급금발생)로 한다.
| ELSIF (lr_ben205.add_self_mon < 0) THEN
| lr_ben205.soc_deduct_cd := '25';
| -- 최종 추가본인부담액이 0보다 작을 경우 사회보험공제처리코드값을 '20'(추가공제발생)로 한다.
| ELSIF (lr_ben205.add_self_mon > 0) THEN
| lr_ben205.soc_deduct_cd := '20';
| END IF;
| -- 정리된 자료를 건강보험공제이력 테이블에 INSERT한다.
| BEGIN
| 
| IF NOT (lr_ben205.self_mon1 = 0 AND lr_ben205.self_mon2 = 0 AND lr_ben205.ADD_SELF_MON1 = 0 AND lr_ben205.ADD_SELF_MON2 = 0
| AND lr_ben205.MON1 = 0 AND LR_BEN205.MON2 = 0 AND lr_ben205.MON3 = 0 AND LR_BEN205.MON4 = 0) THEN
| 
| BEGIN
| INSERT INTO TBEN777 (
| ENTER_CD --회사구분(TORG900)
| , PAY_ACTION_CD --급여계산코드(TCPN201)
| , SABUN --사원번호
| , BEN_GUBUN --기타복리후생이력생성구분(B10230)
| , SEQ --순번
| , BUSINESS_PLACE_CD --사업장코드(TCPN121)
| , MON1 --금액1
| , MON2 --금액2
| , MON3 --금액3
| , MON4 --금액4
| , MON5 --금액5
| , MON6 --금액6
| , MON7 --금액7
| , MON8 --금액8
| , MON9 --금액9
| , MON10 --금액10
| , MON11 --금액11
| , MON12 --금액12
| , MEMO
| , CHKDATE --최종수정시간
| , CHKID --최종수정자
| )VALUES(
| p_enter_cd
| ,p_pay_action_cd
| ,c_cpn203.sabun
| ,ln_benefit_biz_cd
| ,(SELECT NVL(MAX(TO_NUMBER(SEQ)),0)+1 AS SEQ FROM TBEN777 WHERE ENTER_CD =P_ENTER_CD)
| ,C_MAP.business_place_cd
| ,lr_ben205.self_mon1 -- 1 건강보험료본인
| ,lr_ben205.comp_mon1 -- 2 건강보험료회사
| ,lr_ben205.self_mon2 -- 3 노인장기요양보험본인
| ,lr_ben205.comp_mon2 -- 4 노인장기요양보험회사
| ,lr_ben205.ADD_SELF_MON1 -- 5 건강보험_본인_추가/환급
| ,lr_ben205.ADD_COMP_MON1 -- 6 건강보험_회사_추가/환급
| ,lr_ben205.ADD_SELF_MON2 -- 7 노인장기요양_본인_추가/환급
| ,lr_ben205.ADD_COMP_MON2 -- 8 노인장기요양_회사_추가/환급
| ,lr_ben205.MON1 --9 건강보험_정산
| ,lr_ben205.MON2 --10 요양보험_정산
| ,lr_ben205.MON3 --11 건강보험_환급이자
| ,lr_ben205.MON4 --12 요양보험_환급이자
| ,LN_BIGO
| ,SYSDATE
| ,p_chkid
| );
| EXCEPTION
| WHEN OTHERS THEN
| dbms_output.put_line('Err : ' || sqlcode || ' ' || SQLERRM );
| 
| END;
| ln_rcnt := ln_rcnt + 1;
| END IF;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := '사번=> ' || c_cpn203.sabun || ' 건강보험공제이력 테이블(TBEN205) INSERT Error ..' || chr(10) || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'15',P_SQLERRM, P_CHKID);
| RETURN;
| END;
| END;
| END LOOP  ; -- 건강보험공제이력 END
| --------------------
| --  국민연금
| --------------------
| WHEN '10' THEN
| 
| -- 국민연금 공제자료 생성
| FOR c_cpn203 IN csr_cpn203 (C_BP_CD => C_MAP.BUSINESS_PLACE_CD) LOOP
| BEGIN
| lr_ben105         := NULL;
| ln_reward_tot_mon := 0;
| ln_add_self_mon   := 0;
| ln_add_comp_mon   := 0;
| ln_return_self_mon := 0;
| ln_return_comp_mon := 0;
| LN_BIGO := '';
| 
| /* 사번 및 지급일자를 기준으로 Date Track을 적용하여 국민연금불입상태(soc_state_cd)가 정상공제('A10')인 국민연금변동이력의 등급(grade)을 읽어온다.
| TBEN103 : 국민연금 변동 이력 */
| --등급 추출
| BEGIN
| SELECT MAX(SEQ),MAX(SDATE)
| INTO ln_max_seq, lv_sdate
| FROM TBEN103
| WHERE ENTER_CD  = P_ENTER_CD
| AND SABUN    = c_cpn203.SABUN
| AND SDATE    = (   SELECT MAX(SDATE)
| FROM TBEN103
| WHERE ENTER_CD = P_ENTER_CD
| AND lv_cpn201.PAY_YM||'01' BETWEEN SDATE AND NVL(EDATE, '99991231')
| AND SABUN = c_cpn203.SABUN
| )
| AND NVL(SOC_STATE_CD, 'A10') = 'A10';  -- 정상공제일 경우
| 
| -- 09.01.07 1일자 입사가 아닐경우 국민연금을 생성하지 않는다.
| /*
| IF SUBSTR(lv_sdate,1,6) = lv_cpn201.pay_ym THEN
| IF SUBSTR(lv_sdate,7,2) <> '01' THEN
| ln_max_seq := NULL;
| END IF;
| END IF;
| */
| SELECT GRADE, NVL(REWARD_TOT_MON,0), NVL(MON1,F_BEN_NP_SELF_MON(ENTER_CD,lv_sdate,REWARD_TOT_MON))
| INTO lr_ben105.GRADE, ln_reward_tot_mon, lr_ben105.SELF_MON
| FROM TBEN103
| WHERE ENTER_CD = P_ENTER_CD
| AND SABUN    = c_cpn203.SABUN
| AND SEQ      = ln_max_seq
| AND SDATE    = lv_sdate;
| 
| EXCEPTION
| WHEN OTHERS THEN
| lr_ben105.GRADE := '';
| END;
| 
| /* 본인부담액(self_mon) 산출, 회사부담액(comp_mon) 추출
| 2008.01.01 부로 등급이 아닌 기준소득월액 * 국민연금요율 산정방식으로 변경 */
| IF lv_sdate < '20080101' THEN
| lr_ben105.self_mon := 0;
| lr_ben105.comp_mon := 0;
| 
| ELSE
| lr_ben105.GRADE := NULL;
| lr_ben105.SELF_MON := lr_ben105.SELF_MON;
| lr_ben105.COMP_MON := lr_ben105.SELF_MON;
| END IF;
| 
| -- 추가본인부담액, 추가회사부담액, 환급본인부담액, 환금회사부담액 추출
| BEGIN
| 
| SELECT MON7, ADD_SELF_MON, ADD_COMP_MON, RETURN_SELF_MON, RETURN_COMP_MON, BIGO
| INTO ln_mon7, ln_add_self_mon, ln_add_comp_mon, ln_return_self_mon, ln_return_comp_mon, LN_BIGO
| FROM TBEN009
| WHERE ENTER_CD       = P_ENTER_CD
| AND BENEFIT_BIZ_CD = '10'
| AND PAY_ACTION_CD  = P_PAY_ACTION_CD
| AND SABUN          = c_cpn203.SABUN;
| EXCEPTION
| WHEN OTHERS THEN
| ln_add_self_mon := 0;
| ln_add_comp_mon := 0;
| ln_return_self_mon := 0;
| ln_return_comp_mon := 0;
| END;
| 
| -- 본인부담액 예외처리(ln_mon7)이 NULL이 아닌경우 예외처리
| /*메뉴가 국민연금 추가/환급관리인데 추가/환급액만 따로 업로드하고 싶어도 월보험료칸에 다시 한번 금액을 확인해서 업로드해야하는 불편함이 있음.
| 그래서 월보험료는 계산되지 않게 주석처리 함. 입력시에도 Null이 아닌 '0'이 default이기 때문에 빈 값으로 넣는 것도 불편함.
| --국민연금_월보험료
| IF ln_mon7 IS NOT NULL THEN
| lr_ben105.SELF_MON := ln_mon7;
| END IF;
| */
| 
| /*                  -- 추가본인부담액에서 환급본인부담액을 뺀 결과값을 최종 추가본인부담액(add_self_mon)으로 한다.
| lr_ben105.ADD_SELF_MON := ln_add_self_mon - ln_return_self_mon;
| 
| -- 추가회사부담액에서 환급회사부담액을 뺀 결과값을 최종 추가회사부담액(add_comp_mon)으로 한다.
| lr_ben105.ADD_COMP_MON := ln_add_comp_mon - ln_return_comp_mon;
| 
| -- 최종 추가본인부담액이 0일 경우 사회보험공제처리코드값을 '10'(일반공제)로 한다.
| IF (lr_ben105.ADD_SELF_MON = 0) THEN
| lr_ben105.SOC_DEDUCT_CD := '10';
| -- 최종 추가본인부담액이 0보다 클 경우 사회보험공제처리코드값을 '25'(환급금발생)로 한다.
| ELSIF (lr_ben105.ADD_SELF_MON < 0) THEN
| lr_ben105.SOC_DEDUCT_CD := '25';
| -- 최종 추가본인부담액이 0보다 작을 경우 사회보험공제처리코드값을 '20'(추가공제발생)로 한다.
| ELSIF (lr_ben105.ADD_SELF_MON > 0) THEN
| lr_ben105.SOC_DEDUCT_CD := '20';
| END IF;*/
| 
| -- 정리된 자료를 국민연금공제이력 테이블에 INSERT한다.
| BEGIN
| 
| IF NOT (lr_ben105.SELF_MON = 0 AND lr_ben105.COMP_MON = 0 AND ln_add_self_mon = 0) THEN
| INSERT INTO TBEN777 (
| ENTER_CD --회사구분(TORG900)
| , PAY_ACTION_CD --급여계산코드(TCPN201)
| , SABUN --사원번호
| , BEN_GUBUN --기타복리후생이력생성구분(B10230)
| , SEQ --순번
| , BUSINESS_PLACE_CD --사업장코드(TCPN121)
| , MON1 --금액1
| , MON2 --금액2
| , MON3 --금액3
| --, MON4 --금액4
| , MEMO
| , CHKDATE --최종수정시간
| , CHKID --최종수정자
| )
| VALUES
| (
| P_ENTER_CD
| , P_PAY_ACTION_CD
| , c_cpn203.SABUN
| , ln_benefit_biz_cd
| ,(SELECT NVL(MAX(TO_NUMBER(SEQ)),0)+1 AS SEQ FROM TBEN777 WHERE ENTER_CD =P_ENTER_CD)
| , C_MAP.BUSINESS_PLACE_CD
| , LR_BEN105.SELF_MON -- 1. 국민연금 개인부담금
| , LR_BEN105.COMP_MON -- 2. 국민연금 회사부담금
| , ln_add_self_mon --3.국민연금 정산 개인부담금
| --, LR_BEN105.ADD_COMP_MON --4.국민연금 정산 회사부담금
| , LN_BIGO
| , SYSDATE
| , p_chkid
| );
| 
| ln_rcnt := ln_rcnt + 1;
| 
| END IF;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| p_sqlcode := TO_CHAR(SQLCODE);
| p_sqlerrm := '급여일자코드 : ' || P_PAY_ACTION_CD || ' 사번=> ' || c_cpn203.SABUN || ' 국민연금공제이력 테이블(TBEN105) INSERT Error =>' || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'10',P_SQLERRM, P_CHKID);
| RETURN;
| END;
| END;
| END LOOP  ; -- 국민연금공제이력 END
| 
| --------------------
| -- 고용보험
| --------------------
| WHEN '20' THEN
| 
| -- 건강보험 공제자료 생성
| FOR c_cpn203 IN csr_cpn203 (C_BP_CD => c_map.BUSINESS_PLACE_CD) LOOP
| 
| BEGIN
| lr_ben305         := NULL;
| ln_max_seq        := 0;
| ln_reward_tot_mon := 0;
| ln_add_self_mon   := 0;
| ln_add_comp_mon   := 0;
| ln_return_self_mon:= 0;
| ln_return_comp_mon:= 0;
| ln_mon1           := 0;
| ln_mon9           := 0; --월급여에 고용보험료 외에 추가적으로더 납부 또는 공제해야할 것(연말정산분과 별개의 것)
| LN_BIGO           := '';
| 
| /* 사번 및 지급일자를 기준으로 Date Track을 적용
| 이 중에서 MAX(SEQ)인 자료 중에서
| 건강보험불입상태(soc_state_cd)가 정상공제('A10')인 건강보험변동이력의 등급(grade)을 읽어온다.
| TBEN303 : 고용보험 변동 이력
| 등급,보수월액 추출 */
| BEGIN
| SELECT MAX(SEQ),MAX(SDATE)
| INTO ln_max_seq, lv_sdate
| FROM TBEN303
| WHERE enter_cd = p_enter_cd
| AND sabun     = c_cpn203.sabun
| AND sdate     = (SELECT MAX(sdate)
| FROM TBEN303
| WHERE enter_cd = p_enter_cd
| AND lv_cpn201.PAY_YM||TO_CHAR(LAST_DAY(TO_DATE(lv_cpn201.PAY_YM||'01', 'YYYYMMDD')), 'DD') BETWEEN sdate AND NVL(edate, '99991231')
| AND sabun = c_cpn203.sabun
| )
| AND TRIM(NVL(soc_state_cd, 'A10'))  NOT IN ('C90','B25', 'B90')  -- 공제제외,휴직가 아닐 경우
| ;
| EXCEPTION
| WHEN OTHERS THEN
| ln_reward_tot_mon := 0;
| ln_mon1 := 0;
| END;
| 
| BEGIN
| -- 기준소득월액, 본인부담금 정보 구하기
| SELECT NVL(REWARD_TOT_MON,0), NVL(emp_mon , 0)
| INTO  ln_reward_tot_mon, ln_mon1
| FROM TBEN303
| WHERE ENTER_CD = P_ENTER_CD
| AND SABUN     = c_cpn203.SABUN
| AND SEQ        = ln_max_seq
| AND SDATE     = lv_sdate
| ;
| EXCEPTION
| WHEN OTHERS THEN
| ln_reward_tot_mon := 0;
| ln_mon1 := 0;
| END;
| 
| lr_ben305.SELF_MON := ln_mon1;
| 
| /*변동이력상에 건강보험 공제금액이 없을경우*/
| IF lr_ben305.SELF_MON = 0 OR lr_ben305.SELF_MON IS NULL THEN
| lr_ben305.SELF_MON := F_BEN_EI_SELF_MON(
| P_ENTER_CD
| ,lv_cpn201.ORD_EYMD
| ,ln_reward_tot_mon);
| END IF;
| 
| -- 정산분(환급/추징) 추출
| BEGIN
| 
| SELECT ADD_SELF_MON, BIGO, MON9
| INTO ln_add_self_mon, LN_BIGO, ln_mon9
| FROM TBEN009
| WHERE ENTER_CD          = P_ENTER_CD
| AND BENEFIT_BIZ_CD = '20'
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| AND SABUN              = C_CPN203.SABUN;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| ln_add_self_mon := 0; ln_mon9 := 0;
| WHEN OTHERS THEN
| ln_add_self_mon := 0; ln_mon9 := 0;
| END;
| 
| lr_ben305.ADD_SELF_MON := ln_add_self_mon;
| 
| -- 정리된 자료를 건강보험공제이력 테이블에 INSERT한다.
| BEGIN
| 
| IF NOT (lr_ben305.SELF_MON = 0 AND lr_ben305.ADD_SELF_MON = 0 AND ln_mon9 = 0) THEN
| INSERT INTO TBEN777 (
| ENTER_CD --회사구분(TORG900)
| , PAY_ACTION_CD --급여계산코드(TCPN201)
| , SABUN --사원번호
| , BEN_GUBUN --기타복리후생이력생성구분(B10230)
| , SEQ --순번
| , BUSINESS_PLACE_CD --사업장코드(TCPN121)
| , MON1 --금액1
| , MON2 --금액2
| , MEMO
| , CHKDATE --최종수정시간
| , CHKID --최종수정자
| )VALUES(
| p_enter_cd
| ,p_pay_action_cd
| ,c_cpn203.sabun
| ,ln_benefit_biz_cd
| ,(SELECT NVL(MAX(TO_NUMBER(SEQ)),0)+1 AS SEQ FROM TBEN777 WHERE ENTER_CD =P_ENTER_CD)
| ,C_MAP.business_place_cd
| ,DECODE(NVL(ln_mon9, 0), 0, NVL(lr_ben305.SELF_MON, 0), NVL(ln_mon9, 0)) -- 1 고용보험료 (예외항목에 있으면 예외항목만 반영)
| ,lr_ben305.ADD_SELF_MON -- 2 고용보험정산/환급(추가분)
| ,LN_BIGO
| ,SYSDATE
| ,p_chkid
| );
| 
| ln_rcnt := ln_rcnt + 1;
| END IF;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := '사번=> ' || c_cpn203.sabun || ' 건강보험공제이력 테이블(TBEN205) INSERT Error ..' || chr(10) || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'20',P_SQLERRM, P_CHKID);
| RETURN;
| END;
| END;
| END LOOP  ; -- 건강보험공제이력 END
| 
| 
| /*        --200:학자금
| --------------------
| --  학자금 Sample
| --------------------
| WHEN '200' THEN
| 
| ln_pay_except_gubun := 'P'; --P:지급, E:공제
| BEGIN
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON1, MON2, MON3, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT  ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, MAX(SEQ) + 1, BUSINESS_PLACE_CD, PAY_YMD
| ,CASE WHEN SUM(PAY_MON1) > 100000 THEN 100000
| ELSE SUM(PAY_MON1)
| END
| AS MON1    --유치원보조금(비과세)
| ,SUM(PAY_MON2) AS MON2   --유치원보조금외
| ,CASE WHEN SUM(PAY_MON1) >= 100000 THEN SUM(PAY_MON1) - 100000
| ELSE 0
| END
| AS MON3    --유치원보조금(과세)
| ,MAX(PAY_MEMO) AS PAY_MEMO, MAX(PAY_EXCEPT_GUBUN) AS PAY_EXCEPT_GUBUN, MAX(MEMO) AS MEMO, SYSDATE AS CHKDATE, MAX(CHKID) AS CHKID
| FROM (
| SELECT P_ENTER_CD AS ENTER_CD, P_PAY_ACTION_CD AS PAY_ACTION_CD, A.SABUN, ln_benefit_biz_cd AS BEN_GUBUN
| , C.SEQ, '1' AS BUSINESS_PLACE_CD, NULL AS PAY_YMD
| , A.PAY_AMT AS PAY_MON
| , '' AS PAY_MEMO
| , DECODE(A.SCH_TYPE, 'A01', PAY_AMT, 0) AS PAY_MON1
| , DECODE(A.SCH_TYPE, 'A01', 0, PAY_AMT) AS PAY_MON2
| , ln_pay_except_gubun AS PAY_EXCEPT_GUBUN, '' AS MEMO, SYSDATE AS CHKDATE, P_CHKID AS CHKID
| FROM TBEN744 A
| , (SELECT NVL(MAX(SEQ),0) AS SEQ FROM TBEN777 WHERE ENTER_CD = P_ENTER_CD) C
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.PAY_YYMM = LV_CPN201.PAY_YM
| AND A.MAGAM_YN = 'Y'
| AND (A.PAY_ACTION_CD IS NULL OR A.PAY_ACTION_CD  ='')
| UNION ALL
| SELECT P_ENTER_CD AS ENTER_CD, P_PAY_ACTION_CD AS PAY_ACTION_CD, A.SABUN, ln_benefit_biz_cd AS BEN_GUBUN
| , C.SEQ, '1' AS BUSINESS_PLACE_CD, NULL AS PAY_YMD
| , A.PAY_AMT AS PAY_MON
| , '' AS PAY_MEMO
| , DECODE(A.SCH_TYPE, 'A01', PAY_AMT, 0) AS PAY_MON1
| , DECODE(A.SCH_TYPE, 'A01', 0, PAY_AMT) AS PAY_MON2
| , ln_pay_except_gubun AS PAY_EXCEPT_GUBUN, '' AS MEMO, SYSDATE AS CHKDATE, P_CHKID AS CHKID
| FROM TBEN746 A
| , (SELECT NVL(MAX(SEQ),0) AS SEQ FROM TBEN777 WHERE ENTER_CD = P_ENTER_CD) C
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.PAY_YYMM = LV_CPN201.PAY_YM
| AND A.MAGAM_YN = 'Y'
| AND (A.PAY_ACTION_CD IS NULL OR A.PAY_ACTION_CD  ='')
| )
| GROUP BY ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, PAY_YMD, BUSINESS_PLACE_CD
| ;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'200',P_SQLERRM, P_CHKID);
| END;
| 
| BEGIN
| UPDATE TBEN744    --학자금
| SET PAY_ACTION_CD = P_PAY_ACTION_CD
| WHERE ENTER_CD  = P_ENTER_CD
| AND PAY_YYMM  = LV_CPN201.PAY_YM
| AND MAGAM_YN  = 'Y';
| 
| UPDATE TBEN746    --유치원보조금
| SET PAY_ACTION_CD = P_PAY_ACTION_CD
| WHERE ENTER_CD  = P_ENTER_CD
| AND PAY_YYMM  = LV_CPN201.PAY_YM
| AND MAGAM_YN  = 'Y';
| 
| UPDATE TBEN745    --상신신청(업무구분:200)
| SET PAY_ACTION_CD  = P_PAY_ACTION_CD
| WHERE ENTER_CD       = P_ENTER_CD
| AND BENEFIT_BIZ_CD = '200'
| AND PAY_YYMM       = LV_CPN201.PAY_YM
| AND MAGAM_YN       = 'Y';
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'200_1',P_SQLERRM, P_CHKID);
| END;
| 
| 
| --230:대출금
| --------------------
| --  대출금원금상환 Sample
| --------------------
| WHEN '230' THEN
| 
| ln_pay_except_gubun := 'E'; --P:지급, E:공제
| BEGIN
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON1, MON2,MON3, MON4, MON5, MON6, MON7, MON8, MON9, MON10, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT  ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ + 1, BUSINESS_PLACE_CD, PAY_YMD
| ,PAY_MON1 AS MON1
| ,PAY_MON2 AS MON2
| ,PAY_MON3 AS MON3
| ,PAY_MON4 AS MON4
| ,PAY_MON5 AS MON5
| ,PAY_MON6 AS MON6
| ,PAY_MON7 AS MON7
| ,PAY_MON8 AS MON8
| ,PAY_MON9 AS MON9
| ,PAY_MON10 AS MON10
| ,PAY_MEMO AS PAY_MEMO, PAY_EXCEPT_GUBUN AS PAY_EXCEPT_GUBUN, MEMO AS MEMO, SYSDATE AS CHKDATE, CHKID AS CHKID
| FROM (
| SELECT ENTER_CD, P_PAY_ACTION_CD AS PAY_ACTION_CD, SABUN, ln_benefit_biz_cd AS BEN_GUBUN
| , '1' AS BUSINESS_PLACE_CD, NULL AS PAY_YMD
| , '' AS PAY_MEMO
| , ln_pay_except_gubun AS PAY_EXCEPT_GUBUN, '' AS MEMO, SYSDATE AS CHKDATE, P_CHKID AS CHKID
| ,SUM(DECODE(MON1_YN, 'Y', REP_AMT, 0))AS PAY_MON1
| ,SUM(DECODE(MON2_YN, 'Y', REP_AMT, 0)) AS PAY_MON2
| ,SUM(DECODE(MON3_YN, 'Y', REP_AMT, 0)) AS PAY_MON3
| ,SUM(DECODE(MON4_YN, 'Y', REP_AMT, 0)) AS PAY_MON4
| ,SUM(DECODE(MON5_YN, 'Y', REP_AMT, 0)) AS PAY_MON5
| ,SUM(DECODE(MON6_YN, 'Y', REP_AMT, 0)) AS PAY_MON6
| ,SUM(DECODE(MON7_YN, 'Y', REP_AMT, 0)) AS PAY_MON7
| ,SUM(DECODE(MON8_YN, 'Y', REP_AMT, 0)) AS PAY_MON8
| ,SUM(DECODE(MON9_YN, 'Y', REP_AMT, 0)) AS PAY_MON9
| ,SUM(DECODE(MON10_YN, 'Y', REP_AMT, 0)) AS PAY_MON10
| , (SELECT NVL(MAX(SEQ),0) AS SEQ FROM TBEN777 WHERE ENTER_CD = P_ENTER_CD) SEQ
| FROM (
| SELECT A.ENTER_CD, A.SABUN, A.REP_AMT, B.NOTE1, MON1_YN, MON2_YN, MON3_YN, MON4_YN, MON5_YN, MON6_YN, MON7_YN, MON8_YN, MON9_YN , MON10_YN
| FROM TBEN626 A, TSYS005 B, TBEN005 C
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.PAY_YYMM = LV_CPN201.PAY_YM
| AND A.MAGAM_YN = 'Y'
| AND B.ENTER_CD = A.ENTER_CD
| AND B.GRCODE_CD = 'B50001' --대출종류코드
| AND B.CODE = A.LOAN_CD
| AND C.ENTER_CD = A.ENTER_CD
| AND C.PAY_CD = lv_cpn201.PAY_CD
| AND C.BENEFIT_BIZ_CD = '230' --대출금
| AND (A.PAY_ACTION_CD IS NULL OR A.PAY_ACTION_CD  ='')
| AND B.NOTE1 = C.ELEMENT_CD
| )
| GROUP BY ENTER_CD, SABUN
| )
| ;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'230',P_SQLERRM, P_CHKID);
| END;
| 
| BEGIN
| UPDATE TBEN626
| SET  PAY_ACTION_CD = P_PAY_ACTION_CD
| ,PAY_YN = 'N'
| WHERE ENTER_CD  = P_ENTER_CD
| AND PAY_YYMM  = LV_CPN201.PAY_YM
| AND MAGAM_YN  = 'Y';
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'230_1',P_SQLERRM, P_CHKID);
| END;
| 
| --231:대출이자
| --------------------
| --  대출이자 Sample
| --------------------
| WHEN '231' THEN
| 
| ln_pay_except_gubun := 'E'; --P:지급, E:공제
| BEGIN
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON1, MON2,MON3, MON4, MON5, MON6, MON7, MON8, MON9, MON10, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT  ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ + 1, BUSINESS_PLACE_CD, PAY_YMD
| ,PAY_MON1 AS MON1
| ,PAY_MON2 AS MON2
| ,PAY_MON3 AS MON3
| ,PAY_MON4 AS MON4
| ,PAY_MON5 AS MON5
| ,PAY_MON6 AS MON6
| ,PAY_MON7 AS MON7
| ,PAY_MON8 AS MON8
| ,PAY_MON9 AS MON9
| ,PAY_MON10 AS MON10
| ,PAY_MEMO AS PAY_MEMO, PAY_EXCEPT_GUBUN AS PAY_EXCEPT_GUBUN, MEMO AS MEMO, SYSDATE AS CHKDATE, CHKID AS CHKID
| FROM (
| SELECT ENTER_CD, P_PAY_ACTION_CD AS PAY_ACTION_CD, SABUN, ln_benefit_biz_cd AS BEN_GUBUN
| , '1' AS BUSINESS_PLACE_CD, NULL AS PAY_YMD
| , '' AS PAY_MEMO
| , ln_pay_except_gubun AS PAY_EXCEPT_GUBUN, '' AS MEMO, SYSDATE AS CHKDATE, P_CHKID AS CHKID
| ,SUM(DECODE(MON1_YN, 'Y', INT_AMT, 0))AS PAY_MON1
| ,SUM(DECODE(MON2_YN, 'Y', INT_AMT, 0)) AS PAY_MON2
| ,SUM(DECODE(MON3_YN, 'Y', INT_AMT, 0)) AS PAY_MON3
| ,SUM(DECODE(MON4_YN, 'Y', INT_AMT, 0)) AS PAY_MON4
| ,SUM(DECODE(MON5_YN, 'Y', INT_AMT, 0)) AS PAY_MON5
| ,SUM(DECODE(MON6_YN, 'Y', INT_AMT, 0)) AS PAY_MON6
| ,SUM(DECODE(MON7_YN, 'Y', INT_AMT, 0)) AS PAY_MON7
| ,SUM(DECODE(MON8_YN, 'Y', INT_AMT, 0)) AS PAY_MON8
| ,SUM(DECODE(MON9_YN, 'Y', INT_AMT, 0)) AS PAY_MON9
| ,SUM(DECODE(MON10_YN, 'Y', INT_AMT, 0)) AS PAY_MON10
| , (SELECT NVL(MAX(SEQ),0) AS SEQ FROM TBEN777 WHERE ENTER_CD = P_ENTER_CD) SEQ
| FROM (
| SELECT A.ENTER_CD, A.SABUN, A.INT_AMT, B.NOTE2, MON1_YN, MON2_YN, MON3_YN, MON4_YN, MON5_YN, MON6_YN, MON7_YN, MON8_YN, MON9_YN , MON10_YN
| FROM TBEN627 A, TSYS005 B, TBEN005 C
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.PAY_YYMM = LV_CPN201.PAY_YM
| AND A.MAGAM_YN = 'Y'
| AND B.ENTER_CD = A.ENTER_CD
| AND B.GRCODE_CD = 'B50001' --대출종류코드
| AND B.CODE = A.LOAN_CD
| AND C.ENTER_CD = A.ENTER_CD
| AND C.PAY_CD = lv_cpn201.PAY_CD
| AND (A.PAY_ACTION_CD IS NULL OR A.PAY_ACTION_CD  ='')
| AND C.BENEFIT_BIZ_CD = '231' --대출이자
| AND B.NOTE2 = C.ELEMENT_CD
| )
| GROUP BY ENTER_CD, SABUN
| )
| ;
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'231',P_SQLERRM, P_CHKID);
| END;
| 
| 
| BEGIN
| UPDATE TBEN627
| SET  PAY_ACTION_CD = P_PAY_ACTION_CD
| ,PAY_YN = 'N'
| WHERE ENTER_CD  = P_ENTER_CD
| AND PAY_YYMM  = LV_CPN201.PAY_YM
| AND MAGAM_YN  = 'Y';
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'231_1',P_SQLERRM, P_CHKID);
| END;
| 
| --232:대출인정이자
| --------------------
| --  대출인정이자 Sample
| --------------------
| WHEN '232' THEN
| 
| ln_pay_except_gubun := 'P'; --P:지급, E:공제
| BEGIN
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON1, MON2,MON3, MON4, MON5, MON6, MON7, MON8, MON9, MON10, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT  ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ + 1, BUSINESS_PLACE_CD, PAY_YMD
| ,PAY_MON1 AS MON1
| ,PAY_MON2 AS MON2
| ,PAY_MON3 AS MON3
| ,PAY_MON4 AS MON4
| ,PAY_MON5 AS MON5
| ,PAY_MON6 AS MON6
| ,PAY_MON7 AS MON7
| ,PAY_MON8 AS MON8
| ,PAY_MON9 AS MON9
| ,PAY_MON10 AS MON10
| ,PAY_MEMO AS PAY_MEMO, PAY_EXCEPT_GUBUN AS PAY_EXCEPT_GUBUN, MEMO AS MEMO, SYSDATE AS CHKDATE, CHKID AS CHKID
| FROM (
| SELECT ENTER_CD, P_PAY_ACTION_CD AS PAY_ACTION_CD, SABUN, ln_benefit_biz_cd AS BEN_GUBUN
| , '1' AS BUSINESS_PLACE_CD, NULL AS PAY_YMD
| , '' AS PAY_MEMO
| , ln_pay_except_gubun AS PAY_EXCEPT_GUBUN, '' AS MEMO, SYSDATE AS CHKDATE, P_CHKID AS CHKID
| ,SUM(DECODE(MON1_YN, 'Y', INT_AMT, 0))AS PAY_MON1
| ,SUM(DECODE(MON2_YN, 'Y', INT_AMT, 0)) AS PAY_MON2
| ,SUM(DECODE(MON3_YN, 'Y', INT_AMT, 0)) AS PAY_MON3
| ,SUM(DECODE(MON4_YN, 'Y', INT_AMT, 0)) AS PAY_MON4
| ,SUM(DECODE(MON5_YN, 'Y', INT_AMT, 0)) AS PAY_MON5
| ,SUM(DECODE(MON6_YN, 'Y', INT_AMT, 0)) AS PAY_MON6
| ,SUM(DECODE(MON7_YN, 'Y', INT_AMT, 0)) AS PAY_MON7
| ,SUM(DECODE(MON8_YN, 'Y', INT_AMT, 0)) AS PAY_MON8
| ,SUM(DECODE(MON9_YN, 'Y', INT_AMT, 0)) AS PAY_MON9
| ,SUM(DECODE(MON10_YN, 'Y', INT_AMT, 0)) AS PAY_MON10
| , (SELECT NVL(MAX(SEQ),0) AS SEQ FROM TBEN777 WHERE ENTER_CD = P_ENTER_CD) SEQ
| FROM (
| SELECT A.ENTER_CD, A.SABUN, A.INT_AMT, B.NOTE3, MON1_YN, MON2_YN, MON3_YN, MON4_YN, MON5_YN, MON6_YN, MON7_YN, MON8_YN, MON9_YN , MON10_YN
| FROM TBEN628 A, TSYS005 B, TBEN005 C
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.PAY_YYMM = LV_CPN201.PAY_YM
| AND A.MAGAM_YN = 'Y'
| AND B.ENTER_CD = A.ENTER_CD
| AND B.GRCODE_CD = 'B50001' --대출종류코드
| AND B.CODE = A.LOAN_CD
| AND C.ENTER_CD = A.ENTER_CD
| AND C.PAY_CD = lv_cpn201.PAY_CD
| AND (A.PAY_ACTION_CD IS NULL OR A.PAY_ACTION_CD  ='')
| AND C.BENEFIT_BIZ_CD = '232' --대출인정이자
| AND B.NOTE3 = C.ELEMENT_CD
| )
| GROUP BY ENTER_CD, SABUN
| )
| ;
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'232',P_SQLERRM, P_CHKID);
| END;
| 
| 
| BEGIN
| UPDATE TBEN628
| SET PAY_ACTION_CD = P_PAY_ACTION_CD
| ,PAY_YN = 'N'
| WHERE ENTER_CD  = P_ENTER_CD
| AND PAY_YYMM  = LV_CPN201.PAY_YM
| AND MAGAM_YN  = 'Y';
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'232_1',P_SQLERRM, P_CHKID);
| END;
| */
| --220:의료비
| --------------------
| --  의료비 Sample    2021.09.02  추가
| --------------------
| WHEN '40' THEN
| 
| ln_pay_except_gubun := 'P'; --P:지급, E:공제
| BEGIN
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON1, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT  ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, MAX(SEQ) + 1, BUSINESS_PLACE_CD, PAY_YMD
| ,SUM(PAY_MON) AS MON1
| ,MAX(PAY_MEMO) AS PAY_MEMO, MAX(PAY_EXCEPT_GUBUN) AS PAY_EXCEPT_GUBUN, MAX(MEMO) AS MEMO, SYSDATE AS CHKDATE, MAX(CHKID) AS CHKID
| FROM (
| SELECT P_ENTER_CD AS ENTER_CD, P_PAY_ACTION_CD AS PAY_ACTION_CD, A.SABUN, ln_benefit_biz_cd AS BEN_GUBUN
| , C.SEQ, '1' AS BUSINESS_PLACE_CD, NULL AS PAY_YMD
| , A.pay_mon  AS PAY_MON
| , '' AS PAY_MEMO
| , ln_pay_except_gubun AS PAY_EXCEPT_GUBUN, '' AS MEMO, SYSDATE AS CHKDATE, P_CHKID AS CHKID
| FROM TBEN703 A
| , (SELECT NVL(MAX(SEQ),0) AS SEQ FROM TBEN777 WHERE ENTER_CD = P_ENTER_CD) C
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.pay_ym  = LV_CPN201.PAY_YM
| AND A.close_yn  = 'Y'
| AND EXISTS ( SELECT 1
| FROM TCPN203 X
| WHERE X.ENTER_CD          = P_ENTER_CD
| AND X.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD
| AND X.ENTER_CD          = A.ENTER_CD
| AND X.SABUN             = A.SABUN )
| AND (A.PAY_ACTION_CD IS NULL OR A.PAY_ACTION_CD  ='')
| )
| GROUP BY ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, PAY_YMD, BUSINESS_PLACE_CD
| ;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'220',P_SQLERRM, P_CHKID);
| END;
| 
| BEGIN
| UPDATE TBEN703
| SET PAY_ACTION_CD = P_PAY_ACTION_CD
| WHERE ENTER_CD  = P_ENTER_CD
| AND pay_ym   = LV_CPN201.PAY_YM
| AND close_yn   = 'Y';
| 
| 
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'220_1',P_SQLERRM, P_CHKID);
| END;
| 
| --------------------
| -- 35 : 학자금
| --------------------
| WHEN '35' THEN
| 
| ln_pay_except_gubun := 'P'; --P:지급, E:공제
| 
| -- 대학학자금
| BEGIN
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON1, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT ENTER_CD
| , P_PAY_ACTION_CD AS PAY_ACTION_CD
| , SABUN
| , ln_benefit_biz_cd AS BEN_GUBUN
| , MAX(SEQ) + 1
| , '1' AS BUSINESS_PLACE_CD
| , NULL AS PAY_YMD
| , SUM(PAY_MON) AS MON1
| , '' AS PAY_MEMO
| , ln_pay_except_gubun AS PAY_EXCEPT_GUBUN
| , '' AS MEMO
| , SYSDATE AS CHKDATE
| , P_CHKID AS CHKID
| FROM (
| SELECT A.ENTER_CD
| , A.SABUN
| , (SELECT NVL(MAX(SEQ),0) AS SEQ FROM TBEN777 WHERE ENTER_CD = A.ENTER_CD) SEQ
| , A.PAY_MON
| FROM TBEN751 A
| , TBEN750 B
| , TBEN005 C
| WHERE A.ENTER_CD       = B.ENTER_CD
| AND A.SCH_TYPE_CD    = B.SCH_TYPE_CD
| AND A.FAM_CD         = B.FAM_CD
| AND lv_cpn201.PAYMENT_YMD BETWEEN B.SDATE AND NVL(B.EDATE, '99991231')
| AND C.ENTER_CD       = A.ENTER_CD
| AND C.PAY_CD         = LV_CPN201.PAY_CD
| AND b.sch_type_cd = '500'   -- 대학학자금
| AND C.BENEFIT_BIZ_CD = '35' --학자금
| AND C.ELEMENT_CD     = B.ELEMENT_CD
| AND A.ENTER_CD       = P_ENTER_CD
| AND A.PAY_YM         = LV_CPN201.PAY_YM
| AND A.PAY_MON        > 0
| AND A.CLOSE_YN       = 'Y'
| AND (A.PAY_ACTION_CD IS NULL OR A.PAY_ACTION_CD  ='')
| AND B.ELEMENT_CD IS NOT NULL
| AND EXISTS ( SELECT 1
| FROM TCPN203 X
| WHERE X.ENTER_CD          = P_ENTER_CD
| AND X.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD
| AND X.ENTER_CD          = A.ENTER_CD
| AND X.SABUN             = A.SABUN )
| )
| GROUP BY ENTER_CD, SABUN
| ;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'35',P_SQLERRM, P_CHKID);
| END;
| 
| -- 고교학자금
| BEGIN
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON2, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT ENTER_CD
| , P_PAY_ACTION_CD AS PAY_ACTION_CD
| , SABUN
| , ln_benefit_biz_cd AS BEN_GUBUN
| , MAX(SEQ) + 1
| , '1' AS BUSINESS_PLACE_CD
| , NULL AS PAY_YMD
| , SUM(PAY_MON) AS MON1
| , '' AS PAY_MEMO
| , ln_pay_except_gubun AS PAY_EXCEPT_GUBUN
| , '' AS MEMO
| , SYSDATE AS CHKDATE
| , P_CHKID AS CHKID
| FROM (
| SELECT A.ENTER_CD
| , A.SABUN
| , (SELECT NVL(MAX(SEQ),0) AS SEQ FROM TBEN777 WHERE ENTER_CD = A.ENTER_CD) SEQ
| , A.PAY_MON
| FROM TBEN751 A
| , TBEN750 B
| , TBEN005 C
| WHERE A.ENTER_CD       = B.ENTER_CD
| AND A.SCH_TYPE_CD    = B.SCH_TYPE_CD
| AND A.FAM_CD         = B.FAM_CD
| AND lv_cpn201.PAYMENT_YMD BETWEEN B.SDATE AND NVL(B.EDATE, '99991231')
| AND C.ENTER_CD       = A.ENTER_CD
| AND C.PAY_CD         = LV_CPN201.PAY_CD
| AND b.sch_type_cd = '400'   -- 대학학자금
| AND C.BENEFIT_BIZ_CD = '35' --학자금
| AND C.ELEMENT_CD     = B.ELEMENT_CD
| AND A.ENTER_CD       = P_ENTER_CD
| AND A.PAY_YM         = LV_CPN201.PAY_YM
| AND A.PAY_MON        > 0
| AND A.CLOSE_YN       = 'Y'
| AND (A.PAY_ACTION_CD IS NULL OR A.PAY_ACTION_CD  ='')
| AND B.ELEMENT_CD IS NOT NULL
| AND EXISTS ( SELECT 1
| FROM TCPN203 X
| WHERE X.ENTER_CD          = P_ENTER_CD
| AND X.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD
| AND X.ENTER_CD          = A.ENTER_CD
| AND X.SABUN             = A.SABUN )
| )
| GROUP BY ENTER_CD, SABUN
| ;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'35',P_SQLERRM, P_CHKID);
| END;
| 
| ln_pay_except_gubun := 'E'; --P:지급, E:공제
| -- 학자금공제 (산계처리)
| BEGIN
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON3, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT ENTER_CD
| , P_PAY_ACTION_CD AS PAY_ACTION_CD
| , SABUN
| , ln_benefit_biz_cd AS BEN_GUBUN
| , MAX(SEQ) + 1
| , '1' AS BUSINESS_PLACE_CD
| , NULL AS PAY_YMD
| , SUM(PAY_MON) AS MON1
| , '' AS PAY_MEMO
| , ln_pay_except_gubun AS PAY_EXCEPT_GUBUN
| , '' AS MEMO
| , SYSDATE AS CHKDATE
| , P_CHKID AS CHKID
| FROM (
| SELECT A.ENTER_CD
| , A.SABUN
| , (SELECT NVL(MAX(SEQ),0) AS SEQ FROM TBEN777 WHERE ENTER_CD = A.ENTER_CD) SEQ
| , A.PAY_MON
| FROM TBEN751 A
| , TBEN750 B
| , TBEN005 C
| WHERE A.ENTER_CD       = B.ENTER_CD
| AND A.SCH_TYPE_CD    = B.SCH_TYPE_CD
| AND A.FAM_CD         = B.FAM_CD
| AND lv_cpn201.PAYMENT_YMD BETWEEN B.SDATE AND NVL(B.EDATE, '99991231')
| AND C.ENTER_CD       = A.ENTER_CD
| AND C.PAY_CD         = LV_CPN201.PAY_CD
| AND b.sch_type_cd = '400'   -- 대학학자금
| AND C.BENEFIT_BIZ_CD = '35' --학자금
| AND C.ELEMENT_CD     = B.ELEMENT_CD
| AND A.ENTER_CD       = P_ENTER_CD
| AND A.PAY_YM         = LV_CPN201.PAY_YM
| AND A.PAY_MON        > 0
| AND A.CLOSE_YN       = 'Y'
| AND (A.PAY_ACTION_CD IS NULL OR A.PAY_ACTION_CD  ='')
| AND B.ELEMENT_CD IS NOT NULL
| AND EXISTS ( SELECT 1
| FROM TCPN203 X
| WHERE X.ENTER_CD          = P_ENTER_CD
| AND X.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD
| AND X.ENTER_CD          = A.ENTER_CD
| AND X.SABUN             = A.SABUN )
| )
| GROUP BY ENTER_CD, SABUN
| ;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'35',P_SQLERRM, P_CHKID);
| END;
| 
| BEGIN
| UPDATE TBEN751    --학자금
| SET PAY_ACTION_CD = P_PAY_ACTION_CD
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_YM        = LV_CPN201.PAY_YM
| AND PAY_MON       > 0
| AND CLOSE_YN      = 'Y';
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'35_1',P_SQLERRM, P_CHKID);
| END;
| 
| --------------------
| -- 83 : 유아교육비
| --------------------
| WHEN '83' THEN
| 
| ln_pay_except_gubun := 'P'; --P:지급, E:공제
| 
| BEGIN
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON1, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT ENTER_CD
| , P_PAY_ACTION_CD AS PAY_ACTION_CD
| , SABUN
| , ln_benefit_biz_cd AS BEN_GUBUN
| , MAX(SEQ) + 1
| , '1' AS BUSINESS_PLACE_CD
| , NULL AS PAY_YMD
| , SUM(PAY_MON) AS MON1
| , '' AS PAY_MEMO
| , ln_pay_except_gubun AS PAY_EXCEPT_GUBUN
| , '' AS MEMO
| , SYSDATE AS CHKDATE
| , P_CHKID AS CHKID
| FROM (
| SELECT A.ENTER_CD
| , A.SABUN
| , (SELECT NVL(MAX(SEQ),0) AS SEQ FROM TBEN777 WHERE ENTER_CD = A.ENTER_CD) SEQ
| 
- , A.PAY_MON
- 
+ , 120000 as PAY_MON
+ --    , A.PAY_MON
+ 
| FROM TBEN751 A
| , TBEN750 B
| , TBEN005 C
| WHERE A.ENTER_CD       = B.ENTER_CD
| AND A.SCH_TYPE_CD    = B.SCH_TYPE_CD
| AND A.FAM_CD         = B.FAM_CD
| AND C.PAY_CD         = LV_CPN201.PAY_CD
| AND lv_cpn201.PAYMENT_YMD BETWEEN B.SDATE AND NVL(B.EDATE, '99991231')
| AND C.ENTER_CD       = A.ENTER_CD
| AND C.BENEFIT_BIZ_CD = '83' --학자금
| AND b.sch_type_cd = '100' -- 유아교육비
| AND C.ELEMENT_CD     = B.ELEMENT_CD
| AND A.ENTER_CD       = P_ENTER_CD
| 
- AND A.PAY_YM         = LV_CPN201.PAY_YM
- 
+ --  AND A.PAY_YM         = LV_CPN201.PAY_YM
+ AND LV_CPN201.PAY_YM between substr(A.Payment_Ymd ,1,6) and to_char(add_months(to_date(a.payment_ymd,'yyyymmdd'),12),'yyyymm')
+ 
| AND A.PAY_MON        > 0
| 
- AND A.CLOSE_YN       = 'Y'
- 
+ --  AND A.CLOSE_YN       = 'Y'
+ 
| AND (A.PAY_ACTION_CD IS NULL OR A.PAY_ACTION_CD  ='')
| AND B.ELEMENT_CD IS NOT NULL
| AND EXISTS ( SELECT 1
| FROM TCPN203 X
| WHERE X.ENTER_CD          = P_ENTER_CD
| AND X.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD
| AND X.ENTER_CD          = A.ENTER_CD
| AND X.SABUN             = A.SABUN )
| )
| GROUP BY ENTER_CD, SABUN
| ;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'35',P_SQLERRM, P_CHKID);
| END;
| 
| BEGIN
| UPDATE TBEN751 A   --학자금
| SET PAY_ACTION_CD = P_PAY_ACTION_CD
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_YM        = LV_CPN201.PAY_YM
| AND PAY_MON       > 0
| AND CLOSE_YN      = 'Y'
| AND EXISTS ( SELECT 1
| FROM TCPN203 X
| WHERE X.ENTER_CD          = P_ENTER_CD
| AND X.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD
| AND X.ENTER_CD          = A.ENTER_CD
| AND X.SABUN             = A.SABUN );
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'35_1',P_SQLERRM, P_CHKID);
| END;
| 
| ------------------------------------------------------------------------------------------------------------------------
| --  동호회비(70)  -- 20210902 추가
| ------------------------------------------------------------------------------------------------------------------------
| WHEN '70' THEN
| DELETE FROM TBEN777
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| AND BEN_GUBUN     = P_BENEFIT_BIZ_CD
| AND SABUN IN (SELECT X.SABUN
| FROM TCPN203 X
| WHERE X.ENTER_CD          = P_ENTER_CD
| AND X.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD);
| 
| ln_pay_except_gubun := 'E'; -- 지급: P / 공제: E
| 
| BEGIN
| -- 복리후생 이력생성
| --  INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, APPL_MON, PAYMENT_MON, PAY_EXCEPT_GUBUN, PAY_MEMO, MEMO, ELEMENT_CD, CHKDATE, CHKID)
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON1, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| --  INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, APPL_MON, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT P_ENTER_CD, P_PAY_ACTION_CD, SABUN, P_BENEFIT_BIZ_CD, (SEQ + 1)
| , C_MAP.BUSINESS_PLACE_CD, NULL AS  PAY_YMD, PAY_MON,'', ln_pay_except_gubun
| , '', SYSDATE , P_CHKID
| FROM (
| SELECT A.SABUN, ROW_NUMBER()OVER(PARTITION BY A.ENTER_CD, A.SABUN ORDER BY B.ELEMENT_CD) AS SEQ, SUM(B.CLUB_FEE) AS PAY_MON, B.ELEMENT_CD
| FROM TBEN502 A, TBEN500 B
| WHERE A.ENTER_CD = P_ENTER_CD
| AND lv_cpn201.ORD_EYMD BETWEEN A.SDATE AND NVL(A.EDATE,'99991231')
| 
- AND NVL(A.AGREE_YN, 'N') = 'Y'
- 
+ --  AND NVL(A.AGREE_YN, 'N') = 'Y'
+ 
| AND A.CLUB_SEQ = B.CLUB_SEQ
| AND lv_cpn201.ORD_EYMD BETWEEN B.SDATE AND NVL(B.EDATE,'99991231')
| AND EXISTS ( SELECT 1
| FROM TCPN203 X
| WHERE X.ENTER_CD          = P_ENTER_CD
| AND X.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD
| AND X.ENTER_CD          = A.ENTER_CD
| AND X.SABUN             = A.SABUN )
| GROUP BY A.ENTER_CD, A.SABUN, B.ELEMENT_CD
| );
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := '동호회비 이력생성 시 에러 발생 -->' || NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'70',P_SQLERRM, P_CHKID);
| END;
| ------------------------------------------------------------------------------------------------------------------------
| 
| 
| ------------------------------------------------------------------------------------------------------------------------
| --  경조금공제(81)  -- 20210902 추가
| ------------------------------------------------------------------------------------------------------------------------
| WHEN '81' THEN
| IF P_ENTER_CD = 'UAL' THEN
| DELETE FROM TBEN777
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| AND BEN_GUBUN     = P_BENEFIT_BIZ_CD
| AND SABUN IN (SELECT X.SABUN
| FROM TCPN203 X
| WHERE X.ENTER_CD          = P_ENTER_CD
| AND X.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD);
| 
| ln_pay_except_gubun := 'E'; -- 지급: P / 공제: E
| 
| BEGIN
| -- 복리후생 이력생성
| --  INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, APPL_MON, PAYMENT_MON, PAY_EXCEPT_GUBUN, PAY_MEMO, MEMO, ELEMENT_CD, CHKDATE, CHKID)
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON1, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| --  INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, APPL_MON, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT P_ENTER_CD, P_PAY_ACTION_CD, SABUN, P_BENEFIT_BIZ_CD, (SEQ + 1)
| , C_MAP.BUSINESS_PLACE_CD, NULL AS  PAY_YMD, PAY_MON,'', ln_pay_except_gubun
| , '', SYSDATE , P_CHKID
| FROM (
| SELECT B.SABUN, 1 AS SEQ, SUM(B.PAY_AMT) AS PAY_MON
| FROM TBEN471 A, TBEN472 B
| WHERE A.ENTER_CD = 'NK_DEV'
| AND A.ENTER_CD = B.ENTER_CD
| AND A.APPL_SEQ = B.APPL_SEQ
| AND B.PAY_YM = SUBSTR(lv_cpn201.ORD_EYMD,1,6)
| AND EXISTS ( SELECT 1
| FROM TCPN203 X
| WHERE X.ENTER_CD          = P_ENTER_CD
| AND X.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD
| AND X.ENTER_CD          = B.ENTER_CD
| AND X.SABUN             = B.SABUN )
| GROUP BY A.ENTER_CD, B.SABUN
| );
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := '동호회비 이력생성 시 에러 발생 -->' || NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'70',P_SQLERRM, P_CHKID);
| END;
| ELSE
| NULL;
| END IF;
| ------------------------------------------------------------------------------------------------------------------------
| 
| 
| --------------------
| -- 50 : 대출금
| --------------------
| WHEN '50' THEN
| 
| ln_pay_except_gubun := 'E'; --P:지급, E:공제
| 
| BEGIN
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON1, MON2,MON3, MON4, MON5, MON6, MON7, MON8, MON9, MON10, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT ENTER_CD
| , P_PAY_ACTION_CD AS PAY_ACTION_CD
| , SABUN
| , ln_benefit_biz_cd AS BEN_GUBUN
| , SEQ + 1
| , P_BUSINESS_PLACE_CD AS BUSINESS_PLACE_CD
| , NULL AS PAY_YMD
| , PAY_MON1 AS MON1
| , PAY_MON2 AS MON2
| , PAY_MON3 AS MON3
| , PAY_MON4 AS MON4
| , PAY_MON5 AS MON5
| , PAY_MON6 AS MON6
| , PAY_MON7 AS MON7
| , PAY_MON8 AS MON8
| , PAY_MON9 AS MON9
| , PAY_MON10 AS MON10
| , '' AS PAY_MEMO
| , ln_pay_except_gubun AS PAY_EXCEPT_GUBUN
| , '' AS MEMO
| , SYSDATE AS CHKDATE
| , P_CHKID AS CHKID
| FROM (
| SELECT ENTER_CD
| , SABUN
| , SUM(DECODE(MON1_YN,  'Y', REP_MON, 0)) AS PAY_MON1
| , SUM(DECODE(MON2_YN,  'Y', REP_MON, 0)) AS PAY_MON2
| , SUM(DECODE(MON3_YN,  'Y', REP_MON, 0)) AS PAY_MON3
| , SUM(DECODE(MON4_YN,  'Y', REP_MON, 0)) AS PAY_MON4
| , SUM(DECODE(MON5_YN,  'Y', REP_MON, 0)) AS PAY_MON5
| , SUM(DECODE(MON6_YN,  'Y', REP_MON, 0)) AS PAY_MON6
| , SUM(DECODE(MON7_YN,  'Y', REP_MON, 0)) AS PAY_MON7
| , SUM(DECODE(MON8_YN,  'Y', REP_MON, 0)) AS PAY_MON8
| , SUM(DECODE(MON9_YN,  'Y', REP_MON, 0)) AS PAY_MON9
| , SUM(DECODE(MON10_YN, 'Y', REP_MON, 0)) AS PAY_MON10
| , (SELECT NVL(MAX(SEQ),0) AS SEQ FROM TBEN777 WHERE ENTER_CD = A.ENTER_CD) SEQ
| FROM (
| SELECT A.ENTER_CD, A.SABUN, A.REP_MON, C.ELEMENT_CD, C.MON1_YN, C.MON2_YN, C.MON3_YN, C.MON4_YN, C.MON5_YN, C.MON6_YN, C.MON7_YN, C.MON8_YN, C.MON9_YN, C.MON10_YN
| FROM TBEN625 A
| , TBEN621 B
| , TBEN005 C
| WHERE A.ENTER_CD       = P_ENTER_CD
| AND A.REPAY_TYPE     = '01'  -- 급여상환
| AND A.PAY_YM         = LV_CPN201.PAY_YM
| AND A.REP_MON        > 0
| AND A.CLOSE_YN       = 'Y'
| AND A.ENTER_CD       = B.ENTER_CD
| AND A.LOAN_CD        = B.LOAN_CD
| AND A.REP_YMD BETWEEN B.SDATE AND NVL(B.EDATE, '99991231')
| AND C.ENTER_CD       = A.ENTER_CD
| AND C.PAY_CD         = lv_cpn201.PAY_CD
| AND C.BENEFIT_BIZ_CD = ln_benefit_biz_cd --대출
| AND (A.PAY_ACTION_CD IS NULL OR A.PAY_ACTION_CD  ='')
| AND C.ELEMENT_CD     = B.ELEMENT_CD1 --상환금공제 급여항목코드
| ) A
| GROUP BY A.ENTER_CD, A.SABUN, A.ELEMENT_CD
| )
| ;
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'50',P_SQLERRM, P_CHKID);
| END;
| 
| BEGIN
| UPDATE TBEN625 A
| SET A.PAY_ACTION_CD = P_PAY_ACTION_CD
| WHERE A.ENTER_CD      = P_ENTER_CD
| AND A.REPAY_TYPE    = '01'  -- 급여상환
| AND A.PAY_YM        = LV_CPN201.PAY_YM
| AND A.REP_MON       > 0
| AND A.CLOSE_YN      = 'Y'
| AND EXISTS ( SELECT 1
| FROM TCPN203 X
| WHERE X.ENTER_CD          = P_ENTER_CD
| AND X.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD
| AND X.ENTER_CD          = A.ENTER_CD
| AND X.SABUN             = A.SABUN )
| ;
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'50_1',P_SQLERRM, P_CHKID);
| END;
| 
| 
| --------------------
| -- 51 : 대출이자공제
| --------------------
| WHEN '51' THEN
| 
| ln_pay_except_gubun := 'E'; --P:지급, E:공제
| 
| BEGIN
| INSERT INTO TBEN777 (ENTER_CD, PAY_ACTION_CD, SABUN, BEN_GUBUN, SEQ, BUSINESS_PLACE_CD, PAY_YMD, MON1, MON2,MON3, MON4, MON5, MON6, MON7, MON8, MON9, MON10, PAY_MEMO, PAY_EXCEPT_GUBUN, MEMO, CHKDATE, CHKID)
| SELECT ENTER_CD
| , P_PAY_ACTION_CD AS PAY_ACTION_CD
| , SABUN
| , ln_benefit_biz_cd AS BEN_GUBUN
| , SEQ + 1
| , P_BUSINESS_PLACE_CD AS BUSINESS_PLACE_CD
| , NULL AS PAY_YMD
| , PAY_MON1 AS MON1
| , PAY_MON2 AS MON2
| , PAY_MON3 AS MON3
| , PAY_MON4 AS MON4
| , PAY_MON5 AS MON5
| , PAY_MON6 AS MON6
| , PAY_MON7 AS MON7
| , PAY_MON8 AS MON8
| , PAY_MON9 AS MON9
| , PAY_MON10 AS MON10
| , '' AS PAY_MEMO
| , ln_pay_except_gubun AS PAY_EXCEPT_GUBUN
| , '' AS MEMO
| , SYSDATE AS CHKDATE
| , P_CHKID AS CHKID
| FROM (
| SELECT ENTER_CD
| , SABUN
| , SUM(DECODE(MON1_YN,  'Y', INT_MON, 0)) AS PAY_MON1
| , SUM(DECODE(MON2_YN,  'Y', INT_MON, 0)) AS PAY_MON2
| , SUM(DECODE(MON3_YN,  'Y', INT_MON, 0)) AS PAY_MON3
| , SUM(DECODE(MON4_YN,  'Y', INT_MON, 0)) AS PAY_MON4
| , SUM(DECODE(MON5_YN,  'Y', INT_MON, 0)) AS PAY_MON5
| , SUM(DECODE(MON6_YN,  'Y', INT_MON, 0)) AS PAY_MON6
| , SUM(DECODE(MON7_YN,  'Y', INT_MON, 0)) AS PAY_MON7
| , SUM(DECODE(MON8_YN,  'Y', INT_MON, 0)) AS PAY_MON8
| , SUM(DECODE(MON9_YN,  'Y', INT_MON, 0)) AS PAY_MON9
| , SUM(DECODE(MON10_YN, 'Y', INT_MON, 0)) AS PAY_MON10
| , (SELECT NVL(MAX(SEQ),0) AS SEQ FROM TBEN777 WHERE ENTER_CD = A.ENTER_CD) SEQ
| FROM (
| SELECT A.ENTER_CD, A.SABUN, A.INT_MON, C.ELEMENT_CD, C.MON1_YN, C.MON2_YN, C.MON3_YN, C.MON4_YN, C.MON5_YN, C.MON6_YN, C.MON7_YN, C.MON8_YN, C.MON9_YN, C.MON10_YN
| FROM TBEN625 A
| , TBEN621 B
| , TBEN005 C
| WHERE A.ENTER_CD       = P_ENTER_CD
| AND A.REPAY_TYPE     = '01'  -- 급여상환
| AND A.PAY_YM         = LV_CPN201.PAY_YM
| AND A.INT_MON        > 0
| AND A.CLOSE_YN       = 'Y'
| AND A.ENTER_CD       = B.ENTER_CD
| AND A.LOAN_CD        = B.LOAN_CD
| AND A.REP_YMD BETWEEN B.SDATE AND NVL(B.EDATE, '99991231')
| AND C.ENTER_CD       = A.ENTER_CD
| AND C.PAY_CD         = lv_cpn201.PAY_CD
| AND C.BENEFIT_BIZ_CD = ln_benefit_biz_cd --대출
| AND (A.PAY_ACTION_CD IS NULL OR A.PAY_ACTION_CD  ='')
| AND C.ELEMENT_CD     = B.ELEMENT_CD2 --이자공제 급여항목코드
| ) A
| GROUP BY A.ENTER_CD, A.SABUN, A.ELEMENT_CD
| )
| ;
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'51',P_SQLERRM, P_CHKID);
| END;
| 
| BEGIN
| UPDATE TBEN625 A
| SET A.PAY_ACTION_CD = P_PAY_ACTION_CD
| WHERE A.ENTER_CD      = P_ENTER_CD
| AND A.REPAY_TYPE    = '01'  -- 급여상환
| AND A.PAY_YM        = LV_CPN201.PAY_YM
| AND A.INT_MON       > 0
| AND A.CLOSE_YN      = 'Y'
| AND EXISTS ( SELECT 1
| FROM TCPN203 X
| WHERE X.ENTER_CD          = P_ENTER_CD
| AND X.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND X.BUSINESS_PLACE_CD = C_MAP.BUSINESS_PLACE_CD
| AND X.ENTER_CD          = A.ENTER_CD
| AND X.SABUN             = A.SABUN )
| ;
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'51_1',P_SQLERRM, P_CHKID);
| END;
| 
| END CASE;
| 
| /* 급여관련사항마감관리(TCPN983)의 마감상태(S90003)('10001':작업전, '10003':작업, '10005':마감)를 '10003'(작업)으로 한다. */
| LV_CLOSE_ST := '10003';
| 
| BEGIN
| MERGE INTO TBEN991 A
| USING ( SELECT  P_ENTER_CD       AS ENTER_CD,
| P_PAY_ACTION_CD  AS PAY_ACTION_CD,
| P_BENEFIT_BIZ_CD AS BENEFIT_BIZ_CD,
| C_MAP.BUSINESS_PLACE_CD AS BUSINESS_PLACE_CD,
| TO_CHAR(SYSDATE, 'YYYYMMDD') AS WORK_SYMD,
| SYSDATE          AS CHKDATE,
| P_CHKID          AS CHKID
| FROM  DUAL    ) B
| ON (     A.ENTER_CD          = B.ENTER_CD
| AND  A.PAY_ACTION_CD     = B.PAY_ACTION_CD
| AND  A.BENEFIT_BIZ_CD    = B.BENEFIT_BIZ_CD
| AND  A.BUSINESS_PLACE_CD = B.BUSINESS_PLACE_CD
| )
| WHEN MATCHED THEN
| UPDATE SET  A.CLOSE_ST = LV_CLOSE_ST, -- 마감상태(S90003)('10001':작업전, '10003':작업, '10005':마감
| A.CHKDATE  = SYSDATE,
| A.CHKID    = P_CHKID
| WHEN NOT MATCHED THEN
| INSERT
| (
| ENTER_CD, PAY_ACTION_CD, BUSINESS_PLACE_CD, BENEFIT_BIZ_CD, CLOSE_ST, CHKDATE, CHKID
| )
| VALUES
| (
| B.ENTER_CD, B.PAY_ACTION_CD, B.BUSINESS_PLACE_CD, B.BENEFIT_BIZ_CD, LV_CLOSE_ST, B.CHKDATE, B.CHKID
| );
| --
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| NULL;
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := '급여일자코드 : ' || P_PAY_ACTION_CD || '복리후생구분코드 : ' || ln_benefit_biz_cd ||  '급여사업장코드 : ' || C_MAP.BUSINESS_PLACE_CD ||
| ' 의 급여관련사항마감(TBEN991) 작업시 Error =>' || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'90',P_SQLERRM, P_CHKID);
| END;
| 
| END LOOP; -- 급여사업장 별 작업 END
| 
| P_SQLCODE := 'OK' ;
| P_SQLERRM := '작업이 완료되었습니다.';
| COMMIT;
| 
| P_cnt := ln_rcnt;
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(SQLCODE);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'100',P_SQLERRM, P_CHKID);
| END P_BEN_PAY_DATA_CREATE;
| 
| /
```
---
# P_CPN_GL_INS.PRC

```diff
| 
| CREATE OR REPLACE  PROCEDURE "EHR_NG"."P_CPN_GL_INS" (
| P_SQLCODE            OUT VARCHAR2,  -- Error Code
| P_SQLERRM            OUT VARCHAR2,  -- Error Messages
| P_ENTER_CD           IN  VARCHAR2,  -- 회사코드
| P_PAY_ACTION_CD      IN  VARCHAR2,  -- 급여계산코드
| P_BUSINESS_PLACE_CD  IN  VARCHAR2,  -- 사업장코드
| P_LOCATION_CD        IN  VARCHAR2,  -- LOCATION코드
| P_CC_CD              IN  VARCHAR2,  -- COST_CENTER코드
| P_CHKID              IN  VARCHAR2   -- 수정자
| )
| is
| /********************************************************************************/
| /*                    (c) Copyright KLI. 2006                                   */
| /*                           All Rights Reserved                                */
| /********************************************************************************/
| /*  PROCEDURE NAME : P_CPN_GL_INS                                               */
| /*                   전표처리를 위한 기초자료 생성                                   */
| /********************************************************************************/
| /*  [ 참조 TABLE ]                                                               */
| /*              전표처리기준관리   ( TCPN970 )                                     */
| /*              급여대상자        ( TCPN203 )                                     */
| /*              개인별항목계산결과 ( TCPN205 )                                     */
| /*              월급여실적        ( TCPN303 )                                     */
| /*              급여일자관리      ( TCPN201 )                                     */
| /********************************************************************************/
| /*  [ 생성 TABLE ]                                                               */
| /*               전표자료생성결과 ( TCPN977) 생성                                   */
| /********************************************************************************/
| /*  [ 삭제 TABLE ]                                                               */
| /*               전표자료생성결과 ( TCPN977)                                       */
| /********************************************************************************/
| /*  [ PRC 개요 ]                                                                 */
| /*                                                                              */
| /*    1. 전표자료생성결과 자료 삭제                                                  */
| /*    2. 고정값 셋팅 (증빙일, 전기일, 통화, 회사코드 등)                               */
| /*    3. 전표자료 발생 (추정전표가 아닌 경우)                                         */
| /*        3.1 계정소분류가 '00'(전체) 인 경우                                        */
| /*        3.2 계정소분류가 '01'(개인별) 인 경우                                      */
| /*        3.3 계정소분류가 '02'(부서별) 인 경우                                      */
| /*        3.3 계정소분류가 '03'(코스트센터별) 인 경우                                 */
| /*        3.4 계정소분류가 '04'(최종 실지급액) 인 경우                                */
| /*        3.5 계정소분류가 '05'(항목별그룹별지급총액) 인 경우                          */
| /*        3.6 계정소분류가 '06'(전체(차감)) 인 경우                                  */
| /*        3.7 계정소분류가 '07'(급여기준사업장별) 인 경우                              */
| /*        3.7 계정소분류가 '08'(LOCATION별) 인 경우                                 */
| /*        3.7 계정소분류가 '09'(공제전지급총액) 인 경우                               */
| /********************************************************************************/
| /*  [ PRC 호출 ]                                                                */
| /*         [급상여전표처리] 화면에서 [전표생성] 버튼 클릭 시 호출                       */
| /********************************************************************************/
| /* Date        In Charge       Description                                      */
| /*------------------------------------------------------------------------------*/
| /* 2015-01-12  Vong Ha Ik      Initial Release                                  */
| /********************************************************************************/
| --------- Local 변수 선언 -------------
| lv_cpn201       TCPN201%ROWTYPE;
| lv_cpn977       TCPN977%ROWTYPE;
| lv_jukyo        VARCHAR2(100) := '';
| 
| ln_pay_mon      NUMBER := 0;
| ln_seq          NUMBER := 0;
| ln_AMT_CR       NUMBER := 0; -- 차변
| ln_AMT_DR       NUMBER := 0; -- 대변
| 
| lv_biz_cd       TSYS903.BIZ_CD%TYPE    := 'CPN'         ;
| lv_object_nm    TSYS903.OBJECT_NM%TYPE := 'P_CPN_GL_INS';
| er_PGM_ERROR    EXCEPTION ;
| 
| /*
| 계정중분류(직원구분) C14050     TCPN970-ACCT_M_TYPE
| Z    임직원전체
| Y    임원
| N    직원
| 계정소분류(집계구분)  C14100    TCPN970-ACCT_S_TYPE
| 00    전체
| 06    전체(차감)
| 01    개인별
| 02    부서별
| 03    코스트센터별
| 04    실지급액
| 05    지급총액
| 07    급여사업장별
| 08    Location별
| */
| 
| ---------------------------------------------------------------------
| -- 분류1=코스트센터코드표시여부, 분류2=추정전표시에만사용되는 계정
| ---------------------------------------------------------------------
| -- 전표처리기준관리 계정과목별 정보 가져오기
| CURSOR CSR_CODE (PARAM_PAY_CD VARCHAR2) IS
| select * from (SELECT DISTINCT A.ENTER_CD
| , A.PAY_CD
| , A.ACCT_CD                                                          -- 계정코드
| , F_COM_GET_GRCODE_NAME(A.ENTER_CD, 'C14000', A.ACCT_CD) AS ACCT_NM  -- 계정명 (예산 SGE8)
| , A.ELEMENT_SET_CD
| , B.ELEMENT_SET_NM   -- 항목그룹명
| , A.C_D_TYPE         -- 차대구분
| , A.ACCT_L_TYPE      -- 계정대분류
| , A.ACCT_M_TYPE      -- 직원구분  (Z-전체  Y-임원 N-직원)
| , A.ACCT_S_TYPE      -- 집계구분  (00-전체 06-전체(차감) 01-개인별 02-부서별 03-코스트센터별 04-실지급액 05-지급총액)
| , A.ACCT_TYPE1       -- 분류1     (계정유형 0=원장 1=공급자)
| , A.ACCT_TYPE2       -- 분류2
| , A.ACCT_TYPE3       -- 분류3 (Seg3)
| , A.NOTE             -- 적요
| , b.seq              -- 전펴생성순서
| , a.seq   as INV_TYPE
| , a.seg5
| FROM TCPN970 A  -- 전표처리기준관리
| , TCPN071 B  -- 항목그룹Master
| , TCPN072 D  -- 항목그룹Master
| , TCPN205 C
| WHERE A.ENTER_CD       = B.ENTER_CD
| AND A.ELEMENT_SET_CD = B.ELEMENT_SET_CD
| AND A.ENTER_CD       = D.ENTER_CD
| AND A.ELEMENT_SET_CD = D.ELEMENT_SET_CD
| AND A.ENTER_CD       = P_ENTER_CD
| AND A.PAY_CD         = PARAM_PAY_CD          -- 01-급여/02-인센티브/S1-퇴직금/S2-퇴직중간/S3-퇴직추계/Y1-연말정산/Y3-퇴직자정산
| AND A.ENTER_CD = C.ENTER_CD
| AND C.PAY_ACTION_CD = P_PAY_ACTION_CD
| AND C.Element_Cd = D.Element_Cd
| AND A.ACCT_S_TYPE <> '04'
| UNION ALL
| SELECT distinct A.ENTER_CD
| , A.PAY_CD
| , A.ACCT_CD                                                          -- 계정코드
| , F_COM_GET_GRCODE_NAME(A.ENTER_CD, 'C14000', A.ACCT_CD) AS ACCT_NM  -- 계정명 (예산 SGE8)
| , A.ELEMENT_SET_CD
| , B.ELEMENT_SET_NM   -- 항목그룹명
| , A.C_D_TYPE         -- 차대구분
| , A.ACCT_L_TYPE      -- 계정대분류
| , A.ACCT_M_TYPE      -- 직원구분  (Z-전체  Y-임원 N-직원)
| , A.ACCT_S_TYPE      -- 집계구분  (00-전체 06-전체(차감) 01-개인별 02-부서별 03-코스트센터별 04-실지급액 05-지급총액)
| , A.ACCT_TYPE1       -- 분류1     (계정유형 0=원장 1=공급자)
| , A.ACCT_TYPE2       -- 분류2
| , A.ACCT_TYPE3       -- 분류3 (Seg3)
| , A.NOTE             -- 적요
| , b.seq              -- 전펴생성순서
| , a.seq   as INV_TYPE
| , a.seg5
| FROM TCPN970 A  -- 전표처리기준관리
| , TCPN071 B  -- 항목그룹Master
| WHERE A.ENTER_CD       = B.ENTER_CD
| AND A.ELEMENT_SET_CD = B.ELEMENT_SET_CD
| AND A.ENTER_CD       = P_ENTER_CD
| AND A.PAY_CD         = PARAM_PAY_CD          -- 01-급여/02-인센티브/S1-퇴직금/S2-퇴직중간/S3-퇴직추계/Y1-연말정산/Y3-퇴직자정산
| and A.ACCT_S_TYPE = '04' ) ACC_LIST
| order by ACC_LIST.INV_TYPE, ACC_LIST.ACCT_TYPE3
| 
| 
| --      AND A.ELEMENT_SET_CD = '431010201'
| --        ORDER BY C_D_TYPE, A.SEQ ASC
| ;
| /*     TORG109 의 PK
| ENTER_CD, MAP_TYPE_CD, MAP_CD, NOTE
| 
| 급여의 경우 집계구분이   01-개인별  03-코스트센터별 05-지급총액
| */
| /**********************************************************************************************
| 파라미터 체크
| **********************************************************************************************/
| PROCEDURE P_PARAM_CHECK(SYSPARAM CHAR) IS
| BEGIN
| 
| IF P_ENTER_CD      IS NULL OR TRIM(P_ENTER_CD     ) = '' THEN  -- 회사코드
| P_SQLCODE := 'NO' ;
| P_SQLERRM := '회사코드는 필수입니다.(P_PARAM_CHECK)';
| RAISE er_PGM_ERROR;
| END IF;
| 
| IF P_PAY_ACTION_CD IS NULL OR TRIM(P_PAY_ACTION_CD) = '' THEN  -- 급여계산코드
| P_SQLCODE := 'NO' ;
| P_SQLERRM := '급여계산코드는 필수입니다.(P_PARAM_CHECK-P_PAY_ACTION_CD)';
| RAISE er_PGM_ERROR;
| END IF;
| 
| /*            IF P_BUSINESS_PLACE_CD IS NULL OR TRIM(P_BUSINESS_PLACE_CD) = '' THEN  -- 급여기준사업장
| P_SQLCODE := 'NO' ;
| P_SQLERRM := '사업장은 필수입니다.(P_PARAM_CHECK-P_CHKID)';
| RAISE er_PGM_ERROR;
| END IF;*/
| 
| 
| END P_PARAM_CHECK;
| 
| /**********************************************************************************************
| 급여전표처리결과 자료 삭제
| **********************************************************************************************/
| PROCEDURE P_DELETE_DATA(SYSPARAM CHAR) IS
| BEGIN
| 
| BEGIN
| DELETE FROM TCPN977    -- 전표자료생성결과
| WHERE ENTER_CD          = P_ENTER_CD
| AND PAY_ACTION_CD     = P_PAY_ACTION_CD
| --     AND DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', BUSINESS_PLACE_CD) = DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', P_BUSINESS_PLACE_CD)
| --      AND DECODE(P_LOCATION_CD, 'ALL', '%', LOCATION_CD) = DECODE(P_LOCATION_CD, 'ALL', '%', P_LOCATION_CD)
| --     AND DECODE(P_CC_CD, 'ALL', '%', CC_CD) = DECODE(P_CC_CD, 'ALL', '%', P_CC_CD)
| ;
| EXCEPTION WHEN OTHERS THEN P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '급여전표처리결과 Delete Error => ' || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'10',P_SQLERRM, P_CHKID);
| RAISE er_PGM_ERROR ;
| END;
| 
| END P_DELETE_DATA;
| 
| /**********************************************************************************************
| 급여일 정보 및 사업장 정보 조회
| **********************************************************************************************/
| PROCEDURE P_GET_PAYINFO(SYSPARAM CHAR) IS
| BEGIN
| -- 급여계산일자 정보가져오기
| lv_cpn201 := F_CPN_GET_201_INFO(P_ENTER_CD,P_PAY_ACTION_CD);
| 
| END P_GET_PAYINFO;
| 
| 
| 
| /**********************************************************************************************
| 급여 전표 처리 데이타 생성
| **********************************************************************************************/
| PROCEDURE P_PROC_PAY_DATA(SYSPARAM CHAR) IS
| BEGIN
| 
| FOR C_CODE IN CSR_CODE (lv_cpn201.PAY_CD) LOOP -- PAY_CD 01=급여
| 
| lv_cpn977 := NULL;
| /* 계정소분류(집계구분- 공통코드 C14100)
| 00-전체
| 01-개인별
| 02-부서별
| 03-코스트센터별
| 04-실지급액
| 05-지급총액
| 06-전체(차감)
| 07-급여사업장별
| 08-Location별
| 
| 집계구분       전표적요
| -----------------------------------------------------------------------
| 코스트센터       월 + ' ' +  계정설명      + ' ' + 코스트센터명
| 개인            월 + ' ' +  계정설명      + ' ' + 성명
| 그외            월 + ' ' +  계정설명
| */
| ----------------------------------------------------------------------------------------------------------------
| -- 적요처리
| --lv_cpn977.HEAD_TEXT := TO_CHAR(TO_DATE(lv_cpn201.PAY_YM || '01010101' , 'YYYYMMDDHH24MISS'),'YYYY-MM') || ' ' ;
| lv_jukyo := NULL;
| 
| BEGIN
| SELECT A.NOTE
| INTO   lv_jukyo
| FROM TCPN970 A
| , TSYS005 AA
| , TSYS001 BB
| WHERE A.ENTER_CD     = P_ENTER_CD
| AND AA.GRCODE_CD   = BB.GRCODE_CD
| AND AA.ENTER_CD    = A.ENTER_CD
| AND AA.GRCODE_CD   = 'C14000'
| AND AA.CODE        = A.ACCT_CD
| AND AA.CODE        = C_CODE.ACCT_CD
| AND A.ELEMENT_SET_CD = C_CODE.ELEMENT_SET_CD
| AND A.PAY_CD        = lv_cpn201.pay_cd
| ;
| EXCEPTION WHEN NO_DATA_FOUND THEN lv_jukyo := NULL;
| WHEN OTHERS        THEN lv_jukyo := NULL;
| END;
| 
| lv_cpn977.HEAD_TEXT := NVL(lv_jukyo,C_CODE.ACCT_CD) ;
| ----------------------------------------------------------------------------------------------------------------
| 
| -----------------------------------
| -- 1.1. 계정소분류(집계구분)가 '00'(전체) 인 경우
| -----------------------------------
| IF C_CODE.ACCT_S_TYPE = '00' THEN
| BEGIN
| 
| /*                 P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'VONG1',       P_PAY_ACTION_CD||'-C_CODE.ELEMENT_SET_CD:'|| C_CODE.ELEMENT_SET_CD
| ||'-P_BUSINESS_PLACE_CD:'||P_BUSINESS_PLACE_CD||'-P_LOCATION_CD:'||P_LOCATION_CD||'-P_CC_CD:'||P_CC_CD
| ||'-C_CODE.C_D_TYPE:'||C_CODE.C_D_TYPE||'-C_CODE.ACCT_CD:'||C_CODE.ACCT_CD||'-lv_cpn977.HEAD_TEXT:'||lv_cpn977.HEAD_TEXT
| ||'-ln_seq:'||ln_seq||'-C_CODE.ELEMENT_SET_CD:'||C_CODE.ELEMENT_SET_CD||'-C_CODE.ACCT_M_TYPE:'||C_CODE.ACCT_M_TYPE
| , P_CHKID);
| */
| 
| INSERT INTO TCPN977
| (
| ENTER_CD, PAY_ACTION_CD, SEQ
| , BUSINESS_PLACE_CD
| , LOCATION_CD
| , CC_CD
| , CD_KEY, ACCT_CD, RESULT_MON
| , HEAD_TEXT
| , REFER_TEXT, CHKDATE, CHKID, budget_cd , INVOICE_SEQ, invoice_type ,department_cd
| )
| SELECT P_ENTER_CD, P_PAY_ACTION_CD, (NVL((SELECT MAX(SEQ) FROM TCPN977 WHERE ENTER_CD= P_ENTER_CD AND PAY_ACTION_CD=P_PAY_ACTION_CD), 0) + ROWNUM  * 10)
| , NVL(decode(C_CODE.ACCT_L_TYPE,'S182','2'),'1'), P_LOCATION_CD, '00000000'
| , C_CODE.C_D_TYPE,C_CODE.ACCT_TYPE3,  NVL(DECODE(C_CODE.ACCT_TYPE2,-1,X.MON*-1,0,0),X.MON)
| , lv_cpn977.HEAD_TEXT
| , C_CODE.seg5, SYSDATE, P_CHKID,C_CODE.ACCT_CD, C_CODE.SEQ, C_CODE.INV_TYPE, C_CODE.ACCT_L_TYPE
| FROM
| (SELECT NVL(SUM(B.RESULT_MON * DECODE(C.INCLUDE_TYPE,'S',-1,1)),0) AS MON
| FROM TCPN203 A -- 급여대상자관리
| ,(SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN205 -- 개인별항목계산결과
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| /*
| UNION ALL
| SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN294 -- 개인별항목계산결과(최종결과삭제데이터)
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| */
| ) B -- 개인별 항목결과
| ,TCPN072 C -- 항목그룹관리Detail
| WHERE A.ENTER_CD          = P_ENTER_CD
| AND A.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND A.ENTER_CD          = B.ENTER_CD
| AND A.PAY_ACTION_CD     = B.PAY_ACTION_CD
| AND A.SABUN             = B.SABUN
| AND A.ENTER_CD          = C.ENTER_CD
| AND B.ELEMENT_CD        = C.ELEMENT_CD
| AND C.ELEMENT_SET_CD    = C_CODE.ELEMENT_SET_CD
| --           AND DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', F_COM_GET_BP_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', P_BUSINESS_PLACE_CD)
| ---          AND DECODE(P_LOCATION_CD, 'ALL', '%', F_COM_GET_LOCATION_CD2(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_LOCATION_CD, 'ALL', '%', P_LOCATION_CD)
| --         AND DECODE(P_CC_CD, 'ALL', '%', F_COM_GET_COSTCENTER_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_CC_CD, 'ALL', '%', P_CC_CD)
| AND DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL',NVL(F_COM_GET_GRCODE_NOTE_VAL(A.ENTER_CD, 'H10030', f_com_get_manage_cd(A.ENTER_CD, A.SABUN, A.ORD_EYMD), 3), 'N')) = DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL','N','N','C','C','I','I')
| 
| ) X
| WHERE X.MON <> 0
| ;
| EXCEPTION WHEN OTHERS THEN P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '계정소분류가 "전체"(코드 : 00)인 집계금액 등록시 Error => ' || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'30',P_SQLERRM, P_CHKID);
| RAISE er_PGM_ERROR ;
| END;
| 
| 
| 
| /*    begin
| INSERT INTO TCPN977(
| ENTER_CD, PAY_ACTION_CD, SEQ
| , BUSINESS_PLACE_CD
| , LOCATION_CD
| , CC_CD
| , CD_KEY, ACCT_CD, RESULT_MON
| , HEAD_TEXT
| , REFER_TEXT, CHKDATE, CHKID, INVOICE_SEQ
| )
| SELECT P_ENTER_CD, P_PAY_ACTION_CD, (NVL((SELECT MAX(SEQ) FROM TCPN977 WHERE ENTER_CD= P_ENTER_CD AND PAY_ACTION_CD=P_PAY_ACTION_CD), 0) + ROWNUM  * 10)
| , P_BUSINESS_PLACE_CD, P_LOCATION_CD, P_CC_CD
| , C.CD_KEY
| , nvl(DECODE(lv_cpn201.Pay_Cd,'A1','8900002','A2','8900002'),'8900004')
| , C.RESULT_MON * -1
| , nvl(DECODE(lv_cpn201.Pay_Cd,'A1','Clearing wages','A2','Clearing wages'),'Clearing bonus')
| , C.REFER_TEXT, C.CHKDATE, C.CHKID, C.INVOICE_SEQ
| FROM TCPN977 C
| WHERE C.ENTER_CD       = P_ENTER_CD
| AND C.PAY_ACTION_CD  = P_PAY_ACTION_CD
| AND CD_KEY           = C_CODE.C_D_TYPE
| AND C.ACCT_CD        = C_CODE.ACCT_CD
| AND C.Head_Text      = lv_cpn977.HEAD_TEXT;
| EXCEPTION WHEN OTHERS THEN P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '계정소분류가 "전체"(코드 : 00)인 집계금액 등록시 Error => ' || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'30',P_SQLERRM, P_CHKID);
| RAISE er_PGM_ERROR ;
| END;*/
| 
| 
| 
| 
| 
| ----------------------------------
| -- 1.1.2 계정소분류가 '06'(전체(차감)) 인 경우 -- 항목별지급총액 - 공제금액
| ----------------------------------
| ELSIF C_CODE.ACCT_S_TYPE = '06' THEN
| 
| BEGIN
| INSERT INTO TCPN977
| (
| ENTER_CD, PAY_ACTION_CD, SEQ
| , BUSINESS_PLACE_CD, LOCATION_CD, CC_CD
| , CD_KEY, ACCT_CD, RESULT_MON
| , HEAD_TEXT
| , REFER_TEXT, CHKDATE, CHKID,budget_cd , INVOICE_SEQ, invoice_type , department_cd
| )
| SELECT P_ENTER_CD, P_PAY_ACTION_CD, (NVL((SELECT MAX(SEQ) FROM TCPN977 WHERE ENTER_CD= P_ENTER_CD AND PAY_ACTION_CD=P_PAY_ACTION_CD), 0) + ROWNUM  * 10)
| , NVL(decode(C_CODE.ACCT_L_TYPE,'S182','2'),'1'), P_LOCATION_CD, '00000000'
| , C_CODE.C_D_TYPE,C_CODE.ACCT_TYPE3 , NVL(DECODE(C_CODE.ACCT_TYPE2,-1,X.MON*-1,0,0),X.MON)
| , lv_cpn977.HEAD_TEXT
| , NVL(C_CODE.seg5, '0000') , SYSDATE, P_CHKID, C_CODE.ACCT_CD,  C_CODE.SEQ, C_CODE.INV_TYPE, C_CODE.ACCT_L_TYPE
| FROM
| (SELECT NVL(SUM(B.RESULT_MON * DECODE(C.INCLUDE_TYPE,'S',-1,1)),0) AS MON
| FROM TCPN203 A -- 급여대상자관리
| ,(SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN205
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| UNION ALL
| SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN294 -- 개인별항목계산결과(최종결과삭제데이터)
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| 
| ) B -- 개인별 항목결과
| ,TCPN072 C -- 항목그룹관리Detail
| WHERE A.ENTER_CD          = P_ENTER_CD
| AND A.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND A.ENTER_CD          = B.ENTER_CD
| AND A.ENTER_CD          = C.ENTER_CD
| AND A.PAY_ACTION_CD     = B.PAY_ACTION_CD
| AND A.SABUN             = B.SABUN
| AND B.ELEMENT_CD        = C.ELEMENT_CD
| AND C.ELEMENT_SET_CD    = C_CODE.ELEMENT_SET_CD
| ---       AND DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', F_COM_GET_BP_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', P_BUSINESS_PLACE_CD)
| --       AND DECODE(P_LOCATION_CD, 'ALL', '%', F_COM_GET_LOCATION_CD2(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_LOCATION_CD, 'ALL', '%', P_LOCATION_CD)
| --       AND DECODE(P_CC_CD, 'ALL', '%', F_COM_GET_COST_CC_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_CC_CD, 'ALL', '%', P_CC_CD)
| AND DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL',NVL(F_COM_GET_GRCODE_NOTE_VAL(A.ENTER_CD, 'H10030', f_com_get_manage_cd(A.ENTER_CD, A.SABUN, A.ORD_EYMD), 3), 'N')) = DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL','N','N','C','C','I','I')
| ) X
| WHERE X.MON <> 0
| ;
| EXCEPTION WHEN OTHERS THEN P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '계정소분류가 "06"(전체(차감))인 집계금액 등록시 Error => ' || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'30',P_SQLERRM, P_CHKID);
| RAISE er_PGM_ERROR ;
| END;
| ----------------------------------
| -- 1.2. 계정소분류가 '01'(개인별) 인 경우
| ----------------------------------
| ELSIF C_CODE.ACCT_S_TYPE = '01' THEN
| BEGIN
| INSERT INTO TCPN977
| (
| ENTER_CD, PAY_ACTION_CD, SEQ
| , BUSINESS_PLACE_CD, LOCATION_CD, CC_CD
| , CD_KEY, ACCT_CD, RESULT_MON
| , HEAD_TEXT
| , REFER_TEXT, CHKDATE, CHKID, budget_cd ,  INVOICE_SEQ, invoice_type ,department_cd
| )
| SELECT P_ENTER_CD, P_PAY_ACTION_CD, (NVL((SELECT MAX(SEQ) FROM TCPN977 WHERE ENTER_CD= P_ENTER_CD AND PAY_ACTION_CD=P_PAY_ACTION_CD), 0) + ROWNUM  * 10)
| , NVL(decode(C_CODE.ACCT_L_TYPE,'S182','2'),'1'), P_LOCATION_CD, '00000000'
| , C_CODE.C_D_TYPE,C_CODE.ACCT_TYPE3 , NVL(DECODE(C_CODE.ACCT_TYPE2,-1,X.MON*-1,0,0),X.MON)
| , lv_cpn977.HEAD_TEXT ||'-'|| X.NAME
| , NVL(C_CODE.seg5, '0000'), SYSDATE, P_CHKID,C_CODE.ACCT_CD,   C_CODE.SEQ, C_CODE.INV_TYPE, C_CODE.ACCT_L_TYPE
| FROM
| (SELECT A.SABUN
| , A.NAME
| , NVL(SUM(B.RESULT_MON * DECODE(C.INCLUDE_TYPE,'S',-1,1)),0) AS MON
| FROM TCPN203 A -- 급여대상자관리
| ,(SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN205
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| 
| UNION ALL
| SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN294 -- 개인별항목계산결과(최종결과삭제데이터)
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| 
| ) B -- 개인별 항목결과
| ,TCPN072 C -- 항목그룹관리Detail
| WHERE A.ENTER_CD          = P_ENTER_CD
| AND A.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND A.ENTER_CD          = B.ENTER_CD
| AND A.ENTER_CD          = C.ENTER_CD
| AND A.PAY_ACTION_CD     = B.PAY_ACTION_CD
| AND A.SABUN             = B.SABUN
| AND B.ELEMENT_CD        = C.ELEMENT_CD
| AND C.ELEMENT_SET_CD    = C_CODE.ELEMENT_SET_CD
| --    AND DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', F_COM_GET_BP_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', P_BUSINESS_PLACE_CD)
| --     AND DECODE(P_LOCATION_CD, 'ALL', '%', F_COM_GET_LOCATION_CD2(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_LOCATION_CD, 'ALL', '%', P_LOCATION_CD)
| --     AND DECODE(P_CC_CD, 'ALL', '%', F_COM_GET_COST_CC_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_CC_CD, 'ALL', '%', P_CC_CD)
| AND DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL',NVL(F_COM_GET_GRCODE_NOTE_VAL(A.ENTER_CD, 'H10030', f_com_get_manage_cd(A.ENTER_CD, A.SABUN, A.ORD_EYMD), 3), 'N')) = DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL','N','N','C','C','I','I')
| GROUP BY A.SABUN, A.NAME) X
| WHERE X.MON <> 0
| ;
| EXCEPTION WHEN OTHERS THEN P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '계정소분류가 "01"(개인별)인 집계금액 등록시 Error => ' || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'40',P_SQLERRM, P_CHKID);
| RAISE er_PGM_ERROR ;
| END;
| ----------------------------------
| -- 1.3. 계정소분류가 '03'(코스트센터별) 인 경우
| ----------------------------------
| ELSIF C_CODE.ACCT_S_TYPE = '03' THEN
| 
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'VONG2',       P_PAY_ACTION_CD||'-C_CODE.ELEMENT_SET_CD:'|| C_CODE.ELEMENT_SET_CD
| ||'-P_BUSINESS_PLACE_CD:'||P_BUSINESS_PLACE_CD||'-P_LOCATION_CD:'||P_LOCATION_CD||'-P_CC_CD:'||P_CC_CD
| ||'-C_CODE.C_D_TYPE:'||C_CODE.C_D_TYPE||'-C_CODE.ACCT_CD:'||C_CODE.ACCT_CD||'-lv_cpn977.HEAD_TEXT:'||lv_cpn977.HEAD_TEXT
| ||'-ln_seq:'||ln_seq||'-C_CODE.ELEMENT_SET_CD:'||C_CODE.ELEMENT_SET_CD||'-C_CODE.ACCT_M_TYPE:'||C_CODE.ACCT_M_TYPE
| , P_CHKID);
| 
| IF C_CODE.ELEMENT_SET_CD = '61000418' then
| dbms_output.put_line(' C_CODE.ACCT_CD : ' || C_CODE.ACCT_CD);
| end if;
| 
| 
| BEGIN
| INSERT INTO TCPN977
| (
| ENTER_CD, PAY_ACTION_CD, SEQ
| , BUSINESS_PLACE_CD, LOCATION_CD, CC_CD
| , CD_KEY, ACCT_CD, RESULT_MON
| , HEAD_TEXT
| , REFER_TEXT, CHKDATE, CHKID
| , COSTCENTER_CD
| , budget_cd , invoice_seq , invoice_type ,department_cd
| )
| SELECT P_ENTER_CD, P_PAY_ACTION_CD, (NVL((SELECT MAX(SEQ) FROM TCPN977 WHERE ENTER_CD= P_ENTER_CD AND PAY_ACTION_CD=P_PAY_ACTION_CD), 0) + ROWNUM  * 10)
| 
- , NVL(decode(C_CODE.ACCT_L_TYPE,'S182','2'),'1'), P_LOCATION_CD, CC_CD
- 
+ , NVL(decode(C_CODE.ACCT_L_TYPE,'S182','2'),'1'), P_LOCATION_CD, P_CC_CD
+ 
| , C_CODE.C_D_TYPE,  C_CODE.ACCT_TYPE3 ,NVL(DECODE(C_CODE.ACCT_TYPE2,-1,X.MON*-1,0,0),X.MON)      -- 2021.08.31 로직수정
| , lv_cpn977.HEAD_TEXT || ' ' || X.NOTE
| --, F_COM_GET_COSTCENTER_NM2(P_ENTER_CD, CC_CD, '200') AS CC_NM
| , NVL(C_CODE.seg5, '0000')
| , SYSDATE, P_CHKID, CC_CD, C_CODE.ACCT_CD,  C_CODE.SEQ , C_CODE.INV_TYPE, C_CODE.ACCT_L_TYPE   -- 2021.08.31 로직수정
| FROM
| (SELECT distinct nvl((F_COM_GET_COST_CC_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)),'A1005') AS CC_CD
| , '' AS NOTE
| , NVL(SUM(B.RESULT_MON * DECODE(C.INCLUDE_TYPE,'S',-1,1)),0) AS MON
| , A.ENTER_CD
| FROM TCPN203 A -- 급여대상자관리
| ,(SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN205
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| 
| UNION ALL
| SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN294 -- 개인별항목계산결과(최종결과삭제데이터)
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| 
| ) B -- 개인별 항목결과
| ,TCPN072 C -- 항목그룹관리Detail
| WHERE A.ENTER_CD          = P_ENTER_CD
| AND A.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND A.ENTER_CD          = B.ENTER_CD
| AND A.PAY_ACTION_CD     = B.PAY_ACTION_CD
| AND A.SABUN             = B.SABUN
| AND A.ENTER_CD          = C.ENTER_CD
| AND B.ELEMENT_CD        = C.ELEMENT_CD
| AND C.ELEMENT_SET_CD    = C_CODE.ELEMENT_SET_CD
| and C_CODE.ACCT_TYPE1   = (select G.CC_TYPE
| FROM TORG109 g
| WHERE G.ENTER_CD = P_ENTER_CD
| AND G.MAP_TYPE_CD = '300'
| AND G.MAP_CD = nvl((F_COM_GET_COST_CC_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)),'A1005')) -- 0 원가, 2 판관
| --       AND DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', F_COM_GET_BP_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', P_BUSINESS_PLACE_CD)
| --       AND DECODE(P_LOCATION_CD, 'ALL', '%', F_COM_GET_LOCATION_CD2(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_LOCATION_CD, 'ALL', '%', P_LOCATION_CD)
| --       AND DECODE(P_CC_CD, 'ALL', '%', nvl((F_COM_GET_COST_CC_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)),'A1005')) = DECODE(P_CC_CD, 'ALL', '%', P_CC_CD)
| AND DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL',NVL(F_COM_GET_GRCODE_NOTE_VAL(A.ENTER_CD, 'H10030', f_com_get_manage_cd(A.ENTER_CD, A.SABUN, A.ORD_EYMD), 3), 'N')) = DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL','N','N','C','C','I','I')
| GROUP BY A.ENTER_CD, NVL((F_COM_GET_COST_CC_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)),'A1005')
| --, D.NOTE
| ) X, TORG109 Y
| WHERE X.MON <> 0
| AND X.ENTER_CD    = Y.ENTER_CD
| AND Y.MAP_TYPE_CD = '300'
| AND Y.MAP_CD      = X.CC_CD
| ORDER BY Y.NOTE ASC
| ;
| --                                          dbms_output.put_line(' P_SQLERRM : ' || P_SQLERRM);
| EXCEPTION WHEN OTHERS THEN P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '계정소분류가 "03"(코스트센터별)인 집계금액 등록시 Error => ' || lv_cpn977.HEAD_TEXT || sqlerrm;
| dbms_output.put_line(' P_SQLERRM : ' || P_SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'50',P_SQLERRM, P_CHKID);
| RAISE er_PGM_ERROR ;
| END;
| ----------------------------------
| -- 1.4. 계정소분류가 '04'(실지급액) 인 경우
| ----------------------------------
| ELSIF C_CODE.ACCT_S_TYPE = '04' THEN
| BEGIN
| INSERT INTO TCPN977
| (
| ENTER_CD, PAY_ACTION_CD, SEQ
| , BUSINESS_PLACE_CD, LOCATION_CD, CC_CD
| , CD_KEY, ACCT_CD, RESULT_MON
| , HEAD_TEXT
| , REFER_TEXT, CHKDATE, CHKID,budget_cd,  invoice_seq , invoice_type ,department_cd
| )
| SELECT P_ENTER_CD, P_PAY_ACTION_CD, (NVL((SELECT MAX(SEQ) FROM TCPN977 WHERE ENTER_CD= P_ENTER_CD AND PAY_ACTION_CD=P_PAY_ACTION_CD), 0) + ROWNUM  * 10)
| , NVL(decode(C_CODE.ACCT_L_TYPE,'S182','2'),'1'), P_LOCATION_CD, '00000000'
| , C_CODE.C_D_TYPE, C_CODE.ACCT_TYPE3 ,NVL(DECODE(C_CODE.ACCT_TYPE2,-1,X.MON*-1,0,0),X.MON)
| , lv_cpn977.HEAD_TEXT
| , NVL(C_CODE.seg5, '0000'), SYSDATE, P_CHKID, C_CODE.ACCT_CD, C_CODE.SEQ , C_CODE.INV_TYPE, C_CODE.ACCT_L_TYPE
| FROM
| (SELECT NVL(SUM(B.PAYMENT_MON),0) AS MON -- 실지급액
| FROM TCPN203 A -- 급여대상자관리
| ,TCPN303 B -- 개인별 항목결과
| WHERE A.ENTER_CD          = P_ENTER_CD
| AND A.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND A.ENTER_CD          = B.ENTER_CD
| AND A.PAY_ACTION_CD     = B.PAY_ACTION_CD
| AND A.SABUN             = B.SABUN
| --       AND DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', F_COM_GET_BP_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', P_BUSINESS_PLACE_CD)
| --       AND DECODE(P_LOCATION_CD, 'ALL', '%', F_COM_GET_LOCATION_CD2(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_LOCATION_CD, 'ALL', '%', P_LOCATION_CD)
| --       AND DECODE(P_CC_CD, 'ALL', '%',NVL((F_COM_GET_COST_CC_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)),'A1005')) = DECODE(P_CC_CD, 'ALL', '%', P_CC_CD)
| AND DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL',NVL(F_COM_GET_GRCODE_NOTE_VAL(A.ENTER_CD, 'H10030', f_com_get_manage_cd(A.ENTER_CD, A.SABUN, A.ORD_EYMD), 3), 'N')) = DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL','N','N','C','C','I','I')
| ) X
| WHERE X.MON <> 0
| ;
| EXCEPTION WHEN OTHERS THEN P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '계정소분류가 "04"(실지급액)인 집계금액 등록시 Error => ' || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'60',P_SQLERRM, P_CHKID);
| RAISE er_PGM_ERROR ;
| END;
| 
| ----------------------------------
| -- 1.5. 계정소분류가 '05'(항목별그룹별지급총액) 인 경우
| ----------------------------------
| ELSIF C_CODE.ACCT_S_TYPE = '05' THEN
| 
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'VONG2',       P_PAY_ACTION_CD||'-C_CODE.ELEMENT_SET_CD:'|| C_CODE.ELEMENT_SET_CD
| ||'-P_BUSINESS_PLACE_CD:'||P_BUSINESS_PLACE_CD||'-P_LOCATION_CD:'||P_LOCATION_CD||'-P_CC_CD:'||P_CC_CD
| ||'-C_CODE.C_D_TYPE:'||C_CODE.C_D_TYPE||'-C_CODE.ACCT_CD:'||C_CODE.ACCT_CD||'-lv_cpn977.HEAD_TEXT:'||lv_cpn977.HEAD_TEXT
| ||'-ln_seq:'||ln_seq||'-C_CODE.ELEMENT_SET_CD:'||C_CODE.ELEMENT_SET_CD||'-C_CODE.ACCT_M_TYPE:'||C_CODE.ACCT_M_TYPE
| , P_CHKID);
| 
| BEGIN
| INSERT INTO TCPN977
| (
| ENTER_CD, PAY_ACTION_CD, SEQ
| , BUSINESS_PLACE_CD, LOCATION_CD, CC_CD
| , CD_KEY, ACCT_CD, RESULT_MON
| , HEAD_TEXT
| , REFER_TEXT, CHKDATE, CHKID,budget_cd,  invoice_seq , invoice_type ,department_cd
| )
| SELECT P_ENTER_CD, P_PAY_ACTION_CD, (NVL((SELECT MAX(SEQ) FROM TCPN977 WHERE ENTER_CD= P_ENTER_CD AND PAY_ACTION_CD=P_PAY_ACTION_CD), 0) + ROWNUM  * 10)
| , NVL(decode(C_CODE.ACCT_L_TYPE,'S182','2'),'1'), P_LOCATION_CD, '00000000'
| , C_CODE.C_D_TYPE, C_CODE.ACCT_TYPE3 ,NVL(DECODE(C_CODE.ACCT_TYPE2,-1,X.MON*-1,0,0),X.MON)
| , lv_cpn977.HEAD_TEXT
| , NVL(C_CODE.seg5, '0000'), SYSDATE, P_CHKID, C_CODE.ACCT_CD, C_CODE.SEQ , C_CODE.INV_TYPE, C_CODE.ACCT_L_TYPE
| FROM
| (
| 
| SELECT NVL(SUM(B.RESULT_MON * DECODE(C.INCLUDE_TYPE,'S',-1,1)),0) AS MON
| FROM TCPN203 A -- 급여대상자관리
| ,(SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN205
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| 
| UNION ALL
| SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN294 -- 개인별항목계산결과(최종결과삭제데이터)
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| 
| ) B -- 개인별 항목결과
| ,TCPN072 C -- 항목그룹관리Detail
| WHERE A.ENTER_CD          = P_ENTER_CD
| AND A.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND A.ENTER_CD          = B.ENTER_CD
| AND A.PAY_ACTION_CD     = B.PAY_ACTION_CD
| AND A.SABUN             = B.SABUN
| AND A.ENTER_CD          = C.ENTER_CD
| AND B.ELEMENT_CD        = C.ELEMENT_CD
| --      AND DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', F_COM_GET_BP_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', P_BUSINESS_PLACE_CD)
| --      AND DECODE(P_LOCATION_CD, 'ALL', '%', F_COM_GET_LOCATION_CD2(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_LOCATION_CD, 'ALL', '%', P_LOCATION_CD)
| --      AND DECODE(P_CC_CD, 'ALL', '%', F_COM_GET_COSTCENTER_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_CC_CD, 'ALL', '%', P_CC_CD)
| AND C.ELEMENT_SET_CD    = C_CODE.ELEMENT_SET_CD
| AND DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL',NVL(F_COM_GET_GRCODE_NOTE_VAL(A.ENTER_CD, 'H10030', f_com_get_manage_cd(A.ENTER_CD, A.SABUN, A.ORD_EYMD), 3), 'N')) = DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL','N','N','C','C','I','I')
| ) X
| WHERE X.MON <> 0
| ;
| EXCEPTION WHEN OTHERS THEN P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '계정소분류가 "05"(지급총액)인 집계금액 등록시 Error => ' || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'60',P_SQLERRM, P_CHKID);
| RAISE er_PGM_ERROR ;
| END;
| 
| ----------------------------------
| -- 1.6. 계정소분류가 '07'(급여기준사업장별) 인 경우
| ----------------------------------
| ELSIF C_CODE.ACCT_S_TYPE = '07' THEN
| BEGIN
| INSERT INTO TCPN977
| (
| ENTER_CD, PAY_ACTION_CD, SEQ
| , BUSINESS_PLACE_CD, LOCATION_CD, CC_CD
| , CD_KEY, ACCT_CD, RESULT_MON
| , HEAD_TEXT
| , REFER_TEXT, CHKDATE, CHKID,budget_cd , invoice_seq , invoice_type ,department_cd
| )
| SELECT DISTINCT P_ENTER_CD, P_PAY_ACTION_CD, (NVL((SELECT MAX(SEQ) FROM TCPN977 WHERE ENTER_CD= P_ENTER_CD AND PAY_ACTION_CD=P_PAY_ACTION_CD), 0) + ROWNUM  * 10)
| , NVL(decode(C_CODE.ACCT_L_TYPE,'S182','2'),'1'), X.BP_CD,'00000000'
| , C_CODE.C_D_TYPE, C_CODE.ACCT_TYPE3, NVL(DECODE(C_CODE.ACCT_TYPE2,-1,X.MON*-1,0,0),X.MON)
| , lv_cpn977.HEAD_TEXT || ' ' || X.NOTE
| --, (SELECT MAP_NM FROM TORG109 WHERE ENTER_CD = P_ENTER_CD AND MAP_TYPE_CD = '100' AND MAP_CD = BP_CD)
| , NVL(C_CODE.seg5, '0000')
| , SYSDATE, P_CHKID,C_CODE.ACCT_CD, C_CODE.SEQ , C_CODE.INV_TYPE, nvl(decode(P_ENTER_CD,'NVK',decode(BP_CD,'A010808','Y703','A010100','S182','A015500','S182')),'A513')
| FROM
| (SELECT '' AS NOTE
| ,  f_com_get_wrarea_cd(a.ENTER_CD, a.SABUN, a.ORD_EYMD,'1')/*F_COM_GET_BP_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)*/ AS BP_CD
| , NVL(SUM(B.RESULT_MON * DECODE(C.INCLUDE_TYPE,'S',-1,1)),0) AS MON
| FROM TCPN203 A -- 급여대상자관리
| ,(SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN205
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| 
| UNION ALL
| SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN294 -- 개인별항목계산결과(최종결과삭제데이터)
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| 
| ) B -- 개인별 항목결과
| ,TCPN072 C -- 항목그룹관리Detail
| WHERE A.ENTER_CD          = P_ENTER_CD
| AND A.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND A.ENTER_CD          = B.ENTER_CD
| AND A.PAY_ACTION_CD     = B.PAY_ACTION_CD
| AND A.SABUN             = B.SABUN
| AND A.ENTER_CD          = C.ENTER_CD
| AND B.ELEMENT_CD        = C.ELEMENT_CD
| --      AND DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', F_COM_GET_BP_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', P_BUSINESS_PLACE_CD)
| --      AND DECODE(P_LOCATION_CD, 'ALL', '%', F_COM_GET_LOCATION_CD2(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_LOCATION_CD, 'ALL', '%', P_LOCATION_CD)
| --      AND DECODE(P_CC_CD, 'ALL', '%', F_COM_GET_COSTCENTER_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_CC_CD, 'ALL', '%', P_CC_CD)
| AND C.ELEMENT_SET_CD    = C_CODE.ELEMENT_SET_CD
| AND DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL',NVL(F_COM_GET_GRCODE_NOTE_VAL(A.ENTER_CD, 'H10030', f_com_get_manage_cd(A.ENTER_CD, A.SABUN, A.ORD_EYMD), 3), 'N')) = DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL','N','N','C','C','I','I')
| GROUP BY f_com_get_wrarea_cd(a.ENTER_CD, a.SABUN, a.ORD_EYMD,'1')--F_COM_GET_BP_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)
| --                               , D.NOTE
| ) X
| WHERE X.MON <> 0
| ;
| EXCEPTION WHEN OTHERS THEN P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '계정소분류가 "08"(코스트센터별)인 집계금액 등록시 Error => ' || lv_cpn977.HEAD_TEXT || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'50',P_SQLERRM, P_CHKID);
| RAISE er_PGM_ERROR ;
| END;
| 
| ----------------------------------
| -- 1.7. 계정소분류가 '08'(LOCATION별) 인 경우
| ----------------------------------
| /* ELSIF C_CODE.ACCT_S_TYPE = '08' THEN
| BEGIN
| INSERT INTO TCPN977
| (
| ENTER_CD, PAY_ACTION_CD, SEQ
| , BUSINESS_PLACE_CD, LOCATION_CD, CC_CD
| , CD_KEY, ACCT_CD, RESULT_MON
| , HEAD_TEXT
| , REFER_TEXT, CHKDATE, CHKID
| )
| SELECT P_ENTER_CD, P_PAY_ACTION_CD, (NVL((SELECT MAX(SEQ) FROM TCPN977 WHERE ENTER_CD= P_ENTER_CD AND PAY_ACTION_CD=P_PAY_ACTION_CD), 0) + ROWNUM  * 10)
| , P_BUSINESS_PLACE_CD, P_LOCATION_CD, P_CC_CD
| , C_CODE.C_D_TYPE, C_CODE.ACCT_CD, X.MON
| , lv_cpn977.HEAD_TEXT || ' ' || X.NOTE
| --, F_COM_GET_LOCATION_NM(P_ENTER_CD, LOCATION_CD)
| ,C_CODE.ACCT_TYPE2
| , SYSDATE, P_CHKID
| FROM
| (SELECT '' AS NOTE
| , F_COM_GET_LOCATION_CD2(A.ENTER_CD, A.SABUN, A.ORD_EYMD) AS LOCATION_CD
| , NVL(SUM(B.RESULT_MON * DECODE(C.INCLUDE_TYPE,'S',-1,1)),0) AS MON
| FROM TCPN203 A -- 급여대상자관리
| ,(SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN205
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| 
| UNION ALL
| SELECT ENTER_CD, PAY_ACTION_CD, SABUN, ELEMENT_CD, RESULT_MON
| FROM TCPN294 -- 개인별항목계산결과(최종결과삭제데이터)
| WHERE ENTER_CD      = P_ENTER_CD
| AND PAY_ACTION_CD = P_PAY_ACTION_CD
| 
| ) B -- 개인별 항목결과
| ,TCPN072 C -- 항목그룹관리Detail
| WHERE A.ENTER_CD          = P_ENTER_CD
| AND A.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND A.ENTER_CD          = B.ENTER_CD
| AND A.PAY_ACTION_CD     = B.PAY_ACTION_CD
| AND A.SABUN             = B.SABUN
| AND A.ENTER_CD          = C.ENTER_CD
| AND B.ELEMENT_CD        = C.ELEMENT_CD
| --          AND DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', F_COM_GET_BP_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', P_BUSINESS_PLACE_CD)
| --          AND DECODE(P_LOCATION_CD, 'ALL', '%', F_COM_GET_LOCATION_CD2(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_LOCATION_CD, 'ALL', '%', P_LOCATION_CD)
| --          AND DECODE(P_CC_CD, 'ALL', '%', F_COM_GET_COSTCENTER_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_CC_CD, 'ALL', '%', P_CC_CD)
| AND C.ELEMENT_SET_CD    = C_CODE.ELEMENT_SET_CD
| AND DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL',NVL(F_COM_GET_GRCODE_NOTE_VAL(A.ENTER_CD, 'H10030', f_com_get_manage_cd(A.ENTER_CD, A.SABUN, A.ORD_EYMD), 3), 'N')) = DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL','N','N','C','C','I','I')
| GROUP BY F_COM_GET_LOCATION_CD2(A.ENTER_CD, A.SABUN, A.ORD_EYMD)
| --, D.NOTE
| ) X
| WHERE X.MON <> 0
| ;
| EXCEPTION WHEN OTHERS THEN P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '계정소분류가 "08"(코스트센터별)인 집계금액 등록시 Error => ' || lv_cpn977.HEAD_TEXT || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'50',P_SQLERRM, P_CHKID);
| RAISE er_PGM_ERROR ;
| END;   */
| 
| ----------------------------------
| -- 1.4. 계정소분류가 '09'(공제전지급총액) 인 경우
| ----------------------------------
| ELSIF C_CODE.ACCT_S_TYPE = '09' THEN
| 
| BEGIN
| INSERT INTO TCPN977
| (
| ENTER_CD, PAY_ACTION_CD, SEQ
| , BUSINESS_PLACE_CD, LOCATION_CD, CC_CD
| , CD_KEY, ACCT_CD, RESULT_MON
| , HEAD_TEXT
| , REFER_TEXT, CHKDATE, CHKID,budget_cd,  invoice_seq , invoice_type ,department_cd
| )
| SELECT P_ENTER_CD, P_PAY_ACTION_CD, (NVL((SELECT MAX(SEQ) FROM TCPN977 WHERE ENTER_CD= P_ENTER_CD AND PAY_ACTION_CD=P_PAY_ACTION_CD), 0) + ROWNUM  * 10)
| , NVL(decode(C_CODE.ACCT_L_TYPE,'S182','2'),'1'), P_LOCATION_CD, '00000000'
| , C_CODE.C_D_TYPE,C_CODE.ACCT_TYPE3, NVL(DECODE(C_CODE.ACCT_TYPE2,-1,X.MON  *-1,0,0),X.MON)
| , lv_cpn977.HEAD_TEXT
| , NVL(C_CODE.seg5, '0000'), SYSDATE, P_CHKID, C_CODE.ACCT_CD, C_CODE.SEQ , C_CODE.INV_TYPE, C_CODE.ACCT_L_TYPE
| FROM
| (SELECT NVL(SUM(B.TOT_EARNING_MON),0) AS MON -- 실지급액
| FROM TCPN203 A -- 급여대상자관리
| ,TCPN303 B -- 개인별 항목결과
| WHERE A.ENTER_CD          = P_ENTER_CD
| AND A.PAY_ACTION_CD     = P_PAY_ACTION_CD
| AND A.ENTER_CD          = B.ENTER_CD
| AND A.PAY_ACTION_CD     = B.PAY_ACTION_CD
| AND A.SABUN             = B.SABUN
| --          AND DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', F_COM_GET_BP_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_BUSINESS_PLACE_CD, 'ALL', '%', P_BUSINESS_PLACE_CD)
| --          AND DECODE(P_LOCATION_CD, 'ALL', '%', F_COM_GET_LOCATION_CD2(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_LOCATION_CD, 'ALL', '%', P_LOCATION_CD)
| --          AND DECODE(P_CC_CD, 'ALL', '%', F_COM_GET_COSTCENTER_CD(A.ENTER_CD, A.SABUN, A.ORD_EYMD)) = DECODE(P_CC_CD, 'ALL', '%', P_CC_CD)
| AND DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL',NVL(F_COM_GET_GRCODE_NOTE_VAL(A.ENTER_CD, 'H10030', f_com_get_manage_cd(A.ENTER_CD, A.SABUN, A.ORD_EYMD), 3), 'N')) = DECODE(C_CODE.ACCT_M_TYPE,'Z','ALL','N','N','C','C','I','I')
| ) X
| WHERE X.MON <> 0
| ;
| EXCEPTION WHEN OTHERS THEN P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '계정소분류가 "09"(공제전지급총액)인 집계금액 등록시 Error => ' || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'60',P_SQLERRM, P_CHKID);
| RAISE er_PGM_ERROR ;
| END;
| 
| END IF;
| 
| ln_seq := ln_seq + 1;
| 
| END LOOP;
| 
| COMMIT;
| 
| END P_PROC_PAY_DATA;
| 
| 
| BEGIN
| P_SQLCODE  := NULL;
| P_SQLERRM  := NULL;
| lv_cpn977  := NULL;
| 
| 
| 
| P_PARAM_CHECK(''); -- 파라미터 체크
| 
| P_DELETE_DATA(''); -- 기존자료 삭제처리
| 
| P_GET_PAYINFO(''); -- 급여일 정보 및 사업장 정보 조회
| 
| /*
| -- 계정소분류
| '00' : 전체
| '01' : 개인별
| '02' : 부서별
| '03' : 코스트센터별
| '04' : 실지급액
| '05' : 지급총액
| '06' : 전체(차감)
| '07' : 급여사업장별
| '08' : Location별
| 
| PAY_CD                 RUN_TYPE
| 급여코드     급여명          급여구분(공통코드C000001 )
| ------------------------------------------------------
| 01         급여         01-급여
| 02         인센티브     01-급여
| S1         퇴직금          04-퇴직금
| S2         퇴직중간     04-퇴직금
| S3         퇴직추계     04-퇴직금
| Y1         연말정산     Y0001-연말정산
| Y3         퇴직자정산   Y0001-연말정산
| 
| 
| */
| 
| --------------------------------------
| -- 1. 전표자료 발생 (근로소득(급상여)일 경우)
| --------------------------------------
| P_PROC_PAY_DATA('');
| 
| P_SQLCODE := 'OK';
| P_SQLERRM := '[' || lv_cpn201.PAY_ACTION_NM || ']전표자료를 생성하였습니다.';
| 
| COMMIT;
| 
| EXCEPTION WHEN er_PGM_ERROR THEN ROLLBACK;
| WHEN OTHERS       THEN ROLLBACK;
| P_SQLCODE := P_SQLCODE;
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'100',P_SQLERRM, P_CHKID);
| END P_CPN_GL_INS;
| 
| 
| 
| /
```
---
# P_TIM_SCHEDULE_CREATE.PRC

```diff
| 
| CREATE OR REPLACE  PROCEDURE "EHR_NG"."P_TIM_SCHEDULE_CREATE" (
| 
| P_SQLCODE        OUT VARCHAR2,
| P_SQLERRM        OUT VARCHAR2,
| P_ENTER_CD        IN VARCHAR2,
| P_SYM             IN VARCHAR2,
| P_EYM             IN VARCHAR2,
| P_WORK_ORG_CD     IN VARCHAR2,
| P_SABUN           IN VARCHAR2,
| P_CHKID           IN VARCHAR2
| )
| IS
| /******************************************************************************/
| /*                                                                            */
| /*                  (c) Copyright ISU System Inc. 2004                        */
| /*                         All Rights Reserved                                */
| /*                                                                            */
| /******************************************************************************/
| /* [생성 Table]                                                                */
| /*         일근무상세(개인별_정비)(TTIM120)                                           */
| /*                                                                            */
| /******************************************************************************/
| /* Date        In Charge       Description                                    */
| /*----------------------------------------------------------------------------*/
| /* 2013-09-30  Kosh           Initial Release                                 */
| /******************************************************************************/
| 
| --------- Local 변수 선언 -------------
| 
| 
| LV_BIZ_CD       TSYS903.BIZ_CD%TYPE := 'TIM';
| LV_OBJECT_NM    TSYS903.OBJECT_NM%TYPE := 'P_TIM_SCHEDULE_CREATE';
| LV_START_SEQ    NUMBER := 1;
| C_START_SEQ     NUMBER;
| LV_SEQ_CNT      NUMBER := 15;
| LV_TIM017_TIME_CD VARCHAR2(10) := '';
| 
| LV_WORK_ORG_CD    VARCHAR2(10) := '';
| 
| LV_S_YMD        VARCHAR2(8);
| LV_E_YMD        VARCHAR2(8);
| 
| /**/
| CURSOR CSR_YM(I_PER NUMBER)IS
| SELECT SUBSTR(SUN_DATE,1,6) AS WORK_YM
| , ROUND(I_PER/ (COUNT(1) OVER()) * ROW_NUMBER()OVER(ORDER BY SUBSTR(SUN_DATE,1,6))) AS CNT
| FROM TSYS007
| WHERE SUBSTR(SUN_DATE,1,6) BETWEEN P_SYM AND P_EYM
| GROUP BY SUBSTR(SUN_DATE,1,6)
| ;
| -- 조직구분예외사항에 등록된 근무조 정보
| 
| 
| 
| 
| --근무조 추출
| CURSOR CSR_WORK_ORG(C_YM VARCHAR2) IS
| -- 근무패턴에 등록된 근무조 정보
| SELECT A.*
| , B.MAP_NM AS WORK_ORG_NM
| FROM TTIM118 A, TORG109 B
| WHERE A.ENTER_CD = B.ENTER_CD
| AND A.WORK_ORG_CD = B.MAP_CD
| AND B.MAP_TYPE_CD = '500'
| AND A.ENTER_CD =P_ENTER_CD
| AND NVL(A.WORK_ORG_CD, ' ') LIKE NVL(P_WORK_ORG_CD,'%')
| AND C_YM BETWEEN SUBSTR(A.SDATE, 1, 6) AND SUBSTR(NVL(A.EDATE,'99991231'), 1, 6)
| ;
| 
| /* 근무패턴 추출*/
| CURSOR CSR_CAL_PTN (C_START_SEQ VARCHAR2, C_WORK_ORG_CD VARCHAR2, C_YM VARCHAR2) IS
| SELECT A.SUN_DATE AS YMD
| , A.SEQ AS SEQ
| --,B.TIME_CD AS TIME_CD  /*근무패턴 예외관리에 값이 있으면 우선시한다.*/
| , NVL((SELECT TIME_CD
| FROM TTIM122
| WHERE ENTER_CD = P_ENTER_CD
| AND YMD = A.SUN_DATE
| AND WORK_ORG_CD = C_WORK_ORG_CD), B.TIME_CD) AS TIME_CD
| FROM
| --(SELECT SUN_DATE, MOD((TO_DATE(SUN_DATE,'YYYYMMDD')-TO_DATE(P_YM||'01','YYYYMMDD'))+LV_START_SEQ, LV_SEQ_CNT)+1 as SEQ
| (SELECT SUN_DATE, MOD((TO_DATE(SUN_DATE, 'YYYYMMDD') -
| TO_DATE( CASE WHEN S.WORK_DAY_TYPE = 1 THEN TO_CHAR(ADD_MONTHS(TO_DATE(C_YM, 'YYYYMM'), -1), 'YYYYMM')|| STDW_S_DD
| ELSE C_YM||STDW_S_DD
| END, 'YYYYMMDD')) + C_START_SEQ, (SELECT COUNT(*)
| FROM TTIM119
| WHERE ENTER_CD = P_ENTER_CD
| AND WORK_ORG_CD = C_WORK_ORG_CD
| AND SDATE = (SELECT MAX(X.SDATE)
| FROM TTIM118 X
| WHERE X.ENTER_CD = P_ENTER_CD
| AND X.WORK_ORG_CD = C_WORK_ORG_CD
| AND CASE WHEN S.WORK_DAY_TYPE = 1 THEN TO_CHAR(ADD_MONTHS(TO_DATE(C_YM, 'YYYYMM'), -1), 'YYYYMM')||STDW_S_DD
| ELSE C_YM||STDW_S_DD
| END BETWEEN X.SDATE AND NVL(X.EDATE, '99991231'))))+1 AS SEQ
| FROM TSYS007 T
| , (SELECT *
| FROM TTIM004
| WHERE ROWNUM = 1) S
| WHERE T.SUN_DATE >= CASE WHEN S.WORK_DAY_TYPE = 1 THEN TO_CHAR(ADD_MONTHS(TO_DATE(C_YM, 'YYYYMM'),-1), 'YYYYMM')||STDW_S_DD
| ELSE C_YM||STDW_S_DD
| END
| AND T.SUN_DATE <= CASE WHEN S.WORK_DAY_TYPE = 1 THEN C_YM||STDW_E_DD
| ELSE C_YM||STDW_E_DD
| END
| ) A,
| (SELECT ROWNUM AS SEQ
| , TIME_CD
| , SDATE
| FROM (SELECT DISTINCT B.SEQ
| , B.TIME_CD
| , A.SDATE
| FROM TTIM118 A
| , TTIM119 B
| , TSYS007 T
| , (SELECT *
| FROM TTIM004
| WHERE ROWNUM = 1) S
| WHERE A.ENTER_CD = B.ENTER_CD
| AND A.WORK_ORG_CD = B.WORK_ORG_CD
| AND A.SDATE = B.SDATE
| AND A.ENTER_CD = P_ENTER_CD
| AND T.SUN_DATE BETWEEN A.SDATE AND NVL(A.EDATE, '99991231')
| AND A.WORK_ORG_CD = C_WORK_ORG_CD
| AND T.SUN_DATE >= CASE WHEN S.WORK_DAY_TYPE = 1 THEN TO_CHAR(ADD_MONTHS(TO_DATE(C_YM, 'YYYYMM'),-1), 'YYYYMM')||STDW_S_DD
| ELSE C_YM||STDW_S_DD
| END
| AND T.SUN_DATE <= CASE WHEN S.WORK_DAY_TYPE = 1 THEN C_YM||STDW_E_DD
| ELSE C_YM||STDW_E_DD
| END
| ORDER BY SEQ)
| ) B
| WHERE A.SEQ = B.SEQ
| ORDER BY SUN_DATE;
| 
| BEGIN
| 
| p_sqlcode  := NULL;
| p_sqlerrm  := NULL;
| 
| IF P_WORK_ORG_CD IS NULL THEN
| LV_WORK_ORG_CD := '%';
| ELSE
| LV_WORK_ORG_CD := P_WORK_ORG_CD;
| END IF;
| 
| -- 진행상태 이력 삭제
| BEGIN
| DELETE TSYS903
| WHERE ENTER_CD  = P_ENTER_CD
| AND BIZ_CD    = 'PROGRESS'
| AND OBJECT_NM = LV_OBJECT_NM;
| END;
| 
| -- 진행상태 이력 등록-------------------------------------------------------
| P_COM_SET_LOG(P_ENTER_CD, 'PROGRESS', LV_OBJECT_NM, '0' , '', P_CHKID);
| -------------------------------------------------------------------------
| 
| FOR C_YM IN CSR_YM(I_PER => 30) LOOP
| BEGIN
| FOR C_WORK_ORG_ARY IN CSR_WORK_ORG(C_YM => C_YM.WORK_YM) LOOP
| LV_SEQ_CNT   := 0;
| LV_START_SEQ := 0;
| 
| BEGIN
| DELETE FROM TTIM125
| WHERE ENTER_CD = P_ENTER_CD
| AND YMD IN (SELECT SUN_DATE
| FROM TSYS007 T
| , (SELECT * FROM TTIM004 WHERE ROWNUM = 1) S
| WHERE T.SUN_DATE >= CASE WHEN S.WORK_DAY_TYPE = 1 THEN TO_CHAR(ADD_MONTHS(TO_DATE(C_YM.WORK_YM, 'YYYYMM'),-1), 'YYYYMM')||STDW_S_DD
| ELSE C_YM.WORK_YM||STDW_S_DD
| END
| AND T.SUN_DATE  <= CASE WHEN S.WORK_DAY_TYPE = 1 THEN C_YM.WORK_YM||STDW_E_DD
| ELSE C_YM.WORK_YM||STDW_E_DD
| END)
| AND WORK_ORG_CD = C_WORK_ORG_ARY.WORK_ORG_CD ;
| END;
| 
| /* 근무패턴정보상에서 시작패턴 번호 추출함 */
| BEGIN
| SELECT COUNT(B.SEQ)
| , MOD((TO_DATE(CASE WHEN S.WORK_DAY_TYPE = 1 THEN TO_CHAR(ADD_MONTHS(TO_DATE(C_YM.WORK_YM, 'YYYYMM'),-1), 'YYYYMM')||STDW_S_DD
| ELSE C_YM.WORK_YM||STDW_S_DD
| END, 'YYYYMMDD') - TO_DATE(A.SDATE,'YYYYMMDD')), COUNT(B.SEQ))
| INTO LV_SEQ_CNT
| , LV_START_SEQ
| FROM TTIM118 A
| , TTIM119 B
| , TSYS007 T
| , (SELECT * FROM TTIM004 WHERE ROWNUM = 1) S
| WHERE A.ENTER_CD = B.ENTER_CD
| AND A.WORK_ORG_CD = B.WORK_ORG_CD
| AND A.SDATE = B.SDATE
| AND A.ENTER_CD = P_ENTER_CD
| --AND P_YM||'01' BETWEEN A.SDATE AND NVL(A.EDATE, '99991231')
| AND T.SUN_DATE BETWEEN A.SDATE AND NVL(A.EDATE, '99991231')
| AND A.WORK_ORG_CD = C_WORK_ORG_ARY.WORK_ORG_CD
| AND T.SUN_DATE >= CASE WHEN S.WORK_DAY_TYPE = 1 THEN TO_CHAR(ADD_MONTHS(TO_DATE(C_YM.WORK_YM, 'YYYYMM'),-1), 'YYYYMM')||STDW_S_DD
| ELSE C_YM.WORK_YM||STDW_S_DD
| END
| AND T.SUN_DATE <= CASE WHEN S.WORK_DAY_TYPE = 1 THEN C_YM.WORK_YM||STDW_E_DD
| ELSE C_YM.WORK_YM||STDW_E_DD
| END
| GROUP BY A.SDATE
| , S.WORK_DAY_TYPE
| , S.STDW_S_DD ;
| 
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := sqlerrm || ' [근무패턴이 제대로 입력되어 있지 않습니다.] 근무조 : '||C_WORK_ORG_ARY.WORK_ORG_NM;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'10', P_SQLERRM, P_CHKID);
| -- RETURN;
| WHEN OTHERS THEN
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'20', P_SQLERRM, P_CHKID);
| --RETURN;
| END;
| 
| FOR C_CAL_PTN IN CSR_CAL_PTN(C_START_SEQ => LV_START_SEQ, C_WORK_ORG_CD => C_WORK_ORG_ARY.WORK_ORG_CD, C_YM => C_YM.WORK_YM) LOOP
| BEGIN
| IF C_CAL_PTN.SEQ > 0 THEN
| INSERT INTO TTIM125 ( ENTER_CD
| , YMD
| , WORK_ORG_CD
| , TIME_CD
| , CHKDATE
| , CHKID
| ) VALUES (
| P_ENTER_CD
| , C_CAL_PTN.YMD
| , C_WORK_ORG_ARY.WORK_ORG_CD
| , C_CAL_PTN.TIME_CD
| , SYSDATE
| , P_CHKID );
| ELSE
| ROLLBACK;
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := ' [일근무패턴 시작일이 근무조 시작일에 포함되지 않습니다. 일근무패턴 시작일을 수정해 주시기 바랍니다.]' || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'30', P_SQLERRM, P_CHKID);
| END IF;
| EXCEPTION
| WHEN OTHERS THEN
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := ' [일근무 자료 Insert 시 Error (생성일:'||C_CAL_PTN.YMD||', '||'근무조:'||C_WORK_ORG_ARY.WORK_ORG_NM||')]' || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'40', P_SQLERRM, P_CHKID);
| END;
| 
| 
| END LOOP;
| END LOOP;
| 
| 
| -- 진행상태 이력 등록-------------------------------------------------------
| P_COM_SET_LOG(P_ENTER_CD, 'PROGRESS', LV_OBJECT_NM, C_YM.CNT, C_YM.WORK_YM, P_CHKID);
| -------------------------------------------------------------------------
| 
| END;
| 
| COMMIT;
| END LOOP;
| 
| /*
| IF P_SQLCODE IS NOT NULL THEN
| ROLLBACK;
| RETURN;
| ELSE
| COMMIT;
| END IF;
| */
| 
| -- 진행상태 이력 등록-------------------------------------------------------
| P_COM_SET_LOG(P_ENTER_CD, 'PROGRESS', LV_OBJECT_NM, '30', 'DEL TTIM121 START', P_CHKID);
| -------------------------------------------------------------------------
| 
| ----------------------------------------------------------------------------------------------------------------------------
| -- 개인별근무스케쥴 등록 ( TTIM123_v ) 도이치 2020.01.09
| ----------------------------------------------------------------------------------------------------------------------------
| FOR C_YM IN CSR_YM(I_PER => 10) LOOP
| -- 기간 월초~ 월말
| LV_S_YMD := C_YM.WORK_YM || '01';
| LV_E_YMD := TO_CHAR(LAST_DAY(TO_DATE(C_YM.WORK_YM, 'YYYYMM')), 'YYYYMMDD');
| BEGIN
| -- 대상 삭제
| DELETE FROM TTIM121
| WHERE ENTER_CD = P_ENTER_CD
| --AND YMD BETWEEN LV_S_YMD AND LV_E_YMD
| AND SUBSTR(YMD, 1, 6) = C_YM.WORK_YM
| 
- AND DECODE( P_WORK_ORG_CD, NULL, '1', WORK_ORG_CD ) = DECODE( P_WORK_ORG_CD, NULL, '1', P_WORK_ORG_CD )
- 
+ --       AND DECODE( P_WORK_ORG_CD, NULL, '1', WORK_ORG_CD ) = DECODE( P_WORK_ORG_CD, NULL, '1', P_WORK_ORG_CD )
+ 
| AND DECODE( P_SABUN, NULL, '1', SABUN )             = DECODE( P_SABUN, NULL, '1', P_SABUN );
| 
| COMMIT;
| EXCEPTION
| WHEN OTHERS THEN
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '[TTIM121] 개인스케쥴 대상 삭제 시 오류 발생 ===>' || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'991', P_SQLERRM, P_CHKID);
| ROLLBACK;
| RETURN;
| END;
| -- 진행상태 이력 등록-------------------------------------------------------
| P_COM_SET_LOG(P_ENTER_CD, 'PROGRESS', LV_OBJECT_NM, 30 + C_YM.CNT, 'DEL-' || C_YM.WORK_YM, P_CHKID);
| -------------------------------------------------------------------------
| END LOOP;
| -- 진행상태 이력 등록-------------------------------------------------------
| P_COM_SET_LOG(P_ENTER_CD, 'PROGRESS', LV_OBJECT_NM, '40', 'DEL TTIM121 END', P_CHKID);
| -------------------------------------------------------------------------
| 
| FOR C_YM IN CSR_YM(I_PER => 60) LOOP
| 
| LV_S_YMD := C_YM.WORK_YM || '01';
| LV_E_YMD := TO_CHAR(LAST_DAY(TO_DATE(C_YM.WORK_YM, 'YYYYMM')), 'YYYYMMDD');
| 
| BEGIN
| -- 대상 생성
| INSERT INTO TTIM121 T
| (  T.ENTER_CD, T.WORK_ORG_CD, T.SABUN, T.YMD, T.TIME_CD, T.BUSINESS_PLACE_CD, T.WORK_GRP_CD, T.CHKDATE, T.CHKID )
| 
| SELECT A.ENTER_CD, B.WORK_ORG_CD, A.SABUN, B.YMD, B.TIME_CD, C.BUSINESS_PLACE_CD, D.WORK_GRP_CD, SYSDATE, P_CHKID
| FROM (
| SELECT A.ENTER_CD
| , A.SABUN
| , A.EMP_YMD
| , A.RET_YMD
| , B.ORG_CD
| , C.YMD
| , ( SELECT MAX(MAP_CD)
| FROM TORG107 X
| WHERE X.ENTER_CD    = P_ENTER_CD
| AND X.MAP_TYPE_CD = '500' -- 근무조 고정코드
| AND X.ORG_CD      = B.ORG_CD
| AND C.YMD BETWEEN X.SDATE AND NVL(X.EDATE, '99991231')
| ) AS BS_ORG_CD  -- 기본 근무조
| , ( SELECT MAX(MAP_CD)
| FROM TORG113 X
| WHERE X.ENTER_CD    = P_ENTER_CD
| AND X.MAP_TYPE_CD = '500' -- 근무조 고정코드
| AND X.SABUN       = A.SABUN
| AND C.YMD BETWEEN X.SDATE AND NVL(X.EDATE, '99991231')
| ) AS EX_ORG_CD -- 예외 근무조
| FROM THRM100 A, THRM151 B
| , (--SELECT SUN_DATE AS YMD
| --   FROM TSYS007
| -- WHERE SUN_DATE BETWEEN LV_S_YMD AND LV_E_YMD
| 
| SELECT TO_CHAR(TO_DATE(LV_S_YMD, 'YYYYMMDD')+(LEVEL - 1), 'YYYYMMDD') YMD
| FROM DUAL
| CONNECT BY TO_DATE(LV_S_YMD, 'YYYYMMDD')+(LEVEL-1) <= TO_DATE (LV_E_YMD, 'YYYYMMDD')
| ) C
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.ENTER_CD = B.ENTER_CD
| AND A.SABUN    = B.SABUN
| AND C.YMD BETWEEN B.SDATE AND NVL (B.EDATE, '99991231')
| AND B.STATUS_CD      <> 'RAA'
| --AND B.MANAGE_CD IN ( '001' , '002', '003' ) -- 정규직,계약직,임원
| AND DECODE( P_SABUN, NULL, '1', B.SABUN )             = DECODE( P_SABUN, NULL, '1', P_SABUN )
| ) A
| , (
| SELECT A.ENTER_CD, A.WORK_ORG_CD, A.YMD, A.TIME_CD
| FROM TTIM125 A
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.YMD BETWEEN LV_S_YMD AND LV_E_YMD
| ) B
| , BP_V C
| , TTIM118 D
| WHERE A.ENTER_CD    = B.ENTER_CD
| AND NVL(A.EX_ORG_CD, A.BS_ORG_CD) = B.WORK_ORG_CD
| AND A.YMD         = B.YMD
| AND A.ENTER_CD    = C.ENTER_CD
| AND A.SABUN       = C.SABUN
| AND A.YMD BETWEEN C.SDATE AND NVL (C.EDATE,'99991231')
| AND DECODE( P_WORK_ORG_CD, NULL, '1', NVL(A.EX_ORG_CD, A.BS_ORG_CD) ) = DECODE( P_WORK_ORG_CD, NULL, '1', P_WORK_ORG_CD )
| 
| AND A.ENTER_CD = D.ENTER_CD
| AND NVL(A.EX_ORG_CD, A.BS_ORG_CD) = D.WORK_ORG_CD
| AND A.YMD BETWEEN D.SDATE AND NVL (D.EDATE,'99991231');
| 
| COMMIT;
| 
| EXCEPTION
| WHEN OTHERS THEN
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := '[TTIM121] 개인스케쥴 대상 등록 시 오류 발생 ===>' || sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'992', P_SQLERRM, P_CHKID);
| ROLLBACK;
| RETURN;
| END;
| 
| 
| -- 진행상태 이력 등록-------------------------------------------------------
| P_COM_SET_LOG(P_ENTER_CD, 'PROGRESS', LV_OBJECT_NM, (50+C_YM.CNT) , C_YM.WORK_YM, P_CHKID);
| -------------------------------------------------------------------------
| 
| END LOOP;
| 
| -- 진행상태 이력 등록-------------------------------------------------------
| P_COM_SET_LOG(P_ENTER_CD, 'PROGRESS', LV_OBJECT_NM, '100' , '', P_CHKID);
| -------------------------------------------------------------------------
| 
| 
| COMMIT;
| 
| 
| EXCEPTION
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := P_SQLCODE;
| P_SQLERRM := sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM, '100', P_SQLERRM, P_CHKID);
| END P_TIM_SCHEDULE_CREATE ;
| 
| 
| 
| /
```
---
# P_TIM_UNCOMMON_MAIL_DETAIL.PRC

```diff
| 
| CREATE OR REPLACE  PROCEDURE "EHR_NG"."P_TIM_UNCOMMON_MAIL_DETAIL" (
| P_SQLCODE            OUT  VARCHAR2,
| P_SQLERRM            OUT  VARCHAR2,
| P_ENTER_CD            IN  VARCHAR2,
| P_CHKID               IN  VARCHAR2
| )
| --******************************************************************************--
| --                                                                              --
| --                    (c) Copyright ISU System Inc. 2004                        --
| --                           All Rights Reserved                                --
| --                                                                              --
| --******************************************************************************--
| --  PROCEDURE NAME : P_TIM_UNCOMMON_MAIL_DETAIL                                     --
| --             이상근태 신청건 MAIL
| --******************************************************************************--
| --  [ 참조 TABLE ]                                                               --
| --                                                                              --
| --   TTIM301, TSYS996
| --******************************************************************************--
| --  [ 생성 TABLE ]                                                               --
| --  이상근태 신청건 ( TTIM301 )                                          --
| --******************************************************************************--
| --  [ PRC 개요 ]                                                                 --
| --                                                                              --
| --******************************************************************************--
| --  [ PRC 호출 ]                                                                 --
| --            이상근태 신청건 MAIL (JOB 등록 대상)
| --******************************************************************************--
| -- Date        In Charge       Description                                      --
| ----------------------------------------------------------------------------------
| -- 20210819                 Initial Release                                     --
| --******************************************************************************--
| IS
| e_user_no_data      EXCEPTION;
| lv_biz_cd           TSYS903.BIZ_CD%TYPE := 'TIM';
| lv_object_nm        TSYS903.OBJECT_NM%TYPE := 'P_TIM_UNCOMMON_MAIL_DETAIL';
| 
| --mail관련
| LV_MAIL_BIZ_CD      VARCHAR2(100):= 'TTIM301';
| LV_MAIL_JOB         VARCHAR2(100):= 'MAIL';
| LV_MAIL_SEQ         VARCHAR2(100);
| LV_MAIL_SEQ_SUM     VARCHAR2(100);
| 
| LV_MAIL_FROM        VARCHAR2(100);
| LV_MAIL_FROM_DEFAULT  VARCHAR2(100) := 'ehrSystem';
| LV_MAIL_TITLE       VARCHAR2(300) := '[e-HR][인사시스템] 이상근태 신청건';
| 
| LV_MAIL_CONTENT     CLOB;
| LV_TMP_CONTENT      CLOB;
| LV_TMP_DATA         CLOB;
| LV_CONTENT_DATA_CNT NUMBER := 0;
| 
| 
| ------------------------
| --사업장정보(급여)
| ------------------------
| CURSOR MAP_DATA IS
| SELECT '1' AS MAP_CD, '영주사업장' AS MAP_NM, 'TSYS005.T99000.NOTE1' AS REFER FROM DUAL
| UNION ALL
| SELECT '2' AS MAP_CD, '서울사업장' AS MAP_NM, 'TSYS005.T99000.NOTE2' AS REFER FROM DUAL
| UNION ALL
| SELECT '3' AS MAP_CD, '울산사업장' AS MAP_NM, 'TSYS005.T99000.NOTE3' AS REFER FROM DUAL
| UNION ALL
| SELECT '4' AS MAP_CD, '두바이사업장' AS MAP_NM, 'TSYS005.T99000.NOTE4' AS REFER FROM DUAL
| ;
| 
| 
| ------------------------
| --수신자 데이타
| --비고1:영주, 비고2:서울, 비고3:울산, 비고4:두바이
| ------------------------
| CURSOR MAILTO_DATA(P_MAP_CD VARCHAR2) IS
| SELECT MAP_CD
| , MAP_NM
| , MAIL_TO
| , CODE_NM AS NAME
| , SEQ
| , ENTER_CD
| , ROW_NUMBER() OVER ( PARTITION BY MAP_CD ORDER BY ENTER_CD, MAP_CD, SEQ ) AS SEQNUM
| , COUNT(*) OVER(PARTITION BY 1) AS CNT
| FROM(
| SELECT '1' AS MAP_CD, '영주사업장' AS MAP_NM , A.NOTE1 AS MAIL_TO, A.CODE_NM, A.SEQ,  A.ENTER_CD FROM TSYS005 A WHERE A.ENTER_CD = P_ENTER_CD AND A.GRCODE_CD = 'T99000'
| UNION ALL
| SELECT '2' AS MAP_CD, '서울사업장' AS MAP_NM, A.NOTE2 AS MAIL_TO, A.CODE_NM, A.SEQ, A.ENTER_CD  FROM TSYS005 A WHERE A.ENTER_CD = P_ENTER_CD AND A.GRCODE_CD = 'T99000'
| UNION ALL
| SELECT '3' AS MAP_CD, '울산사업장' AS MAP_NM, A.NOTE3 AS MAIL_TO, A.CODE_NM, A.SEQ, A.ENTER_CD  FROM TSYS005 A WHERE A.ENTER_CD = P_ENTER_CD AND A.GRCODE_CD = 'T99000'
| UNION ALL
| SELECT '4' AS MAP_CD, '두바이사업장' AS MAP_NM, A.NOTE4 AS MAIL_TO, A.CODE_NM, A.SEQ, A.ENTER_CD  FROM TSYS005 A WHERE A.ENTER_CD = P_ENTER_CD AND A.GRCODE_CD = 'T99000'
| )
| WHERE MAP_CD = P_MAP_CD
| 
+ AND CODE_NM IN ('HR팀장', '노무팀장', '노무담당자', '급여담당자') --20211013 add
+ 
| ORDER BY ENTER_CD, MAP_CD, SEQ
| ;
| 
| ------------------------
| --메일내용 데이타
| --대상자쿼리
| --1.전일에 최종승인된 근태신청건중에 근무차감이 발생되는 근태신청건을 메일로 발송
| ------------------------
| CURSOR CONTENT_DATA(P_MAP_CD VARCHAR2) IS
| SELECT F_COM_GET_ORG_NM2(A.ENTER_CD, A.SABUN, A.S_YMD) AS ORG_NM
| , A.SABUN
| , F_COM_GET_NAMES(A.ENTER_CD, A.SABUN) AS SABUN_NM
| , A.S_YMD
| , A.E_YMD
| 
- , A.REQ_S_HM
- , A.REQ_E_HM
- 
+ , SUBSTR(A.REQ_S_HM,1,2) ||':'|| SUBSTR(A.REQ_S_HM,3,4) AS REQ_S_HM  --20211013 add
+ , SUBSTR(A.REQ_E_HM,1,2) ||':'|| SUBSTR(A.REQ_E_HM,3,4) AS REQ_E_HM  --20211013 add
+ 
| , A.GNT_CD
| , C.GNT_NM
| , NVL(A.GNT_REQ_RESON,'-') AS GNT_REQ_RESON
| , F_COM_GET_MAP_CD(A.ENTER_CD, '100',  A.SABUN) AS MAP_CD--급여사업장
| , F_COM_GET_MAP_NM(A.ENTER_CD, '100',  A.SABUN) AS MAP_NM
| , A.APPL_SEQ
| , A.ENTER_CD
| FROM TTIM301 A
| , THRI103 B
| , TTIM014 C
| WHERE A.ENTER_CD = B.ENTER_CD
| AND A.APPL_SEQ = B.APPL_SEQ
| AND A.ENTER_CD = C.ENTER_CD
| AND A.GNT_CD   = C.GNT_CD
| AND A.ENTER_CD = P_ENTER_CD
| AND B.APPL_YMD = TRUNC(SYSDATE) - 1  --테스트데이타 20210819
| AND B.APPL_STATUS_CD = '99'
| AND A.GNT_CD IN (SELECT C.GNT_CD
| FROM TTIM014 C
| WHERE C.ENTER_CD = P_ENTER_CD
| AND C.WORK_CD = '9010')
| AND A.MAIL_SEQ IS NULL
| AND F_COM_GET_MAP_CD(A.ENTER_CD, '100',  A.SABUN) = P_MAP_CD
| ;
| 
| 
| BEGIN
| 
| 
| ------------------------
| -- 사업장별 조회
| ------------------------
| FOR A_DATA IN MAP_DATA
| LOOP
| 
| ------------------------
| -- 메일 양식 조회
| ------------------------
| BEGIN
| SELECT SUBSTR(TAG, INSTR( TAG, 'mailFrom:')+9, INSTR( TAG, ',', INSTR( TAG, 'mailFrom:') )- INSTR( TAG, 'mailFrom:')-9) AS MAIL_FROM
| , MAIL_CONTENT
| --, MAIL_TITLE
| INTO LV_MAIL_FROM, LV_MAIL_CONTENT --,lv_mail_title
| FROM (
| SELECT REGEXP_REPLACE(TITLE , '<[^>]*>', '')  AS MAIL_TITLE
| , CONTENTS AS MAIL_CONTENT
| , REPLACE(TAG,'''') AS TAG
| FROM TSYS710 A
| WHERE BBS_CD   = F_COM_GET_STD_CD_VALUE(TRIM(P_ENTER_CD), 'MAIL_FORMAT')
| AND ENTER_CD = P_ENTER_CD
| AND REPLACE(TAG,'''') LIKE '%bizCd:COMMON'||'%'
| AND REPLACE(TAG,'''') LIKE '%job:MAIL'||'%'
| AND ROWNUM = 1
| );
| EXCEPTION
| WHEN OTHERS THEN
| LV_MAIL_FROM := LV_MAIL_FROM_DEFAULT;
| LV_MAIL_CONTENT := '<p><b><span style="font-size: 18pt;"><u>@@제목@@</u></span></b></p><p><br>@@내용@@</p>';
| END;
| 
| 
| LV_TMP_CONTENT := LV_MAIL_CONTENT;
| LV_TMP_CONTENT := REPLACE( LV_TMP_CONTENT, '@@제목@@', LV_MAIL_TITLE );
| LV_TMP_CONTENT := REPLACE( LV_TMP_CONTENT, '@@발송일시@@', '발송일시 : '|| TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS'));
| 
| --부서	사번	성명	시작일자	종료일자	시작시간	종료시간	근태구분	사유
| LV_TMP_DATA := '<BR><table><tr>'||
| '<th style="text-align:center; border: 1px solid;">부서</td>'||
| '<th style="text-align:center; border: 1px solid;">사번</td>'||
| '<th style="text-align:center; border: 1px solid;">성명</td>'||
| '<th style="text-align:center; border: 1px solid;">시작일자</td>'||
| '<th style="text-align:center; border: 1px solid;">종료일자</td>'||
| '<th style="text-align:center; border: 1px solid;">시작시간</td>'||
| '<th style="text-align:center; border: 1px solid;">종료시간</td>'||
| '<th style="text-align:center; border: 1px solid;">근태구분</td>'||
| '<th style="text-align:center; border: 1px solid;">사유</td></tr>';
| 
| 
| ------------------------
| -- 메일내용 조회
| ------------------------
| LV_CONTENT_DATA_CNT := 0;
| FOR C_DATA IN CONTENT_DATA(A_DATA.MAP_CD)
| LOOP
| LV_CONTENT_DATA_CNT := LV_CONTENT_DATA_CNT +1;
| LV_TMP_DATA := LV_TMP_DATA||
| '<tr>'||
| '<td style="text-align:center; border: 1px solid; font-size:12px;">'||C_DATA.ORG_NM||'</td>'||
| '<td style="text-align:center; border: 1px solid;font-size:12px;">'||C_DATA.SABUN||'</td>'||
| '<td style="text-align:center; border: 1px solid;font-size:12px;">'||C_DATA.SABUN_NM||'</td>'||
| '<td style="text-align:center; border: 1px solid;font-size:12px;">'||TO_CHAR(TO_DATE(C_DATA.S_YMD,'YYYY-MM-DD'),'YYYY-MM-DD')||'</td>'||
| '<td style="text-align:center; border: 1px solid;font-size:12px;">'||TO_CHAR(TO_DATE(C_DATA.E_YMD,'YYYY-MM-DD'),'YYYY-MM-DD')||'</td>'||
| 
- '<td style="text-align:center; border: 1px solid;font-size:12px;">'||TO_CHAR(TO_DATE(C_DATA.E_YMD,'YYYY-MM-DD HH24:MI:SS'),'YYYY-MM-DD HH24:MI:SS')||'</td>'||
- '<td style="text-align:center; border: 1px solid;font-size:12px;">'||TO_CHAR(TO_DATE(C_DATA.E_YMD,'YYYY-MM-DD HH24:MI:SS'),'YYYY-MM-DD HH24:MI:SS')||'</td>'||
- 
+ '<td style="text-align:center; border: 1px solid;font-size:12px;">'|| C_DATA.REQ_S_HM ||'</td>'||  --20211013 add
+ '<td style="text-align:center; border: 1px solid;font-size:12px;">'|| C_DATA.REQ_E_HM ||'</td>'||  --20211013 add
+ 
| '<td style="text-align:center; border: 1px solid;font-size:12px;">'||C_DATA.GNT_NM||'</td>'||
| '<td style="text-align:center; border: 1px solid;font-size:12px;">'||C_DATA.GNT_REQ_RESON||'</td>'||
| '</tr>';
| END LOOP;
| 
| LV_TMP_DATA := LV_TMP_DATA|| '</table>';
| LV_TMP_CONTENT := REPLACE( LV_TMP_CONTENT, '@@내용@@', LV_TMP_DATA );
| 
| 
| ------------------------
| -- 인사담당 수신자 메일로 발송할 내역 생성
| ------------------------
| IF LV_CONTENT_DATA_CNT > 0 THEN --메일 내용이 존재하는 경우
| FOR M_DATA IN MAILTO_DATA(A_DATA.MAP_CD)
| LOOP
| BEGIN
| 
| LV_MAIL_SEQ := F_COM_GET_SEQ('MAIL');
| 
| IF M_DATA.SEQNUM = 1 THEN
| LV_MAIL_SEQ_SUM := LV_MAIL_SEQ;
| END IF;
| 
| IF M_DATA.SEQNUM> 1 AND M_DATA.SEQNUM = M_DATA.CNT THEN
| LV_MAIL_SEQ_SUM := LV_MAIL_SEQ_SUM||'~'||LV_MAIL_SEQ;
| END IF;
| 
| 
| INSERT INTO TSYS996( ENTER_CD, SEQ, BIZ_CD, SEND_TYPE, SEND_CNT, RCV_NAME, TITLE, SEND_SABUN, SEND_ADDR, SEND_TIME, CONTENTS, SUCCESS_YN, LOG, CC_NAME, INSERT_DATE )
| VALUES  ( P_ENTER_CD
| , LV_MAIL_SEQ
| , LV_MAIL_BIZ_CD
| , '0'
| , '1'
| , M_DATA.MAIL_TO||';'||M_DATA.NAME --수신자
| , LV_MAIL_TITLE
| , 'e-HR System'
| , LV_MAIL_FROM   --발신자
| , TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS')
| , LV_TMP_CONTENT
| , 'N'
| , ''
| , NULL
| , SYSDATE );
| 
| EXCEPTION
| WHEN OTHERS THEN
| P_SQLCODE := SQLCODE;
| P_SQLERRM := 'TSYS996.SEQ : ' || LV_MAIL_SEQ || '==> 메일전송 내역 저장 시 => ' || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'STEP_10',P_SQLERRM, P_CHKID);
| END;
| END LOOP;
| 
| ------------------------
| -- 메일순번 갱신
| ------------------------
| FOR C_DATA IN CONTENT_DATA(A_DATA.MAP_CD)
| LOOP
| BEGIN
| UPDATE TTIM301 A
| SET A.MAIL_SEQ = LV_MAIL_SEQ_SUM
| /*, CHKDATE  = SYSDATE
| , CHKID    = P_CHKID*/
| WHERE A.ENTER_CD = C_DATA.ENTER_CD
| AND A.SABUN    = C_DATA.SABUN
| AND A.S_YMD    = C_DATA.S_YMD
| AND A.E_YMD    = C_DATA.E_YMD
| AND A.REQ_S_HM = C_DATA.REQ_S_HM
| AND A.REQ_E_HM = C_DATA.REQ_E_HM
| AND A.GNT_CD = C_DATA.GNT_CD
| AND A.GNT_REQ_RESON = C_DATA.GNT_REQ_RESON
| AND A.APPL_SEQ = C_DATA.APPL_SEQ;
| EXCEPTION
| WHEN OTHERS THEN
| P_SQLCODE := SQLCODE;
| P_SQLERRM := 'TTIM301.MAIL_SEQ : ' || LV_MAIL_SEQ || '==> 메일순번 갱신 시 => ' || SQLERRM;
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'STEP_20',P_SQLERRM, P_CHKID);
| END;
| END LOOP;
| END IF; -- IF LV_CONTENT_DATA_CNT > 0 THEN --메일 내용이 존재하는 경우
| 
| END LOOP;
| 
| COMMIT;
| 
| P_SQLCODE :='S'; --성공
| 
| EXCEPTION
| WHEN e_user_no_data THEN
| P_SQLCODE := 'S';
| P_SQLERRM := '메일 발송할 내역이 없습니다.';
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'STEP_100',P_SQLERRM, P_CHKID);
| WHEN OTHERS THEN
| ROLLBACK;
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRM := NVL(P_SQLERRM,SQLERRM);
| P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'STEP_100',P_SQLERRM, P_CHKID);
| END ;
| 
| 
| 
| /
```
---
# P_TIM_WORK_HOUR_CHG_AF.PRC

```diff
| 
| CREATE OR REPLACE  PROCEDURE "EHR_NG"."P_TIM_WORK_HOUR_CHG_AF" (
| 
| P_SQLCODE             OUT VARCHAR2,
| P_SQLERRNM            OUT VARCHAR2,
| P_ENTER_CD             IN  VARCHAR2,
| P_S_YMD                IN  VARCHAR2,
| P_E_YMD                IN  VARCHAR2,
| P_SABUN                IN  VARCHAR2, /*NULL이면 전체*/
| P_BUSINESS_PLACE_CD    IN  VARCHAR2, /*NULL이면 전체*/
| P_CHKID                IN  VARCHAR2
| )
| IS
| /********************************************************************************/
| /*                                                                              */
| /*                    (c) Copyright ISU System Inc. 2004                        */
| /*                           All Rights Reserved                                */
| /*                                                                              */
| /********************************************************************************/
| /*  PROCEDURE NAME : P_TIM_WORK_HOUR_CHG_OSSTEM                                 */
| /*                                                                              */
| /*                  세콤에서 취합한 데이타를 토대로 근무시간 생성                        */
| /********************************************************************************/
| /*  [ 참조 TABLE ]                                                                */
| /*                                                                              */
| /********************************************************************************/
| /*  [ 생성 TABLE ]                                                               */
| /*                                                                              */
| /*     TTIM335 : 근무시간변경이력                                                   */
| /*     TTIM337 : 근무시간세부내역_임시                                               */
| /********************************************************************************/
| /*  [ 삭제 TABLE ]                                                              */
| /*                                                                              */
| /*                                                                              */
| /********************************************************************************/
| /*  [ PRC 개요 ]                                                                */
| /*                                                                              */
| /*
| 1. 세콤근무데이타로 부터 근무시간변경이력(TTIM335)으로 데이타 이관
| : 근태, 근무일, 출근시간, 퇴근시간 등을 등록
| 2. 근무시간변경이력에서는 근무일의 근태처리에 대해서 1차적으로 체크함
| Case1.  출퇴근 데이타가 없을때 TTIM301상의 근태데이타 유무 확인하여 등록
| Case2. 출퇴근 데이타가 없고 TTIM301상의 데이타도 없으면 무단결근 처리
| Case3.  근태종류가 반차,  출장,   교육등은 출퇴근기록이 있더라도 등록한다.
| 3. 근무시간변경이력에 대해서 근무시간세부내역에 대해서 산출한다.
| : 일근무상세(TTIM120_V)상에 설정된 근무시간코드를 기준으로 일일근무일정에
| 대한 근무시간을 산출함.(각 근무코드별로 데이타 산출)                                                   */
| /********************************************************************************/
| /*  [ PRC 호출 ]                                                                */
| /*                                                                              */
| /*                                                                              */
| /********************************************************************************/
| /* Date        In Charge       Description                                      */
| /*------------------------------------------------------------------------------*/
| /* 2014-11-19  Ko.sh          Initial Release                                   */
| /********************************************************************************/
| 
| /* Local Variables */
| LV_BIZ_CD               TSYS903.BIZ_CD%TYPE := 'TIM';
| LV_OBJECT_NM            TSYS903.OBJECT_NM%TYPE := 'P_TIM_WORK_HOUR_CHG';
| 
| /*기본근무(고정값)*/
| LV_WORK_CD              TTIM015.WORK_CD%TYPE := '0010';
| /*지각코드(고정값)*/
| LV_LATE_CD              TTIM015.WORK_CD%TYPE := '0090';
| /*조퇴코드(고정값)*/
| LV_LEAVE_CD             TTIM015.WORK_CD%TYPE := '0110';
| LV_STD_TIME_CD          TTIM017.TIME_CD%TYPE;
| LV_STD_EHM              TTIM017.WORK_EHM%TYPE;
| LV_LATE_HH              NUMBER;
| LV_LATE_MM              NUMBER;
| LV_OUT_WORK_EXIST_YN    VARCHAR(10) := 'N'; /*외근존재여부*/
| LV_OUT_WORK_SHM         VARCHAR(4);  /*외근시작시간*/
| LV_OUT_WORK_EHM         VARCHAR(4);  /*외근종료시간*/
| LV_CH_SHM               VARCHAR(4);  --변경시작시간
| LV_CH_EHM               VARCHAR(4);  --변경종료시간
| LV_EX_EMP_YN            VARCHAR2(1) :='N';  /*일근무제외자 여부 (TTIM309)*/
| LV_CHG_WORK_YN          VARCHAR2(1) :='N';  /*출퇴근시간변경 여부 (TTIM345)*/
| 
| LV_FIX_ST_TIME_YN       VARCHAR2(1) :='N';  /*출근시간고정 여부 (TTIM115)*/
| LV_FIX_ED_TIME_YN       VARCHAR2(1) :='N';  /*퇴근시간고정 여부 (TTIM115)*/
| LV_LOG                  VARCHAR2(4000);
| 
- LV_hol_time_cd          VARCHAR2(1);
- LV_HOLIDAY_YN           VARCHAR2(1);
- 
| 
| 
| LV_EX_HOUR              NUMBER;
| LV_EX_HOUR2             NUMBER;
| 
| LV_APP_SHM               VARCHAR(4);  --[벽산]연장근무신청 출근시간
| LV_APP_EHM               VARCHAR(4);  --[벽산]연장근무신청 출근시간
| 
| ------------------------------------------------------------------------------------------------------------------------------
| -- 일근무데이타
| ------------------------------------------------------------------------------------------------------------------------------
| CURSOR CSR_TIMECARD IS
| SELECT /*+ LEADING(Y) */
| X.YMD
| , X.SABUN
| , X.WORK_ORG_CD
| , X.WORK_GRP_CD
| , X.IN_HM
| , X.OUT_HM
| , X.CLOSE_YN
| , Z.TIME_CD, Z.WORK_YN, Z.ABSENCE_CD
| , Z.WORK_YN AS HOL_YN -- 휴일여부
| , Z.WORK_SHM -- 근무시작시간
| , Z.WORK_EHM -- 근무종료시간
| , F_COM_GET_WORKTYPE(Y.ENTER_CD, Y.SABUN, X.YMD) AS WORK_TYPE  -- 직군(A:사무직, B:생산직)
| FROM (
| SELECT A.ENTER_CD, A.YMD, A.SABUN, A.WORK_ORG_CD, A.WORK_GRP_CD
| , CASE WHEN NVL(D.UPDATE_YN,'N') = 'Y' THEN D.IN_HM  -- [일근무관리에서 인정근무시간을 수정 했으면 해당 인정시간으로.. ]
| WHEN B.IN_HM IS NOT NULL AND C.IN_HM IS NOT NULL AND B.IN_HM < C.IN_HM THEN B.IN_HM -- 세콤, EHR 기록이 둘다 있을 때 작은 시간이 우선임
| WHEN B.IN_HM IS NOT NULL AND C.IN_HM IS NOT NULL AND B.IN_HM >= C.IN_HM THEN C.IN_HM -- 세콤, EHR 기록이 둘다 있을 때 작은 시간이 우선임
| WHEN B.IN_HM IS NOT NULL THEN B.IN_HM
| WHEN C.IN_HM IS NOT NULL THEN C.IN_HM
| ELSE D.IN_HM END  AS IN_HM
| , CASE WHEN NVL(D.UPDATE_YN,'N') = 'Y' THEN D.OUT_HM  -- [일근무관리에서 인정근무시간을 수정 했으면 해당 인정시간으로.. ]
| WHEN B.OUT_HM IS NOT NULL AND C.OUT_HM IS NOT NULL AND B.OUT_HM > C.OUT_HM THEN B.OUT_HM -- 세콤, EHR 기록이 둘다 있을 때 큰 시간이 우선임
| WHEN B.OUT_HM IS NOT NULL AND C.OUT_HM IS NOT NULL AND B.OUT_HM <= C.OUT_HM THEN C.OUT_HM -- 세콤, EHR 기록이 둘다 있을 때 큰 시간이 우선임
| WHEN B.OUT_HM IS NOT NULL THEN B.OUT_HM
| WHEN C.OUT_HM IS NOT NULL THEN C.OUT_HM
| ELSE D.OUT_HM END  AS OUT_HM
| , A.TIME_CD
| , A.BUSINESS_PLACE_CD
| , NVL(D.CLOSE_YN, 'N') AS CLOSE_YN
| FROM TTIM120_V A, TTIM330 B, TTIM730 C, TTIM335 D  -- [도이치]TTIM730: EHR에서 출퇴근 체크  2020.01.07
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.YMD BETWEEN P_S_YMD AND P_E_YMD
| -- 세콤 출퇴근 기록
| AND A.ENTER_CD = B.ENTER_CD(+)
| AND A.YMD      = B.YMD(+)
| AND A.SABUN    = B.SABUN(+)
| -- EHR 출퇴근 기록
| AND A.ENTER_CD = C.ENTER_CD(+)
| AND A.YMD      = C.YMD(+)
| AND A.SABUN    = C.SABUN(+)
| -- 인정 출퇴근 기록
| AND A.ENTER_CD = D.ENTER_CD(+)
| AND A.YMD      = D.YMD(+)
| AND A.SABUN    = D.SABUN(+)
| -- 파람 조건
| AND CASE WHEN P_SABUN IS NULL THEN '1' ELSE A.SABUN END = CASE WHEN P_SABUN IS NULL THEN '1' ELSE P_SABUN END
| AND CASE WHEN P_BUSINESS_PLACE_CD IS NULL THEN '1' ELSE A.BUSINESS_PLACE_CD END = CASE WHEN P_BUSINESS_PLACE_CD IS NULL THEN '1' ELSE P_BUSINESS_PLACE_CD END
| 
| ) X
| , THRM100 Y
| , TTIM017 Z
| WHERE X.ENTER_CD = Y.ENTER_CD
| AND X.SABUN    = Y.SABUN
| AND X.ENTER_CD = Z.ENTER_CD
| AND X.TIME_CD  = Z.TIME_CD
| --   AND NVL(X.CLOSE_YN,'N') = 'N'  -- 일근무 마감 상태이면 갱신하지 않음.
| ;
| 
| 
| ------------------------------------------------------------------------------------------------------------------------------
| -- 일근무 상세
| ------------------------------------------------------------------------------------------------------------------------------
| CURSOR CSR_WORK_DTL (C_YMD VARCHAR2, C_SABUN VARCHAR2, C_SHM VARCHAR2, C_EHM VARCHAR2, C_TIME_CD VARCHAR2) IS
| SELECT A.WORK_CD, F_TIM_WORK_INFO_TEMP(P_ENTER_CD, C_SABUN, C_YMD, C_SHM, C_EHM, A.WORK_CD)  AS HHMM
| FROM ( SELECT X.WORK_CD
| FROM TTIM018 X
| WHERE  X.ENTER_CD = P_ENTER_CD
| AND X.TIME_CD = C_TIME_CD
| /*UNION
| SELECT WORK_CD
| FROM TTIM015
| WHERE ENTER_CD = P_ENTER_CD
| AND WORK_CD_TYPE IN ('4', '5')*/
| UNION
| SELECT '0090' FROM DUAL /*지각*/
| UNION
| SELECT '0110' FROM DUAL /*조퇴*/
| UNION
| SELECT '0010' FROM DUAL /*기본근무는 필수*/
| UNION
| SELECT '0075' FROM DUAL /*휴일근무시 선택근로제 인원은 휴일연장이 자동으로 발생하므로 추가함*/
| ) A
| WHERE A.WORK_CD IS NOT NULL
| --AND WORK_CD IN (SELECT DISTINCT WORK_CD FROM TTIM018 WHERE ENTER_CD = P_ENTER_CD AND TIME_CD = C_TIME_CD)
| ;
| 
| 
| BEGIN
| 
| ------------------------------------------------------------------------------------------------------------------------------
| -- 세콤근무기록을 기반으로 근무시간변경이력에 저장
| ------------------------------------------------------------------------------------------------------------------------------
| FOR CSR_SC IN CSR_TIMECARD LOOP
| 
| LV_LOG := 'S_YMD:' || P_S_YMD || ', E_YMD:' || P_E_YMD || ', SABUN:' || P_SABUN || ', SABUN:' || P_SABUN;
| LV_LOG := LV_LOG || ', CLOSE_YN:' || CSR_SC.CLOSE_YN;
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-1',LV_LOG, P_SABUN);
| --DBMS_OUTPUT.PUT_LINE(LV_LOG);
| 
| -- 근무시간변경 이력 삭제
| DELETE FROM TTIM335 WHERE ENTER_CD = P_ENTER_CD AND YMD = CSR_SC.YMD AND SABUN = CSR_SC.SABUN AND NVL(UPDATE_YN,'N') <> 'Y'; -- [일근무관리] 에서 수정했으면 삭제 안함.
| DELETE FROM TTIM337 WHERE ENTER_CD = P_ENTER_CD AND YMD = CSR_SC.YMD AND SABUN = CSR_SC.SABUN ;
| 
| 
| ------------------------------------------------------------------------------------------------------------------------------
| -- 외근(직출, 직퇴) 시 출퇴근 시간 변경
| ------------------------------------------------------------------------------------------------------------------------------
| --시간단위 근태 존재여부 (외근)
| LV_OUT_WORK_EXIST_YN := 'N'; --외근존재 여부
| LV_OUT_WORK_SHM := '';
| LV_OUT_WORK_EHM := '';
| 
- LV_holiday_yn   := '';
- LV_hol_time_cd  := '';
- 
| 
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-21','SABUN:' || CSR_SC.SABUN || ', YMD:' || CSR_SC.YMD, P_SABUN);
| BEGIN
| SELECT A.GNT_CD
| , CASE WHEN A.GNT_CD = '210' AND A.REQ_S_HM IS NOT NULL THEN A.REQ_S_HM ELSE NULL END AS OUT_WORK_SHM --직출 ( 근태 신청 시 필수입력값이라 Null일리가 없음 )
| , CASE WHEN A.GNT_CD = '220' AND A.REQ_E_HM IS NOT NULL THEN A.REQ_E_HM ELSE NULL END AS OUT_WORK_EHM  --직퇴 ( 근태 신청 시 필수입력값이라 Null일리가 없음 )
| INTO LV_OUT_WORK_EXIST_YN, LV_OUT_WORK_SHM, LV_OUT_WORK_EHM
| FROM TTIM301 A
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.SABUN    = CSR_SC.SABUN
| AND A.S_YMD    = CSR_SC.YMD
| AND NVL(A.UPDATE_YN, 'N') = 'N' -- 취소신청여부
| AND A.GNT_CD   IN ('210', '220')  -- 직출, 직퇴
| AND EXISTS ( SELECT 1
| FROM THRI103 X
| WHERE X.ENTER_CD = A.ENTER_CD
| AND X.APPL_SEQ = A.APPL_SEQ
| AND X.APPL_STATUS_CD = '99' ) ;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| LV_OUT_WORK_EXIST_YN := 'N';
| LV_OUT_WORK_SHM := '';
| LV_OUT_WORK_EHM := '';
| WHEN OTHERS THEN
| LV_OUT_WORK_EXIST_YN := 'N';
| LV_OUT_WORK_SHM := '';
| LV_OUT_WORK_EHM := '';
| 
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRNM := sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'123-2',P_SQLERRNM, P_SABUN);
| END;
| 
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-22','LV_OUT_WORK_EXIST_YN:' || LV_OUT_WORK_EXIST_YN || ', LV_OUT_WORK_EHM:' || LV_OUT_WORK_EHM, P_SABUN);
| 
| --외근여부가 존재하면 출,퇴근시간을 변경하여 반영한다.
| IF LV_OUT_WORK_EXIST_YN = '210' THEN --직출
| CSR_SC.IN_HM := NVL(LV_OUT_WORK_SHM, CSR_SC.WORK_SHM); --기본출근시간 ( 근태 신청 시 필수입력값이라 Null일리가 없음 )
| END IF;
| IF LV_OUT_WORK_EXIST_YN = '220' THEN --직퇴
| CSR_SC.OUT_HM := NVL(LV_OUT_WORK_EHM, CSR_SC.WORK_EHM); --기본퇴근시간 ( 근태 신청 시 필수입력값이라 Null일리가 없음 )
| END IF;
| 
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-2','IN_HM:' || CSR_SC.IN_HM || ', OUT_HM:' || CSR_SC.OUT_HM, P_SABUN);
| 
| ------------------------------------------------------------------------------------------------------------------------------
| -- [벽산] 근무조의 출퇴근시간고정이 'Y'이면 스케쥴 근무시간으로 출퇴근 시간 설정 -- 2020.01.29
| -- [벽산] 출근/퇴근 분리 -- 2020.08.18
| ------------------------------------------------------------------------------------------------------------------------------
| 
| LV_FIX_ST_TIME_YN := 'N'; -- 출근시간 고정 여부
| LV_FIX_ED_TIME_YN := 'N'; -- 퇴근시간 고정 여부
| 
- 
- 
| BEGIN
| SELECT FIX_ST_TIME_YN, FIX_ED_TIME_YN
| INTO LV_FIX_ST_TIME_YN, LV_FIX_ED_TIME_YN
| FROM TTIM115 A
| WHERE A.ENTER_CD     = P_ENTER_CD
| AND A.WORK_GRP_CD  = CSR_SC.WORK_GRP_CD ;
| EXCEPTION
| WHEN OTHERS THEN
| LV_FIX_ST_TIME_YN := 'N'; -- 출근시간 고정 여부
| LV_FIX_ED_TIME_YN := 'N'; -- 퇴근시간 고정 여부
| END;
| IF NVL( CSR_SC.HOL_YN, 'N') = 'N' THEN  -- 휴일 제외
| 
| IF LV_FIX_ST_TIME_YN = 'Y' THEN  -- 출근시간 고정
| CSR_SC.IN_HM  := NVL(LV_OUT_WORK_SHM, CSR_SC.WORK_SHM);
| END IF;
| IF LV_FIX_ED_TIME_YN = 'Y' AND CSR_SC.IN_HM IS NOT NULL THEN -- 퇴근시간 고정
| CSR_SC.OUT_HM := NVL(LV_OUT_WORK_EHM, CSR_SC.WORK_EHM);
| 
| END IF;
| END IF;
| 
| ------------------------------------------------------------------------------------------------------------------------------
| -- [벽산]휴일이면서 출퇴근시간 고정이면
| -- 실 출근시간이 있으면  실출근시간 ~ 신청퇴근시간으로 인정.
| ------------------------------------------------------------------------------------------------------------------------------
| 
- --  IF NVL( CSR_SC.HOL_YN, 'N') = 'Y' AND LV_FIX_ED_TIME_YN = 'Y' AND CSR_SC.IN_HM IS NOT NULL THEN
- ---------------------------------------------------
- -- 휴일여부, 근무시간코드
- ---------------------------------------------------
- BEGIN
- SELECT A.holiday_yn , A.HOLIDAY_GUBUN
- INTO LV_holiday_yn, LV_hol_time_cd
- FROM TTIM120_V A, TTIM017 B
- WHERE A.ENTER_CD = B.ENTER_CD
- AND A.TIME_CD   = B.TIME_CD
- AND A.ENTER_CD = P_ENTER_CD
- AND A.SABUN    = CSR_SC.SABUN
- AND A.YMD      = CSR_SC.YMD;
- EXCEPTION
- WHEN OTHERS THEN
- LV_holiday_yn := 'N';
- END;
- 
- IF (NVL( CSR_SC.HOL_YN, 'N') = 'Y' OR LV_holiday_yn = 'Y') AND CSR_SC.IN_HM IS NULL  THEN
- 
+ IF NVL( CSR_SC.HOL_YN, 'N') = 'Y' AND LV_FIX_ED_TIME_YN = 'Y' AND CSR_SC.IN_HM IS NOT NULL THEN
+ 
| LV_APP_SHM := '';
| LV_APP_EHM := '';
| BEGIN
| SELECT MAX(REQ_S_HM) KEEP(DENSE_RANK FIRST ORDER BY APPL_GUBUN )
| , MAX(REQ_E_HM) KEEP(DENSE_RANK FIRST ORDER BY APPL_GUBUN )
| INTO LV_APP_SHM, LV_APP_EHM
| FROM TTIM601 A
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.SABUN    = CSR_SC.SABUN
| AND A.YMD      = CSR_SC.YMD;
| EXCEPTION
| WHEN OTHERS THEN
| LV_APP_SHM := '';
| LV_APP_EHM := '';
| END;
| IF LV_APP_EHM IS NOT NULL THEN
| 
- CSR_SC.IN_HM := LV_APP_SHM;
- 
| CSR_SC.OUT_HM := LV_APP_EHM;
| END IF;
| 
| END IF;
| 
| --P_COM_SET_LOG(P_ENTER_CD, lv_biz_cd, lv_object_nm,'log-3','FIX_ED_TIME_YN:' || LV_FIX_ED_TIME_YN ||', IN_HM:' || CSR_SC.IN_HM || ', OUT_HM:' || CSR_SC.OUT_HM, P_SABUN);
| ------------------------------------------------------------------------------------------------------------------------------
| -- 일근무제외자의 기본근무 출퇴근 시간 조회
| ------------------------------------------------------------------------------------------------------------------------------
| IF NVL( CSR_SC.HOL_YN, 'N') = 'N' THEN  -- 휴일 제외
| LV_EX_EMP_YN := 'N'; -- 일근무제외자 여부
| LV_OUT_WORK_SHM := '';
| LV_OUT_WORK_EHM := '';
| BEGIN
| SELECT 'Y', NVL(A.IN_HM, CSR_SC.WORK_SHM),  NVL(A.OUT_HM, CSR_SC.WORK_EHM)
| INTO LV_EX_EMP_YN, LV_OUT_WORK_SHM, LV_OUT_WORK_EHM
| FROM TTIM309 A
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.SABUN    = CSR_SC.SABUN
| AND A.WORK_CD  = LV_WORK_CD -- 기본근무
| AND CSR_SC.YMD BETWEEN A.SDATE AND NVL(A.EDATE, '29991231') ;
| EXCEPTION
| WHEN OTHERS THEN
| LV_EX_EMP_YN := 'N';
| END;
| IF LV_EX_EMP_YN = 'Y' THEN
| CSR_SC.IN_HM := NVL(LV_OUT_WORK_SHM, CSR_SC.IN_HM);
| CSR_SC.OUT_HM := NVL(LV_OUT_WORK_EHM, CSR_SC.OUT_HM);
| END IF;
| 
| END IF;
| ------------------------------------------------------------------------------------------------------------------------------
| -- 출퇴근시간변경 이력
| ------------------------------------------------------------------------------------------------------------------------------
| LV_CHG_WORK_YN := 'N'; -- 일근무제외자 여부
| LV_OUT_WORK_SHM := '';
| LV_OUT_WORK_EHM := '';
| BEGIN
| SELECT MAX('Y')
| , MAX(A.AF_SHM) KEEP(DENSE_RANK FIRST ORDER BY A.APPL_SEQ DESC)
| , MAX(A.AF_EHM) KEEP(DENSE_RANK FIRST ORDER BY A.APPL_SEQ DESC)
| INTO LV_CHG_WORK_YN, LV_OUT_WORK_SHM, LV_OUT_WORK_EHM
| FROM TTIM345 A
| WHERE A.ENTER_CD   = P_ENTER_CD
| AND A.YMD        = CSR_SC.YMD
| AND A.SABUN      = CSR_SC.SABUN
| AND EXISTS ( SELECT 1
| FROM THRI103 X
| WHERE X.ENTER_CD = A.ENTER_CD
| AND X.APPL_SEQ = A.APPL_SEQ
| AND X.APPL_STATUS_CD = '99' ) ;
| EXCEPTION
| WHEN OTHERS THEN
| LV_CHG_WORK_YN := 'N';
| END;
| IF LV_CHG_WORK_YN IS NOT NULL AND LV_CHG_WORK_YN = 'Y' THEN
| CSR_SC.IN_HM := NVL(LV_OUT_WORK_SHM, CSR_SC.IN_HM);
| CSR_SC.OUT_HM := NVL(LV_OUT_WORK_EHM, CSR_SC.OUT_HM);
| END IF;
| 
| 
| ------------------------------------------------------------------------------------------------------------------------------
| -- 근무시간변경이력 저장 (TTIM335)
| ------------------------------------------------------------------------------------------------------------------------------
| BEGIN
| MERGE INTO TTIM335 A
| USING (
| SELECT P_ENTER_CD AS ENTER_CD
| , CSR_SC.YMD AS YMD
| , CSR_SC.SABUN AS SABUN
| , '' AS GNT_CD
| , CSR_SC.IN_HM AS IN_HM
| , CSR_SC.OUT_HM AS OUT_HM
| , '' AS MEMO
| , CSR_SC.HOL_YN AS HOL_YN
| , SYSDATE AS CHKDATE
| , P_CHKID AS CHKID
| , CSR_SC.TIME_CD AS TIME_CD  --2020.06.24 TIME_CD 추가함.
| FROM DUAL
| 
| ) B
| ON (        A.ENTER_CD = B.ENTER_CD
| AND A.YMD      = B.YMD
| AND A.SABUN    = B.SABUN
| )
| WHEN NOT MATCHED THEN
| INSERT ( A.ENTER_CD, A.YMD, A.SABUN, A.IN_HM, A.OUT_HM, A.MEMO, A.HOL_YN, A.CHKDATE, A.CHKID, A.TIME_CD, A.close_yn )
| VALUES ( B.ENTER_CD, B.YMD, B.SABUN, B.IN_HM, B.OUT_HM, B.MEMO, B.HOL_YN, B.CHKDATE, B.CHKID, B.TIME_CD, 'Y' )
| WHEN MATCHED THEN
| UPDATE SET HOL_YN  = B.HOL_YN
| 
- , TIME_CD = B.TIME_CD;
- 
+ , TIME_CD = B.TIME_CD
+ ;
+ 
| EXCEPTION
| WHEN OTHERS THEN
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRNM := '근무시간변경이력 등록시 Error : '||sqlerrm||' / 사번 : '||CSR_SC.SABUN||' / 근무일자 : '||CSR_SC.YMD||' / '||CSR_SC.IN_HM||' / '||CSR_SC.OUT_HM ;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'20', P_SQLERRNM||'==>'|| SQLERRM, P_CHKID);
| END;
| 
| ------------------------------------------------------------------------------------------------------------------------------
| -- 근무시간변경이력 상세 저장 (TTIM337)
| ------------------------------------------------------------------------------------------------------------------------------
| FOR C_DTL IN CSR_WORK_DTL (C_YMD => CSR_SC.YMD , C_SABUN => CSR_SC.SABUN, C_SHM => CSR_SC.IN_HM, C_EHM => CSR_SC.OUT_HM, C_TIME_CD => CSR_SC.TIME_CD)
| LOOP
| IF C_DTL.HHMM IS NOT NULL THEN
| 
- 
- /*           ---------------------------------------------------
- -- 휴일여부, 근무시간코드
- ---------------------------------------------------
- 
| BEGIN
| 
- SELECT A.HOLIDAY_GUBUN ,a.HOLIDAY_YN
- INTO LV_hol_time_cd, LV_HOLIDAY_YN
- FROM TTIM120_V A, TTIM017 B
- WHERE A.ENTER_CD = B.ENTER_CD
- AND A.TIME_CD   = B.TIME_CD
- AND A.ENTER_CD = P_ENTER_CD
- AND A.SABUN    = CSR_SC.SABUN
- AND A.YMD      = CSR_SC.YMD;
- EXCEPTION
- WHEN OTHERS THEN
- LV_hol_time_cd := null;
- END;*/
- 
- IF LV_hol_time_cd = 'A' THEN
- IF C_DTL.WORK_CD = '0070' THEN
- C_DTL.WORK_CD := '0060';
- ELSIF C_DTL.WORK_CD = '0075' THEN
- C_DTL.WORK_CD := '0062';
- END IF;
- 
- ELSIF LV_hol_time_cd = 'B' THEN
- IF C_DTL.WORK_CD = '0070' THEN
- C_DTL.WORK_CD := '0086';
- ELSIF C_DTL.WORK_CD = '0075' THEN
- C_DTL.WORK_CD := '0087';
- END IF;
- END IF;
- 
- 
- 
- BEGIN
- 
| MERGE INTO TTIM337 A
| USING ( SELECT P_ENTER_CD AS ENTER_CD
| , CSR_SC.YMD AS YMD
| , CSR_SC.SABUN AS SABUN
| , C_DTL.WORK_CD AS WORK_CD
| , TO_NUMBER(SUBSTR(C_DTL.HHMM,1,2)) AS WORK_HH
| , TO_NUMBER(SUBSTR(C_DTL.HHMM,3,2)) AS WORK_MM
| FROM DUAL
| ) B
| 
- ON ( A.ENTER_CD = B.ENTER_CD
- 
+ ON (     A.ENTER_CD = B.ENTER_CD
+ 
| AND A.YMD = B.YMD
| AND A.SABUN = B.SABUN
| AND A.WORK_CD = B.WORK_CD
| )
| WHEN NOT MATCHED THEN
| INSERT (ENTER_CD, YMD, SABUN, WORK_CD, WORK_HH, WORK_MM, CHKDATE, CHKID)
| VALUES ( P_ENTER_CD, B.YMD, B.SABUN, B.WORK_CD, B.WORK_HH, B.WORK_MM, SYSDATE, P_CHKID)
| WHEN MATCHED THEN
| UPDATE SET WORK_HH = B.WORK_HH, WORK_MM = B.WORK_MM, CHKDATE = sysdate, CHKID= P_CHKID;
| EXCEPTION
| WHEN OTHERS THEN
| --ROLLBACK;
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRNM := '근무시간변경이력 등록시 Error : '||sqlerrm||' / 사번 : '||CSR_SC.SABUN||' / 근무일자 : '||CSR_SC.YMD ;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'30', P_SQLERRNM||'==>'|| SQLERRM, P_CHKID);
| END;
| END IF;
| END LOOP;
| 
| 
| ------------------------------------------------------------------------------------------------------------------------------
| -- [벽산] 생산직 휴게시간 생성
| -- 기본근무, 휴일기본근무 8시간일 경우 1시간 차감
| ------------------------------------------------------------------------------------------------------------------------------
| LV_EX_HOUR := 0;
| -- 직군(A:사무직, B:생산직)
| 
- 
- -- IF LV_HOLIDAY_YN = 'Y' THEN
- 
- 
- 
| IF CSR_SC.WORK_TYPE = 'B' THEN
| BEGIN
| SELECT CASE WHEN (SUM(WORK_HH) + (SUM(WORK_MM)/60)) >= 7 THEN 0.5 ELSE 0 END
| INTO LV_EX_HOUR
| FROM TTIM337 A, TTIM015 B
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.YMD      = CSR_SC.YMD
| AND A.SABUN    = CSR_SC.SABUN
| AND A.ENTER_CD = B.ENTER_CD
| AND A.WORK_CD  = B.WORK_CD
| 
- AND B.DAY_TYPE IN ( '101') ; -- 정규근무, 휴일기본근무
- 
+ AND B.DAY_TYPE IN ( '101', '201') ; -- 정규근무, 휴일기본근무
+ 
| 
| if LV_EX_HOUR > 0 AND P_ENTER_CD = 'NVK' THEN  --영주공장만 20210924
| UPDATE TTIM337 A
| SET A.WORK_HH = 7
| ,A.WORK_MM = 30
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.YMD      = CSR_SC.YMD
| AND A.SABUN    = CSR_SC.SABUN
| AND A.WORK_CD  = '0010';
| END IF;
| 
| 
- -- 휴일 또는 공휴일에 근무시 휴일기본근무시간만 적용하고, 기본근무시간은 0으로 강제로 Update한다. (교대근무조의 경우)
- IF LV_holiday_yn = 'Y'  THEN
- UPDATE TTIM337 A
- SET A.WORK_HH = 0
- ,A.WORK_MM = 0
- WHERE A.ENTER_CD = P_ENTER_CD
- AND A.YMD      = CSR_SC.YMD
- AND A.SABUN    = CSR_SC.SABUN
- AND A.WORK_CD  = '0010';
- END IF;
- 
- 
- 
| /*
| MERGE INTO TTIM337 A
| USING ( SELECT P_ENTER_CD   AS ENTER_CD
| , CSR_SC.YMD   AS YMD
| , CSR_SC.SABUN AS SABUN
| , '0210'       AS WORK_CD
| , DECODE(LV_EX_HOUR,0,NULL,LV_EX_HOUR)   AS WORK_HH
| , 0            AS WORK_MM
| FROM DUAL
| ) B
| ON (     A.ENTER_CD = B.ENTER_CD
| AND A.YMD      = B.YMD
| AND A.SABUN    = B.SABUN
| AND A.WORK_CD  = B.WORK_CD
| )
| WHEN NOT MATCHED THEN
| INSERT (ENTER_CD, YMD, SABUN, WORK_CD, WORK_HH, WORK_MM, CHKDATE, CHKID)
| VALUES ( P_ENTER_CD, B.YMD, B.SABUN, B.WORK_CD, B.WORK_HH, B.WORK_MM, SYSDATE, P_CHKID)
| WHEN MATCHED THEN
| UPDATE SET WORK_HH = B.WORK_HH, WORK_MM = B.WORK_MM, CHKDATE = sysdate, CHKID= P_CHKID;*/
| 
| EXCEPTION
| WHEN OTHERS THEN
| --ROLLBACK;
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRNM := '생산직 차감근무시간(기본근무) 생성시 Error : '||sqlerrm||' / 사번 : '||CSR_SC.SABUN||' / 근무일자 : '||CSR_SC.YMD;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'91', '생산직 차감근무시간(기본근무) 생성 시 Error : '||P_SQLERRNM, P_CHKID);
| END;
| END IF;
| 
- 
- 
- 
| ------------------------------------------------------------------------------------------------------------------------------
| -- [벽산] 생산직 차감근무시간 생성
| -- 연장근무, 휴일연장근무 4시간이상일 경우 0.5휴게시간 발생  ( 52시간 체크 시 휴게시간 제외하고 체크 됨
| ------------------------------------------------------------------------------------------------------------------------------
| LV_EX_HOUR := 0;
| -- 직군(A:사무직, B:생산직)
| /* IF CSR_SC.WORK_TYPE = 'B' THEN
| BEGIN
| SELECT CASE WHEN (SUM(WORK_HH) + (SUM(WORK_MM)/60)) >= 4 THEN 30 ELSE 0 END
| INTO LV_EX_HOUR
| FROM TTIM337 A, TTIM015 B
| WHERE A.ENTER_CD = P_ENTER_CD
| AND A.YMD      = CSR_SC.YMD
| AND A.SABUN    = CSR_SC.SABUN
| AND A.ENTER_CD = B.ENTER_CD
| AND A.WORK_CD  = B.WORK_CD
| AND B.DAY_TYPE IN ( '105', '205' ); -- 연장근무, 휴일연장근무 ( 두개가 동시에 생길 일이 없음!)
| 
| MERGE INTO TTIM337 A
| USING ( SELECT P_ENTER_CD   AS ENTER_CD
| , CSR_SC.YMD   AS YMD
| , CSR_SC.SABUN AS SABUN
| , '0215'       AS WORK_CD
| , 0            AS WORK_HH
| , DECODE(LV_EX_HOUR,0,NULL,LV_EX_HOUR)        AS WORK_MM
| FROM DUAL
| ) B
| ON (     A.ENTER_CD = B.ENTER_CD
| AND A.YMD      = B.YMD
| AND A.SABUN    = B.SABUN
| AND A.WORK_CD  = B.WORK_CD
| )
| WHEN NOT MATCHED THEN
| INSERT (ENTER_CD, YMD, SABUN, WORK_CD, WORK_HH, WORK_MM, CHKDATE, CHKID)
| VALUES ( P_ENTER_CD, B.YMD, B.SABUN, B.WORK_CD, B.WORK_HH, B.WORK_MM, SYSDATE, P_CHKID)
| WHEN MATCHED THEN
| UPDATE SET WORK_HH = B.WORK_HH, WORK_MM = B.WORK_MM, CHKDATE = sysdate, CHKID= P_CHKID;
| 
| EXCEPTION
| WHEN OTHERS THEN
| --ROLLBACK;
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRNM := '생산직 차감근무시간(연장근무) 생성시 Error : '||sqlerrm||' / 사번 : '||CSR_SC.SABUN||' / 근무일자 : '||CSR_SC.YMD;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'92', '생산직 차감근무시간(연장근무) 생성 시 Error : '||P_SQLERRNM, P_CHKID);
| END;
| END IF;  */
| 
| END LOOP;
| 
| 
| COMMIT;
| 
| EXCEPTION
| WHEN OTHERS THEN
| --ROLLBACK;
| P_SQLCODE := TO_CHAR(sqlcode);
| P_SQLERRNM := sqlerrm;
| P_COM_SET_LOG(P_ENTER_CD, LV_BIZ_CD, LV_OBJECT_NM,'100', P_SQLERRNM, P_CHKID);
| END;
| 
| 
| /
```
---
# TBEN751_TEMP.SQL

```diff
| 
| CREATE TABLE "EHR_NG"."TBEN751_temp"
| (	"ENTER_CD" VARCHAR2(10),
| "APPL_SEQ" NUMBER,
| "SABUN" VARCHAR2(13),
| "SCH_TYPE_CD" VARCHAR2(10),
| "FAM_CD" VARCHAR2(10),
| "FAM_NM" VARCHAR2(100),
| "FAM_RES_NO" VARCHAR2(200),
| "APP_YEAR" VARCHAR2(4),
| "DIV_CD" VARCHAR2(10),
| "SCH_LOC_CD" VARCHAR2(1),
| "SCH_YEAR" VARCHAR2(2),
| "SCH_DEPT" VARCHAR2(200),
| "SCH_ENT_YM" VARCHAR2(8),
| "SCH_PAY_YN" VARCHAR2(1),
| "EXC_RATE" NUMBER,
| "EXT_MON" NUMBER,
| "APPL_MON" NUMBER,
| "NOTE" VARCHAR2(2000),
| "PAY_MON" NUMBER,
| "PAY_YM" VARCHAR2(8),
| "PAY_NOTE" VARCHAR2(4000),
| "CLOSE_YN" VARCHAR2(1),
| "CHKDATE" DATE DEFAULT SYSDATE,
| "CHKID" VARCHAR2(13),
| "FAM_YMD" VARCHAR2(8),
| "PAY_ACTION_CD" VARCHAR2(10),
| "SCH_SUP_TYPE_CD" VARCHAR2(10),
| "ADMISSION_FEE" NUMBER DEFAULT 0,
| "TUITION_FEE" NUMBER DEFAULT 0,
| "CONDUITE_FEE" NUMBER DEFAULT 0,
| "STUDENT_UNION_FEE" NUMBER DEFAULT 0,
| "SCHOLARSHIP_FEE" NUMBER DEFAULT 0,
| "PAYMENT_YMD" VARCHAR2(8),
| 
- "ACA_SCH_CD" VARCHAR2(10),
- 
+ "ACA_SCH_CD" VARCHAR2(50),
+ 
| "PAYMENT_E_YMD" VARCHAR2(8)
| ) SEGMENT CREATION IMMEDIATE
| PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255
| NOCOMPRESS LOGGING
| TABLESPACE "TSHRD1"   NO INMEMORY ;
```
---
# TCPN_PUMP_TEMP.SQL

```diff
| 
| CREATE TABLE "EHR_NG"."TCPN_PUMP_TEMP"
| (	"ENTER_CD" VARCHAR2(10),
| "PAY_YM" VARCHAR2(6),
| "PAY_CD" VARCHAR2(10),
| "PAYMENT_YMD" VARCHAR2(10),
| "SABUN" VARCHAR2(100),
| "NAME" VARCHAR2(100),
| "MON_1" NUMBER DEFAULT 0,
| "MON_2" NUMBER DEFAULT 0,
| "MON_3" NUMBER DEFAULT 0,
| "MON_4" NUMBER DEFAULT 0,
| "MON_5" NUMBER DEFAULT 0,
| "MON_6" NUMBER DEFAULT 0,
| "MON_7" NUMBER DEFAULT 0,
| "MON_8" NUMBER DEFAULT 0,
| "MON_9" NUMBER DEFAULT 0,
| "MON_10" NUMBER DEFAULT 0,
| "MON_11" NUMBER DEFAULT 0,
| "MON_12" NUMBER DEFAULT 0,
| "MON_13" NUMBER DEFAULT 0,
| "MON_14" NUMBER DEFAULT 0,
| "MON_15" NUMBER DEFAULT 0,
| "MON_16" NUMBER DEFAULT 0,
| "MON_17" NUMBER DEFAULT 0,
| "MON_18" NUMBER DEFAULT 0,
| "MON_19" NUMBER DEFAULT 0,
| "MON_20" NUMBER DEFAULT 0,
| "MON_21" NUMBER DEFAULT 0,
| "MON_22" NUMBER DEFAULT 0,
| "MON_23" NUMBER DEFAULT 0,
| "MON_24" NUMBER DEFAULT 0,
| "MON_25" NUMBER DEFAULT 0,
| "MON_26" NUMBER DEFAULT 0,
| "MON_27" NUMBER DEFAULT 0,
| "MON_28" NUMBER DEFAULT 0,
| "MON_29" NUMBER DEFAULT 0,
| "MON_30" NUMBER DEFAULT 0,
| "MON_31" NUMBER DEFAULT 0,
| "MON_32" NUMBER DEFAULT 0,
| "MON_33" NUMBER DEFAULT 0,
| "MON_34" NUMBER DEFAULT 0,
| "MON_35" NUMBER DEFAULT 0,
| "MON_36" NUMBER DEFAULT 0,
| "MON_37" NUMBER DEFAULT 0,
| "MON_38" NUMBER DEFAULT 0,
| "MON_39" NUMBER DEFAULT 0,
| "MON_40" NUMBER DEFAULT 0,
| "MON_41" NUMBER DEFAULT 0,
| "MON_42" NUMBER DEFAULT 0,
| "MON_43" NUMBER DEFAULT 0,
| "MON_44" NUMBER DEFAULT 0,
| "MON_45" NUMBER DEFAULT 0,
| "MON_46" NUMBER DEFAULT 0,
| "MON_47" NUMBER DEFAULT 0,
| "MON_48" NUMBER DEFAULT 0,
| "MON_49" NUMBER DEFAULT 0,
| "MON_50" NUMBER DEFAULT 0,
| "MON_51" NUMBER DEFAULT 0,
| "MON_52" NUMBER DEFAULT 0,
| "MON_53" NUMBER DEFAULT 0,
| "MON_54" NUMBER DEFAULT 0,
| "MON_55" NUMBER DEFAULT 0,
| "MON_56" NUMBER DEFAULT 0,
| "MON_57" NUMBER DEFAULT 0,
| "MON_58" NUMBER DEFAULT 0,
| "MON_59" NUMBER DEFAULT 0,
| "MON_60" NUMBER DEFAULT 0,
| "MON_61" NUMBER DEFAULT 0,
| "MON_62" NUMBER DEFAULT 0,
| "MON_63" NUMBER DEFAULT 0,
| "MON_64" NUMBER DEFAULT 0,
| "MON_65" NUMBER DEFAULT 0,
| "MON_66" NUMBER DEFAULT 0,
| "MON_67" NUMBER DEFAULT 0,
| "MON_68" NUMBER DEFAULT 0,
| "MON_69" NUMBER DEFAULT 0,
| "TOT_EARNING_MON" NUMBER DEFAULT 0,
| "NOTAX_TOT_MON" NUMBER DEFAULT 0,
| "NOTAX_ABROAD_MON" NUMBER DEFAULT 0,
| "NOTAX_WORK_MON" NUMBER DEFAULT 0,
| "NOTAX_FOOD_MON" NUMBER DEFAULT 0,
| "NOTAX_CAR_MON" NUMBER DEFAULT 0,
| "NOTAX_ETC_MON" NUMBER DEFAULT 0,
| "NOTAX_FORN_MON" NUMBER DEFAULT 0,
| "NOTAX_BABY_MON" NUMBER DEFAULT 0,
| "NOTAX_STUDY_MON" NUMBER DEFAULT 0,
| "TAXIBLE_EARN_MON" NUMBER DEFAULT 0,
| "INCOME_DED_MON" NUMBER DEFAULT 0,
| "INCOME_MON" NUMBER DEFAULT 0,
| "TOT_MAN_DED_MON" NUMBER DEFAULT 0,
| "TOT_SPC_DED_MON" NUMBER DEFAULT 0,
| "TAX_BASE_MON" NUMBER DEFAULT 0,
| "CAL_TAX_MON" NUMBER DEFAULT 0,
| "INCTAX_DED_MON" NUMBER DEFAULT 0,
| "DED_1" NUMBER DEFAULT 0,
| "DED_2" NUMBER DEFAULT 0,
| "DED_3" NUMBER DEFAULT 0,
| "DED_4" NUMBER DEFAULT 0,
| "DED_5" NUMBER DEFAULT 0,
| "DED_6" NUMBER DEFAULT 0,
| "DED_7" NUMBER DEFAULT 0,
| "DED_8" NUMBER DEFAULT 0,
| "DED_9" NUMBER DEFAULT 0,
| "DED_10" NUMBER DEFAULT 0,
| "DED_11" NUMBER DEFAULT 0,
| "DED_12" NUMBER DEFAULT 0,
| "DED_13" NUMBER DEFAULT 0,
| "DED_14" NUMBER DEFAULT 0,
| "DED_15" NUMBER DEFAULT 0,
| "DED_16" NUMBER DEFAULT 0,
| "DED_17" NUMBER DEFAULT 0,
| "DED_18" NUMBER DEFAULT 0,
| "DED_19" NUMBER DEFAULT 0,
| "DED_20" NUMBER DEFAULT 0,
| "DED_21" NUMBER DEFAULT 0,
| "DED_22" NUMBER DEFAULT 0,
| "DED_23" NUMBER DEFAULT 0,
| "DED_24" NUMBER DEFAULT 0,
| "DED_25" NUMBER DEFAULT 0,
| "DED_26" NUMBER DEFAULT 0,
| "DED_27" NUMBER DEFAULT 0,
| "DED_28" NUMBER DEFAULT 0,
| "DED_29" NUMBER DEFAULT 0,
| "DED_30" NUMBER DEFAULT 0,
| "DED_31" NUMBER DEFAULT 0,
| "DED_32" NUMBER DEFAULT 0,
| "DED_33" NUMBER DEFAULT 0,
| "DED_34" NUMBER DEFAULT 0,
| "DED_35" NUMBER DEFAULT 0,
| "DED_36" NUMBER DEFAULT 0,
| "TOT_DED_MON" NUMBER DEFAULT 0,
| 
- "PAYMENT_MON" NUMBER DEFAULT 0
- 
+ "PAYMENT_MON" NUMBER DEFAULT 0,
+ "WORK_ADMIN" VARCHAR2(1),
+ "DED_37" NUMBER DEFAULT 0,
+ "DED_38" NUMBER DEFAULT 0,
+ "MON_70" NUMBER DEFAULT 0
+ 
| ) SEGMENT CREATION IMMEDIATE
| PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255
| NOCOMPRESS LOGGING
| TABLESPACE "TSHRD1"   NO INMEMORY ;
```
---
# TRG_CPN_201.SQL

```diff
| 
| CREATE OR REPLACE  TRIGGER "EHR_NG"."TRG_CPN_201"
| BEFORE DELETE OR INSERT
| ON TCPN201
| REFERENCING NEW AS  NEW OLD AS  OLD
| FOR EACH ROW
| DECLARE
| 
| /******************************************************************************
| NAME:
| PURPOSE:
| 
| REVISIONS:
| Ver        Date        Author           Description
| ---------  ----------  ---------------  ------------------------------------
| 1.0        2005-08-29                   1. Created this trigger.
| 
| NOTES:
| 
| 소급대상소득 삭제시 TCPN504테이블에 급여일자별 수당항목 레코드 삭제
| 
| ******************************************************************************/
| lv_cpn201              TCPN201%ROWTYPE;
| lv_re_cpn201           TCPN201%ROWTYPE;         -- 소급대상급여계산일자
| lv_run_type            TCPN051.RUN_TYPE%TYPE;
| lv_sep_pay_cd          TCPN051.SEP_PAY_CD%TYPE; -- 퇴직급여코드맵핑(TCPN051)
| lv_rtr_pay_action_cd   TCPN201.PAY_ACTION_CD%TYPE;  -- 전월소급대상 급여일자코드
| lv_sqlcode             VARCHAR2(100);
| lv_sqlerrm             VARCHAR2(4000);
| lv_biz_cd              TSYS903.BIZ_CD%TYPE := 'CPN';
| lv_object_nm           TSYS903.OBJECT_NM%TYPE := 'TRG_CPN_201';
| 
| lv_ym                  VARCHAR2(08);
| 
| 
| BEGIN
| lv_sqlcode  := NULL;
| lv_sqlerrm  := NULL;
| -- F_COM_GET_PROFILE : Trigger활성화여부
| -------------------
| IF INSERTING AND F_COM_GET_PROFILE(:NEW.ENTER_CD, 1) = 'Y' THEN
| 
| 
| -- 마감자료 생성
| BEGIN
| INSERT INTO TCPN981
| (
| ENTER_CD, PAY_ACTION_CD, CHKDATE, CHKID
| )
| VALUES
| (
| :NEW.ENTER_CD, :NEW.PAY_ACTION_CD, SYSDATE, :NEW.CHKID
| );
| EXCEPTION
| WHEN OTHERS THEN
| lv_sqlerrm := SQLERRM;
| P_COM_SET_LOG_NOCOMMIT(:NEW.ENTER_CD,lv_biz_cd,lv_object_nm,'05',lv_sqlerrm,:NEW.CHKID);
| END;
| 
| BEGIN
| SELECT RUN_TYPE, SEP_PAY_CD
| INTO lv_run_type, lv_sep_pay_cd
| FROM TCPN051
| WHERE ENTER_CD = :NEW.ENTER_CD
| AND PAY_CD   = :NEW.PAY_CD;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| lv_sqlerrm := SQLERRM;
| P_COM_SET_LOG_NOCOMMIT(:NEW.ENTER_CD,lv_biz_cd,lv_object_nm,'10',lv_sqlerrm,:NEW.CHKID);
| END;
| 
| IF lv_run_type IN ('00001','00002') THEN -- 급여, 상여
| 
| BEGIN
| SELECT A.PAY_ACTION_CD
| INTO lv_rtr_pay_action_cd
| FROM TCPN201 A
| WHERE A.ENTER_CD = :NEW.ENTER_CD
| AND A.PAY_CD   = :NEW.PAY_CD
| AND A.PAYMENT_YMD = (SELECT MAX(B.PAYMENT_YMD) FROM TCPN201 B
| WHERE B.ENTER_CD = A.ENTER_CD
| AND B.PAY_CD   = A.PAY_CD
| AND B.PAY_YM   < :NEW.PAY_YM
| AND B.PAYMENT_YMD < :NEW.PAYMENT_YMD);
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| lv_rtr_pay_action_cd := NULL;
| WHEN OTHERS THEN
| P_COM_SET_LOG_NOCOMMIT(:NEW.ENTER_CD,lv_biz_cd,lv_object_nm,'20',SQLERRM,:NEW.CHKID);
| END;
| 
| IF lv_rtr_pay_action_cd IS NOT NULL THEN
| -- 급여계산일자,소급대상 급여계산일자 가져오기
| 
| lv_cpn201 := NULL;
| lv_cpn201.ENTER_CD      := :NEW.ENTER_CD;
| lv_cpn201.PAY_ACTION_CD := :NEW.PAY_ACTION_CD;
| lv_re_cpn201 := F_CPN_GET_201_INFO(:NEW.ENTER_CD,lv_rtr_pay_action_cd);
| 
| -- 소급 대상 일자 및 항목 생성
| 
| P_CPN_CAL_RE_INFO_INS(lv_sqlcode
| ,lv_sqlerrm
| ,lv_cpn201
| ,lv_re_cpn201
| ,:NEW.CHKID);
| 
| END IF;
| 
| ELSIF lv_run_type IN ('R0001') THEN -- 퇴직급여
| 
| --퇴직급여(정규)
| IF :NEW.PAY_CD = 'S4' THEN
| 
| --급여기산일 등록
| BEGIN
| 
| INSERT INTO TCPN202
| SELECT :NEW.ENTER_CD, :NEW.PAY_ACTION_CD, PAY_TYPE
| , (CASE WHEN SUBSTR(ORD_SYMD,7,2) = '01' THEN :NEW.PAY_YM||SUBSTR(ORD_SYMD,7,2)
| ELSE TO_CHAR(ADD_MONTHS(TO_DATE(:NEW.PAY_YM,'YYYYMM'),-1),'YYYYMM')||SUBSTR(ORD_SYMD,7,2)
| END) AS ORD_SYMD
| , (CASE WHEN SUBSTR(ORD_EYMD,7,2) = TO_CHAR(LAST_DAY(TO_DATE(ORD_EYMD,'YYYYMMDD')),'DD') THEN TO_CHAR(LAST_DAY(TO_DATE(:NEW.PAY_YM,'YYYYMM')),'YYYYMMDD')
| ELSE :NEW.PAY_YM||SUBSTR(ORD_EYMD,7,2)
| END) AS ORD_EYMD
| ,NULL, NULL, NULL, NULL, NULL
| ,SYSDATE, :NEW.CHKID
| FROM TCPN202 A
| WHERE ENTER_CD = :NEW.ENTER_CD
| AND PAY_ACTION_CD = (SELECT MAX(A.PAY_ACTION_CD)
| FROM TCPN201 A
| WHERE A.ENTER_CD = :NEW.ENTER_CD
| AND A.PAY_CD   = '01'
| AND A.PAYMENT_YMD < :NEW.PAYMENT_YMD)
| ;
| 
| EXCEPTION
| WHEN OTHERS THEN
| P_COM_SET_LOG_NOCOMMIT(:NEW.ENTER_CD,lv_biz_cd,lv_object_nm,'30',SQLERRM,:NEW.CHKID);
| END;
| 
| END IF;
| 
| END IF;
| 
| IF lv_run_type IN ('00001','00002') THEN -- 급여
| 
| --복리후생마감항목
| BEGIN
| 
| INSERT INTO TBEN991 (ENTER_CD, PAY_ACTION_CD, BUSINESS_PLACE_CD, BENEFIT_BIZ_CD, CLOSE_ST, BIGO, CHKDATE, CHKID)
| SELECT A.ENTER_CD, :NEW.PAY_ACTION_CD, B.BUSINESS_PLACE_CD, A.BENEFIT_BIZ_CD, '10001', NULL, SYSDATE, :NEW.CHKID
| FROM TCPN980 A, TCPN121 B
| WHERE A.ENTER_CD = :NEW.ENTER_CD
| AND A.PAY_CD = :NEW.PAY_CD
| AND A.BENEFIT_BIZ_CD IS NOT NULL
| AND B.ENTER_CD = A.ENTER_CD
| 
- AND B.BUSINESS_PLACE_CD = '1'
- 
+ AND B.BUSINESS_PLACE_CD <> '3'
+ 
| AND B.SDATE = (SELECT MAX(SDATE)
| FROM TCPN121
| WHERE ENTER_CD = B.ENTER_CD
| AND BUSINESS_PLACE_CD = B.BUSINESS_PLACE_CD
| AND :NEW.PAYMENT_YMD BETWEEN SDATE AND NVL(EDATE, '99991231') )
| AND A.BENEFIT_BIZ_CD <> '15' -- 무신사는 건강보험을 급여계산식에서 별도로 처리하므로 제외 함(by JSG 20200125)
| ;
| 
| /*
| INSERT INTO TBEN991
| (
| SELECT A.ENTER_CD, :NEW.PAY_ACTION_CD, B.BUSINESS_PLACE_CD, A.BENEFIT_BIZ_CD, '10001', NULL, SYSDATE, :NEW.CHKID
| FROM (SELECT ENTER_CD,PAY_CD,BENEFIT_BIZ_CD
| FROM TBEN005
| GROUP BY ENTER_CD,PAY_CD,BENEFIT_BIZ_CD
| ) A
| INNER JOIN TCPN121 B
| ON B.ENTER_CD = A.ENTER_CD
| INNER JOIN TCPN051 C
| ON C.ENTER_CD = B.ENTER_CD
| AND C.BUSINESS_PLACE_CD = B.BUSINESS_PLACE_CD
| AND C.PAY_CD = A.PAY_CD
| WHERE A.ENTER_CD  = :NEW.ENTER_CD
| AND A.PAY_CD = :NEW.PAY_CD
| );
| */
| 
| EXCEPTION
| WHEN OTHERS THEN
| P_COM_SET_LOG_NOCOMMIT(:NEW.ENTER_CD,lv_biz_cd,lv_object_nm,'40',SQLERRM,:NEW.CHKID);
| END;
| 
| END IF;
| 
| --
| END IF;
| -------------------
| IF DELETING AND F_COM_GET_PROFILE(:OLD.ENTER_CD, 1) = 'Y' THEN
| 
| 
| -- 마감관리 자료 삭제
| BEGIN
| DELETE FROM TCPN981
| WHERE ENTER_CD = :OLD.ENTER_CD
| AND PAY_ACTION_CD = :OLD.PAY_ACTION_CD;
| 
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| NULL;
| WHEN OTHERS THEN
| lv_sqlerrm := '마감관리 자료 삭제시 Error => ' || SQLERRM;
| P_COM_SET_LOG_NOCOMMIT(:OLD.ENTER_CD,lv_biz_cd,lv_object_nm,'25',lv_sqlerrm,:NEW.CHKID);
| END;
| 
| BEGIN
| SELECT RUN_TYPE, SEP_PAY_CD
| INTO lv_run_type, lv_sep_pay_cd
| FROM TCPN051
| WHERE ENTER_CD = :OLD.ENTER_CD
| AND PAY_CD   = :OLD.PAY_CD;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| lv_sqlerrm := SQLERRM;
| P_COM_SET_LOG_NOCOMMIT(:OLD.ENTER_CD,lv_biz_cd,lv_object_nm,'30',lv_sqlerrm,:OLD.CHKID);
| END;
| 
| IF lv_run_type IN ('00001','00002') THEN -- 급여, 상여일경우
| -- 소급대상소득관리
| 
| BEGIN
| DELETE FROM TCPN503 A
| WHERE A.ENTER_CD      = :OLD.ENTER_CD
| AND A.PAY_ACTION_CD = :OLD.PAY_ACTION_CD;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| NULL;
| WHEN OTHERS THEN
| lv_sqlerrm := '소급대상소득관리 Delete시 Error => ' || SQLERRM;
| P_COM_SET_LOG_NOCOMMIT(:OLD.ENTER_CD,lv_biz_cd,lv_object_nm,'40',lv_sqlerrm,:OLD.CHKID);
| END;
| 
| BEGIN
| DELETE FROM TBEN991 A
| WHERE A.ENTER_CD      = :OLD.ENTER_CD
| AND A.PAY_ACTION_CD = :OLD.PAY_ACTION_CD;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| NULL;
| WHEN OTHERS THEN
| lv_sqlerrm := '복리후생마감관리 Delete시 Error => ' || SQLERRM;
| P_COM_SET_LOG_NOCOMMIT(:OLD.ENTER_CD,lv_biz_cd,lv_object_nm,'50',lv_sqlerrm,:OLD.CHKID);
| END;
| -- 소급대상소득항목관리
| 
| BEGIN
| DELETE FROM TCPN504 A
| WHERE A.ENTER_CD      = :OLD.ENTER_CD
| AND A.PAY_ACTION_CD = :OLD.PAY_ACTION_CD;
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| NULL;
| WHEN OTHERS THEN
| lv_sqlerrm := '소급대상소득항목관리 Delete시 Error => ' || SQLERRM;
| P_COM_SET_LOG_NOCOMMIT(:OLD.ENTER_CD,lv_biz_cd,lv_object_nm,'50',lv_sqlerrm,:OLD.CHKID);
| END;
| 
| 
| 
| --급여기산일
| BEGIN
| 
| DELETE FROM TCPN202 A
| WHERE A.ENTER_CD      = :OLD.ENTER_CD
| AND A.PAY_ACTION_CD = :OLD.PAY_ACTION_CD;
| 
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| NULL;
| WHEN OTHERS THEN
| lv_sqlerrm := '급여기산일 Delete시 Error => ' || SQLERRM;
| P_COM_SET_LOG_NOCOMMIT(:OLD.ENTER_CD,lv_biz_cd,lv_object_nm,'60',lv_sqlerrm,:OLD.CHKID);
| END;
| 
| ELSIF lv_run_type IN ('R0001') THEN -- 퇴직급여
| 
| --급여기산일
| BEGIN
| 
| DELETE FROM TCPN202 A
| WHERE A.ENTER_CD      = :OLD.ENTER_CD
| AND A.PAY_ACTION_CD = :OLD.PAY_ACTION_CD;
| 
| EXCEPTION
| WHEN NO_DATA_FOUND THEN
| NULL;
| WHEN OTHERS THEN
| lv_sqlerrm := '급여기산일 Delete시 Error => ' || SQLERRM;
| P_COM_SET_LOG_NOCOMMIT(:OLD.ENTER_CD,lv_biz_cd,lv_object_nm,'60',lv_sqlerrm,:OLD.CHKID);
| END;
| 
| END IF;
| 
| END IF;
| END ;
| 
| 
| 
| 
- 
- 
| /
| ALTER TRIGGER "EHR_NG"."TRG_CPN_201" ENABLE;
```
---
