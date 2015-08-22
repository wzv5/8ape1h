// author:  wang zheng
// date:    2015.03.23
// description: 运营商劫持监视，针对河南联通

var count = 0;
var list = [];

var blacklist = [
// 阻止连接
[/http:\/\/61\.163\.249\.25\/proxy\?/, 1],
[/hndnserror/, 1],
[/s\.ashx/, 1],
[/youku\.ashx/, 1],
[/xiaomi\.ashx/, 1],
[/296cq\.com/, 1],
[/www\.bobo\.com/, 1],

// 可疑
[/\/proxy\?/, 0],
[/\.ashx/, 0],
//[/http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\//, 0],
];

var whitelist = [
];

function setIconText(text) {
	chrome.browserAction.setBadgeText({
		text: ""+text
	});
}
setIconText("");

function findWhiteList(url) {
    for (var i = 0; i < whitelist.length; i++)
    {
        if (whitelist[i].test(url)) return 1;
    }
    return 0;
}

function findBlackList(url) {
    for (var i = 0; i < blacklist.length; i++)
    {
        if (blacklist[i][0].test(url))
            return blacklist[i][1] ? 1 : -1;
    }
    return 0;
}

function getRedirectUrl(headers) {
    for (var i = 0; i < headers.length; i++)
    {
        if (headers[i].name == "Location")
            return headers[i].value;
    }
}

function getUrlParam(url, param) {
    var i, s, p, i2;
    i = url.indexOf("?");
    if (i == -1)
        return ""
    s = url.substr(i+1);
    i = s.indexOf("#");
    if (i != -1)
        s = url.substring(0, i);
    if (!param) return s;
    s = "&" + s + "&";
    p = "&" + param + "="
    i = s.indexOf(p);
    if (i == -1)
        return "";
    i2 = s.indexOf("&", i+p.length);
    if (i2 == -1)
        return "";
    return s.substring(i+p.length, i2);
}

function removeUrlParam(url, param) {
    var i1, i2, i3, i4;
    var u1, u2, u3;
    var a;
    
    // 拆分url
    i1 = url.indexOf("?");
    if (i1 == -1)
        return url;
    i1++;
    u1 = url.substring(0, i1);
    i2 = url.indexOf("#", i1);
    if (i2 == -1) {
        u2 = url.substring(i1);
        u3 = "";
    }
    else {
        u2 = url.substring(i1, i2);
        u3 = url.substring(i2);
    }
    
    // 分析u2部分
    i3 = 0;
    i4 = -1;
    while (true) {
        i3 = u2.indexOf(param + "=", i3);
        if (i3 == -1) {
            i3 = u2.length;
            break;
        }
        a = u2.substr(i3-1, 1);
        if (i3 == 0 || a == "&") {
            i4 = u2.indexOf("&", i3+param.length+1);
            break;
        }
        else {
            i3 += param.length+1;
        }
    }
    
    // 组合最终url
    a = u1 + u2.substring(0, i3);
    if (i4 != -1)
        a += u2.substring(i4+1);
    if (a.substr(-1, 1) == "&")
        a = a.substr(0, a.length-1);
    if (a.substr(-1, 1) == "?")
        a = a.substr(0, a.length-1);
    a += u3;
    return a;
}

function findPromotion(url) {
    if (url.indexOf("baidu.com") == -1 && url.indexOf("hao123.com") == -1)
        return;
    var tn = getUrlParam(url, "tn");
    // 不过滤百度官方的tn参数
    if (!tn 
        || tn.indexOf("baidu") != -1
        || tn.indexOf("bmSelfUsrStat") != -1
        || tn.indexOf("usercounts") != -1
        || tn.indexOf("channellist") != -1
        || tn.indexOf("videoMulti") != -1
        || tn.indexOf("dutu") != -1
        || tn.indexOf("detail") != -1
        || tn.indexOf("redirect") != -1
        || tn.indexOf("result") != -1
        || tn.indexOf("default") != -1
    ) return;
    return removeUrlParam(url, "tn");
}

chrome.webRequest.onHeadersReceived.addListener(function (o) {  
    var url = o.url;
    var tourl = getRedirectUrl(o.responseHeaders);
    if (!tourl) return;
    if (!tourl.startsWith("http://") && !tourl.startsWith("https://"))
        return;
    if (findWhiteList(tourl)) return;
    var result = findBlackList(tourl);
    if (result == 0) return;
    
    setIconText(++count);
    var s = "可疑重定向：" + url + " => " + tourl;
    if (result == 1) {
        s = "【已阻止】" + s;
        chrome.webRequest.handlerBehaviorChanged();
    }
    list.push(s);
    console.log(s);
    
    return {cancel: result == 1};
}, { urls: ["<all_urls>"] }, ["blocking", "responseHeaders"]);

chrome.webRequest.onBeforeRequest.addListener(function (o) {
    var url = o.url;
    if (!url.startsWith("http://") && !url.startsWith("https://"))
        return;
    var tourl = findPromotion(url);
    if (tourl) {
        setIconText(++count);
        var s = "推广链接：" + url + "，修正后：" + tourl;
        list.push(s);
        console.log(s);
        chrome.webRequest.handlerBehaviorChanged();
        return {redirectUrl: tourl};
    }
}, { urls: ["<all_urls>"] }, ["blocking"]);

chrome.webRequest.onBeforeSendHeaders.addListener(function (o) {
    if (o.url.startsWith("http://")) {
        var found = false;
        o.requestHeaders.forEach(function(h) {
        if (h.name == "Cookie") {
            found = true;
            if (h.value.indexOf("qh[360]=1") == -1) {
                h.value += "; qh[360]=1";
            }
        }
        });
        if (!found) {
            o.requestHeaders.push({name: "Cookie", value: "qh[360]=1"});
        }
        return {requestHeaders: o.requestHeaders};
    }
}, { urls: ["<all_urls>"] }, ["blocking", "requestHeaders"]);
