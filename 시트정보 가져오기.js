// 활성화된 Window 가져오기
function getActiveTabWindow(doc) {
  var $a = $("li[aria-selected=true] > a[href]", doc);
  var prgTitle = $a.text();
  var prgHref = $a.attr("href");
  var $activeIframe = $(prgHref, doc).find("iframe");
  if (prgTitle) {
    console.log("-", prgTitle, "-");
  }
  return $activeIframe.length ? $activeIframe[0].contentWindow : $("iframe", doc).length && $("iframe", doc)[0].contentWindow;
}

function getSheetInfo() {
  var results = {};

  Object.keys(this)
    .filter(
      function findIbSheet(key) {
        var obj = this[key];
        return !/^_/.test(key) && obj && obj.GetCellValue && obj.GetSelectRow; // ibsheet 메서드
      }.bind(this)
    )
    .forEach(
      function (sheetName) {
        var sheet = this[sheetName];
        var row = sheet.GetSelectRow();
        if (row === -1) return;

        results[sheetName] = [];

        for (var col = 0; col < sheet.ColCount; col++) {
          var value = sheet.GetCellValue(row, col);
          var text = sheet.GetCellText(row, col);
          var colName = sheet.ColSaveName(col);
          var isHidden = sheet.GetColHidden(col);

          var set = new Set();

          // Merge된 헤더내용 처리
          // 데이터 시작 전 까지 반복 (Header만큼 반복)
          for (var i = 0; i < sheet.GetDataFirstRow(); i++) {
            set.add(sheet.GetCellText(i, col));
          }

          var headerText = Array.from(set).join(" ");

          // 히든컬럼일 경우 표시
          if (isHidden) {
            headerText += "(Hidden)";
          }

          results[sheetName].push({
            Header: headerText,
            Value: value,
            Text: value !== text ? text : "", // 화면에 보이는 값과 실제 값이 다를 경우
            ColName: colName,
            Hidden: isHidden
          });
        }
      }.bind(this)
    );

  Object.keys(results)
    .sort(function (a, b) {
      return a.replace(/[^0-9]/g, "") - b.replace(/[^0-9]/g, "");
    })
    .forEach(
      function (sheetName) {
        if (results[sheetName]) {
          // var temp = $("div[id*=DIV_" + sheetName + "]", this.document).siblings().find('.sheet_title li:nth-child(1)').text();
          // var sheetTitle = temp && temp.trim();
          var sheetTitle = "";
          console.log("----", sheetName + sheetTitle, "start ----");
          if (console.table) {
            // console.table(results[sheetName].sort(function (a, b) { return a.Hidden - b.Hidden}), ['ColName', 'Header', 'Value', 'Text']);
            console.table(
              results[sheetName]
                .sort(function (a, b) {
                  return a.Hidden - b.Hidden;
                })
                .reduce(function (acc, cur) {
                  acc[cur.ColName] = cur;
                  return acc;
                }, {}),
              ["Header", "Value", "Text"]
            );
          } else {
            console.log(
              results[sheetName].sort(function (a, b) {
                return a.Hidden - b.Hidden;
              })
            );
          }
          console.log("----", sheetName, sheetTitle, "end ----");
        }
      }.bind(this)
    );

    var activeWindow = getActiveTabWindow(this.document);
    // console.log(activeWindow, activeWindow.location && activeWindow.location.href)
    // 재귀
    if (activeWindow) {
      getSheetInfo.call(activeWindow);
    } else if (Object.keys(results).length === 0) {
      return alert("화면 내 그리드가 없거나 선택된 행이 없음");
    }
}

var activeWindow = getActiveTabWindow(window.document);
getSheetInfo.call(activeWindow);
