var rem = Web.w / 384
var url = new Url()

// 对system.js重载
d.imageResource = {
    upload: "/upload/",
    ueditor: "/ueditor/",
    source: "/source/",
    dbtxt: "/dbtxt/",
    epub: "/epub/"
};

d.ToolIReader = [{
    id: 1,
    href: "#",
    name: "返回",
    onclick: "window.history.back(); return false;"
}, {
    id: 1,
    href: "#",
    name: "封面",
    onclick: "ireader.goto(0); return false;"
}, {
    id: 1,
    href: "#",
    name: "往期",
    onclick: "e.issues(); return false;"
}, {
    id: 1,
    href: "#",
    name: "目录",
    onclick: "ireader.catalog(); return false;"
}, ]

console.log(window.location.href)
$("html").css("font-size", rem);

//获取滚动条当前的位置 
function getScrollTop() {
    var scrollTop = 0;
    if (document.documentElement && document.documentElement.scrollTop) {
        scrollTop = document.documentElement.scrollTop;
    } else if (document.body) {
        scrollTop = document.body.scrollTop;
    }
    return scrollTop;
}

//获取当前可是范围的高度 
function getClientHeight() {
    var clientHeight = 0;
    if (document.body.clientHeight && document.documentElement.clientHeight) {
        clientHeight = Math.min(document.body.clientHeight, document.documentElement.clientHeight);
    } else {
        clientHeight = Math.max(document.body.clientHeight, document.documentElement.clientHeight);
    }
    return clientHeight;
}

//获取文档完整的高度 
function getScrollHeight() {
    return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
}

document.addEventListener('touchend', function(re) {
    if (getScrollTop() + getClientHeight() == getScrollHeight()) {
        e.loadMore();
    }
}, false);

d.ToolBottom = [
    { id: "index", href: "#", name: "博看书苑", onclick: "e.goto(this, 'index')" },
    { id: "search", href: "#", name: "搜索", onclick: "e.goto(this, 'search')" },
    { id: "search", href: "https://www.wenjuan.com/s/eARjMr/", name: "书友信箱" },
]

d.Login = [
    { "title": "用户名", "name": "text", "placeholder": "请输入用户名" },
    { "title": "密码", "name": "password", "placeholder": "请输入密码" }
]


var page = url.GetPage()
for (var x in d.ToolBottom) {
    var obj = d.ToolBottom[x]
    if (page == obj.id) {
        obj._class = 'active'
    }
}

e.FormatPartCatalog = function(data) {
    ereader.data = data
    var part = new PartCatalog()
    part.SetData(data)
    part.SetClass("pc-catalog")
    $("#catalog").html(part.Html().String())
}

/**
 * 格式化数据为菜单导航
 */
e.MenuCategory = function(data, selector, _goto) {
    if (!data) {
        return
    }
    if (!_goto) {
        _goto = 0
    }
    if (data.length == 1 && data[0].sublevels.length > 1) {
        data = data[0].sublevels
    }
    var url = new Url()
    for (var x in data) {
        data[x].href = url.Path(_goto + '/0/' + data[x].id)
        if (url.GetCategory() && url.GetCategory() === '0') {
            data[0]._class = 'active'
        } else {
            if (url.GetCategory() == data[x].id) {
                data[x]._class = 'active'
            } else {
                data[x]._class = ''
            }
        }
    }
    return data
}

/**
 * 使用资源的信息
 */
e.MenuProduct = function(data, selector, _goto) {
    if (!_goto) {
        _goto = 0
    }
    var a = []
    var b = { magazine: '杂志', paper: '报纸', book: '图书' }
    var url = new Url()
    var i = 0
    for (var x in b) {
        i++
        if (data[x] < 0 || (data[x] == 0 && x == 'article')) {
            continue
        }
        var h = url.Path(_goto + "/" + i)
        obj = { id: i, href: h, name: b[x] }
        if (url.GetGenre() == obj.id) {
            obj._class = 'active'
        }
        a.push(obj)
    }
    return a
}

e.goto = function(it, tag) {
    if (new Url().GetPage() == 'index') {
        Session.Remove("wei-goto-page")
        $(".page-tb").hide()
        $(".page-" + tag).show()
        $(it).parents("nav").find('li').removeClass("active")
        $(it).parent().addClass("active")
    } else if (new Url().GetPage() == 'issue') {
        window.location.href = new Url().Path('index')
        Session.Set("wei-goto-page", tag);
    }
}


/**
 * 单项预览列表
 */
e.PreviewItems = function(data, selector, _goto) {
    if (!data) {
        return
    }
    e.loading = 0;

    var url = new Url()
    for (var x in data) {
        e.checkJpg(x, data)
        var obj = data[x]
        if (!obj) {
            continue;
        }
        if (!obj || !obj.resourceName) {
            data.splice(x, 1)
            continue;
        }
        data[x]['name'] = obj.resourceName
        var genre = url.GetGenre()
        var path = obj.webp
        if (!isWebp || !obj.epub || obj.epub == "0") {
            path = obj.jpg
        }
        var array = [path, obj.html, obj.resourceId, obj.issueId]
        if (genre == '2') {
            array = [obj.txt, obj.html, obj.resourceCode, obj.issueNo]
        }
        data[x]['src'] = e.ContentPicture(genre, array)
        var page = e.ItemPage(obj.web, obj.jpg, obj.html)
        data[x].href = url.Path(page + "/0/0/" + obj.resourceId + "/" + obj.issueId)
        if (e.IsRole(obj.issueId)) {
            delete(data[x].price1)
        }
    }
    return data
}

/**
 * 资源请求处理，1. 请求jcms2.0, 2. 请求陈工资源服务器
 */
e.ContentPicture = function(genre, a, webp) {
    var path = "page"
    var ext = ".mg"
    var key = "/source/"

    if (!isWebp || !webp || webp == "0") {
        path = "jpage"
        ext = ".jpg"
    }
    // 判断epub封面
    // if (!!a[1] && a[1] != "0" && (!a[0] || a[0] == "0") ) {
    //     path = "epub"
    //     a[0] = a[1]
    // }

    if (d.isUseRedirect) {
        switch (path) {
            case "epub":
                key = d.imageResource.epub
                break;
            default:
                key = d.imageResource.source
        }
    }

    var src = key + path + a[0] + "/" + a[2] + "/" + a[2] + "-" + a[3] + "/cover_small" + ext
    if (genre == 2) {
        if (d.isUseRedirect) {
            key = d.imageResource.dbtxt
        }
        src = key + "/dbtxt/" + a[0] + "/" + a[2] + "/" + a[3] + "/JPG/pages_1.jpg"
    }

    return src
}

e.search = function(self, selector) {
    if (!self || !selector) {
        console.log('search self or selector is null', self, selector)
        return
    }
    var it = $(self).parent().prev()
    var value = it.val()
    if (!value) {
        return
    }
    $(".source-category").hide()
    $(".nav li").removeClass("active")
    var img = new Html("img", "", "src=load.gif", 'style=width:8rem;top:8rem')
    var p = new Html("p", img, "style=text-align:center")
    $(selector).html(p.String())
    $("[name='search']").val(value)
    Web.Update(selector, 0)
}

/**
 * 搜索单项预览列表
 */
e.SearchItems = function(data, selector, _goto) {
    if (!data) {
        return
    }
    if (!$("input[name='search']").val()) {
        return
    }

    var url = new Url()
    if ((!data.magazines || data.magazines == 0) && (!data.papers || data.papers == 0) && (!data.books || data.books == 0)) {
        Web.Alert("没有相关资源，请留意！")
        return
    }

    var b = { magazines: '杂志', papers: '报纸', books: '图书', articles: '内容' }
    var genre = { magazines: 1, papers: 2, books: 3, articles: 4 }
    var array = []
    for (var i in b) {
        var value = data[i]
        if (!value || !value instanceof Array || value.length == 0) {
            continue
        }
        for (var x in value) {
            e.checkJpg(x, value)
            var obj = value[x]
            if (!obj) {
                continue;
            }
            obj['name'] = "[" + b[i] + "] " + obj.resourceName
            var path = obj.webp
            if (!isWebp || !obj.epub || obj.epub == "0") {
                path = obj.jpg
            }
            var arr = [path, obj.html, obj.resourceId, obj.issueId]
            if (genre[i] == '2') {
                arr = [obj.txt, obj.html, obj.resourceCode, obj.issueNo]
            }
            obj['src'] = e.ContentPicture(genre[i], arr)
            obj['genre'] = genre[i]
            var page = e.ItemPage(obj.web, obj.jpg, obj.html)
            obj.href = url.Path(page + "/" + genre[i] + "/0/" + obj.resourceId + "/" + obj.issueId)
            array.push(obj)
        }
    }
    return array
}

e.ItemPage = function(web, jpg, html) {
    if (!!web && web != "0") {
        return "imageReader"
    }
    if (!!jpg && jpg != "0") {
        return "imageReader"
    }
    if (!!html && html != "0" && html != "epub0") {
        return "epubReader"
    }
    return "txtReader"
}


e.role = function(iid, page, end, start, toll) {
    return true
}

e.OtherRole = function() {
    return true
}

$(function() {
    var loginTag = e.parseSearchParam(window.location.href).login;
    if (loginTag == "1") {
        var user = Session.Get("user");
        if (!e.role()) {
            e.LoginShow();
        }
    }

    setTimeout(function() {
        $(".page a").click(function() {
            Session.Set("lastpage", new Url().GetPage());
        });
    }, 1000);

    var tabsWidth = 5 // $('#tabs').css('width').split('px')[0];
    var lis = $('#tabs li');
    var l = $('#tabs li').length;
    var wLi = tabsWidth / l; //通过容器的宽度除以li的个数来计算每个li的宽度
    for (var i = 0; i < lis.length; i++) {
        lis[i].style.width = (wLi - 5) + 'px'
    };

    if (new Url().GetPage() == 'index') {
        var page = Session.Get('wei-goto-page');
        if (page) {
            e.goto('a#' + page, page)
        }
    }
});