var rem = Math.floor(Web.w / 25);
var url = new Url()
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
        obj.class = 'active'
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
            data[0].class = 'active'
        } else {
            if (url.GetCategory() == data[x].id) {
                data[x].class = 'active'
            } else {
                data[x].class = ''
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
            obj.class = 'active'
        }
        a.push(obj)
    }
    if (a.length == 1) {
        $("#layout-body tr:first").hide()
        $("#layout-left").css("height", Web.h - 4.5 * rem)
        $("#layout-right").css("height", Web.h - 4.5 * rem)
    }
    return a
}

e.goto = function(it, tag) {
    if (new Url().GetPage() == 'index') {
        Session.Remove("wei-goto-page")
        $(".page-tb").hide()
        $(".page-" + tag).show()
        if (tag == 'index' && $(".page-index .nav li").length == 1) {
            $("#layout-body tr>td:first").hide()
        }
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
        if (!isWebp && obj.epub == "0") {
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
    var img = new Html("img", "", "src=load.gif", 'style=width:8rem;top:8rem')
    var p = new Html("p", img, "style=text-align:center")
    $(selector).html(p.String())
    $("[name='search']").val(value)
    Web.Update(selector, 0)
}

/**
 * 分页加载
 */
e.loadMore = function() {
    if (e.loading) {
        return
    }
    e.loading = 1
    var url = $(".load-more:last").attr("data-source")
    if (!url) {
        return
    }
    url = url.replace(/\/page\/\d+/i, function(word) {
        var a = word.split("/")
        if (a.length != 3) {
            return word
        }
        return "/page/" + (parseInt(a[2]) + 1)
    });

    var index = $("part").length
    $(".load-more:last").after($(".load-more:first").clone())
    $(".load-more:last").html('<p style="text-align:center;"><img class="loading" src="load.gif" style="width:10%;"></p>')
    $(".load-more:last").attr("data-source", url)
    $(".load-more:last").attr("data-index", parseInt(index) + 1)
    Web.Update(".load-more:last", 0)
}

/**
 * 搜索单项预览列表
 */
e.SearchItems = function(data, selector, _goto) {
    if (!data) {
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
            if (!isWebp && obj.epub == "0") {
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

$(function() {
    $("#layout-body").css("width", Web.w)
    $("#layout-body").css("height", Web.h)
    $("#layout-left").css("height", Web.h - 9 * rem)
    $("#layout-right").css("height", Web.h - 9 * rem)

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

    if (new Url().GetPage() == 'index') {
        var page = Session.Get('wei-goto-page');
        if (page) {
            e.goto('a#' + page, page)
        }
    }
});