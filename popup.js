var bgPage = chrome.extension.getBackgroundPage();
var list = bgPage.list;
var e = document.getElementById("info");
var es = e.innerHTML;
for (var i = 0; i < list.length; i++)
{
    es = es + list[i] + "<br />";
}
e.innerHTML = es;