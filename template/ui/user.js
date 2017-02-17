/**
 * Created by bookan on 2016/3/31.
 */

var Session = LocalCache // 启用缓存的方式

/**
 * 是否使用重定向到资源服务器
 * @type {boolean}
 */
d.isUseRedirect = true;

/**
 * 判断浏览器是否可加载webp
 */
e.checkWebp = function() {
    try {
        return (document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') == 0);
    } catch (err) {
        return false;
    }
}

e.init = function() {
    e.PaperArea()
    e.WebStatus()
    e.UserData()
    e.UserRole()
        // 加载微信息权限
    var url = new Url()
    var instance = url.GetInstance()
    if ((url.GetProduct() != "wei" || !instance) && !Session.Get("wx")) {
        return
    }
    // 二维码
    $.get("http://weixin.bookan.cn/index.php/home/weikan/getinfo?org=" + instance, function(re) {
        if (re.name == "") {
            return
        }
        Session.Set('wx', re)
        setTimeout(
            function() {
                var part = new PartLogin()
                part.AddClass("login")
                $("[data-name='PartLogin']").html(part.Html().String())
            }, 1000
        )
    }, 'json')
}

e.returned = function(e) {
    // alert(123)
    e.preventDefault()
    return false;
}

// 从阅读页返回
e.backFromReader = function() {
    Session.Set("touch", false)
    var lstpage = Session.Get("lastpage")
    var url = new Url();
    if (!lstpage) {
        var href = "http://" + window.location.host + "/" + url.GetProduct() + "/" + url.GetInstance() + "/" + "index";
    } else {
        var href = url.Path(lstpage + "/" + url.GetGenre() + "/" + url.GetCategory() + "/" + url.GetMid());
    }
    wx = Session.Get("wxcode")
    if (!!wx) {
        href + wx
    }
    window.location.href = href
}

/**
 * 获取地理位置
 * 通过百度地图解析为地区信息
 */

// 从浏览器获取地理位置信息
e.AreaLocation = function() {
    var options = {
        enableHighAccuracy: true,
        maximumAge: 1000
    }
    if (navigator.geolocation) {
        //浏览器支持geolocation
        try {
            navigator.geolocation.getCurrentPosition(e.areaSuccess, e.areaError, options);
        } catch (e) {
            e.locationAlert()
        }
    } else {
        //浏览器不支持geolocation
        console.log('您的浏览器不支持地理位置定位');
    }
}

// 地理提示判断
e.locationAlert = function() {
    if (window.location.pathname.indexOf("/wei/") > -1) {
        console.log("请前往设置开启定位功能！")
            // alert("请前往设置开启定位功能！")
        return
    }
}

/**
 * 报纸地区数据
 */
e.PaperArea = function() {
    $.post(window.location.href, { handle: 'PaperArea' })
}

// 地理位置获取成功时
e.areaSuccess = function(position) {
    //返回用户位置
    //经度
    var longitude = position.coords.longitude;
    //纬度
    var latitude = position.coords.latitude;
    //根据经纬度获取地理位置，不太准确，获取城市区域还是可以的
    var map = new BMap.Map("allmap");
    var point = new BMap.Point(longitude, latitude);
    var gc = new BMap.Geocoder();
    gc.getLocation(point, function(re) {
        Session.Set("local", re.addressComponents)
        console.log(re.addressComponents)
    });
}

// 地理位置获取失败时
e.areaError = function(error) {
    switch (error.code) {
        case 1:
            console.log("位置服务被拒绝");
            break;
        case 2:
            console.log("暂时获取不到位置信息");
            break;
        case 3:
            console.log("获取信息超时");
            break;
        case 4:
            console.log("未知错误");
            break;
    }
    e.locationAlert()
}

/**
 * 机构、个人、用户权限
 * @param iid issueId
 * @param page 当前页
 * @param end 结束页
 * @param start 起始页
 * @param toll 试读页数
 * @returns {boolean} 0有权限， 1无权限， 2请登录
 */
e.role = function(mid, iid, page, end, start, toll) {
    // 分享页判断
    if (!start) {
        start = 0
    }

    // 可读页数为0， 即为免费阅读
    // if (end == start) {
    //     return true
    // }

    if (!!toll && end - start > toll) {
        end = start + toll
    }

    if (page >= start && page <= end) {
        return true
    }

    return e.OtherRole(mid, iid)
}

// 其它条件可读
e.OtherRole = function(mid, iid) {
    // 微信扫描触摸屏二维码，可阅读一册
    var touch = Session.Get("touch")
    if (touch) {
        return true
    }

    var web = Session.Get('web')
    if (!web) {
        Web.Alert("产品服务未开通，请联系管理员")
        return false
    }
    var t = new Date().getTime()
    if (!web.base.startTime || web.base.startTime * 1000 > t) {
        Web.Alert("产品服务已到期，请联系管理员")
        return false
    }
    if (!web.base.endTime || web.base.endTime * 1000 < t) {
        Web.Alert("产品服务已到期，请联系管理员")
        return false
    }
    // 触摸屏不需要登录 
    var url = new Url()
    if (url.GetProduct() == "touch") {
        return true
    }

    // 价格为0，直接阅读
    var price1 = Session.Get("issue" + iid)

    // 网站类型, ture 支付， false 机构
    var type = !!web && !!web.base && !!web.base.type && web.base.type == 1
    if (!!type && price1 == 0) {
        return true
    }

    var user = Session.Get("user")
    if (!type) {
        var needLogin = false
        for (var x in web.operationList) {
            var obj = web.operationList[x]
            if (obj.right == 'needlogin' && obj.value == 1) {
                needLogin = true
            }
        }
        if (!needLogin) {
            return true
        }
        if (!!user && !!user.userId) {
            return true
        }
    }

    if (!user || !user.userId) {
        // 注释二次滑动弹出登录页面
        // if (!d.loginAlert) {
        //     d.loginAlert = 1
        //     Web.Alert("您没有阅读该内容的权限，请先登录")
        //     return false
        // }
        e.LoginShow()
        return false
    }


    if (e.IsRole(mid, iid)) {
        return true
    }

    // 显示购买提示框
    e.showBuy();

    return false
}

/**
 * 判断该书是否购买
 */
e.IsRole = function(mid, iid) {
    var role = Session.Get("role")
    if (!role) {
        return false
    }
    if (!!role.source[mid]) {
        return true
    }
    if (!!role.issue[iid]) {
        return true
    }
    return false
}

/**
 * 显示购买提示框
 */
e.showBuy = function() {
    var iid = url.GetIid()
    var price1 = Session.Get("issue" + iid)
    if (!price1) {
        price1 = ""
    }
    var content = '<h5>您还没购买此资源，不能阅读完整内容。此杂志<span style="color:red">' + price1 + '</span>元，点击立即购买！</h5>'
    $('.modal-body').empty();
    $('.modal-body').append(content);
    $('#myModal').modal('show').css({
        "margin-top": function() {
            return 300;
        }
    });
}

e.gotoBuy = function(it, genre, iid) {
    if (!Session.Get("user")) {
        Web.Alert("登录后才能购买，请先登录！")
        return
    }
    var items = {}
    if (!!genre && !!iid) {
        items[genre] = iid
    } else {
        items = e.ItemChecked()
    }
    if (!items || (!items[1] && !items[2] && !items[3])) {
        Web.Alert('未选购买商品，点击"选择"按钮启动选择！')
        return
    }

    $.post(window.location.href, {
        handle: "UserOrderAdd",
        magazines: items[1],
        papers: items[2],
        books: items[3],
        cache: 1
    }, function(re) {
        if (re.status == 0) {
            Web.Alert("添加订单失败，请留意！")
            return
        }
        Session.Set('pay', re.data)
        window.location.href = url.Path('pay/0/0/0')
    }, 'json')
}

e.joinShopCart = function(it, genre, iid) {
    if (!Session.Get("user")) {
        Web.Alert("登录后才能购买，请先登录！")
        return
    }
    var items = {}
    if (!!genre && !!iid) {
        items[genre] = iid
    } else {
        items = e.ItemChecked()
    }
    if (!items || (!items[1] && !items[2] && !items[3])) {
        Web.Alert('未选购买商品，点击"选择"按钮启动选择！')
        return
    }

    $.post(window.location.href, {
        handle: "UserOrderAdd",
        magazines: items[1],
        papers: items[2],
        books: items[3],
        cache: 1
    }, function(re) {
        if (re.status == 0) {
            Web.Alert("添加订单失败，请留意！")
            return
        }
        Session.Set('pay', re.data)
        Web.Alert("已添加到购物车！")
        $('#myModal').modal("hide");
    }, 'json')
}

e.formatPrice = function(genre, iid, price) {
    var buy = ""
    if (price) {
        if (price == "0" || price == "0.00") {
            buy = new Html("p", "电子版：免费", "id=item-" + iid, "class=preview-price")
        } else {
            buy = new Html("p", "电子版：￥" + price, "id=item-" + iid, "class=preview-price")
            buy.AddAttr("onclick", "e.BuyItem(this,'" + genre + "','" + iid + "')")
        }

    } else {
        buy = new Html("", "已购买", "style=color:#f##")
    }
    return buy
}

/**
 * 色值转换
 */
e.rgb2hex = function(rgb) {
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

    function hex(x) {
        return ("0" + parseInt(x).toString(16)).slice(-2);
    }

    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

/**
 * 用户转入登录界面
 * @param self
 * @param url
 */
e.login = function(self, url) {
    window.location.href = url
}


/**
 * 用户退出
 */
e.logout = function() {
    $.post(window.location.href, { handle: 'UserLogout' }, function(re) {
        if (re.status == 0) {
            Web.Alert(re.info)
            return
        }
        var url = new Url()
            // 武大触摸屏退出
        Session.Remove("user")
        if (url.GetProduct() == "touch" && url.GetInstance() == "whu") {
            Web.Update('[data-name="PartWXLogin"]', 0)
        }

        Session.Remove("web")
        Session.Remove("role")
        if (url.GetPage() == 'user') {
            if (url.GetInstance() != 'magazine') {
                window.location.href = url.Path('index')
                return
            } else {
                window.history.back();
                return
            }
        }
        window.location.reload(true)
    })
}

/**
 * 添加收藏
 */
e.favorite = function(self, url, title) {
    if (!url) {
        url = window.location.href
    }
    if (!title) {
        title = document.title
    }
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf("360se") > -1) {
        Web.Alert("由于360浏览器功能限制，请按 Ctrl+D 手动收藏！");
    } else if (ua.indexOf("msie 8") > -1) {
        window.external.AddToFavoritesBar(url, title); //IE8
    } else if (document.all) {
        try {
            window.external.addFavorite(url, title);
        } catch (e) {
            Web.Alert('您的浏览器不支持,请按 Ctrl+D 手动收藏!');
        }
    } else if (window.sidebar) {
        window.sidebar.addPanel(title, url, "");
    } else {
        Web.Alert('您的浏览器不支持,请按 Ctrl+D 手动收藏!');
    }
}

/**
 * 用户自定义事件，需要获取part for及数据
 * @param self
 * @param selector
 */
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
    var url = new Url()
    window.location.href = url.Path("search") + "/search@" + value
}

/**
 *
 */
e.carousel = function(self, selector, id) {
    $(self).parents(tag).find("input").val(id)
    Web.Update(selector, id)
}

e.goto = function(page) {
    url = new Url()
    window.location.href = url.Path(page)
}

e.reader = function(key, id) {
    if (!!key) {
        var url = new Url()
        var page = url.GetPage()
        if (page == "epubReader") {
            ereader.goto(key)
            return
        }
        ireader.page(key)
        return
    }
    treader.page(id)
}

e.remove = function(it, iid, genre) {
    var url = new Url()
    var value = url.GetArgs('user')
    var handle = 'User' + value + 'Del'
    $.post(window.location.href, { handle: handle, iid: iid, genre: genre, cache: 1 }, function(re) {
        if (re.status == 0) {
            console.log(re.info)
        }
        $(it).prev().remove()
        $(it).remove()
        return
    })
}

e.issues = function() {
    var url = new Url()
    var mid = url.GetMid();
    if (!mid || mid == 0) {
        Web.Alert("操作失败，请留意！")
        return
    }
    window.location.href = url.Path("issue/0/0/" + mid)
}

/**
 * 记录用户信息
 * @param username 用户名
 * @param passwd 密码
 * @param verifyCode 验证码
 * @param func callback
 */
e.userInfo = function(username, passwd, verifyCode, func) {
    $.post(window.location.href, {
        handle: "UserInfo",
        username: username,
        password: passwd,
        verifyCode: verifyCode
    }, function(re) {
        if (re.status == 0) {
            $('.login-msg-error-text').text("登录失败!")
            return
        }
        Session.Set('user', re.data)
        if (func) {
            func()
        }
    }, 'json')
}


/**
 * 从购物车移除
 * @param genre 资源类型
 * @param issueIds issueid列表，多个以逗号分割
 */
e.shoppingCartRemove = function(genre, issueIds) {
    var userId = Session.Get('user').userId
    if (!userId) {
        console.error("userId is null")
        return
    }
    $.post(window.location.href, {
        handle: "UserShopCartRemove",
        userId: userId,
        resourceType: genre,
        issueIds: issueIds
    }, function(result) {
        // TODO
    })
}

/**
 *  清空购物车
 */
e.shoppingCartEmpty = function() {
    var userId = Session.Get('user').userId
    if (!userId) {
        console.error("userId is null")
        return
    }
    $.post(window.location.href, {
        handle: "UserShopCartEmpty",
        userId: userId,
        resourceTypes: "1,2,3"
    }, function(result) {
        // TODO
    })
}

e.wxlogin = function(b) {
    //从服务器请求该组件
    var name = "PartWXCode"
    var left = (Web.w - 400) / 2
    var top = (Web.h - 400) / 2

    if (!!Session.Get('user')) {
        Web.Alert("已登录！")
        return
    }

    $.post(window.location.href, { handle: "UserCookie" }, function(result) {
        if (result.status == 0) {
            Web.Alert("未启用Cookies， 请留意")
            return
        }
        var part = new PartWXCode()
        var html = part.SetData(result.data).Html()
        html.AddAttr("style", "position: fixed; width: 400px;height: 400px;left:" + left + "px;top: " + top + "px;z-index:99999")
        html.AddAttr("id", "wxcode")
        $("body").append(html.String())
        $("body").click(function() {
            $("#wxcode").remove()
        })
    }, 'json')
}


// 轮换
e.Rotation = function(len, id, step, start) {
    clearInterval(d.t[id])
    if (len < 2) {
        return
    }
    e.RotationShow(id, start)
    d.t[id] = setInterval(function() {
        start++
        var n = start % len
        e.RotationShow(id, n)
    }, step)
}

//显示当前
e.RotationShow = function(id, n) {
    $("#" + id + " div.ad-page").hide()
    $("#" + id + " button.ad-nav ").removeClass('active')
    $("#" + id + "-ad-" + n).show()
    $("#" + id + "-ad-nav-" + n).addClass('active')
}

/**
 * PartFunc
 * 非空值即有效
 * 两个左划线（a//c）中间即为空值
 */

/**
 *  接品数据格式化
 *  OrgInfo,          //product/instance/page/，机构信息
 *  OrgProduct,       //product/instance/page，机构产品实例信息
 *  SourceCategory,   //product/instance/page/1，杂志分类，分类单id从instance info中取
 *  CategoryIssue,    //product/instance/page/1/，杂志分类期列表，默认分类， issue信息为最新有效期
 *  SourceInfo,       //product/instance/page/1/0/137，杂志信息，中国经济周刊id为137
 *  SourceYear,       //product/instance/page/1/0/137/0/，杂志年度列表
 *  YearIssue,        //product/instance/page/1/0/137/0/2016，杂志该年期列表
 *  YearMonthIssue,  //product/instance/page/1/0/137/0/201501，杂志年月份度列表
 *  IssueInfo,        //product/instance/page/1/0/137/208156，杂志期信息
 *  IssueCatalog,     //product/instance/page/1/0/137/208156/catagory，杂志期信息
 */

// 最近阅读增
e.LastReaderAdd = function(iid) {
    if (!Session.Get('user')) {
        return
    }
    if (!iid || iid == 0) {
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
    $.post(href, { handle: "UserLastReaderAdd", iid: iid, cache: 1 }, function(re) {
        if (re.status == 0) {
            console.log(re.info)
        }
        return
    })
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
    $.post(window.location.href, { handle: "UserCollectAdd", iid: iid, userId: id, cache: 1 }, function(re) {
        if (re.status == 0) {
            console.log(re.info)
        }
        Web.Alert("添加收藏成功，请留意")
        return
    })
}


e.ItemPage = function(web, jpg, html) {
    if (!!html && html != "0" && html != "epub0") {
        return "epubReader"
    }
    if (!!web && web != "0") {
        return "imageReader"
    }
    if (!!jpg && jpg != "0") {
        return "imageReader"
    }
    return "txtReader"
}

/**
 * 实例名称
 */
e.LogInstance = function(data, selector, _goto) {
    return { id: data.id, img: data.name, title: data.title }
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
        if (url.GetCategory() == data[x].id) {
            data[x]._class = 'active'
        }
    }
    if (url.GetPage() == "paper" && url.GetGenre() == 2) {
        data.push({ name: "地区检索", href: url.Path("map/0/1") })
    }
    return data
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
 * 本地报纸优先
 */
e.localPaperFirst = function() {
    var url = new Url()
    if (url.GetGenre() != '2') {
        return ""
    }
    var web = Session.Get("web")
    if (!web || !web.operationList || web.operationList.length == 0) {
        return ""
    }
    var local = Session.Get("local")
    if (!local) {
        return ""
    }

    // 该机构是否启用本地优先
    var d = false
    for (var x in web.operationList) {
        var obj = web.operationList[x]
        if (obj.right == 'localfirst' && obj.value == 1) {
            d = true
            break
        }
    }

    if (!d) {
        return ""
    }

    return local.province + "," + local.city
}

/**
 * 资源有效性检查， 没有jpg不显示
 */
e.checkJpg = function(x, data) {
    if (!data) {
        return false
    }
    var obj = data[x]
    if (!obj) {
        return false
    }
    if (obj.jpg == 0 && obj.txt == 0 && obj.html == 0) {
        data.splice(x, 1)
        return false
    }
    return true
}

/**
 * 资源请求处理，1. 请求jcms2.0, 2. 请求陈工资源服务器
 */
e.ContentPicture = function(genre, a) {
    var path = "page"
    var ext = ".mg"
    var key = "/source/"

    if (!isWebp) {
        path = "jpage"
        ext = ".jpg"
    }
    // 判断epub封面
    if (!!a[1] && a[1] != "0" && (!a[0] || a[0] == "0")) {
        path = "epub"
        a[0] = a[1]
    }

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

// 使用其中一个资源
e.SourceOne = function(data, selector, _goto) {
    for (var x in data) {
        if (!!data[x] && data[x].length > 0) {
            return e.PreviewItems(data[x], selector, _goto)
        }
    }
}

// 订单列表
e.OrderItems = function(data, selector, _goto) {
    for (var x in data) {
        data[x].content = e.ItemsName(data[x].goods)
    }
    return data
}

e.ItemsName = function(data) {
    var a = { magazines: "杂志", papers: "报纸", books: "图书" }
    var arr = []
    for (var x in data) {
        for (var i in data[x]) {
            var name = "[" + a[x] + "]" + data[x][i].resourceName + "：" + data[x][i].issueName
            arr.push(name)
        }
    }
    // return arr.join('&nbsp;&nbsp;')
    return arr.join('<br>')
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
        data[x]['genre'] = genre
        var path = obj.webp
        if (!isWebp || !obj.epub || obj.epub == "0") {
            path = obj.jpg
        }
        var array = [path, obj.html, obj.resourceId, obj.issueId]
        if (genre == 2) {
            data[x]['name'] = obj.issueNo
            array = [obj.txt, obj.html, obj.resourceCode, obj.issueNo]
        }
        data[x]['src'] = e.ContentPicture(genre, array)
        var page = e.ItemPage(obj.web, obj.jpg, obj.html)
        data[x].href = url.Path(page + "/0/0/" + obj.resourceId + "/" + obj.issueId)
    }
    $("#resourceName").html(name)
    return data
}

/**
 * 年度列表格式化数据为菜单导航
 */
e.YearCategory = function(data, selector, _goto) {
    if (!data) {
        return
    }
    if (!_goto) {
        _goto = 0
    }
    var url = new Url()
    data[0]._class = 'active'
    for (var x in data) {
        data[x].name = data[x].year
        data[x].href = url.Path(_goto + '/0/0/0/0/' + data[x].year)
        if (url.GetParam() == data[x].year) {
            data[0]._class = "";
            data[x]._class = "active";
        }
    }

    return data
}

/**目录显示 */
e.CatalogItems = function(data, selector, _goto) {
    if (!data || data.length == 0) {
        e.FormatPartMenu(selector)
        return
    }

    if (new Url().GetProduct() != 'wei') {
        setTimeout(function() {
            var d = $(".pc-catalog>ul")
            $(".pc-catalog").css("width", d.length * 85 + "rem")
        }, 100)
    }

    // 临时存入session
    var iid = new Url().GetIid()
    Session.Set('catalog' + iid, JSON.stringify(data))
    return data
}


// 获取预览图的选择项
e.ItemChecked = function() {
    var obj = {}
    $("input[name='preview-item']:checked").each(function() {
        var val = $(this).val()
        if (!val) {
            return
        }
        var a = val.split(',')
        var k = a[0]
        var v = a[1]
        obj[k] = !obj[k] ? v : obj[k] + ',' + v
    });
    return obj
}

// 显示预览图的选择项
e.ItemSelect = function() {
    $("[data-name='PartPrePaging'] input").toggle()
}

// 删除预览图的选择项
e.ItemDelete = function() {
    var url = new Url()
    var user = url.GetArgs('user')
    var handle = 'User' + user + 'Del'
    var items = e.ItemChecked()

    $.post(window.location.href, {
        handle: handle,
        magazines: items[1],
        paper: items[2],
        books: items[3],
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

// 滑动后，加载
e.PreviewLoad = function() {
    $("[data-name='PartPreview'] img").each(function() {
        var s = $(this).attr("src")
        if (!!s && s != "none") {
            return
        }
        $(this).attr("src", $(this).attr("data-src"))
    })
}

// 分页
e.Paging = function(it, num, selector, total) {
    var p
    var s = $(it).parents("ul")
    if (!t) {
        s = $(selector).parents("ul")
    }

    if (num == 0) {
        // 点击页码
        p = parseInt($(it).html())
    } else {
        // 点击向前或向后
        p = parseInt(s.find("li.paging.active a").html())
    }

    if (!p && !!it) {
        return
    }

    if (!!it) {
        num = p + num
    }
    num = num < 1 ? 1 : (num > total ? total : num)
    Session.Set(window.location.href + "-paging", num);
    $("input[name='page']").val(num)
    Web.Update($(".load-more"), 0)

    $(selector).find("li.paging").removeClass("active")
    if (total < 8) {
        // 不需要重写组件
        $(selector).find("li.paging-" + num).addClass("active")
    }
    var a = [num - 2, num - 1, num, num + 1, num + 2, '...', total]
    if (num < 4) {
        a = [1, 2, 3, 4, 5, '...', total]
    } else {
        if (total - num < 4) {
            a = [1, '...', total - 4, total - 3, total - 2, total - 1, total]
        }
    }

    var i = 0
    s.find('li.paging').each(function() {
        var v = a[i]
        i++
        $(selector).find("li.paging-" + i).children('a').text(v)
        if (v == num) {
            $(selector).find("li.paging-" + i).addClass("active")
        }
    })

};

// 分页
e.PrePaging = function(it, num, id, total) {
    var selector = "[data-index='" + id + "']"
    var p = parseInt($(selector).find("li.paging.active a").html())
    if (num == 0) {
        p = parseInt($(it).html())
    }
    if (!p) {
        return
    }

    num = p + num
    num = num < 1 ? 1 : (num > total ? total : num)
    Session.Set(window.location.href + "-paging", num);

    $(selector).find("tr.page").hide()
    $(selector).find("tr.page-" + num).show()
    $(selector).find("li.paging").removeClass("active")
    if (total < 8) {
        $(selector).find("li.paging-" + num).addClass("active")
        return
    }

    var a = [num - 2, num - 1, num, num + 1, num + 2, '...', total]
    if (num < 4) {
        a = [1, 2, 3, 4, 5, '...', total]
    } else {
        if (total - num < 4) {
            a = [1, '...', total - 4, total - 3, total - 2, total - 1, total]
        }
    }

    var i = 0
    $(selector).find('.top-paging li.paging').each(function() {
        i++
        $(selector).find("li.paging-" + i).children('a').text(a[i - 1])
        if (a[i - 1] == num) {
            $(selector).find("li.paging-" + i).addClass('active')
        }
    })
};

// 内容显示
e.ArticleShow = function(data, selector, _goto) {
    return data[0]
}

// 文本阅读
e.TxtReader = function(genre, iid, html, txt) {
    var url = new Url()
    if (!!html && html > 0) {
        window.location.href = url.Path("epubReader/" + genre + "/0/0/" + iid)
        return
    }
    if (!!txt && txt > 0) {
        window.location.href = url.Path("txtReader/" + genre + "/0/0/" + iid)
        return
    }
    Web.Alert("没有相关阅读器，请留意")
}

// 图片阅读
e.ImgReader = function(genre, iid, pdf, webp, jpg) {
        var url = new Url()
        if (!!pdf) {
            window.location.href = url.Path("pdfReader/" + genre + "/0/0/" + iid)
            return
        }
        if (!!webp || !!jpg) {
            window.location.href = url.Path("imageReader/" + genre + "/0/0/" + iid)
            return
        }
        Web.Alert("没有相关阅读器，请留意")
    }
    // 显示登录
e.LoginShow = function() {
    var url = new Url()
    if (url.GetProduct() == "wei") {
        Web.Update("[data-name='PartWLogin']", 0);
        setTimeout(function() {
            $("[data-name='PartWLogin']").show()
        }, 100);
        return
    }
    window.location.href = url.Path("login")
}

// 获取验证码
var t
e.LoginCode = function(it) {
    var name = $("[name='username']").val()
    if (!name || name.length != 11) {
        Web.Alert("请输入正确手机号码！")
        return
    }
    $.post(window.location.href, { handle: "UserVerifyCode", phone: name, cache: 1 }, function(re) {
        if (re.status == 0) {
            Web.Alert("验证码发送失败，请稍后再试")
            return
        }
        var i = 60
        t = setInterval(function() {
            i--
            if (i < 1) {
                $(".login-code").html("获取验证码")
                clearInterval(t)
                return
            }
            $(".login-code").html(i + "秒后再试")
        }, 1000)
    }, 'json')
}

// 用户登录 
e.LoginSubmit = function() {
    var username = $("[name='username']").val()
    var password = $("[name='password']").val()
    var type = 3
    if (!username || !password) {
        Web.Alert("请填写帐号、密码")
        return
    }

    // 判断登录类型
    var c = $(".login-code").html()
    var h = "OrgLogin"
    var web = Session.Get("web")
    if (!!web.base.type) {
        h = "UserLogin"
        type = 4
        if (c != undefined && c == "获取验证码") {
            type = 5
        }
    }

    $.post(window.location.href, {
        handle: h,
        username: username,
        password: password,
        type: type,
        cache: 1
    }, function(re) {
        if (re.status == 0) {
            Web.Alert("登录失败，请稍后再试")
            return
        }
        clearInterval(t)
        e.UserRole("LoginCancel")
        Session.Set("user", re.data)
            // 分享阅读页面登录成功后，显示底部操作栏
        var url = new Url()
        if (url.GetPage() == "login") {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = new Url().Path('index');
            }
        }
        $('*[data-source=ToolIReader]').show();
    }, 'json')
}


// 用户取消登录
e.LoginCancel = function() {
    var url = new Url()
    if (url.GetProduct() == 'wei') {
        $('*[data-class=login]').hide();
        return
    }
    window.history.back()
}

/**
 * 添加到购物车
 * @param genre 资源类型
 * @param issueIds issueid列表，多个以逗号分割
 */
e.AddCart = function(it, genre, issueIds) {
    if (!issueIds) {
        return
    }

    var user = Session.Get('user')
    if (!user) {
        // Web.Alert("请登录后再添加购物车")
        e.LoginShow();
        return
    }
    if (!user.userId) {
        Web.Alert("登录失效，请退出后重新登录")
        return;
    }

    //判断是否已买
    if (e.IsRole(issueIds)) {
        Web.Alert("该商品已购买，请留意！")
        return
    }

    $.post(window.location.href, {
        handle: "UserShopCartAdd",
        userId: user.userId,
        resourceType: genre,
        issueIds: issueIds,
        cache: 1
    }, function(result) {
        if (result.status == 0) {
            Web.Alert("购物车添加失败，请留意！")
            return
        }
        Web.Alert("添加购物车成功！");
        $('#myModal').modal("hide");
    }, 'json')
}

//  用户购买
e.BuyItem = function(it, genre, iid) {
    $(it).attr('disabled', true);
    $(it).css('background-color', "#aaa");
    if (!Session.Get("user")) {
        // Web.Alert("登录后才能购买，请先登录！")
        e.LoginShow();
        return
    }
    var items = {}
    if (!!genre && !!iid) {
        if (e.IsRole(iid)) {
            Web.Alert("该商品已购买，请留意！")
            return
        }
        items[genre] = iid
    } else {
        items = e.ItemChecked()
    }
    if (!items || (!items[1] && !items[2] && !items[3])) {
        Web.Alert('未选购买商品，点击"选择"按钮启动选择！')
        return
    }

    $.post(window.location.href, {
        handle: "UserOrderAdd",
        magazines: items[1],
        papers: items[2],
        books: items[3],
        cache: 1
    }, function(re) {
        if (re.status == 0) {
            Web.Alert("添加订单失败，请留意！")
            return
        }
        Session.Set('pay', re.data)
        e.UserRole()
        window.location.href = url.Path('pay/0/0/0')
        $('#myModal').modal("hide");
    }, 'json')
}

//提交支付
e.OrderPay = function(handle, no, type, code) {
    $.post(window.location.href, { handle: handle, orderNo: no, payType: type, createQrcode: code }, function(re) {
        if (re.status == 0) {
            Web.Alert("支付失败，请留意！")
            return
        }
        Web.Alert("支付成功，请留意！")
        Web.Update("[data-name='PartPreview']", 0)
    }, 'json')
}

//确认支付
e.PayConfirm = function(no) {
    $.post(window.location.href, { handle: "UserOrderConfirm", orderNo: no, cache: 1 }, function(re) {
        if (re.status == 0 || !re.data) {
            Web.Alert("支付失败，请留意！")
            return
        }
        Web.Alert("支付成功，请留意！")

        Session.Remove("role");

        var url = new Url();
        if (url.GetProduct() == "wei" && url.GetInstance() == "magazine") {
            window.history.back();
        }
        if (url.GetProduct() == "web" && url.GetInstance() == "bk") {
            window.location.href = url.Path("user/1/user@ResourceShelf")
        }
    }, 'json')
}

e.PayCancel = function() {
    $(".pay-before").show()
    $(".pay-after").hide()
}

// 支付宝支付
e.ali = function(it, no) {
    url = new Html()
    $.post(window.location.href, {
        handle: 'UserAliPay',
        orderNo: no,
        returnUrl: window.location.href,
        cache: 1
    }, function(re) {
        if (!re) {
            Web.Alert("支付失败")
            return
        }
        $("#pay-channel-ali").html(re)
        document.forms['alipaysubmit'].submit();
        $(".pay-before").hide()
    })
}

// 微信支付
e.wei = function(it, no) {
    $.post(window.location.href, {
        handle: "UserWeiPay",
        orderNo: no,
        payType: 2,
        createQrcode: 1,
        cache: 1
    }, function(re) {
        if (!re) {
            Web.Alert("购买失败，请留意")
            return
        } else {
            $("#pay-channel-wei img").attr("src", "data:image/png;base64," + re)
            $(".pay-before").hide()
            $(".pay-after").show()
        }
    })
}

e.PassWord = function() {
    if (!Session.Get("user")) {
        e.logout()
        window.location.href = new Url().Path("index")
        return
    }
    var p1 = $('[name="password"]').val()
    if (!p1 || p1.length < 6) {
        Web.Alert("密码长度不能少于6位")
        return
    }
    var p2 = $('[name="password1"]').val()
    if (p1 != p2) {
        Web.Alert("两次输入密码不相同")
        return
    }
    $.post(window.location.href, { handle: "UserPasswordSet", password: p1 }, function(re) {
        if (!re) {
            Web.Alert("修改密码失败，请留意")
            return
        }
        Web.Alert("密码修改成功，请留意")
    }, 'json')
}

e.WebStatus = function() {
    var re = Session.Get("web")
    if (!!re && re.length > 0) {
        e.WebTitle(re)
        return
    }
    //获取产否有权限
    $.post(handle, { handle: "WebInfo" }, function(re) {
        if (re.status == 0 || !re.data || !re.data.base) {
            return
        }
        e.WebTitle(re.data)
        Session.Set('web', re.data)
        for (var x in re.data.operationList) {
            var obj = re.data.operationList[x]
            if (obj.right == "localfirst" && !!obj.value) {
                e.AreaLocation()
                return
            }
        }
    }, "json")
}

// 从网站信息设置页面标题
e.WebTitle = function(re) {
    if (!re || re.length == 0) {
        return
    }
    var title = ""
    for (var x in re.operationList) {
        var obj = re.operationList[x]
        if (obj.right == "trial") {
            title = "[试用]"
        }
    }
    var $body = $('body');
    document.title = title + re.base.title
    var $iframe = $('<iframe src="/favicon.ico" width="1" height="1" frameborder="0"></iframe>');
    $iframe.on('load', function() {
        setTimeout(function() {
            $iframe.off('load').remove();
        }, 0);
    }).appendTo($body);
};

e.UserData = function() {
    $.post(window.location.href, { handle: "UserInfo" }, function(r) {
        if (r.status == 0 || !r.data) {
            // Session.Remove("user")
            // Session.Remove("pay")
            return
        }
        Session.Set('user', r.data)
    }, 'json')
}

e.UserRole = function(key) {
    $.post(window.location.href, {
        handle: "UserSourceItems",
        user: "ResourceShelf",
        genre: "1,2,3",
        cache: 1
    }, function(re) {
        if (!!key) {
            e[key]()
        }
        if (re.status == 0) {
            // Session.Remove("role")
            return
        }
        // 按单本购买，品种包年两种方式处理
        var source = {}
        var issue = {}
        for (var x in re.data) {
            for (var i in re.data[x]) {
                var obj = re.data[x][i]
                if (x.indexOf("resource") == 0) {
                    source[obj.resourceId] = 1
                } else {
                    issue[obj.issueId] = 1
                }
            }
        }
        Session.Set('role', { source: source, issue: issue })
        if (new Url().GetProduct() == "web" && new Url().GetInstance() == "bk") {
            if (new Url().GetPage() == "detail") {
                Web.Update('[data-name="PartDetail"]', 0)
            } else {
                Web.Update('[data-name="PartPreview"]', 0)
            }
        }
    }, "json")
}

// 从epub获取目录
e.tocToCatalog = function(re) {
    var xmlDoc
    try //Internet Explorer
    {
        xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        xmlDoc.loadXML(re);
    } catch (e) {
        try //Firefox, Mozilla, Opera, etc.
        {
            parser = new DOMParser();
            xmlDoc = parser.parseFromString(re, "text/xml");
            // if(navigator.userAgent.indexOf("Edge") < 0){
            isIE = false
                // }

        } catch (e) {
            Web.Alert(目录加载失败)
        }
    }

    var data = []
    var dom = xmlDoc.getElementsByTagName('navMap')
    if (!isIE) {
        var nodes = dom[0].childNodes;
        for (var i in nodes) {
            var obj = nodes[i];
            if (obj.tagName == 'navPoint') {
                data.push(e.xmlRecursion(obj))
            }
        }

    } else {
        var nodes = dom.nextNode().childNodes
        for (var i = 0; i < nodes.length; i++) {
            var obj = nodes.nextNode()
            if (obj.tagName == 'navPoint') {
                data.push(e.xmlRecursion(obj))
            }
        }
    }

    return data
}

e.xmlRecursion = function(dom) {
    if (!dom) {
        return
    }
    var a = { page: "", name: "", sublevels: [] }
    if (!isIE) {
        var nodes = dom.childNodes
        for (var i in nodes) {
            var obj = nodes[i]
            if (obj.tagName == "navLabel") {
                a.name = HTMLDecode(obj.getElementsByTagName('text')[0].firstChild.wholeText)
                continue
            }
            if (obj.tagName == "content") {
                a.page = obj.getAttribute('src')
                continue
            }
            if (obj.tagName == "navPoint") {
                a.sublevels.push(e.xmlRecursion(obj))
            }
        }
    } else {
        var nodes = dom.childNodes
        for (var x = 0; x < nodes.length; x++) {
            var obj = nodes.nextNode()
            if (obj.tagName == "navLabel") {
                var child = obj.getElementsByTagName('text')
                a.name = HTMLDecode(child.nextNode().text)
                continue
            }
            if (obj.tagName == "content") {
                a.page = obj.getAttribute('src')
                continue
            }
            if (obj.tagName == "navPoint") {
                a.sublevels.push(e.xmlRecursion(obj))
            }
        }
    }

    return a
}

e.UserFromTouchQrcode = function() {
    Session.Set("touch", false)
        // 没有触摸屏二维码特定的参数
    if (window.location.hash == "") {
        return
    }
    var patt = new RegExp("\\d+@\\w{32}")
    var code = window.location.hash.match(patt)
    if (!code || code.length == 0) {
        return
    }
    // 有微信接口传来的特定参数
    Session.Set("wxcode", "")
    var a = window.location.hash.split("?")
    if (a.length == 2) {
        Session.Set("wxcode", "?" + a[1])
    }
    window.location.hash = ""
    $.post(window.location.pathname, { handle: "UserFromTouchQrcode", touch: code[0] }, function(re) {
        if (re.status == 0 || !re.data.role) {
            return
        }
        Session.Set("touch", true)
    }, "json")
}


function HTMLDecode(text) {
    var temp = document.createElement('div');
    temp.innerHTML = text;
    var output = temp.innerText || temp.textContent;
    temp = null;
    return output;
}


e.FormatPartCatalog = function(data) {
    ereader.data = data
    var part = new PartCatalog()
    part.SetData(data)
    part.SetClass("pc-catalog")
    $("#catalog").html(part.Html().String())
    setTimeout(function() {
        var d = $(".pc-catalog>ul")
        $(".pc-catalog").css("width", d.length * 85 + "rem")
    }, 100)
}

e.FormatPartMenu = function(selector) {
    $.post(window.location.href, { handle: "ResourceHash" }, function(re) {
        var url = new Url()
        var mid = url.GetMid()
        var iid = url.GetIid()
        var n = 1
        var dir = d.isUseRedirect ? d.imageResource.epub + "epub" + n + "/" + mid + "/" + mid + "-" + iid + "/" + iid + "_" + re + "/" : "/epub/" + n + "/" + mid + "/" + iid + "/"

        $.get(dir + "OEBPS/toc.ncx", function(re) {
            $(".load").hide()
            var data = e.tocToCatalog(re)

            // 临时存入session
            Session.Set('catalog' + iid, JSON.stringify(data))

            var part = new PartList()
            part.AddClass("contents")
            part.SetData(data)
            $(selector).html(part.Html().String())
        });
    })
}

/**
 * 对象排序，按对象某个属性，或按排序依据的函数进行排序
 * @param key 属性名
 * @param desc boolean 是否倒序
 * @return func 数组排序方法
 */
e.objSort = function(key, desc) {
    return function(a, b) {
        // return desc ? ~~(a[key] < b[key]) : ~~(a[key] > b[key]);
        return desc ? b[key] - a[key] : a[key] - b[key]
    }
};

/**
 * tag = 点赞1，分享2，评论3，收藏4，笔记5的添加次数入口
 */
e.resourceOperateTimes = function(key, tag) {
    $.post(window.location.href, { handle: "ResourceOperateTimes", tag: tag, cache: 1 }, function(re) {
        if (re.status == 0) {
            Web.Alert(re.info)
            return
        }
        e.AddResourceOperate(key)
    }, "json")
    if (key == "detail-like") {
        Web.Alert("点赞成功，谢谢！")
    }
}

e.AddResourceOperate = function(key) {
    var selector = "." + key + " .detail-info-value"
    var s = $(selector).html()
    var i = s.replace(/[^0-9]/ig, "")
    i++
    $(selector).html("（" + i + "）")
}

e.loadMore = function() {}

// 阅读日志
var ReaderLog = function(type, url) {
    // 空请求，支持孙工输出阅读日志
    var a = url.split("/")
    if (a.length < 3) {
        return
    }
    a = a.slice(3)
    var s = "/" + type + "/" + a.join("/") + "?log=1"
    $.get(s)

    // 分享epub, 按篇分享
    if (url.indexOf(".xhtml") < 0 || !ereader || !ereader.share) {
        return
    }
    ereader.share(url)
}

/**
 * 解析url search中参数
 * @param url
 * @return Object
 */
e.parseSearchParam = function(url) {
    var paramObj = {};
    if (typeof url !== "string" || url.indexOf("?") < 0) {
        return paramObj
    }
    var searchStr = url.split("?")[1];
    var searchArr = searchStr.split("&");
    for (var i in searchArr) {
        paramObj[searchArr[i].split("=")[0]] = unescape(searchArr[i].split("=")[1]);
    }
    return paramObj;
};

/**
 * 分页
 */
e.PreviewPaging = function(data, selector, _goto) {
    return data
}

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
    name: "收藏",
    onclick: "e.CollectAdd(0); return false;"
}, {
    id: 1,
    href: "#",
    name: "目录",
    onclick: "ireader.catalog(); return false;"
}, ]

window.onscroll = function() {
    var url = new Url()
        // 非触摸屏
    if (url.GetProduct() != "touch") {
        if (!d.PreviewLoad) {
            d.PreviewLoad = 1
            e.PreviewLoad()
        }
        return
    }
    // 触摸屏
    var ch = $("body")[0].clientHeight
    var t = $("body")[0].scrollTop //滚动高度  
    var h = 400
    if (t == 0) {
        h = 150
        t = $(this).scrollTop()
    }
    if (window.navigator.userAgent.indexOf("Edge") > 0) {
        h = 150
    }
    if (ch - Web.h < t - h) {
        e.loadMore()
    }
}

var isWebp = e.checkWebp()
var isIE = true;

e.init()