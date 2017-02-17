var rem = Math.floor(Web.w / 25);
$("html").css("font-size", rem);
var url = new Url()

var loginUser = "登录"
if (Session.Get("user")) {
    loginUser = "设置"
}
d.ToolBottom = [
    { id: "index", href: url.Path("issue" + "/0/0/0"), name: "我的" },
    { id: "index", href: url.Path("issue" + "/0/0/0"), name: "博看书苑" },
    { id: "index", href: url.Path("cart" + "/0/0/0"), name: "购物车" },
    { id: "search", href: "#", name: loginUser, onclick: "e.setting();" },
]

d.Login = [
    { "title": "用户名", "name": "text", "placeholder": "请输入用户名" },
    { "title": "密码", "name": "password", "placeholder": "请输入密码" }
]

d.UserMenu = [
    [
        { id: 0, name: "注册或登录", href: url.Path("login") },
    ],
    [
        { id: 0, name: "退出", href: "#", onclick: "e.logout();return false;" }
    ],
]

var url = new Url()
var page = url.GetPage()
for (var x in d.ToolBottom) {
    var obj = d.ToolBottom[x]
    if (page == obj.id) {
        obj._class = 'active'
    }
}

$(function() {
    $("#layout-left").css("width", Web.w * 0.75)
    $("#layout-left").css("height", Web.h)
    $("#layout-right").css("width", Web.w * 0.25)
})

e.LoginShow = function() {
    $("*[data-class='login']").show()
}

e.setting = function() {
    if (!!Session.Get('user')) {
        window.location.href = url.Path("setting" + "/0/0/0")
        return
    }
    e.LoginShow()
    return false
}