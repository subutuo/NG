SELECT A.ENTER_CD
     , '2021' AS YYYY
     , A.SABUN
     , C.NAME
     , (SELECT f_com_get_org_nm(A.enter_cd, A.ORG_CD, to_char(SYSDATE, 'yyyymmdd'), 'ko_KR') FROM DUAL) AS ORG_NM
     , NVL(C.EMP_YMD, C.GEMP_YMD) AS EMP_YMD
     , NVL(B.AMT_BF, 0) AS AMT_BF -- 출자금
     , NVL(B.AMT_1, 0) AS AMT_1
     , NVL(B.AMT_2, 0) AS AMT_2
     , NVL(B.AMT_3, 0) AS AMT_3
     , NVL(B.AMT_4, 0) AS AMT_4
     , NVL(B.AMT_5, 0) AS AMT_5
     , NVL(B.AMT_6, 0) AS AMT_6
     , NVL(B.AMT_7, 0) AS AMT_7
     , NVL(B.AMT_8, 0) AS AMT_8
     , NVL(B.AMT_9, 0) AS AMT_9
     , NVL(B.AMT_10, 0) AS AMT_10
     , NVL(B.AMT_11, 0) AS AMT_11
     , NVL(B.AMT_12, 0) AS AMT_12
     , NVL(B.AMT_TOT, 0) AS AMT_TOT
     , TRUNC(NVL(B.AMT_BF / 1000 * 12, 0))       AS CNT_BF -- 좌수
     , TRUNC(NVL(B.AMT_1 / 1000 * 11, 0))       AS CNT_1
     , TRUNC(NVL(B.AMT_2 / 1000 * 10, 0))       AS CNT_2
     , TRUNC(NVL(B.AMT_3 / 1000 * 9, 0))        AS CNT_3
     , TRUNC(NVL(B.AMT_4 / 1000 * 8, 0))        AS CNT_4
     , TRUNC(NVL(B.AMT_5 / 1000 * 7, 0))        AS CNT_5
     , TRUNC(NVL(B.AMT_6 / 1000 * 6, 0))        AS CNT_6
     , TRUNC(NVL(B.AMT_7 / 1000 * 5, 0))        AS CNT_7
     , TRUNC(NVL(B.AMT_8 / 1000 * 4, 0))        AS CNT_8
     , TRUNC(NVL(B.AMT_9 / 1000 * 3, 0))        AS CNT_9
     , TRUNC(NVL(B.AMT_10 / 1000 * 2, 0))        AS CNT_10
     , TRUNC(NVL(B.AMT_11 / 1000 * 1, 0))        AS CNT_11
     , TRUNC(NVL(B.AMT_BF / 1000 * 12, 0) + NVL(B.AMT_1 / 1000 * 11, 0) + NVL(B.AMT_2 / 1000 * 10, 0) + NVL(B.AMT_3 / 1000 * 9, 0) +
       NVL(B.AMT_4 / 1000 * 8, 0)  + NVL(B.AMT_5 / 1000 * 7, 0)  + NVL(B.AMT_6 / 1000 * 6, 0)  + NVL(B.AMT_7 / 1000 * 5, 0) +
       NVL(B.AMT_8 / 1000 * 4, 0)  + NVL(B.AMT_9 / 1000 * 3, 0)  + NVL(B.AMT_10 / 1000 * 2, 0)  + NVL(B.AMT_11 / 1000 * 1, 0)) AS CNT_TOT
     , NULL AS ASSIGN_AMT -- 배당금
     , NULL AS BALANCE_AMT -- 정산금
     , NULL AS BALANCE_DATE -- 정산일자
     , NVL(AMT_TOT, 0) AS REST_AMT -- 잔액
     , 'N'  AS SET_YN -- 확정
  FROM thrm151 A