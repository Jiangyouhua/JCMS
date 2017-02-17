/**
 * 文章显示
 */
e.ArticleShow = function (data, selector, _goto) {
    console.log(data)
    if (!data) {
        return
    }
    var d = data[0]
    if(!data[0]){
        d = {show:2}
    }
    var time = d.show * 1000
    var tag = "active"
    $("body").css("background-color", $("li." + tag).css("background-color"))
    var node = $("li." + tag).next()
    if (!node.length) {
        node = $("li." + tag).parent().children(":first")
    }
    if (!node.length) {
        return
    }
    var url = $(node).find("a").attr('href')
    var a = url.split("/")
    id = a.pop()
    id = id.replace("#", "")
    $(node).parent().children().removeClass(tag)
    $(node).addClass(tag)
    $(node).parents("part").find("input").val(id)

    setTimeout(function () {
        e.ArticleUp()
    }, 100)
    setTimeout(function () {
        Web.Update(selector, id) //tab切换
    }, time);
    return d
}

/**
 * 内容滚动
 */
var t = ''
e.ArticleUp = function () {
    clearInterval(t)
    var top = $("#text-body")[0].offsetTop
    var h = Web.h - top - 50
    var height = $("#text-body")[0].clientHeight
    var body = $("#text-body").html()
    var length = height - h
    if (length <= 0) {
        return
    }
    $("#text-body").css("height", h)
    $("#text-body").css("overflow", "auto")
    t = setInterval(function () {
        var a = $("#text-body")[0].scrollTop
        if (a >= length) {
            length += height
            $("#text-body").append(body)
        }
        $("#text-body")[0].scrollTop = a + 1
    }, 50)
};