// 定义页面基准尺寸 16:9
var rem = Web.w > Web.h ? Web.w / 384 : Web.w / 216
var url = new Url()

$("html").css("font-size", rem)

document.addEventListener('touchstart', function(e) {
    if (e.touches.length == 1) {
        return
    }
    e.preventDefault()
}, false);


d.BootStrap = [
    { id: 1, name: "", img: "log.png", href: "", size: "92rem*19.44rem", position: "92rem*12rem" },
    {
        id: 1,
        name: "",
        img: "bootstrap-magazine.png",
        href: "preview/4/2848",
        size: "50rem*35.35rem",
        position: "57rem*60rem"
    },
    {
        id: 1,
        name: "",
        img: "bootstrap-paper.png",
        href: "preview/4/2960",
        size: "50rem*35.35rem",
        position: "127rem*60rem"
    },
    {
        id: 1,
        name: "",
        img: "bootstrap-book.png",
        href: "preview/4/2966",
        size: "50rem*35.35rem",
        position: "197rem*60rem"
    },
    { id: 1, name: "", img: "bootstrap-teach.png", href: "pre/4/3080", size: "50rem*35.35rem", position: "57rem*102rem" },
    {
        id: 1,
        name: "",
        img: "bootstrap-media.png",
        href: "pre/4/3045",
        size: "50rem*35.35rem",
        position: "127rem*102rem"
    },
    {
        id: 1,
        name: "",
        img: "bootstrap-souce.png",
        href: "pre/4/3079",
        size: "50rem*35.35rem",
        position: "197rem*102rem"
    },
    { id: 1, name: "", img: "bookan.png", href: "", size: "50rem*12.85rem", position: "16rem*145rem" },
    {
        id: 1,
        name: "",
        img: "erweima.png",
        href: "",
        size: "17rem*17rem",
        position: "302rem*5rem",
        onclick: "e.wxlogin()"
    },
    { id: 1, name: "", img: "helping.png", href: "help", size: "17rem*17rem", position: "302rem*23rem" }
]
if (!isWebp) {
    d.BootStrap = [
        { id: 1, name: "", img: "log.png", href: "", size: "110rem*31.77rem", position: "110rem*15rem" },
        {
            id: 1,
            name: "",
            img: "bootstrap-magazine.png",
            href: "preview/4/2848",
            size: "60rem*42.86rem",
            position: "70rem*72rem"
        },
        {
            id: 1,
            name: "",
            img: "bootstrap-paper.png",
            href: "preview/4/2960",
            size: "60rem*42.86rem",
            position: "160rem*72rem"
        },
        {
            id: 1,
            name: "",
            img: "bootstrap-book.png",
            href: "preview/4/2966",
            size: "60rem*42.86rem",
            position: "250rem*72rem"
        },
        {
            id: 1,
            name: "",
            img: "bootstrap-teach.png",
            href: "pre/4/3080",
            size: "60rem*42.86rem",
            position: "70rem*122rem"
        },
        {
            id: 1,
            name: "",
            img: "bootstrap-media.png",
            href: "pre/4/3045",
            size: "60rem*42.86rem",
            position: "160rem*122rem"
        },
        {
            id: 1,
            name: "",
            img: "bootstrap-souce.png",
            href: "pre/4/3079",
            size: "60rem*42.86rem",
            position: "250rem*122rem"
        },
        { id: 1, name: "", img: "bookan.png", href: "", size: "60rem*25rem", position: "20rem*172rem" },
        {
            id: 1,
            name: "",
            img: "erweima.png",
            href: "",
            size: "20rem*35rem",
            position: "363rem*5rem",
            onclick: "e.wxlogin()"
        },
        { id: 1, name: "", img: "helping.png", href: "help", size: "20rem*35rem", position: "363rem*26rem" }
    ]
}

// d.UserSourceOperate = []
// if (url.GetArgs('user') == 'LastReader') {
//     d.UserSourceOperate.push({ name: "选择", onclick: "e.ItemSelect()" }, { name: "删除", onclick: "e.ItemDelete()" })
// } else if (url.GetArgs('user') == 'ShopCart') {
//     d.UserSourceOperate.push({ name: "选择", onclick: "e.ItemSelect()" }, { name: "删除", onclick: "e.ItemDelete()" }, { name: "购买", onclick: "e.BuyItem()" })
// }

// 内容页工具
// d.ToolBottom = [
//     { id: "home", href: "#", name: "首页", onclick: "e.goto('index');" },
//     { id: "search", href: "#", name: "资源检索", onclick: "e.goto('search');" },
//     { id: "back", href: "#", name: "返回", onclick: "window.history.back();" }
// ]


// zhangsi 

d.TopMeun = [
    { id: "magazine", href: url.Path("preview/4/2848"), name: "杂志", class: url.GetCategory() == 2848 ? 'active' : '' },
    { id: "paper", href: url.Path("preview/4/2960"), name: "报纸" },
    { id: "book", href: url.Path("preview/4/2966"), name: "图书" },
    { id: "teach", href: url.Path("pre/4/3080"), name: "学术论文" },
    { id: "media", href: url.Path("pre/4/3045"), name: "多媒体" },
    { id: "source", href: url.Path("pre/4/3079"), name: "特色资源" },
    { id: "home", href: "#", name: "首页", onclick: "e.goto('index');" },
    { id: "search", href: "#", name: "资源检索", onclick: "e.goto('search');", class: url.GetPage() == 'search' ? 'active' : '' },
    { id: "back", href: "#", name: "返回", onclick: "window.history.back();" }
]
var category = url.GetCategory()
for (var x in d.TopMeun) {
    var a = d.TopMeun[x].href.split("/")
    var end = a.pop()
    if (category == end) {
        Session.Set("topmenu", category)
    }
}


d.UserMenu = [
    { id: 0, name: "用户收藏", href: url.Path("0/user@Collect") },
    { id: 0, name: "最近阅读", href: url.Path("0/user@LastReader") }
]

d.UserSource = [
    { name: "我的杂志", onmouseover: "e.PersonTab(this, 0, 6)", class: "active" },
    { name: "我的报纸", onmouseover: "e.PersonTab(this, 1, 6)" },
    { name: "我的图书", onmouseover: "e.PersonTab(this, 2, 6)" },
    { name: "学术论文", onmouseover: "e.PersonTab(this, 3, 6)" },
    { name: "多媒体", onmouseover: "e.PersonTab(this, 4, 6)" },
    { name: "特色资源", onmouseover: "e.PersonTab(this, 5, 6)" },
]


e.WhuSearch = function(it) {
    var url = new Url()
    var type = $('input:checked').val()
    var key = $(it).parents("part").find('input[name=search]').val()
        // key = encodeURI(key)
    if (!key) {
        Web.Alert("没有输入搜索的内容")
        return
    }
    // if (url.GetPage() == "search" && (!d.articles || d.articles == 0) ) {
    //     d.Search.count++
    //     if (d.Search.count > 1) {
    //         Web.Alert('很抱歉，没有找到与"' + decodeURI(new Url().GetArgs().split("@")[1]) + '"相关的内容！');
    //     }
    //     return
    // }
    if (type == 1) {
        var url = new Url()
        window.location.href = url.Path("search") + "/search@" + key
        return
    } else if (type == 2) {
        $.post(window.location.href, { handle: "WhuSearch" }, function(re) {
            console.log(re)
            re = JSON.parse(re)
            var session = re.data
            var url = "http://opac.lib.whu.edu.cn/F/" + session + "?func=find-b&adjacent=Y&find_code=WRD&request=" + encodeURI(key)
            window.open(url)
        });
    } else {
        var url = "http://cn.whu.findplus.cn/?h=search_list&query=" + encodeURI(key) + "&action[addexpander][]=fulltext"
        window.open(url)
    }

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

e.PersonTab = function(it, x, len) {
    for (var i = 0; i < len; i++) {
        $("#preview-" + i).hide();
    }
    $(it).parent().addClass('active')
    $(it).parent().siblings().removeClass()
    $("#preview-" + x).show()
}


/**
 * 单项预览列表
 */
e.PreviewItems = function(data, selector, _goto) {
    if (!data) {
        return
    }

    var url = new Url()
    for (var x in data) {
        e.checkJpg(x, data)
        var obj = data[x]
        if (!obj) {
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
        var page = _goto
            // data[x].href = url.Path(page + "/0/0/" + obj.resourceId + "/" + obj.issueId)
        data[x].href = url.Path("detail/0/0/" + obj.resourceId + "/" + obj.issueId)
        if (e.IsRole(obj.issueId)) {
            delete(data[x].price1)
        }
    }
    return data
}


/**
 * 内容发布单项预览列表
 */
e.ArticleItems = function(data, selector) {
    if (!data) {
        return
    }
    e.loading = 0

    var url = new Url()
        // for (var x in data) {
        //     var obj = data[x]
        //     var href = url.Path("detail/4/0/" + obj.resourceId + "/" + obj.resourceId)
        //         //第三方资源
        //     data[x]['name'] = obj.resourceName
        //     data[x]['src'] = e.WhuImageSrc(obj.jpg)
        //     data[x].href = href
        // }

    for (var x in data) {
        var obj = data[x]
            //第三方资源
        data[x]['src'] = e.WhuImageSrc(obj.jpg)
        if (obj.html.indexOf("http://") == 0) {
            data[x].href = obj.html
        } else {
            var a = obj.html.split('/')
            var genre = a[0]
            var mid = a[2]
            var iid = a[3]
            var reader = obj.jpg.indexOf("epub") === 0 ? "epubReader" : genre == 2 ? "txtReader" : "imageReader"
            data[x].href = url.Path(reader) + "/" + genre + "/0/" + mid + "/" + iid
        }
    }
    return data
}

e.WhuImageSrc = function(path) {
    if (!path) {
        return path
    }
    var src = ""
        //第三方资源
    if (path.indexOf("http://") == 0) {
        src = ""
    } else {
        if (path.indexOf("dbtxt/") == 0 || path.indexOf("dbtxt/") == 1) {
            src = d.isUseRedirect ? d.imageResource.dbtxt : "dbtxt"
        } else if (path.indexOf("upload/") == 0 || path.indexOf("upload/") == 1) {
            src = d.isUseRedirect ? d.imageResource.upload : "upload"
                //杂志，图书
        } else {
            src = d.isUseRedirect ? d.imageResource.source : "source"
                //杂志，图书
        }

    }
    return src + path
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
            text: obj.text,
            genre: genre,
            iid: obj.issueId
        }
        // var path = obj.webp
        // if (!isWebp && obj.epub == "0") {
        //     path = obj.jpg
        // }
        // var array = [path, obj.html, obj.resourceId, obj.issueId]
        // if (genre == '2') {
        //     array = [obj.txt, obj.html, obj.resourceCode, obj.issueNo]
        // }
    var src = e.WhuImageSrc(obj.jpg)
    d.images = [
        { src: src }
    ]

    // 封面左边属性说明
    var like = obj.thumbsUp ? obj.thumbsUp : 0
    var share = obj.share ? obj.share : 0
    var score = obj.score ? obj.score : 0
    var collect = obj.collect ? obj.collect : 0
    var notes = obj.notes ? obj.notes : 0
    var owner = obj.owner ? obj.owner : 0
    d.info = [
        { name: "点赞", value: "（" + like + "）", tag: "like" },
        { name: "分享", value: "（" + share + "）", tag: "share" },
        { name: "评论", value: "（" + score + "）", tag: "score" },
        { name: "收藏", value: "（" + collect + "）", tag: "collect" },
        // { name: "笔记", value: "（" + notes + "）", tag: "notes" },
        { name: "来源", value: owner, tag: "souce" },
    ]


    if (!!obj.explain) {
        d.items.push({ name: "内容介绍", value: obj.explain })
    }

    d.source = []
    d.source.push({ name: "前往阅读", func: "gotoReader", value: "'" + obj.html + "," + obj.jpg + "'" })

    // if ((!!obj.html && obj.html > '0') || (!!obj.txt && obj.txt > '0')) {
    //     if (!obj.html) {
    //         obj.html = '0'
    //     }
    //     if (!obj.txt) {
    //         obj.txt = '0'
    //     }
    //     d.source.push({ name: "文本版阅读", func: "TxtReader", value: obj.html + "," + obj.txt, tag: 'text' })
    // }
    // if ((!!obj.p`1   AA vbnm,.,./ ；‘` && obj.pdf > '0') || (!!obj.webp && obj.webp > '0')) {
    //     var pdf = !obj.pdf ? 0 : obj.pdf
    //     var webp = !obj.webp ? 0 : obj.webp
    //     var jpg = !obj.jpg ? 0 : obj.jpg
    //     d.source.push({ name: "原貌版阅读", func: "ImgReader", value: pdf + "," + webp + "," + jpg, tag: 'image' })
    // }

    return d
}


/**
 * 搜索单项预览列表
 */
e.SearchItems = function(data, selector, _goto) {
    if (!data) {
        return
    }

    // var url = new Url()
    // if (url.GetPage() == "search" && (!data.magazines || data.magazines == 0) && (!data.papers || data.papers == 0) && (!data.books || data.books == 0)) {
    //     d.Search.count++
    //     if (d.Search == 2) {
    //         Web.Alert("没有相关资源，请留意！")
    //     }
    //     return
    // }


    // var b = { magazines: '杂志', papers: '报纸', books: '图书', articles: '内容' }
    // var genre = { magazines: 1, papers: 2, books: 3, articles: 4 }
    // var array = []
    var d = data["articles"]
    if (!d) {
        Web.Alert("没有相关资源，请留意！")
        return
    }
    return e.ArticleItems(d, selector, _goto)
        // for (var i in b) {
        //     var value = data[i]
        //     if (!value || !value instanceof Array || value.length == 0) {
        //         continue
        //     }

    //     for (var x in value) {
    //         e.checkJpg(x, value)
    //         var obj = value[x]
    //         obj['name'] = "[" + b[i] + "] " + obj.resourceName
    //         var path = obj.webp
    //         if (!isWebp && obj.epub == "0") {
    //             path = obj.jpg
    //         }
    //         var arr = [path, obj.html, obj.resourceId, obj.issueId]
    //         if (genre == '2') {
    //             arr = [obj.txt, obj.html, obj.resourceCode, obj.issueNo]
    //         }
    //         obj['src'] = e.ContentPicture(genre, arr)
    //         obj['genre'] = genre[i]
    //         var page = e.ItemPage(obj.web, obj.jpg, obj.html)
    //         obj.href = url.Path("detail/" + genre[i] + "/0/" + obj.resourceId + "/" + obj.issueId)
    //         if (e.IsRole(obj.issueId)) {
    //             delete (obj.price1)
    //         }
    //         array.push(obj)
    //     }
    // }
    // if (data.magazines.length > 0) {
    //     d.Search.magazine = 1
    // }

    // if (data.books.length > 0) {
    //     d.Search.book = 1
    // }

    // if (data.papers.length > 0) {
    //     d.Search.paper = 1
    // }

    // if (!d.Search.magazine && d.Search.book) {
    //     e.PersonTab($('.del a')[1], 2, 3)
    // }
    // if (d.Search.magazine && !d.Search.book) {
    //     e.PersonTab($('.del a')[0], 0, 3)
    // }
    // if (d.Search.paper && !d.Search.book) {
    //     e.PersonTab($('.del a')[0], 0, 3)
    // }
    // return array
}

/**
 * 单项预览列表 往期
 */
e.YearItems = function(data, selector, _goto) {
    if (!data) {
        return
    }
    var url = new Url()
    var name = ''
    for (var x in data) {
        var obj = data[x]
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


e.PreItems = function(data, selector, _goto) {
    if (!data) {
        return
    }

    var url = new Url()
    for (var x in data) {
        var obj = data[x]
        console.log()
        if (url.GetCategory(url.GetCategory()) == obj.id) {
            data = obj.data;
        }
        // data[x]['name'] = obj.resourceName
        // var genre = url.GetGenre()
        // var path = obj.webp
        // if (!isWebp && obj.epub == "0") {
        //     path = obj.jpg
        // }
        // var array = [path, obj.html, obj.resourceId, obj.issueId]
        // if (genre == '2') {
        //     array = [obj.txt, obj.html, obj.resourceCode, obj.issueNo]
        // }
        // data[x]['src'] = e.ContentPicture(genre, array)
        // var page = _goto
        // data[x].href = url.Path(page + "/0/0/" + obj.resourceId + "/" + obj.issueId)
        // if (e.IsRole(obj.issueId)) {
        //     delete (data[x].price1)
        // }
    }
    return data
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
    var genre = url.GetGenre()
    var category = url.GetCategory()
    if (genre == 1) {
        _goto = "magazine"
    }
    if (genre == 2) {
        _goto = "paper"
    }
    if (genre == 3) {
        _goto = "book"
    }
    if (genre == 4) {
        if (category == 68) {
            _goto = "teach"
        }
        if (category == 71) {
            _goto = "media"
        }
        if (category == 67) {
            _goto = "souce"
        }
    }

    for (var x in data) {
        data[x].href = url.Path(_goto + '/0/' + data[x].id)
        if (url.GetCategory() == data[x].id) {
            if (category == 2061) {
                data.push({ name: "地区检索", href: url.Path("map/0/1") })
            }
            data[x]._class = 'active'
        }

    }
    // if (url.GetPage() == "paper" && url.GetGenre() == 2) {
    //     data.push({name: "地区检索", href: url.Path("map/0/1")})
    // }
    if ($('li.active a').attr('id') === 'paper' || (new Url().GetCategory() >= '2961' && new Url().GetCategory() <= '2965')) {
        data.push({ name: "地区检索", href: url.Path("map/0/1") })
    }
    return data
}

/**
 * 评论
 */
e.CommentItems = function(data, selector, _goto) {
    for (var x in data) {
        data[x].time = (new Date(data[x].time * 1000)).toLocaleDateString()
    }
    return data
}

/**
 * 对资源添加评论
 */
e.ScoreSubmit = function() {
    var content = $(".score-area textarea").val()
    if (!content || content.length < 5) {
        Web.Alert("评论内容不能少于5个字符！")
        return
    }
    $.post(window.location.href, { handle: "ResourceAddComment", content: content }, function(re) {
        if (re.status == 0) {
            Web.Alert(re.info)
            return
        }
        Web.Alert("评论提交成功，请留意")
        $(".score-area textarea").val("")
        $(".score-area").hide()
        e.AddResourceOperate("detail-score")
        Web.Update(".resouce-comment", 0)
    }, "json")
}


/**
 * reader All resouce
 */
e.gotoReader = function(mid, iid, obj) {
    if (!mid || !iid || !obj) {
        return
    }

    var html = obj.split(",")[0];
    var jpg = obj.split(",")[1];

    // thirth
    if (html.indexOf("http:") == 0) {
        // window.location.href = href
        window.open(html)
        return
    }
    var a = html.split("/")
    if (a.length < 4) {
        return
    }
    var genre = a[0] ? a[0] : 0
    mid = a[2] ? a[2] : mid
    iid = a[3] ? a[3] : iid
    var url = new Url()
    var reader = jpg.indexOf("epub") === 0 ? "epubReader" : genre == 2 ? "txtReader" : "imageReader"
    Session.Set("detailUrl", window.location.href);
    window.location.href = url.Path(reader) + "/" + genre + "/0/" + mid + "/" + iid
}

// 收藏增
e.CollectAdd = function(iid, id) {

    if (!Session.Get("user")) {
        Web.Alert("扫码登录后方可收藏")
        e.wxlogin()
        return
    }
    if (!iid) {
        var url = new Url()
        var iid = url.GetIid()
        if (!iid) {
            return
        }
    }
    if (!iid || iid == 0) {
        return
    }
    var url = new Url()
    var page = url.GetPage()
    var href = window.location.href
    if (page == "imageReader" || page == "txtReader") {
        href = Session.Get("detailUrl")
        iid = 0
    }
    $.post(href, { handle: "UserCollectAdd", iid: iid, userId: id, cache: 1 }, function(re) {
        if (re.status == 0) {
            console.log(re.info)
        }
        Web.Alert("添加收藏成功，请留意")
        e.resourceOperateTimes("detail-collect", 4)
        return
    })
}

// 我的收藏/最近阅读
d.UserSourceOperate = [
    { name: "选择", onclick: "e.ItemSelect()" },
    { name: "删除", onclick: "e.ItemDelete()" }
]


// 显示预览图的选择项
e.ItemSelect = function() {
    $("[data-name='PartPreview'] input").toggle()
}

// 删除预览图的选择项
e.ItemDelete = function() {
    var url = new Url()
    var user = url.GetArgs('user')
    var handle = 'User' + user + 'Del'
    var items = e.ItemChecked()

    $.post(window.location.href, {
        handle: handle,
        articles: items[4],
        cache: 1
    }, function(re) {
        if (re.status == 0) {
            Web.Alert(re.info)
            return
        }
        window.location.reload(true)
            // Web.Update("[data-name='PartPreview']", 0)
    }, "json")
}


// zhangsi

// 删除笔记的选择项
e.NoteDelete = function(it) {
    var url = new Url();
    var typeId;
    var userId = Session.Get('user').userId.toString();
    if (url.GetPage() == "note" || url.GetPage() == "look") {
        typeId = 5;
    }
    var id = $(it).attr("id")
    $.post(window.location.href, {
            handle: "MicroJournalUserDeleteOperate",
            type: typeId,
            userId: userId,
            ids: id
        },
        function(re) {
            if (re.status == 0) {
                return
            }
            if (url.GetPage() == "look") {
                window.history.back()
                return
            }
            $("." + id).remove()
        }, "json")
}

// 全选
function selectAll(it) {
    $('input[name=note]').attr('checked', $(it).is(':checked'));
}



// 多选删除
e.NoteAllDelete = function() {
        var url = new Url();
        var typeId;
        var id = '';
        var userId = Session.Get('user').userId.toString();
        if (url.GetPage() == "note") {
            typeId = 5;
        }
        $('input:checked').parent().parent().each(
            function() {
                var c = $(this).attr('class')
                if (!!c) {
                    id += c + ','
                }

            });
        $.post(window.location.href, {
                handle: "MicroJournalUserDeleteOperate",
                type: typeId,
                userId: userId,
                ids: id
            },
            function(re) {
                if (re.status == 0) {
                    alert('至少选择一项！')
                    return
                }
                if (id.indexOf(',') > -1) {
                    var ids = id.split(',')
                    for (var i = 0; i < ids.length; i++) {
                        if (!!ids[i]) {
                            $('.' + ids[i]).remove()
                        }
                    }
                }
            }, "json")

    }
    // 查看
e.look = function(it) {
    var data = $(it).parent().parent().attr('data')
    if (!!data) {
        Session.Set("noteDetail", data)
        window.location.href = "look"
    }
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


$(function() {
    // 判断浏览器类型
    if (navigator.userAgent.indexOf("Edge") > -1) {
        $('.comm').css('height', '95rem')
            // 首页搜索
        $('.boot .radio.whu').css('top', '50rem').css('left', '96rem')
        $('.boot .radio.bk').css('top', '50rem').css('left', '123rem')
        $('.boot .radio.gc').css('top', '50rem').css('left', '75rem')
        $('.radio input[type=radio]').css('width', '5.5rem').css('height', '5.5rem')
            // 搜索页
        $('.instation .radio.gc').css('top', '20rem').css('left', '80rem')
        $('.instation .radio.whu').css('top', '20rem').css('left', '100rem')
        $('.instation .radio.bk').css('top', '20rem').css('left', '127rem')
            // 预览页
        $('.issuing').css('margin', '15rem 0 25rem 0')
        $('.load-moring').css('margin', '15rem 0 25rem 0')
    }

    // 资源操作，点赞、分享、收藏、评论、笔记
    $("body").on("click", ".detail-info a", function(re) {
        var user = Session.Get("user")
        var key = $(this).parent().attr("class")
        if (!user || !user.userId || !key) {
            Web.Alert("请先登录！")
            return
        }
        switch (key) {
            case "detail-like":
                e.resourceOperateTimes(key, 1)
                break
            case "detail-share":
                $(".sharing").show()
                break
            case "detail-score":
                $(".score-area").show()
                break
            case "detail-collect":
                e.CollectAdd(0)
                break
        }

        //e.resourceOperateTimes()
    })

    // 关闭分享
    $("body").on("click", ".closing", function() {
        $(".sharing").hide()
        $(".wechat-qrcode, .sharing").hide()
    })

    // 选择某平台分享
    $("body").on("click", ".social-share a", function() {
        $(".sharing").hide()
        e.resourceOperateTimes(2)
    })

    // 特色资源隐藏二级菜单
    var url = new Url()
    if (url.GetCategory() == 3079) {
        $(".bottom-menu-up").hide()
    }

    //保存顶级菜单项
    $("body").on('click', '[data-source="TopMeun"] a, [data-source="BootStrap"] a', function() {
        if ($(this).html() == "返回") {
            return
        }
        var href = $(this).attr("href")
        var a = href.split("/")
        var category = a.pop()
        Session.Set("topmenu", category)
    })

    $("body").on('click', '.social-share a', function(e) {
        if ($(this).attr("class") == "social-share-icon icon-wechat") {
            $(".wechat-qrcode, .sharing").show()
            e.resourceOperateTimes("detail-share", 2)
            return
        }
        e.resourceOperateTimes("detail-share", 2)
    })

    // 新窗口阅读
    $('body').on('click', '.source a', function() {
        $(this).attr('target', '_blank')
    })
    $('body').on('click', '.wd a', function() {
        $(this).attr('target', '_blank')
    })
    $('body').on('click', '.shelves a', function() {
        $(this).attr('target', '_blank')
    })
    $('body').on('click', '.searchs a', function() {
        $(this).attr('target', '_blank')
    })


    // 搜索  保留关键词

    if (new Url().GetArgs().split('@')[0] == "search") {
        var value = decodeURI(window.location.href.split('@')[1])
        if (!!value) {
            $('input[name=search]').val(value)
        }
    }

    // 区域检索
    $(".provinces").on("click", 'a', function(e) {
        var href = $(this).attr("href")
        if (href.indexOf("http:") == 0) {
            return
        }
        e.preventDefault()
        var a = href.split("/")
        if (a[4] == 2) {
            href = href.replace("detail", "txtReader")
        } else {
            href = href.replace("detail", "imageReader")
        }
        window.location.href = href
    })




    // 往期页面处理
    $(".issues").on("click", 'a', function(e) {
        var href = $(this).attr("href")
        if (href.indexOf("http:") == 0) {
            return
        }
        e.preventDefault()
        var a = href.split("/")
        if (a[4] == 2) {
            href = href.replace("detail", "txtReader")
        } else {
            href = href.replace("detail", "imageReader")
        }
        window.location.href = href
            // var url = a.join("/")
            // 不要删， 用来跳转至明细，现在不用
            // $.post(window.location, {handle:"ResourceByHtml", html: url, cache:1 }, function (re) {
            //     if (re.status == 0) {
            //         Web.Alert(re.info)
            //         return
            //     }
            //     for (var x in re.data) {
            //         var obj = re.data[x]
            //         var url = new Url()
            //         var href = url.Path("detail") + "/4/0/" + obj.issueId + "/" + obj.issueId
            //         window.location.href = href
            //         return
            //     }
            // },"json")
    })


})