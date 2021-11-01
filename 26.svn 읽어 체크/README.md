0. set SVN_EDITOR=notepad.exe

1. 기존 svn 레파지토리 Checkout
svn checkout https://akcnapwvihrad01.novelis.biz/svn/NG_DEV/EHR_NG

2. cd EHR_NG

3. 수정사항 업데이트
svn update

4. ant -f build.prod.xml

5. deployed - target/ROOT.war

2892