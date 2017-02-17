var Session = SessionCache // 启用缓存的方式
    // 定义页面基准尺寸 16:9
var rem = Web.w > Web.h ? Math.ceil(Web.w / 384) : Math.ceil(Web.w / 216)
var url = new Url()
var role = Session.Get("role") // 用户是否登录

// VIP专区显示
var vip = "hide"
if (!!role && !!role.source) {
    for (var x in role.source) {
        var vip = "" // 有品种包年时显示vip专区
        break
    }
}

$("html").css("font-size", rem)

d.indexPage = { id: "home", name: "首页", href: url.Path('index') }
d.Search = { count: 0, magazine: 0, book: 0, paper: 0 }

// 内容页工具
d.WebNav = [
    { id: "index", href: url.Path("index"), name: "首页", class: url.GetPage() == 'index' ? 'active' : '' },
    { id: "magazine", href: url.Path("magazine/1"), name: "杂志", class: url.GetPage() == 'magazine' ? 'active' : '' },
    { id: "book", href: url.Path("book/3"), name: "图书", class: url.GetPage() == 'book' ? 'active' : '' },
    { id: "paper", href: url.Path("paper/1"), name: "报纸", class: url.GetPage() == 'paper' ? 'active' : '' },
    { id: "paper", href: url.Path("free"), name: "免费阅读", class: url.GetPage() == 'free' ? 'active' : '' },
    // { id: "paper", href: url.Path("article/4/0/0/100"), name: "移动阅读" },
]

d.UserMenu = [
    [
        { id: 0, name: "注册或登录", href: url.Path("login") },
    ],
    [
        { id: 0, name: "退出", href: "#", onclick: "e.logout();return false;" },
        { id: 0, name: "我的订单", href: url.Path("order") },
        { id: 0, name: "购物车", href: url.Path("user/user@ShopCart") },
        { id: 0, name: "我的书架", href: url.Path("user/1/user@ResourceShelf") },
    ],
]


d.UserInfoMneu = [{
        id: 0,
        name: "我的书架",
        href: url.Path("user/1/user@ResourceShelf"),
        class: url.GetArgs('user') == 'ResourceShelf' ? 'active' : ''
    },
    {
        id: 1,
        name: "VIP专区",
        href: url.Path("user/1/user@ResourceVip"),
        class: url.GetArgs('user') == 'ResourceVip' ? 'active ' + vip : vip
    },
    {
        id: 2,
        name: "最近浏览",
        href: url.Path("user/1/user@LastReader"),
        class: url.GetArgs('user') == 'LastReader' ? 'active' : ''
    },
    {
        id: 3,
        name: "购物车",
        href: url.Path("user/1/user@ShopCart"),
        class: url.GetArgs('user') == 'ShopCart' ? 'active' : ''
    },
    {
        id: 4,
        name: "我的订单",
        href: url.Path("order"),
        class: url.GetPage() == 'order' ? 'active' : ''
    },
    {
        id: 5,
        name: "密码设置",
        href: url.Path("setting"),
        class: url.GetPage() == 'setting' ? 'active' : ''
    },
]


d.UserSourceOperate = []
if (url.GetArgs('user') == 'LastReader') {
    d.UserSourceOperate.push({ name: "选择", onclick: "e.ItemSelect()" }, { name: "删除", onclick: "e.ItemDelete()" })
} else if (url.GetArgs('user') == 'ShopCart') {
    d.UserSourceOperate.push({ name: "选择", onclick: "e.ItemSelect()" }, {
        name: "删除",
        onclick: "e.ItemDelete()"
    }, { name: "购买", onclick: "e.BuyItem()" })
}

d.Login = [
    { "name": "text", "placeholder": "手机号码" },
    { "name": "password", "placeholder": "密码或验证码" }
]

d.BottomMenu = [
    { name: "联系我们", href: url.Path("article/4/0/0/101") },
    // { name: "加入我们", href: "javascript:void(0)" },
    // { name: "刊社入口", href: "javascript:void(0)" },
    { name: "关于我们", href: "http://www.bookan.com.cn/hsh/job/job.html#page2" },
]


d.UserSource = [
    { name: "杂志/报纸", onclick: "e.PersonTab(this, 0, 3)" },
    // { name: "报纸", onclick: "e.PersonTab(this, 1, 3)" },
    { name: "图书", onclick: "e.PersonTab(this, 2, 3)" },
]


/**
 * 杂志分类
 */
e.MagazineCategory = function(data, selector, _goto) {
    //层级
    var i = 0
    var d = []
    if (data.length == 1) {
        for (var x in data) {
            if (!i) {
                d = data[x].sublevels
                break
            }
        }
    } else {
        return e.TreeRecursion(data, selector, _goto)
    }
    //加载面包屑
    if (selector.indexOf("PartList") > 0) {
        setTimeout(function() {
            e.BreadcrumbsHtml()
        }, 100)
    }
    return e.TreeRecursion(d, selector, _goto)
}

e.TreeRecursion = function(data, selector, _goto) {
    if (!data || data.length == 0) {
        return
    }

    if (!_goto) {
        _goto = 0
    }
    var genre = _goto == "magazine" ? 1 : (_goto == "paper" ? 2 : (_goto == "book" ? 3 : (_goto == "article" ? 4 : 0)))
    var url = new Url()
    var sourceType = url.GetGenre()
    var page = _goto
    if (!_goto) {
        if (sourceType == 1) {
            page = "magazine"
        } else if (sourceType == 3) {
            page = "book"
        } else if (sourceType == 4) {
            page = "article"
        }
    }

    for (var x in data) {
        obj = data[x]
        data[x].href = url.Path(page + "/" + genre + "/" + obj.id)
        data[x].sublevels = e.TreeRecursion(obj.sublevels, selector, _goto)
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
    var b = { magazine: '杂志', paper: '报纸', book: '图书', article: '内容' }
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
    for (var x in d.ToolBottom) {
        var obj = d.ToolBottom[x]
        if (url.GetPage() == "search" && obj.id == 'search') {
            obj._class = 'active'
        }
        a.push(obj)
    }
    return a;
}

/**
 * ad广告
 */
e.AdItems = function(data, selector, _goto) {
    for (var x in data) {
        data[x].title = ""
    }
    return data
}

/**
 * 期刊列表显示
 */
e.ListItems = function(data, selector, _goto) {
    if (!data || data.length == 0) {
        return
    }
    if (!_goto) {
        _goto = 0
    }
    var source = $(selector).attr("data-source")
    var url = new Url(source)
    var genre = url.GetGenre()
    var category = url.GetCategory()
    var d = []
    for (var x in data) {
        if (x == 10) {
            break;
        }
        d[x] = data[x]
        d[x].name = data[x].resourceName
        d[x].href = url.Path("detail" + "/" + genre + "/" + category + "/" + data[x].resourceId + "/" + data[x].issueId)
    }
    return d
}

/**
 *
 */

e.NoTitle = function(data, selector, _goto) {
    if (!data || data.length == 0) {
        return
    }
    var d = data[0]
    d.title = ""
    return d
}

/**
 * 单项预览列表
 */
e.PreviewLimit = function(data, selector, _goto) {
    return e.PreviewItems(data, selector, _goto, 12)
}

e.PreviewItems = function(data, selector, _goto, limit) {
    if (!data) {
        return
    }

    var source = $(selector).attr("data-source")
    var url = new Url(source)
    var d = []
    for (var x in data) {
        if (!e.checkJpg(x, data)) {
            continue
        }
        if (!!limit && x >= limit) {
            break
        }
        var obj = data[x]
        if (!obj) {
            continue;
        }
        d[x] = obj
        d[x]['name'] = obj.resourceName
        var genre = url.GetGenre()
        var path = obj.webp
        if (!isWebp && obj.epub == "0") {
            path = obj.jpg
        }
        var arr = [path, obj.html, obj.resourceId, obj.issueId]
        if (genre == '2') {
            arr = [obj.txt, obj.html, obj.resourceCode, obj.issueNo]
        }
        d[x]['src'] = e.ContentPicture(genre, arr)
        d[x]['genre'] = url.GetGenre()
        d[x].href = url.Path("detail/0/0/" + obj.resourceId + "/" + obj.issueId)
        if (e.IsRole(obj.issueId)) {
            delete(data[x].price1)
        }
    }
    return d
}

/**
 * 搜索单项预览列表
 */
e.SearchItems = function(data, selector, _goto) {
    if (!data) {
        return
    }

    var url = new Url()
    if (url.GetPage() == "search" && (!data.magazines || data.magazines == 0) && (!data.papers || data.papers == 0) && (!data.books || data.books == 0)) {
        d.Search.count++
            if (d.Search.count > 1) {
                var searchVal = $('input[name="search"]').val();
                if (!searchVal) {
                    searchVal = decodeURI(window.location.href.split("@")[1]);
                }
                Web.Alert('很抱歉，没有找到与"' + searchVal + '"相关的内容！');
            }
        return
    }


    var b = { magazines: '杂志', papers: '报纸', books: '图书', articles: '内容' }
    var genre = { magazines: 1, papers: 2, books: 3, articles: 4 }
    if (window.location.href.indexOf("user@ResourceVip") > 0) {
        b = { resourceMagazines: '杂志', resourcePapers: '报纸', resourceBooks: '图书', resourceArticles: '内容' }
        genre = { resourceMagazines: 1, resourcePapers: 2, resourceBooks: 3, resourceArticles: 4 }
    }

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
            if (genre == '2') {
                arr = [obj.txt, obj.html, obj.resourceCode, obj.issueNo]
            }
            obj['src'] = e.ContentPicture(genre, arr)
            obj['genre'] = genre[i]
            var page = e.ItemPage(obj.web, obj.jpg, obj.html)
            obj.href = url.Path("detail/" + genre[i] + "/0/" + obj.resourceId + "/" + obj.issueId)
            if (e.IsRole(obj.issueId)) {
                delete(obj.price1)
            }
            array.push(obj)
        }
    }
    if (!!data.magazines && data.magazines.length > 0) {
        d.Search.magazine = 1
    }

    if (!!data.books && data.books.length > 0) {
        d.Search.book = 1
    }

    if (!!data.papers && data.papers.length > 0) {
        d.Search.paper = 1
    }

    if (!d.Search.magazine && d.Search.book) {
        e.PersonTab($('.del a')[1], 2, 3)
    }
    if (d.Search.magazine && !d.Search.book) {
        e.PersonTab($('.del a')[0], 0, 3)
    }
    if (d.Search.paper && !d.Search.book) {
        e.PersonTab($('.del a')[0], 0, 3)
    }
    return array
}


/**
 * 单项预览列表
 */
e.YearItems = function(data, selector, _goto) {
    if (!data) {
        return
    }
    var url = new Url()
    var name = ''
    for (var x in data) {
        e.checkJpg(x, data)
        var obj = data[x]
        if (!obj) {
            continue;
        }
        if (!name) {
            name = obj.resourceName
        }
        data[x]['name'] = obj.issueName
        var genre = url.GetGenre()
        var path = obj.webp
        if (!isWebp && obj.epub == "0") {
            path = obj.jpg
        }
        var array = [path, obj.html, obj.resourceId, obj.issueId]
        if (genre == 2) {
            data[x]['name'] = obj.issueNo
            array = [obj.txt, obj.html, obj.resourceCode, obj.issueNo]
        }
        data[x]['src'] = e.ContentPicture(genre, array)
        var page = e.ItemPage(obj.web, obj.jpg, obj.html)
        data[x].href = url.Path("detail/0/0/" + obj.resourceId + "/" + obj.issueId)
        if (e.IsRole(obj.issueId)) {
            delete(data[x].price1)
        }
    }
    $("#resourceName").html(name)
    return data
}


e.MagazineTab = function(it, x, len) {
    for (var i = 0; i < len; i++) {
        $("#magazine-" + i).hide();
    }
    $(it).parent().addClass('active')
    $(it).parent().siblings().removeClass()
    $("#magazine-" + x).show()
}


e.BookTab = function(it, x, len) {
    for (var i = 0; i < len; i++) {
        $("#Book-" + i).hide()
    }
    $(it).parent().addClass('active')
    $(it).parent().siblings().removeClass()
    $("#Book-" + x).show()
}

e.PersonTab = function(it, x, len) {
    for (var i = 0; i < len; i++) {
        $("#preview-" + i).hide();
    }
    $(it).parent().addClass('active')
    $(it).parent().siblings().removeClass()
    $("#preview-" + x).show()
}


//多级菜单跳转
e.MenuOnMove = function(it, url) {
    if (!$(it).next()[0]) {
        window.location.href = url
        return false
    }
    $(it).next().children().show()
}

//多级菜单跳转
e.MenuOnMove = function(it, url) {
    if (!$(it).next()[0]) {
        window.location.href = url
        return false
    }
    $(it).next().children().show()
}


e.stripString = function(s) {
    var pattern = new RegExp("[`~!@#$^&*()=|{}':;',\\[\\].<>/?~！@#￥……&*（）&mdash;—|{}【】‘；：”“'。，、？%%]")
    var rs = "";
    for (var i = 0; i < s.length; i++) {
        rs = rs + s.substr(i, 1).replace(pattern, '');
    }
    return rs;
};

e.search = function(self, selector) {
    d.Search.count = 0; // 搜索次数索引置空
    if (!self || !selector) {
        console.log('search self or selector is null', self, selector)
        return
    }
    var it = $(self).parent().prev()
    var value = it.val().toString().trim();
    value = e.stripString(value);
    if (!value || value == "") {
        Web.Alert("请输入正确的搜索内容！")
        return
    }
    var url = new Url()
    if (url.GetPage() == "search") {
        Web.Update("[data-name='PartPreview']", 0);
        return
    }
    window.location.href = url.Path("search/search@" + value)
}

//期册信息明细
e.DetailShow = function(data, selector, _goto) {
    if (!data || data.length == 0) {
        return
    }
    Session.Set("issue" + data[0].issueId, data[0].price1)
    var d = {}
    d.items = []
    d.free = 0
    var url = new Url()
    var genre = url.GetGenre()
    var obj = data[0]
        //是否不需要购买
    if (!(obj.price1 * 100)) {
        d.free = 1
    }
    if (e.IsRole(obj.issueId)) {
        d.free = 2
    }
    d.base = {
        id: obj.resourceId,
        name: obj.resourceName,
        genre: genre,
        iid: obj.issueId
    }
    if (genre == 1 || genre == 2) {
        d.base.issueName = obj.issueName
    }
    var path = obj.webp
    if (!isWebp && obj.epub == "0") {
        path = obj.jpg
    }
    var array = [path, obj.html, obj.resourceId, obj.issueId]
    if (genre == '2') {
        array = [obj.txt, obj.html, obj.resourceCode, obj.issueNo]
    }
    var src = e.ContentPicture(genre, array)
    d.images = [
        { src: src }
    ]
    var array = { price1: "电子刊价格", price0: "实物刊价格", /*issueName: "刊期", resourceType: "类别"*/ }
    d.info = []
    for (var x in array) {
        if (!obj[x]) {
            continue
        }
        var dollar = "￥"
        if (x == "price0") {
            if (obj[x] == 0 || obj[x] == "0.00") {
                continue
            }
        }
        if (x == "price1") {
            if (obj[x] == 0 || obj[x] == '0.00') {
                dollar = ""
                obj[x] = " 免费"
            }
        }

        d.info.push({ name: array[x], value: dollar + obj[x], tag: x })
    }

    if (!!obj.explain) {
        d.items.push({ name: "内容介绍", value: obj.explain })
    }

    d.source = []
    if ((!!obj.html && obj.html > '0') || (!!obj.txt && obj.txt > '0')) {
        if (!obj.html) {
            obj.html = '0'
        }
        if (!obj.txt) {
            obj.txt = '0'
        }
        d.source.push({ name: "文本版阅读", func: "TxtReader", value: obj.html + "," + obj.txt, tag: 'text' })
    }
    if ((!!obj.pdf && obj.pdf > '0') || (!!obj.webp && obj.webp > '0')) {
        var pdf = !obj.pdf ? 0 : obj.pdf
        var webp = !obj.webp ? 0 : obj.webp
        var jpg = !obj.jpg ? 0 : obj.jpg
        d.source.push({ name: "原貌版阅读", func: "ImgReader", value: pdf + "," + webp + "," + jpg, tag: 'image' })
    }

    return d
}

// e.DetailCatalog = function(data, selector, _goto){
//     var a = e.CatalogLi(data, 0)
//     var s = a.join('<br>')
//     d.items.push({ name: "目录", value: s })
// }

e.CatalogLi = function(data, level) {
    var d = []
    var c = Web.Char('--', level)
    for (var x in data) {
        s = c + data[x].name
        d.push(s)
        a = e.CatalogLi(data[x].sublevels, level + 1)
        for (var i in a) {
            d.push(a[i])
        }
    }
    return d
}

e.BreadcrumbsWithTopMenu = function(it, product, instance, page) {
    if (!it || !product || !instance || !page) {
        return false
    }
    var href = $(it).attr("href")
    var text = $(it).html()

    if (href.indexOf(product + "/" + instance + "/" + page) > 0) {
        d.WebBreadcrumbs.push({ id: page, href: href, name: "> " + text })
        return true
    }
    return false
}

e.BreadcrumbsWithLeftMenu = function(it, product, instance, page, genre, category) {
    if (!it || !product || !instance || !page || !category) {
        return false
    }
    var href = $(it).attr("href")
    var text = $(it).html()
    return e.Breadcrumbs(it, product, instance, page, genre, href, text)
}

e.Breadcrumbs = function(it, product, instance, page, genre, href, text) {
    if (!href) {
        return
    }
    if (href.indexOf(product + "/" + instance + "/" + page + "/" + genre > 0)) {
        var p = $(it).parent().parent().prev()
        if (!!p && !!p[0] && p[0].tagName == "A") {
            var h = $(p).attr("href")
            var t = $(p).html()
            e.Breadcrumbs(p, product, instance, page, genre, h, t)
        }
        d.WebBreadcrumbs.push({ href: href, name: "> " + text })
        return true
    }
    return false
}

e.BreadcrumbsHtml = function() {
    //面包屑导航, 解析顶部菜单
    var product = url.GetProduct()
    var instance = url.GetInstance()
    var page = url.GetPage()
    var genre = url.GetGenre()
    d.WebBreadcrumbs = []

    if (!!page) {
        if (page == "magazine" || page == "book" || page == "paper" || page == "free") {
            $(".top-nav").find('a').each(function() {
                if (e.BreadcrumbsWithTopMenu(this, product, instance, page)) {
                    return false
                }
            })
        }
        if (page == "detail") {
            var a = ['', "> 杂志", "> 报纸", "> 图书"]
            d.WebNav[genre].name = a[genre]
            d.WebBreadcrumbs.push(d.WebNav[genre])
            d.WebBreadcrumbs.push({ href: window.location.href, name: "> 商品介绍" })
        }
    }

    // 左则菜单
    var category = url.GetCategory()
    if (!!category && category == "0") {
        e.BreadcrumbsWithLeftMenu("#" + category, product, instance, page, genre, category)
    }
    var menu = new PartMenu()
    d.indexPage.name = "首页"
    d.WebBreadcrumbs.unshift(d.indexPage)
    menu.SetData(d.WebBreadcrumbs)
    $("#WebBreadcrumbs").html(menu.Html().String())
}

/**
 * 后绑定事件区
 */

$(function() {
    // 二级菜单显示
    $("body").on("mousemove", ".sub-cate-items>ul>li", function() {
        $(this).css('background-color', '#F8F8F8')
        var it = $(this).children()
        $(it).next().children().show()
    })
    $("body").on("mouseout", ".sub-cate-items>ul>li", function() {
        $(this).css('background-color', '#fff')
        var it = $(this).children()
        $(it).next().children().hide()
    })

    setTimeout(function() {
        e.BreadcrumbsHtml()
    }, 500)

    if (url.GetGenre() == 1) {
        $("#detail").text('杂志/报纸')
        $("#magazines").show()
        $("#books").hide()
    } else if (url.GetGenre() == 3) {
        $("#detail").text('图书')
        $("#books").show()
        $("#magazines").hide()
    }

    var a = $(".paging a").attr("onclick")

    if (!!role && !!role.source) {
        s = ""
        for (var x in role.source) {
            if (!s) {
                s = x
            } else {
                s = s + "," + x
            }
        }
        if ($("#mid").length > 0) {
            $("#mid").val(s)
            Web.Update(".shelf", s)
        }
    }
});