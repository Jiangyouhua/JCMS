/**
 * Created by jiangyouhua on 2016/3/31.
 * 为框架的核心类
 * 全文件分四部分，使用jquery选择器
 * 1. 全局变量：handle, ajax入口；d全局变量集；e全局事件集
 * 2. 组件格式化程序web：web.Load入口程序，web.Part组件加载程序，web.ForPart组件生成html程序
 * 3. Html类，实现js输出html所有元素
 * 4. Part类及了类，定义各个重用组件
 */

// 通过传入cache参数强制整站更新
var handle = window.location.pathname + (window.location.search.indexOf("cache") > 0 ? "?cache=1" : "")
var website = 'JCMS Back';
var mark = "jcms-index-"
var tag = "Part" //"dd"
var d = {}
var e = {}

d.t = []
d.imageResource = {
    upload: "http://resource.magook.com/",
    ueditor: "http://resource.magook.com/",
    source: "http://msharecej.magook.com/",
    dbtxt: "http://pres.bookan.cn:8180/",
    epub: "http://mebookj.magook.com/"
};

/**
 * 启动Part加载
 */
$(document).ready(function() {
    Web.Load(tag)
    Web.Nav();
});


var Web = {
    w: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
    h: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight,
    Status: { "-1": "已删除", "0": "未启用", "1": "已启用", "2": "已确定" },
    Nav: function() {
        $('nav a').removeClass('active');
        $("nav a[href='" + window.location.pathname + "']").parent('li').addClass('active');
    },

    /**
     * 通过选择器加载组件，支持组件嵌套
     * @param s， 选择器
     * @Jiang youhua
     */
    Load: function(s) {
        var parts = []
        var makes = []
        var i = 0
            //先加唯一标识，再基于标识写入
        $(s).each(function() {
            var map = { index: i, obj: this }
            var _index = $(this).attr("id")
            if (!_index) {
                _index = mark + i
                $(this).attr("id", _index)
            }
            parts.push(map)
            makes.push(_index)
            i++
            //IE8
            // if (!$(this).children('div')[0]) {
            //     var div = new Html()
            //     $(this).prepend(div.String())
            // }
        })

        for (var x in parts) {
            Web.Part(parts[x].obj, makes[x])
        }
    },

    /**
     * 组件加载，升级为异步加载
     * 1. name, 组件名称：以此实例化一个同名组件
     * 2. source, 数据源：数据源有四种方式：变量值， json字符串，ajax get(xml, json, ini文件)， ajax post(后台传入数据)
     * 3. config, 配置参数
     * 4. operate, 操作参数
     * 5. func, 数据处理函数，可用来改变当前项数据的显示结果
     * 6. attr, 属性
     * 7. classify, 类型
     * @param self，jquery对象，表示通过选择器选择的part本身
     * @Jiang youhua
     */
    Part: function(self, _index) {
        // 获取自定义属性值
        var name = $(self).attr("data-name") //part名称
        var source = $(self).attr("data-source") //绑定的data或url, url格式为handle/func, data为数组或对象
        var config = $(self).attr("data-config") //绑定的配置文件, 对象或数据组
        var operate = $(self).attr("data-operate") //绑定操作，{operate:obj,}operate为操作，obj为对象（1. part，2.handle）,sessionStorage保存用户权限
        var _goto = $(self).attr("data-goto")
        var _attr = $(self).attr("data-attr")
        var _class = $(self).attr("data-class")

        // 必须需要一个PART名称
        if (!name) {
            console.log("Web Part name is null")
            return
        }

        var key = "PartCache_"
        try {
            //看内存是否有该组件
            var part = new(eval(name))
            Web.ForPart(self, part, source, config, operate, _goto, _attr, _class, _index)
        } catch (e) {
            //看缓存是否有该组件
            var re = Session.Get(key + name)
            if (!!re) {
                eval(re)
                var part = new(eval(name))
                Web.ForPart(self, part, source, config, operate, _goto, _attr, _class, _index)
                return
            }
            console.log("Part is not find, " + name)
                //从服务器请求该组件
            $.get("/part/" + name + ".js", function(re) {
                try {
                    eval(re)
                    Session.Set(key + name, re)
                    var part = new(eval(name))
                    Web.ForPart(self, part, source, config, operate, _goto, _attr, _class, _index)
                } catch (e) {
                    console.log(e)
                }
            })
        }
    },

    /**
     * 组件格式化后输出html string, 主要处理数据加载
     * @param self，jquery通过选择器获取的对象
     * @param part，part组件实例
     * @param source，数据源
     * @param config，配置参数
     * @param operate，操作参数
     * @param func，数据处理函数
     * @param _attr，属性
     * @param _class，类型
     * @returns {boolean}
     * @Jiang youhua
     */
    ForPart: function(selector, part, source, config, operate, _goto, _attr, _class, _index) {
        if (!selector || !part) {
            console.log("Web ForPart selector or part is null")
            return
        }
        part.SetOperate(operate).SetAttr(_attr).SetClass(_class).SetId(_index)

        if (!!config) {
            var v = Web.GetData(config, 0)
            part.SetConfig(v.data)
        }
        if (!!source) {
            source = Web.GetData(source, 1)
        }

        // 数据解析
        // 1.无数据
        if (!source || !source.data) {
            Web.StringPart(part, selector)
            return true
        }

        // 2.非Ajax数据
        if (!source.ajax) {
            Web.StringPart(part, selector, source.data)
            return true
        }

        // 3.get请求
        if (typeof source.data == 'string') {
            $.get(source.data, function(re) {
                if (re.status == 0) {
                    Web.Alert(re.info)
                    if (!!re.data) {
                        window.location.href = re.data
                    }
                    return true
                }
                Web.StringPart(part, selector, re.data)
            }, "json")
            return true
        }

        // 4.post请求，启动缓存
        // var key = this.ForKey(source.data)
        // if (!!key && !!Session.Get(key)) {
        //     var data = Session.Get(key)
        //     if (!$.isEmptyObject(data)) {
        //         if (!!source.data.func) {
        //             data = e[source.data.func](data, selector, _goto)
        //         }
        //         Web.StringPart(part, selector, data)
        //         return
        //     }
        // }
        source.data.local = e.localPaperFirst()
        $.post(handle, source.data, function(re) {
            if (re.status == 0) {
                //Web.Alert(re.info)
                if (!!re.data && typeof(re.data) == "string") {
                    window.location.href = re.data
                }
                return true
            }
            //写入局部缓存
            // Session.Set(key, re.data)
            var data = re.data
            if (!!source.data.func) {
                data = e[source.data.func](data, selector, _goto)
            }
            Web.StringPart(part, selector, data)
        }, 'json')
    },

    /**
     * 输出Part
     */
    StringPart: function(part, selector, data) {
        if (!part || !selector) {
            return
        }
        var pre = [] //前面添加的内容
        var next = [] //后面添加的内容
        var curr = false //判断前后

        var s = $(selector).children()
        s.each(function() {
            if (this.tagName == 'self') {
                curr = true
                return
            }
            if (!curr) {
                pre.unshift(this)
            } else {
                next.push(this)
            }
        })

        //插入part格式化的内容
        var html = part.SetData(data).Html().String();
        $(selector).html(html)
        if ($(selector).find('._content')[0]) {
            s = $(selector).find('._content')
        }
        if (!!pre && pre.length > 0) {
            for (var x in pre) {
                s.prepend(pre[x])
            }
        }
        if (!!next && next.length > 0) {
            for (var x in next) {
                s.append(next[x])
            }
        }
    },

    /**
     * 将[{name:value1},{name:value2}]转{anme:[value1, value2]}
     * @param a, [{name:value1},{name:value2}]
     * @param data，{anme:[value1, value2]}，可以与已有数据结合
     * @returns {*}
     * @Jiang youhua
     */
    MapArray: function(a, data) {
        for (var x in a) {
            var name = a[x].name
            var value = a[x].value
            if (name.indexOf('[]') > 0) {
                if (!data[name]) {
                    data[name] = []
                }
                data[name].push(value)
            } else {
                data[name] = value
            }
        }
        return data
    },

    /**
     * 通过解析后的数据源加载数据，数据有四种方式
     * 1. Variable, 变量，一般定义于全局d集合中
     * 2. json string, 直接解析
     * 3. Ajax get，请求xml, json， ini数据文件并作对应解析
     * 4. Ajax post, 通过后台请数据json数据
     * @param s, 数据源
     * @param isAjax，是否通过Ajax请求
     * @returns {{ajax: number, data: *}}
     * @Jiang youhua
     */
    GetData: function(s, isAjax) {
        var re = { ajax: 0, data: s }
            //非字符串直接返回
        if (!s || typeof s != 'string') {
            return re
        }
        //string(json string)
        if (s.indexOf('[') == 0 || s.indexOf('{') == 0) {
            re.data = JSON.parse(s)
            if (!re.data) {
                console.log('Web GetData s is not Json', s)
            }
            return re
        }

        if (s.indexOf('/') < 0) {
            //variable
            if (s.match(/^[_A-Z]+/)) {
                re.data = d[s]
                if (!re.data) {
                    console.log('Web GetData s is not Variable', s)
                }
            }
            //string
            return re
        }
        //非数据部分不能通过Ajax请求
        if (!isAjax) {
            console.log('Web GetData s is not ajax data', s)
            return re
        }

        //AJAX
        re.ajax = 1
            //get
        if (s.match(/\.\w+$/i)) {
            return re
        }
        //post
        re.data = Web.DeUrl(s)
        return re
    },

    /**
     * 通过url绑定数据的方式，解析并返回url所绑定的数据
     * url的格式为：handle/func/key/value/...
     * 1. handle, 后台处理类
     * 2. func, 后台处理类对应的处理方法
     * 3. key, value, 要传递至后台处理的数据，从表单 name == key中获取更新
     * 格式化url，并生成该数据
     * @param s， url字符串
     * @returns {*}
     * @Jiang youhua
     */
    DeUrl: function(s) {
        if (s.indexOf('/') == 0) {
            s = s.substring(1, s.length - 1)
        }
        var a = s.split('/')
        if (a.length == 0) {
            console.log('Web DeUrl s is not ajax.post data', s)
            return s
        }
        var data = {}

        data['handle'] = a.shift()
        if (a.length == 0) {
            return data
        }
        data['func'] = a.shift()
        if (a.length == 0) {
            return data
        }
        for (var i = 0; i < a.length; i += 2) {
            var k = a[i]
            var v = a[i + 1]
            if (k == 'container') {
                v = ue.getContent();
            }
            if (k != 'status' && k != 'container') {
                var arr = k.split("@") //使用别名
                var j = k
                if (arr.length == 2) {
                    k = arr[0]
                    j = arr[1]
                }
                var val = Session.Get(j) //先判断session有没有
                if (!val) {
                    var selector = "[name='" + j + "']"
                    if (!!$(selector)[0]) {
                        v = $(selector).val()
                    }
                } else {
                    v = val
                }
            }
            data[k] = !v ? 0 : v
        }
        return data
    },

    /**
     * 通过url绑定数据的方式，将数据生成url
     * @param a，数据
     * @returns {*} , url字符串
     * @Jiang youhua
     */
    EnUrl: function(a) {
        if (!a) {
            return ""
        }
        var url = a.handle + "/" + a.func
        delete a.handle
        delete a.func
        if (!a) {
            return url
        }
        for (var x in a) {
            url += ("/" + x + "/" + a[x])
        }
        return url
    },

    /**
     * 提示条幅，三秒钟后自动隐藏
     * @param message，提示的信息
     * @Jiang youhua
     */
    Alert: function(message) {
        if (message && message.length > 0) {
            var a = new Html("span", message)
            a.AddAttr("style", "display: inline-block; max-width: 70rem; width: 75%; background: #222; color: #ddd; font-family: '微软雅黑';font-size:1.1em; line-height:3em;")
            var p = new Html("p", a, 'id=web-alert', "style=position: absolute; width: 100%; bottom: 10%;text-align:center; z-index:999999; ")
            $("body").append(p.String())
            setTimeout(function() {
                $("#web-alert").remove()
            }, 3000)
            return;
        }
        console.log(message)
    },

    /**
     * 确定当前项在该树的深度级别
     * @param before，前一项对象
     * @param after，当前项对象
     * @param level，前一项的深度级别
     * @returns {*}，当前项的深度级别
     * @Jiang youhua
     */
    Level: function(before, after, level) {
        if (!before || !before.leftside || !before.rightside) {
            return 0
        }
        if (!after || !after.leftside || !after.rightside) {
            return 0
        }
        if (after.leftside <= before.leftside) {
            return
        }
        if (!level) {
            level = 0
        }
        //下一级
        if (after.rightside < before.rightside) {
            return level + 1
        }
        //上一级
        return level - (after.leftside - before.rightside) + 1
    },

    /**
     * 获取重复多次字符串的字符串
     * @param a，需要重复的字符串
     * @param n，重复次数
     * @returns {string}
     * @Jiang youhua
     */
    Char: function(a, n) {
        var s = ""
        for (var i = 0; i < n; i++) {
            s += a
        }
        return s
    },

    /**
     * 通过指定选择器，更新选择器选择的所有对象的内容
     * 1. input对象，赋值
     * 2. img对象，改变src
     * 3. select对象，如使用PartSelect实现重新格式化，否则直接改变select的html内容
     * 4. 其它html, 直接改变html内容
     * 5. part, 分情况更新part
     * @param selector, 选择器
     * @param value，内容
     * @Jiang youhua
     */
    Update: function(selector, value) {
        if (!selector) {
            Web.Alert("无效操作，请留意")
            return
        }

        //对象转字符
        if (typeof value == 'object') {
            if (value instanceof Array) {
                value = value.join(",")
            } else {
                value = JSON.stringify()
            }
        }

        //遍历该选择器所有对象
        $(selector).each(function() {
            //html
            var t = $(this).prop('tagName')

            if (t == 'INPUT') {
                $(this).val(value)
                return true
            }

            if (t == 'IMG') {
                $(this).attr("src", value)
                return true
            }

            if (t == 'SELECT') {
                //判断是否基于Part生成
                var config = $(this).parents(tag).attr('config')
                var name = $(this).attr('name')
                if (!config || !name) {
                    $(this).html(value)
                    return true
                }
                //form内的select
                var val = {}
                var obj = JSON.parse(config)
                for (var x in obj) {
                    val = obj[x]
                    if (val.key == name) {
                        break;
                    }
                }
                if (val.source.indexOf('/') < 0) {
                    val.source = value
                    return true
                }

                var a = Web.DeUrl(val.source)
                val.source = Web.EnUrl(a)
                if (typeof val._class == 'object') {
                    val._class.push("form-control")
                } else {
                    val._class += " form-control"
                }
                if (typeof val.attr == 'object') {
                    val.attr.name = val.key
                } else {
                    val.attr += " name=" + val.key
                }
                var part = new PartSelect()
                Web.ForPart($(this).parent(), part, val.source, val.config, val.operation, val.attr, val._class)
                return true
            }

            if (t != tag.toUpperCase()) {
                $(this).html(value)
                return true
            }

            //Part处理, 5种数据类形：ajax.post, ajax.get, json string, variable, string
            //json对象, 直接赋值给source
            if (isNaN(value) && (value.indexOf('[') == 0 || value.indexOf('{') == 0)) {
                $(this).attr('source', value)
                Web.Part(this)
                return true
            }
            var s = $(this).attr("data-source")
            if (!s || s == 0) {
                Web.Part(this)
                return true
            }
            //variable, string, 直接赋值给source
            if (s.indexOf('/') < 0) {
                if (!!value) {
                    $(this).attr('data-source', value)
                }
                Web.Part(this)
                return true
            }

            //ajax.get
            if (s.match(/\.\w+$/i)) {
                s = s.replace(/\/\w+\./i, value)
                $(this).attr('data-source', s)
                Web.Part(this)
                return true
            }

            //ajax.post
            var a = Web.DeUrl(s)
            s = Web.EnUrl(a)
            $(this).attr("data-source", s)
            Web.Part(this)
        })
    },

    /**
     * 向后台poat请求数据
     * @param data
     * @Jiang youhua
     */
    Post: function(data) {
        if (typeof data == 'object' && !(data instanceof FormData)) {
            data = JSON.stringify(data)
        }
        event.preventDefault()
        event.stopPropagation()
        $.ajax({
            url: handle,
            type: 'POST',
            cache: false,
            data: data,
            processData: false,
            contentType: false
        }).done(function(re) {
            if (!re.status || re.status == 0) {
                Web.Alert(re.info)
                if (!!re.data) {
                    window.location.href = re.data
                }
                return
            }
            Web.Load(".load")
            ue.setContent('');
            // Web.Alert('操作成功请留意！')
        }).fail(function(res) {});
    },

    /**
     *  缓存的主健，避免数据多次请求
     */
    ForKey: function(data) {
        // 不启用缓存
        if (!!data && !!data.cache && data.cache != "0") {
            return ''
        }

        // 启用缓存
        var url = new Url()
        var i = 0
        var genre = 'genre' in data && data.genre != 0 ? data.genre : url.GetGenre()
        var category = 'category' in data && data.category != 0 ? data.category : url.GetCategory()
        var mid = 'mid' in data && data.mid != 0 ? data.mid : url.GetMid()
        var iid = 'iid' in data && data.iid != 0 ? data.iid : url.GetIid()
        var param = 'param' in data && data.param != 0 ? data.param : url.GetParam()
        var args = url.GetArgs()
        var k = data.handle + "/" + url.GetInstance()
        switch (data.handle) {
            case 'OrgInfo':
            case 'OrgProduct':
                return k
            case 'SourceCategory':
                return k + '/' + genre
            case 'CategoryIssue':
                return k + '/' + genre + '/' + category
            case 'SourceInfo':
                return k + '/' + genre + '/' + category + '/' + mid
            case 'SourceYear':
            case 'SourceYearMonth':
            case 'YearIssue':
            case 'IssueCatalog':
                return k + '/' + genre + '/' + category + '/' + mid + '/' + iid + '/' + param
            default:
                return ''
        }
    }
}

/**
 * 对url进行对象处理
 */
var Url = function() {
    var _level = []
    var _args = {};
    (function(self, args) {
        var arr = []
        var obj = {}
            //url的数据
        var a = window.location.pathname.split('/');
        a.shift()
        for (var x in a) {
            if (a[x].indexOf('@') > 0) {
                var ar = a[x].split('@')
                obj[ar[0]] = ar[1]
                continue;
            }
            if (x > 7) {
                break
            }
            arr[x] = a[x]
            i++
        }

        //将资源数据与url数据融合
        //传入的组件源
        var m = {}
        if (!!args && args.length > 0) {
            var source = Array.prototype.slice.call(args)
            var m = Web.DeUrl(source.join('/'))
        }

        var map = ['product', 'instance', 'layout', 'genre', 'category', 'mid', 'iid', 'param']
        for (var x = 0; x < 8; x++) {
            arr[x] = !!m && !!m[map[x]] && m[map[x]] != '0' ? m[map[x]] : (!arr[x] ? '0' : arr[x])
        }

        if (arr[2] == 0) {
            arr[2] = "index"
        }

        //将source key@value值加入 
        for (var x in m) {
            for (var i in map) {
                if (x == map[i]) {
                    continue
                }
            }
            obj[x] = !!m[map[x]] && m[map[x]] != '0' ? m[map[x]] : obj[x]
            i++
        }
        self._level = arr
        self._args = obj
    })(this, arguments)
}

//原方法
Url.prototype = {
    //获取当前级别值
    GetProduct: function() {
        return this._level[0]
    },
    GetInstance: function() {
        return this._level[1]
    },
    GetPage: function() {
        return this._level[2]
    },
    GetGenre: function() {
        var genre = this._level[3]
        if (genre != 0) {
            return genre
        }
        var web = Session.Get("web")
        if (!web || !web.base) {
            return genre
        }
        var magazine = web.base.magazine
        if (magazine > -1) {
            return 1
        }
        var paper = web.base.paper
        if (paper > -1) {
            return 2
        }
        var book = web.base.book
        if (book > -1) {
            return 3
        }
        return 0
    },
    GetCategory: function() {
        return this._level[4]
    },
    GetMid: function() {
        return this._level[5]
    },
    GetIid: function() {
        return this._level[6]
    },
    GetParam: function() {
        return this._level[7]
    },

    //设置当前参数值
    GetArgs: function(key) {
        if (!key) {
            var a = []
            for (var x in this._args) {
                s = x + "@" + this._args[x]
                a.push(s)
            }
            return a.join("/")
        }
        return this._args[key]
    },
    SetProduct: function(s) {
        this._level[0] = s
    },
    SetInstance: function(s) {
        this._level[1] = s
    },
    SetPage: function(s) {
        this._level[2] = s
    },
    SetGenre: function(i) {
        this._level[3] = 3
    },
    SetCategory: function(i) {
        this._level[4] = 4
    },
    SetMid: function(i) {
        this._level[5] = 5
    },
    SetIid: function(i) {
        this._level[6] = 6
    },
    SetParam: function(s) {
        this._level[7] = s
    },
    SetArgs: function(k, v) {
        this._args[k] = v
    },

    //分割为更小的元素
    _split: function(array, s) {
        var arr = []
        for (var i in array) {
            var a = array[i]
            if (!isNaN(a) || a.indexOf(s) < -1) {
                arr.push(a)
                continue
            }
            ar = a.split(s)
            for (var x in ar) {
                if (!ar[x]) {
                    continue
                }
                arr.push(ar[x])
            }
        }
        return arr
    },

    //转为约定的url结构的数据
    _forurl: function(array) {
        var arr = this._split(array, '/')
        var i = 0
        for (var x in arr) {
            if (arr[x].indexOf('@') > 0) {
                var a = arr[x].split('@')
                arr[x] = !a[1] ? arr[x] + this._args[a[0]] : arr[x]
                continue
            }
            if (i > 5) {
                break;
            }
            i++
            if (!!arr[x] && arr[x] != '0') {
                continue
            }
            var v = this._level[parseInt(x) + 2]
            if (!v) {
                continue
            }
            arr[x] = v
        }
        return arr
    },
    Path: function() {
        var a = Array.prototype.slice.call(arguments)
        a = this._forurl(a)
        return "/" + this._level[0] + "/" + this._level[1] + "/" + a.join("/")
    },

    Index: function() {
        var a = Array.prototype.slice.call(arguments)
        a = this._forurl(a)
        a.shift()
        return this._level[1] + "/" + a.join("/")
    }
}

/**
 * Session sessionStorage 多网站处理
 */
var SessionCache = {
    _key: function() {
        var url = new Url()
        return url.GetProduct() + "-" + url.GetInstance()
    },
    _data: function(key) {
        var s = sessionStorage.getItem(key)
        if (!s || s == 'undefult') {
            return
        }
        return JSON.parse(s)
    },
    _update: function(key, data) {
        if (!data) {
            sessionStorage.removeItem(key)
            return
        }
        if (typeof data == 'string') {
            sessionStorage.setItem(key, data)
            return
        }
        var s = JSON.stringify(data)
        sessionStorage.setItem(key, s)
    },
    Set: function(key, value) {
        var k = this._key()
        var data = this._data(k)
        if (!data) {
            data = {}
        }
        data[key] = value
        this._update(k, data)
    },
    Get: function(key) {
        var k = this._key()
        var data = this._data(k)
        if (!data) {
            return
        }
        return data[key]
    },
    Remove: function(key) {
        this.Set(key, '')
    },
    Clear: function() {
        var k = this._key()
        this._update(k, '')
    },
    Value: function(key, value) {
        if (value === undefined) {
            return JSON.parse(sessionStorage.getItem(key))
        }
        sessionStorage.setItem(key, JSON.stringify(value))
    }
}

/**
 * Local localStorage 多网站处理
 */
var LocalCache = {
    _key: function() {
        var url = new Url()
        return url.GetProduct() + "-" + url.GetInstance()
    },
    _data: function(key) {
        var s = localStorage.getItem(key)
        if (!s || s == 'undefult') {
            return
        }
        return JSON.parse(s)
    },
    _update: function(key, data) {
        if (!data) {
            localStorage.removeItem(key)
            return
        }
        if (typeof data == 'string') {
            localStorage.setItem(key, data)
            return
        }
        var s = JSON.stringify(data)
        localStorage.setItem(key, s)
    },
    Set: function(key, value) {
        var k = this._key()
        var data = this._data(k)
        if (!data) {
            data = {}
        }
        data[key] = value
        this._update(k, data)
    },
    Get: function(key) {
        var k = this._key()
        var data = this._data(k)
        if (!data) {
            return
        }
        return data[key]
    },
    Remove: function(key) {
        this.Set(key, '')
    },
    Clear: function() {
        var k = this._key()
        this._update(k, '')
    },
    Value: function(key, value) {
        if (value === undefined) {
            return JSON.parse(localStorage.getItem(key))
        }
        localStorage.setItem(key, JSON.stringify(value))
    }
}

/**
 * 类型：js输出html
 * 1. Html类，将html标签类化，方便js输出html
 * 2. Html*.用来绑定数据输出Html组件
 * _tag, 标签名
 * _attr, 属性
 * _class, 类别
 * _content, 内容
 */
var Html = function() {
    //实例属性
    var _tag = "div"
    var _attr = {}
    var _class = []
    var _content = null

    //构造函数，可去掉该闭包
    ;
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        if (a.length == 0) {
            return
        }
        self.SetTag(a.shift())
            //内容
        if (a.length == 0) {
            return
        }
        self.AddContent(a.shift())
            //属性
        if (a.length == 0) {
            return
        }
        self.SetAttr(a)
    })(this, arguments)
}

/**
 * 原型方法
 * @type {{SetTag: Html.SetTag, AddAttr: Html.AddAttr, SetAttr: Html.SetAttr, AddClass: Html.AddClass, SetClass: Html.SetClass, AddContent: Html.AddContent, SetContent: Html.SetContent, forContent: Html.forContent, String: Html.String}}
 */
Html.prototype = {
    /**
     * 设置标签名
     * @param name， 标签名称
     * @returns {Html}
     * @Jiang youhua
     */
    SetTag: function(name) {
        if (!name) {
            console.log("Html SetTag name is null")
            return this
        }
        if (typeof name != 'string') {
            console.log("Html SetTag name is not String")
            return this
        }
        this._tag = name
        return this
    },

    /**
     * 添加属性，接收键值对与非键值对
     * @param key
     * @param value
     * @returns {Html}
     * @Jiang youhua
     */
    AddAttr: function(key, value) {
        if (!key) {
            console.log("Html AddAttr key is null")
            return this
        }
        if (typeof key != 'string') {
            console.log("Html AddAttr key is not String")
            return this
        }
        key = $.trim(key)

        //如果是类别
        if (key == 'class' || key == '_class') {
            this.AddClass(value)
            return this
        }

        //初始属性
        if (!this._attr) {
            this._attr = {}
        }
        //value为空
        if (!value && value != 0) {
            this._attr[key] = ''
            return this
        }
        if (typeof value == "string") {
            this._attr[key] = $.trim(value)
            return this
        }
        this._attr[key] = value.toString()
        return this
    },

    /**
     * 初化并设置属性，接收键值对与非键值对
     * @param args
     * @param init
     * @returns {Html}
     * @Jiang youhua
     */
    SetAttr: function(args, init) {
        //无参数
        if (init) {
            this._attr = {}
        }
        if (!args) {
            return this
        }

        //纯属数字
        if (!isNaN(args)) {
            console.log('Html SetAttr args is number')
            return this
        }

        //{key:vlaue}
        if (typeof args == 'object' && !(args instanceof Array)) {
            for (var x in args) {
                var obj = args[x]
                if (typeof obj != 'string') {
                    obj = obj.toString()
                }
                this._attr[x] = obj
            }
            return this
        }

        //"key=value key1=value1"字符串
        if (typeof args == 'string') {
            args = args.split(" ")
        }

        //处理数组
        for (var x in args) {
            var obj = args[x]
            if (!obj) {
                continue;
            }

            //字符串
            if (typeof obj == "string") {
                var m = obj.split("=")
                var n = obj.split(" ")
                if (m.length > 2 && n.length > 1) {
                    this.SetAttr(n)
                    continue
                }
                var k = m.shift()
                this.AddAttr(k, m.join("="))
                continue
            }
            //对象
            if (typeof obj == "object") {
                if (obj instanceof Array) {
                    this.SetAttr(obj)
                    continue
                }
                for (var i in obj) {
                    this.AddAttr(i, obj[i])
                }
            }
        }
        return this
    },

    /**
     * 添加类型
     * @param value，类型名
     * @returns {Html}
     * @Jiang youhua
     */
    AddClass: function(value) {
        if (!value) {
            console.log('Html AddClass Value is null')
            return this
        }
        //初始化
        if (!this._class) {
            this._class = []
        }
        //转字符串
        if (typeof value != 'string') {
            value = value.toString()
        }
        //判断是否存在
        for (var x in this._class) {
            if (this._class[x] == value) {
                return this
            }
        }
        this._class.push(value)
        return this
    },

    /**
     * 初始化并设置类型
     * @param args，接收字符串与数组
     * @returns {Html}
     * @Jiang youhua
     */
    SetClass: function(args) {
        //空值
        this._class = []
        if (!args) {
            return this
        }
        //不能是对象
        if (typeof args == 'object' && !(args instanceof Array)) {
            console.log('Html SetClass args is illegal')
            return this
        }

        if (typeof args == 'string') {
            args = args.split(" ")
        }
        for (var x in args) {
            this.AddClass(args[x])
        }
        return this
    },

    GetClass: function() {
        return this._class
    },

    /**
     * 添加内容
     * @param content，内容，支持所有对象
     * @returns {Html}
     * @Jiang youhua
     */
    AddContent: function(content) {
        //空值
        if (!content) {
            // console.log("Html AddContent is null")
            return this
        }
        if (this == content) {
            // console.log("Html AddContent is self")
            return this
        }
        //初始化
        if (!this._content) {
            this._content = []
        }
        this._content.push(content)
        return this
    },

    /**
     * 初始化并设置内容
     * @param contents，内容，支持所有对象
     * @returns {Html}
     * @Jiang youhua
     */
    SetContent: function(contents) {
        this._content = []
        if (!contents) {
            return this
        }
        if (typeof contents == 'object' && contents instanceof Array) {
            this._content = contents
            return this
        }
        this._content[0] = contents
        return this
    },

    /**
     * 格式化内容为字符串
     * @param contents，内容
     * @returns {*}
     */
    forContent: function(contents) {
        //非对象，转字符串返回
        if (!contents && contents != 0) {
            return ''
        }
        if (typeof contents != 'object') {
            return contents.toString()
        }
        //html对象，转字符串返回
        if (contents instanceof Html) {
            return contents.String()
        }
        //对象，遍历递归调用
        s = ''
        for (var x in contents) {
            s += this.forContent(contents[x])
        }
        return s
    },

    /**
     * 本实例输出为HTML字符串
     * @returns {string}
     * @Jiang youhua
     */
    String: function() {
        //处理标签
        if (!this._tag) {
            this._tag = "div"
        }
        //处理类别
        var c = ''
        if (!!this._class) {
            c = 'class="' + this._class.join(" ") + '"'
        }
        //处理属性
        var a = ''
        for (var x in this._attr) {
            if (!this._attr[x]) {
                a = a + " " + x //单词属性
            } else {
                if (x == "_class" || x == "_Class") {
                    x == "class"
                }
                a = a + ' ' + x + '="' + this._attr[x] + '"'; //key=value
            }
        }

        //非内容部分(ie8)
        c = $.trim(c)
        a = $.trim(a)
        var h = "<" + this._tag + " " + c + " " + a
        switch (this._tag) {
            case "img":
            case "input":
            case "br":
            case "hr":
                return h + "/>"
        }
        var s = this.forContent(this._content)
        return h + ">" + s + "</" + this._tag + ">"
    }
}


/**
 * 组件类，为所有组件的父类
 * 1. 抽象类
 * 2. 所有组件均要继承该类
 * _data, [{},]或{}组件数据，支持通过Ajax获取数据
 * _config，[{},]或{}组件数据，不支持通过Ajax获取数据
 * _operate，{"key":"selector,args..."}, 操作，对内容操作传入参数：selector，选择器
 * _id，全局id
 * _html, 组件转为html对象
 * @Jiang youhua
 */
var Part = function() {
    this._config = {} //配置
    this._operate = {} //操作
    this._id = '' //随机id
    this._html
}

Part.prototype = {

    /**
     * 接收任意参数并接顺序赋予_data, _config, _operate, _attr, _class
     * @Jiang youhua
     */
    Set: function() {
        var a = Array.prototype.slice.call(arguments)
        this.SetArgs(a)
    },

    /**
     * 接收数组参数并顺序赋予_data, _config, _operate, _attr, _class
     * @param a， 数组
     * @returns {Part}
     * @Jiang youhua
     */
    SetArgs: function(a) {
        this._html = new Html()
        if (a.length == 0) {
            return this
        }
        this.SetData(a.shift())
        if (a.length == 0) {
            return this
        }
        this.SetConfig(a.shift())
        if (a.length == 0) {
            return this
        }
        this.SetOperate(a.shift())
        if (a.length == 0) {
            return this
        }
        this.SetAttr(a.shift())
        if (a.length == 0) {
            return this
        }
        this.SetClass(a)
    },

    /**
     * 设置数据
     * @param data， 数据
     * @returns {Part}
     * @Jiang youhua
     */
    SetData: function(data) {
        if (typeof(data) == "string") {
            try {
                data = eval(data)
            } catch (e) {
                this._data = data
                return this
            }
        }
        if (typeof(data) != "object") {
            return this
        }
        this._data = data
        return this
    },

    /**
     * 设置配置参数
     * @param config， 参数
     * @returns {Part}
     * @Jiang youhua
     */
    SetConfig: function(config) {
        if (typeof(config) == "string") {
            try {
                config = eval(config)
            } catch (e) {
                return this
            }
        }
        if (typeof(config) != "object") {
            return this
        }
        this._config = config
        return this
    },

    /**
     * 设置操作参数
     * @param operate， 参数
     * @returns {Part}
     * @Jiang youhua
     */
    SetOperate: function(operate) {
        if (!operate) {
            return this
        }
        if (typeof(operate) == "string") {
            try {
                operate = JSON.parse(operate)
            } catch (e) {
                console.log(e)
                return this
            }
        }
        if (typeof(operate) != "object") {
            return this
        }
        this._operate = operate
        return this
    },

    /**
     * 添加属性
     * @param key，键
     * @param value， 值
     * @Jiang youhua
     */
    AddAttr: function(key, value) {
        if (key == "_class") {
            key = "class"
        }
        this._html.AddAttr(key, value)
        return this
    },

    /**
     * 设置属性
     * @param a，数组
     * @Jiang youhua
     */
    SetAttr: function(a) {
        this._html.SetAttr(a)
        return this
    },

    GetAttr: function(key) {
        if (!this._html._attr || !this._html._attr[key]) {
            return
        }
        var v = this._html._attr[key];
        if (!v) {
            return
        }
        delete this._html._attr[key]
        return v
    },

    /**
     * 添加类别
     * @param value，类别
     * @Jiang youhua
     */
    AddClass: function(value) {
        this._html.AddClass(value)
        return this
    },

    /**
     * 设置类别
     * @param value
     * @Jiang youhua
     */
    SetClass: function(value) {
        this._html.SetClass(value)
        return this
    },

    SetId: function(value) {
        if (typeof value == 'string' || !isNaN(value)) {
            this._id = value
        }
        return this
    },

    /**
     * 输出html对象
     * @returns {*}
     * @Jiang youhua
     */
    Html: function() {
        return this._html()
    },

    /**
     * 格式化操作
     * html 绑定的元素
     * data, 接收的数据
     */
    Operate: function(obj, func) {
        if (!func) {
            return
        }
        // 判断条件是否合适
        console.log(obj)
        args = this._operate[func]
        if (!args) {
            return "e." + func + "(this)"
        }
        var a = args.split(',')
        if (!a || !a.length) {
            return "e." + func + "(this)"
        }
        var arr = []
        for (var x in a) {
            var v = !obj ? a[x] : obj[a[x]]
            if (!v) {
                continue
            }
            arr.push(v)
        }
        s = arr.join("','")
        return "e." + func + "(this,'" + s + "')"
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * 组件
 * data, 显示数据，[{id:int, title:string, text:string, file:string}]
 * @Jiang youhua
 */
var PartAd = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartAd.prototype = new Part()
PartAd.prototype.Html = function() {
    console.log(this._data)
    if (!this._data) {
        console.log("PartAd Data is err")
        return new Html()
    }

    var nav = new Html("p")
    var step = !!this._config && !!this._config.step ? this._config.step : 4000
    var len = this._data.length
    var id = this._id
    for (var x in this._data) {
        var obj = this._data[x]
        if (!x && !obj.file) {
            continue
        }
        var ext = !!obj.file ? obj.file.split('.').pop() : ""
        if (ext != "jpg" && ext != "png") {
            continue
        }
        var img = new Html("img", "", "src=" + obj.file)
        var a = new Html("a", img)
        if (!!obj.html) {
            a.AddAttr('href', obj.html)
        } else if (!!obj.text && !obj.html) {
            var url = new Url()
            a.AddAttr('href', url.Path("article/4/0/0/" + obj.issueId))
        }
        var div = new Html("div", a, "class=ad-page", "id=" + id + "-ad-" + x)
        var but = new Html("button", "", "class=ad-nav", "id=" + id + "-ad-nav-" + x)
        var active = "active"
        if (!!x && x != "0") {
            div.AddAttr("style", "display:none")
            active = "0"
        }
        but.AddClass(active)
        if (len > 1) {
            nav.AddContent(but)
        }
        but.AddAttr("onclick", "e.Rotation(" + len + ", '" + id + "' ," + step + "," + x + ")")
        this._html.AddContent(div)
        if (!!obj.title) {
            var title = new Html("p", obj.title)
            div.AddContent(title)
        }
        if (!!obj.text) {
            var text = new Html("div", obj.text)
            div.AddContent(text)
        }
    }

    setTimeout("e.Rotation(" + len + ", '" + id + "', " + step + ", 1)", step);
    this._html.AddContent(nav)
    return this._html
}


/**
 * 菜单，导航条组件
 * data, 显示数据，{id:int, title:string, text:string, file:string}
 * @Jiang youhua
 */
var PartArticle = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartArticle.prototype = new Part()
PartArticle.prototype.Html = function() {
    if (!this._data) {
        console.log("PartBoot Data is err")
        return new Html()
    }


    //菜单
    var obj = this._data
    console.log(obj)

    //标题
    if (!!obj.title) {
        var h = new Html('h1', obj.title)
        var div = new Html('div', h)
        this._html.AddContent(div)
    }

    //文件
    if (!!obj.file || obj != "") {
        var div = new Html('div')
        var f = !!obj.file ? obj.file.split(',') : [];
        if (f.length > 0) {
            for (var x in f) {
                console.log(f[x])
                var d = new Html("div")
                div.AddContent(d)
                var href = f[x]
                var arr = href.split("@")
                var name = arr.length > 1 ? arr[0] : ""
                var value = arr.length > 1 ? arr[1] : arr[0]
                var a = value.split(".")
                var ext = a.pop()
                if (ext == 'mp4') {
                    var source = new Html('source', '', 'type=video/mp4', 'src=' + value);
                    var video = new Html('video', source, 'controls=""', 'width=480', 'height=320', 'autoplay=""');
                    d.AddContent(video)
                    continue
                }
                if (ext == 'mp3') {
                    var source = new Html('source', '', 'type=video/mp4', 'source=' + value)
                    var audio = new Html('audio', source, 'controls=controls')
                    d.AddContent(audio)
                    continue
                }
                if (ext == 'jpg' || ext == 'png' || ext == 'gif') {
                    var img = new Html('img', '', 'src=' + value)
                    d.AddContent(img)
                    continue
                }
                d.AddContent(new Html("p", name))
            }
        }
        this._html.AddContent(div)
    }

    //内容
    if (!!obj.text) {
        var div = new Html('div', obj.text, "id=text-body")
        this._html.AddContent(div)
    }
    return this._html
}

/**
 * 菜单，导航条组件
 * data, 显示数据，[{href:string, name:[text, size], img:[src, w, h], position:[x, y]},...]
 * @Jiang youhua
 */
var PartBootstrap = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartBootstrap.prototype = new Part()
PartBootstrap.prototype.Html = function() {
    if (!this._data) {
        console.log("PartBoot Data is err")
        return new Html()
    }
    //菜单
    for (var x in this._data) {
        var obj = this._data[x]
        var a = new Html('a')
            //图片处理
        if (!!obj.img) {
            var html = new Html('img', "", 'src=' + obj.img)
            if (!!obj.size) {
                var s = obj.size.split('*')
                var width = !s[0] ? 64 : s[0]
                var heigth = !s[1] ? 64 : s[1]
                html.AddAttr("style", "width:" + width + "; heigth:" + heigth)
            }
            a.AddContent(html)
            delete(obj, 'img')
        }
        //文字处理
        if (!!obj.name) {
            var html = new Html('span', obj.name)
            a.AddContent(html)
            delete(obj, 'name')
        }

        //位置处理
        if (!!obj.position) {
            var p = obj.position.split('*')
            var left = !p[0] ? 100 : p[0]
            var top = !p[1] ? 100 : p[1]
            a.AddAttr('style', 'left:' + left + '; top:' + top)
            delete(obj, 'position')
        }

        for (n in obj) {
            var val = obj[n]
            if (!val) {
                continue
            }
            a.AddAttr(n, val)
        }

        this._html.AddContent(a)
    }
    return this._html
}


/**
 * data =[{key:value,sub:{key:vlaue}}]
 * zhangsi List
 * @constructor
 */
var PartCatalog = function() {
    this._index = 0
    this._level = []; //保存最新层级
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}

PartCatalog.prototype = new Part()
PartCatalog.prototype.Html = function() {
    if (!this._data) {
        console.log("PartList Data is err")
        return new Html('')
    }
    this._level[0] = {}
    this._level[0].li = this._html
    this.Recursion(this._data, 1)
    return this._html
}

PartCatalog.prototype.Recursion = function(data, level) {
    if (!data || data.length == 0) {
        return
    }
    this._level[level] = {}
    this._level[level].ul = new Html('ul') //当前层组
    this._level[level - 1].li.AddContent(this._level[level].ul) //添加至上一级

    for (var x in data) {
        var obj = data[x]
        if (x == data.length) {
            return
        }
        if (this._index % 20 == 0 && this._index > 0) {
            this._level[level].ul = new Html('ul')
            for (var n = level - 1; n > 0; n--) {
                this._level[n] = {}
                this._level[n].li = new Html("li", this._level[n + 1].ul)
                this._level[n].ul = new Html("ul", this._level[n].li)
            }
            this._level[0].li.AddContent(this._level[1].ul)
        }
        this._index++
            var a = new Html('a', obj.name)
        var page = !obj.page ? '' : obj.page
        var id = !obj.id ? '' : obj.id
        a.AddAttr("onclick", "e.reader('" + page + "','" + id + "')")
        a.AddAttr("id", "catalog_" + this._index)
        this._level[level].li = new Html('li', a)
        this._level[level].ul.AddContent(this._level[level].li)
        this.Recursion(obj.sublevels, level + 1)
    }
}

/**
 * 时间组件
 * @Jiang Youhau
 */
var PartDate = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartDate.prototype = new Part()
PartDate.prototype.Html = function() {
    this._html.AddClass("datetime")
    var t = setInterval(function() {
        var time = new Date()
            // zhangsi
        $('.datetime').html(time.getFullYear() + " / " + (time.getMonth() + 1) + " / " + time.getDate() + "&nbsp;" + time.toLocaleTimeString())
    }, 1000)
    return this._html
}


/**
 * 资源详情页组件
 * data, 显示数据，{base:{id, name}, imagas:[src],info:[{name:, value:},], source:[{name:, value:,},], items;[{name:, value:,}]}
 * @Jiang youhua
 */
var PartDetail = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartDetail.prototype = new Part()
PartDetail.prototype.Html = function() {
    if (!this._data) {
        return
    }
    //只显示一个期册的内容
    var data = this._data
    if (this._data instanceof Array) {
        data = this._data[0]
    }


    //显示预览图
    var images = new Html('div', '', 'class=detail-images')
        //显示名称
    this._html.AddContent(images)
    for (var x in data.images) {
        var obj = data.images[x]
        var img = new Html('img', '', 'src=' + obj.src)
        images.AddContent(img)
    }

    var name = new Html('h3', data.base.name)
    var title = new Html("div", name, "class=detail-title")
    this._html.AddContent(title)
    if (!!data.base.issueName) {
        title.AddContent(new Html("h4", data.base.issueName))
    }
    // 武大显示简介
    var url = new Url()
    if (url.GetInstance() == "whu") {
        var intro = new Html("span", "简介：" + data.base.text, "class=detail-intro")
        this._html.AddContent(intro)
    }


    //显示信息
    var info = new Html('div', '', 'class=detail-info')

    this._html.AddContent(info)
    for (var x in data.info) {
        var obj = data.info[x]
        var name = new Html('span', obj.name + ":", "class=detail-info-name")
        var value = new Html('span', obj.value, 'class=detail-info-value')
        var a = new Html("a", "")
        var p = new Html('p', name, 'class=detail-' + obj.tag)
        p.AddContent(value)
        p.AddContent(a)
        info.AddContent(p)
    }

    //购买或加入购物车
    var operate = new Html('div', '', 'class=operate')
    this._html.AddContent(operate)
    var o = { 'BuyItem': '直接购买', 'AddCart': '加入购物车' }
    if (!!this._operate && !data.free) {
        for (var x in this._operate) {
            var but = new Html("button", o[x], 'class=detail-' + x, 'onclick=' + this.Operate(data.base, x))
            operate.AddContent(but)
        }
    }
    if (data.free == 2) {
        var p = new Html("已购买")
        operate.AddContent(p)
    }

    //阅读样式
    var source = new Html('div', '', 'class=detail-source')
    this._html.AddContent(source)
    for (var x in data.source) {
        var obj = data.source[x]
        if (!obj.value) {
            continue
        }
        var but = new Html("button", obj.name, 'onclick=e.' + obj.func + '(' + data.base.genre + ',' + data.base.iid + ',' + obj.value + ')')
        source.AddContent(but)
    }
    if (data.base.genre != 3) {
        var issue = new Html('button', '往期', 'class=issue', 'onclick=e.issues(); return false;')
        source.AddContent(issue)
    }


    return this._html
}

/**
 * 数据表单编辑器组件, 不支持多选
 * data =[
 * {id:int, name:stirng, value:string, form:string, type:string},...
 * ]
 * //name表单项数据名称， value:对应的值， form,表单项名（input, textarea）
 */
var PartForm = function() {
        Part.apply(this, arguments);
        (function(self, args) {
            var a = Array.prototype.slice.call(args)
            self.SetArgs(a)
        })(this, arguments)
    }
    //继承Part的prototype属性与方法
PartForm.prototype = new Part()
PartForm.prototype.Html = function() {
    if (!this._data) {
        return new Html()
    }
    //操作
    if (!!this._operater || this._operater.length > 0) {
        var p = new Html('p')
        this._html.AddContent(p)
        if (this._operater.submit) {
            var but = new Html("button", "", this.Operater(this._operater.submit))
            p.AddContent(but)
        }
        if (this._operater.cencal) {
            var but = new Html("button", "", this.Operater(this._operater.cencal))
            p.AddContent(but)
        }
    }

    for (var x in this._data) {
        var obj = this._data[x]
        var div = new Html('div', '', 'class=input-group-addon')
        this._html.AddContent(div)
        if (!!obj.name) {
            var span = new Html("span", obj.name, 'class=input-group-addon')
            delete(obj.name)
            div, AddContent(span)
        }
        form = !obj.from ? "input" : obj.form
        var f = new Html(form)
        f.AddClass("form-control")
        if (form == "button") {
            f.AddClass(obj.value)
            delete(obj.value)
        }
        delete(obj.name)
        for (var i in obj) {
            if (i != "operate") {
                f.AddAttr(i, obj[i])
                continue
            }
            for (var n in obj[i]) {
                var o = obj[i][x]
                var option = new Html("option", o, 'value=' + n)
                f.AddContent(option)
            }
        }
    }
    return this._thml
}


/**
 * data =[{key:value,sub:{key:vlaue}}]
 * zhangsi List
 * @constructor
 */
var PartList = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}

PartList.prototype = new Part()
PartList.prototype.Html = function() {
    if (!this._data) {
        console.log("PartList Data is err")
        return new Html('')
    }
    this._html.AddContent(this.Recursion(this._data))
    return this._html
}

PartList.prototype.Recursion = function(data) {
    if (!data) {
        return
    }
    var ul = new Html('ul')
    for (var x in data) {
        var obj = data[x];
        if (!obj) {
            continue;
        }
        var a = new Html('a', obj.name)
        for (var i in obj) {
            if (i == 'name' || i == 'sublevels') {
                continue
            }
            a.AddAttr(i, obj[i])
        }
        var li = new Html('li', a)
        li.AddContent(this.Recursion(obj.sublevels))
        ul.AddContent(li)
    }
    return ul
}

/**
 * 实例名称标签，标志以默认方式提供
 * data, 显示数据，{id, img:string, title:string}
 * @Jiang Youhau
 */
var PartLog = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartLog.prototype = new Part()
PartLog.prototype.Html = function() {
    if (!this._data) {
        console.log("PartLog Data is err")
        return new Html()
    }

    var id = this._data.id
    var title = this._data.title
    var img = this._data.img
    if (!title && !img) {
        console.log("PartLog Data's title, name is nil")
        return new Html()
    }

    //图片
    if (!!img) {
        var html = new Html('img', "", "style=display:none", "onload=$(this).show()", "onclick=e.goto('index.html')")
        html.AddAttr('src', img + ".png")
        this._html.AddContent(html)
    }

    //文字
    // if (!!title) {
    //     var url = new Url()
    //     if (url.GetProduct() == 'touch' && url.GetInstance() == 'whu') {
    //         this._html.AddContent(title)
    //     }
    // }
    this._html.SetTag('a')
    this._html.AddAttr('href', '#')
    return this._html
}


/**
 * 登录
 */
var PartLogin = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartLogin.prototype = new Part()
PartLogin.prototype.Html = function() {
    var web = Session.Get('web')
    var data = { name: "账号", password: "密码" }
    var b = 0
    var wx = ''
    var url = new Url()
    if ((web && !!web.base && !!web.base.type && web.base.type == 1) || (url.GetInstance() == "magazine")) {
        data = { name: "手机号", password: "验证码或密码" }
        b = 1
    } else {
        if (url.GetProduct() == "wei" && url.GetPage() == "index" && e.parseSearchParam(window.location.href).login == "1") {
            //     // Do nothing now.
        } else {
            wx = this.wxCode()
        }
    }

    var s1 = "class=control-label"
    var s2 = "form-group"
    if (url.GetProduct() == "wei" && url.GetInstance() != "magazine") {
        s1 = "class=input-group-addon"
        s2 = "class=input-group"
    }

    var label = new Html("label", data.name, s1)
    var input = new Html("input", "", "type=text", "class=form-control")
    input.AddAttr("name", "username")
    var div = new Html('div', label, s2)
    div.AddContent(input)
    this._html.AddContent(div)


    var label = new Html("label", data.password, s1)
    if (b) {
        var code = new Html('button', '获取验证码', "class=login-code", "type=button", "onclick=e.LoginCode()")
        code.AddClass("btn btn-info btn-xs")
        label.AddContent("&nbsp;")
        label.AddContent(code)
    }
    var input = new Html("input", "", "type=password", "class=form-control")
    input.AddAttr("name", "password")
    var div = new Html('div', label, s2)
    div.AddContent(input)
    this._html.AddContent(div)

    var s = new Html("button", '确定', "type=button", "class=login-submit", "onclick=e.LoginSubmit()")
    s.AddClass('btn btn-warning')
    var c = new Html("button", '取消', "type=button", "class=login-cancel", "onclick=e.LoginCancel()")
    c.AddClass('btn btn-default')
    var div = new Html('div', s)
    div.AddContent(c)
    div.AddClass('ensure')
    this._html.AddContent(div)
    if (!!wx) {
        this._html.AddContent(wx)
    }

    if (url.GetProduct() == "wei") {
        if (url.GetPage() == "index" && e.parseSearchParam(window.location.href).login == "1") {
            this._html.AddAttr("style", "background-color: #fff;font-size: 1.2rem;border: #ddd 1px solid;width: 75%;height: 23%;overflow: auto;margin: auto;padding: 1rem;position: absolute;top: 0; left: 0; bottom: 0; right: 0;");
        } else {
            this._html.AddAttr("style", "background-color: #fff;font-size: 1.2rem;border: #ddd 1px solid;width: 75%;height: 63%;overflow: auto;margin: auto;padding: 1rem;position: absolute;top: 0; left: 0; bottom: 0; right: 0;");
        }
    }

    return this._html
}


// 微刊登录
var PartWLogin = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartWLogin.prototype = new Part()
PartWLogin.prototype.Html = function() {
    var wx = ''
    var url = new Url()
    if (url.GetProduct() == "wei" && url.GetPage() == "index" && e.parseSearchParam(window.location.href).login == "1") {
        // Do nothing now.
    } else {
        wx = this.wxCode()
    }
    var span = new Html('span', 'X', 'class=close', "onclick=e.LoginCancel()");
    this._html.AddContent(span)
    var input = new Html("input", "", "type=text", 'placeholder=请输入账号', "class=form-control username", "onfocus=this.placeholder='' onblur=this.placeholder='请输入账号'");
    input.AddAttr("name", "username")
    var div = new Html('div', '', 'class=form-group')
    div.AddContent(input)
    this._html.AddContent(div)

    var input = new Html("input", "", "type=password", 'placeholder=请输入密码', "class=form-control password", "onfocus=this.placeholder='' onblur=this.placeholder='请输入密码'")
    input.AddAttr("name", "password")
    var div = new Html('div', '', 'class=form-group')
    div.AddContent(input)
    this._html.AddContent(div)

    var btn = new Html('button', '登录', 'class=btn', "onclick=e.LoginSubmit()");
    btn.AddAttr("type", "submit")
    this._html.AddContent(btn)
    this._html.AddClass('wl')
    if (!!wx) {
        this._html.AddContent(wx)
    }
    if (url.GetPage() == "index" && e.parseSearchParam(window.location.href).login == "1") {
        this._html.AddAttr("style", "width: 85%;background-color: #BEBEBE;overflow: auto;margin: auto;padding: 1rem;position: absolute;top:25%; left:8%;padding:12% 0 5% 7%");
    } else {
        this._html.AddAttr("style", "width: 85%;background-color: #BEBEBE;overflow: auto;margin: auto;padding: 1rem;position: absolute; top:3%; right:8%;padding:12% 0 0 7%");
    }
    this._html.AddAttr("touchstart", "e.returned(event)")
    this._html.AddContent(new Html("p", "&nbsp;"))
    return this._html
}


// 获取微信息二维码内容
PartLogin.prototype.wxCode = function() {
    var wx = Session.Get("wx")
    if (!wx || wx.name == "") {
        return;
    }
    var p = new Html("p", "<br><span style='color:#f00'>友情提示</span>获取账号和密码的方法")
    var div = new Html("div", p)
    wx.msg = !wx.msg ? "申请账号密码" : wx.msg
    var p = new Html("p", "1. 关注微信公众号：<span style='color:#f00'>" + wx.name + "</span><br>2. 输入关键词：<span style='color:#f00'>" + wx.msg + "</span>", "style=text-align:left")
    div.AddContent(p)
    var img = new Html("img", "", "src=" + wx.qrcode)
    var d = new Html("div", img, "style=text-align:center")
    var p = new Html("p", "长按识别二维码关注")
    d.AddContent(p)
    div.AddContent(d)

    return div
}


// 微刊登录
PartWLogin.prototype.wxCode = function() {
    var wx = Session.Get("wx")
    if (!wx || wx.name == "") {
        return;
    }
    var p = new Html("p", "<br><span style='color:#f00'>友情提示</span>获取账号和密码的方法")
    var div = new Html("div", p)
    wx.msg = !wx.msg ? "申请账号密码" : wx.msg
    var p = new Html("p", "1. 关注微信公众号：<span style='color:#f00'>" + wx.name + "</span><br>2. 输入关键词: <span style='color:#f00'>" + wx.msg + "</span>", "style=text-align:left")
    div.AddContent(p)
    var img = new Html("img", "", "src=" + wx.qrcode)
    var d = new Html("div", img, "style=text-align:center")
    var p = new Html("p", "长按识别二维码关注")
    d.AddContent(p)
    div.AddContent(d)

    return div
}


/**
 * 菜单，导航条组件
 * data, 显示数据，{id:int, href:string, name:string, img:string}
 * config, 格式化数据, {id:data.id_key, href:data.href_key, name:data.name_key, name:data.img_key}
 * @Zhang si
 */
var PartLoginBK = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartLoginBK.prototype = new Part()
PartLoginBK.prototype.Html = function() {
    if (!this._data) {
        console.log("PartLoginBK Data is err")
        return new Html()
    }
    var h3 = new Html("h3", "博看会员")

    var errorMsg = new Html('div', '', 'class=login-msg-error')
    var errorMsgP = new Html('p', '', 'class=login-msg-error-text')
    errorMsg.AddContent(errorMsgP)

    var form = new Html('form', h3, 'class=form-horizontal')

    form.AddContent(errorMsg)

    for (var x in this._data) {
        var obj = this._data[x]
        var label = new Html("label", obj.title, "class=control-label")
        var input = new Html("input", "", "class=form-control", "placeholder=" + obj.placeholder)
        input.AddAttr("type", obj.name == "password" ? "password" : "text")
        var div = new Html("div", label, "class=form-group")
        div.AddContent(input)
        form.AddContent(div)
    }
    var divL = new Html("div")

    var btnCode = new Html('button', "获取验证码")
    btnCode.AddClass("btn btn-default")
    btnCode.AddAttr("id", "login-btn-code")
    divL.AddContent(btnCode)
    var btnLogin = new Html('button', "登录")
    btnLogin.AddClass("btn btn-default")
    btnLogin.AddAttr("id", "login-btn-login")
    divL.AddContent(btnLogin)

    var div = new Html("div", form, 'class=form')
    div.AddContent(divL)
    this._html.AddContent(div)
    return this._html
}


/**
 * 菜单，导航条组件
 * data, 显示数据，{id:int, href:string, name:string, img:string}
 * config, 格式化数据, {id:data.id_key, href:data.href_key, name:data.name_key, name:data.img_key}
 * @Jiang Youhau
 */
var PartLogo = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartLogo.prototype = new Part()
PartLogo.prototype.Html = function() {
    if (!this._data) {
        console.log("PartLogo Data is err")
        return new Html()
    }

    //标志   修改  zhangsi
    var a = new Html('a')
    a.AddClass("navbar-brand")
    var img = this._data.img
    if (!!img) {
        var img = new Html('img')
        img.AddAttr('src', img)
        a.AddContent(img)
        delete this._data.img
    }
    var name = this._data.name
    if (!!name) {
        a.AddContent(name)
        this._data.name
    }
    for (n in this._data) {
        var value = this._data[n]
        a.AddAttr(n, value)
    }
    this._html.AddContent(a)
    this._html.AddClass('navbar-header')
    return this._html
}


/**
 * 菜单，导航条组件
 * data, 显示数据，[{id:int, href:string, name:string, img:string},]
 * @Jiang youhua
 */
var PartMenu = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartMenu.prototype = new Part()
PartMenu.prototype.Html = function() {
    if (!this._data) {
        console.log("PartMenu Data is err")
        return new Html()
    }

    //菜单
    for (var x in this._data) {
        var obj = this._data[x]
        var a = new Html('a')

        //图片
        if (!!obj.img) {
            var img = new Html("img")
            img.AddAttr('src', obj.img)
                // delete obj.img
        }

        // 名称
        if (!!obj.name) {
            a.AddContent(obj.name)
                // delete obj.name
        }

        var c = ""
        for (var n in obj) {
            if (n == 'class' || n == "_class") {
                c = obj[n]
                continue
            }
            var value = obj[n]
            if (!value) {
                continue
            }
            a.AddAttr(n, value)
        }
        var li = new Html("li", a)
            //li.AddAttr("style", "width:" + (Web.w / (this._data.length)) + "px")
        if (!!c) {
            li.AddClass(c)
        }
        this._html.AddContent(li)
    }
    this._html.SetTag('ul')
    return this._html
}


/**
 * zhangsi  Nav
 * 导航菜单
 * @constructor
 * data:[{name:string,href:string,}]
 * [{"name":"首页","href":"index.html"},{"name":"杂志","href":"magazine.html"},{"name":"杂志","href":"book.html"}]
 */
var PartNavction = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartNavction.prototype = new Part()
PartNavction.prototype.Html = function() {
    if (!this._data) {
        console.log("PartNavction Data is err")
        return new Html('')
    }
    var ul = new Html('ul')
    var url = new Url();
    for (var x in this._data) {
        var obj = this._data[x]
        var a = new Html('a', obj.name, 'href=' + obj.href)
        if (url.GetProduct() == 'publish') {
            a.AddAttr('target', '_blank');
            a.AddAttr('onclick', 'return false;');
        }

        this.Operate(a, this._operate, obj)
        var li = new Html('li', a, "style=" + "float: left; width:" + 100 / this._data.length + "%; line-height: 120%;");
        if (!x || x == "0") {
            li.AddClass("active")
        }
        ul.AddContent(li)
    }
    var div = new Html('div', ul, 'id=nav-items')
    var div = new Html('div', div, 'id=nav')
    var div = new Html('div', div)
    div.SetAttr('style', 'width:100%;background-color:#F16B08;')
    this._html.AddContent(div)
    var input = new Html('input', '', 'type=hidden', "value=0")

    input.AddAttr('name', this.GetAttr('name'))
    delete(this._html._attr['name'])
    this._html.AddContent(input)

    return this._html
}

/**
 * data =[{key:value,sub:{key:vlaue}}]
 * zhangsi List
 * @constructor
 */
var PartOrder = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}

PartOrder.prototype = new Part()
PartOrder.prototype.Html = function() {
    if (!this._data) {
        console.log("PartOrder Data is err")
        return new Html('')
    }
    // 表头
    var th = new Html('th', "编号")
    var tr = new Html('tr', th)
    this._html.AddContent(tr)
    var th = new Html('th', "商品")
    tr.AddContent(th)
    var th = new Html('th', "时间")
    tr.AddContent(th)
    var th = new Html('th', "订单号")
    tr.AddContent(th)
    var th = new Html('th', "总金额（元）")
    tr.AddContent(th)
    var th = new Html('th', "全部状态")
    tr.AddContent(th)
    for (x in this._data) {
        // 头部分
        var obj = this._data[x]
        var th = new Html('td', x)
        var tr = new Html('tr', th)
        this._html.AddContent(tr)
        var th = new Html('td', obj.content)
        tr.AddContent(th)

        var date = new Date(obj.submitTime * 1000);
        var hours = date.getHours().toString().length == 1 ? "0" + date.getHours() : date.getHours();
        var minutes = date.getMinutes().toString().length == 1 ? "0" + date.getMinutes() : date.getMinutes();
        var seconds = date.getSeconds().toString().length == 1 ? "0" + date.getSeconds() : date.getSeconds();
        var th = new Html('td', date.toLocaleDateString() + " " + hours + ":" + minutes + ":" + seconds)
        tr.AddContent(th)

        var th = new Html('td', obj.orderNo)
        tr.AddContent(th)
        var th = new Html('td', obj.fee)
        tr.AddContent(th)
        if (obj.orderStatus == 0) {
            var span = new Html('span', '未支付')
            span.AddAttr('style', 'color:red')
            var th = new Html('td', span)
            tr.AddContent(th)
        } else if (obj.orderStatus == 1) {
            var span = new Html('span', '已支付')
            var th = new Html('td', span)
            tr.AddContent(th)
        }
    }
    this._html.SetTag("table")
    return this._html
}

/**
 * zhangsi  magazine/book
 * 杂志或图书的预览
 * data, [{resourceId:int, resourceName:string, issueId:int, issueName, }]
 * config,{row:2, column:5, title:"", buy:1}
 * operate,{even:func()}
 * @constructor
 */
var PartPreview = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartPreview.prototype = new Part()
PartPreview.prototype.Html = function() {
    if (!this._data || this._data.length == 0) {
        console.log("PartPre Data is err")
        var url = new Url()
        var key = url.GetArgs("search")
        if (!key) {
            key = $("[name='search']").val()
        }
        // Web.Alert("搜索不到“" + key + "”")
        return new Html()
    }
    //预览图
    var col = !this._config || !this._config.column ? 6 : this._config.column
    var row = !this._config || !this._config.row ? 0 : this._config.row
    if (row == 0) {
        row = 2
    }
    this._html.SetTag('table')

    var url = new Url()
    var m = 0;
    var tr = new Html('tr')
    var width = 100 / 6
    for (var x in this._data) {
        var page = Math.floor(x / (col * row)) + 1
        m = x % col
            //分行
        if (x == 0 || m == 0) {
            tr = new Html('tr', '', "class=page page-" + page)
            if (page > 1) {
                tr.AddAttr("style", "display:none")
            }
            this._html.AddContent(tr)
        }

        var obj = this._data[x]
        var img = new Html('img')
        if (!!this._config.load && x >= this._config.load) {
            img.AddAttr('data-src', obj.src)
        } else {
            img.AddAttr('src', obj.src)
        }

        var p = new Html('p', img, "class=slice")
        var a = new Html('a', p, 'href=' + obj.href)
        var input = new Html('input', '', 'type=checkbox', 'style=display:none')
        input.AddAttr("name", "preview-item")
        input.AddAttr("value", obj.resourceType + "," + obj.issueId)
        var span = new Html("span", input)
        span.AddContent(obj.name)
        var p = new Html('p', span, "class=text")
        if (url.GetInstance() == "whu") {
            if (url.GetPage() == "issue") {
                var span = new Html('span', '')
            } else {
                var span = new Html('span', '来源：' + obj.owner, 'class=owner')
            }
            p.AddContent(span)
        }
        if (url.GetPage() == "pre") {
            var div = new Html('div', obj.text, 'class=explain')
            p.AddContent(div)
        }
        a.AddContent(p)

        var td = new Html('td', a)
        if (!!this._config && !!this._config.buy) {
            if (!!obj.price1) {
                if (obj.price1 == 0 || obj.price1 == "0.00") {
                    var buy = new Html("", "免费", "style=color:#f##")
                } else {
                    var buy = new Html("p", "电子版：￥" + obj.price1, "id=item-" + obj.issueId, "class=preview-price")
                    buy.AddAttr("onclick", "e.BuyItem(this,'" + obj.genre + "','" + obj.issueId + "')")
                }
            } else {
                var buy = new Html("", "已购买", "style=color:#f##")
            }
            td.AddContent(buy)
        }

        tr.AddContent(td)
    }

    //补全该行td
    m++
    for (m; m < col; m++) {
        tr.AddContent(new Html('td'))
    }
    this._html.AddAttr("style", "table-layout:fixed;")
    return this._html
}

/**
 * 分页 id, len, column, row
 */
var PartPaging = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartPaging.prototype = new Part()
PartPaging.prototype.Html = function() {
    if (!this._data || this._data.length == 0) {
        console.log("PartPre Data is err")
        return new Html()
    }

    var p = Session.Get(window.location.href + "-paging")
    if (!p) {
        p = 1;
    }

    var nav = new Html('nav')
    var ul = new Html('ul')
    var page = Math.ceil(this._data.total / this._data.num)
    var tag = this._html._class[0]
    if (tag == "") {
        this._html.AddClass("paging")
        tag = "paging"
    }
    var param = ", '." + tag + "', " + page + ")" + ";return false;";
    ul.AddClass('pagination');

    //向前
    var left = new Html('span', '&laquo;', 'aria-hidden=true')
    var pre = new Html('a', left, 'href=#', 'aria-label=Previous')
    pre.AddAttr('onclick', "e.Paging(this, -1" + param)
        //向后
    var right = new Html('span', '&raquo;', 'aria-hidden=true')
    var next = new Html('a', right, 'href=#', 'aria-label=Next')
    next.AddAttr('onclick', "e.Paging(this, 1" + param)
        //页码
    ul.AddContent(new Html('li', pre))

    var arr = [];
    if (page < 7) {
        for (var i = 1; i <= page; i++) {
            arr.push(i)
        }
    } else {
        arr = [1, 2, 3, 4, 5, '...', page]
    }

    for (var i in arr) {
        var a = new Html('a', arr[i], 'href=#')
        a.AddAttr('onclick', "e.Paging(this," + 0 + param)
        var li = new Html('li', a, i != "..." ? "class=paging paging-" + (parseInt(i) + 1) : "")
        if (i == 0) {
            li.AddClass('active')
        }
        ul.AddContent(li)
    }

    ul.AddContent(new Html('li', next))
    nav.AddContent(ul)
    this._html.AddContent(nav)
    setTimeout(function() {
        var t = Session.Get(window.location.href + "-paging")
        if (!t || t < 2) {
            return
        }
        e.Paging("", t, "." + tag, page)
    }, 5)
    return this._html
}

/**
 * zhangsi  magazine/book
 * 杂志或图书的分页预览
 * data, [{resourceId:int, resourceName:string, issueId:int, issueName, }]
 * config,{row:2, column:5, title:"", buy:1}
 * operate,{even:func()}
 * @constructor
 */
var PartPrePaging = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartPrePaging.prototype = new Part()
PartPrePaging.prototype.Html = function() {
    if (!this._data || this._data.length == 0) {
        console.log("PartPre Data is err")
        return new Html('')
    }
    //预览图 
    var col = !this._config || !this._config.column ? 6 : this._config.column
    var row = !this._config || !this._config.row ? 0 : this._config.row
    var title = !this._config || !this._config.title ? "" : this._config.title
    var nav = this.Paging(this._id, this._data.length, col, row)
    if (row == 0) {
        row = 2
    }
    this._html.SetTag('table')

    //上页的分页条
    if (!!title || !!nav) {
        var tr = new Html("tr", new Html("td", title))
        var td = new Html("td", nav, "class=top-paging", "style:text-align:right", "colspan=" + (col - 1))
        tr.AddContent(td)
        this._html.AddContent(tr)
    }

    var m = 0;
    var tr = new Html('tr')
    var width = 100 / 6
    for (var x in this._data) {
        var page = Math.floor(x / (col * row)) + 1
        m = x % col
            //分行
        if (x == 0 || m == 0) {
            tr = new Html('tr', '', "class=page page-" + page)
            if (page > 1 && !!nav) {
                tr.AddAttr("style", "display:none")
            }
            this._html.AddContent(tr)
        }

        var obj = this._data[x]
        var img = new Html('img')
        if (!!this._config.load && x >= this._config.load) {
            img.AddAttr('data-src', obj.src)
        } else {
            img.AddAttr('src', obj.src)
        }

        var p = new Html('p', img, "class=slice")
        var a = new Html('a', p, 'href=' + obj.href)
        var input = new Html('input', '', 'type=checkbox', 'style=display:none')
        input.AddAttr("name", "preview-item")
        input.AddAttr("value", obj.genre + "," + obj.issueId)
        var span = new Html("span", input)
        span.AddContent(obj.name)
        var p = new Html('p', span, "class=text")
        a.AddContent(p)

        var td = new Html('td', a)
        if (!!this._config && !!this._config.buy) {
            td.AddContent(e.formatPrice(obj.genre, obj.issueId, obj.price1))
        }

        tr.AddContent(td)
    }
    if (!!nav) {
        this._html.AddContent(new Html("tr", new Html("td", nav, "class=bottom-paging", "colspan=" + col)))
    }

    //补全该行td
    m++
    for (m; m < col; m++) {
        tr.AddContent(new Html('td'))
    }
    //只加载部分，剩下滑动再加载
    this._html.AddAttr("ontouchstart", "e.PerviewLoad()")
    this._html.AddAttr("style", "table-layout:fixed;")
    return this._html
}

PartPrePaging.prototype.Paging = function(id, len, column, row) {
    if (!len || len == "0" || !row) {
        console.log("PartPaging Data is err")
        return
    }

    var p = Session.Get(window.location.href + "-paging");
    if (!p) {
        p = 1;
    }

    var nav = new Html('nav');
    var ul = new Html('ul');
    var page = Math.ceil(len / (column * row));
    var param = ", '" + id + "', " + page + ");return false;";
    ul.AddClass('pagination');

    //向前
    var left = new Html('span', '&laquo;', 'aria-hidden=true');
    var pre = new Html('a', left, 'href=#', 'aria-label=Previous');
    pre.AddAttr('onclick', "e.PrePaging(this, -1" + param);
    //向后
    var right = new Html('span', '&raquo;', 'aria-hidden=true');
    var next = new Html('a', right, 'href=#', 'aria-label=Next');
    next.AddAttr('onclick', "e.PrePaging(this, 1" + param)
        //页码
    ul.AddContent(new Html('li', pre));

    var arr = [];
    if (page < 7) {
        for (var i = 1; i <= page; i++) {
            arr.push(i)
        }
    } else {
        arr = [1, 2, 3, 4, 5, '...', page]
    }

    for (var i in arr) {
        var a = new Html('a', arr[i], 'href=#');
        a.AddAttr('onclick', "e.PrePaging(this," + 0 + param);
        var li = new Html('li', a, i != "..." ? "class=paging paging-" + (parseInt(i) + 1) : "");
        if (!!p) {
            if (p == arr[i]) {
                li.AddClass('active');
                setTimeout(function() {
                    $('li.paging.active a:first').click();
                }, 200);
            }
        } else {
            if (i == 0) {
                li.AddClass('active');
            }
        }
        ul.AddContent(li);
    }

    ul.AddContent(new Html('li', next));
    nav.AddContent(ul);
    return nav;
}


/**
 * 搜索组件
 * config , {placeholder:string}
 * operate,{search:string}
 * @Jiang youhua
 */
var PartSearch = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartSearch.prototype = new Part()
PartSearch.prototype.Html = function() {
    var url = new Url()
    if (url.GetInstance() == "whu") {
        var bk = new Html('input', '', 'type=radio', 'name=optionsRadios', 'value=1', 'checked')
        var bkDiv = new Html('span', bk, 'class=radio  bk')
        var span = new Html('span', '站内')
        bkDiv.AddContent(span)
        this._html.AddContent(bkDiv)

        var whu = new Html('input', '', 'type=radio', 'name=optionsRadios', 'value=0')
        var whuDiv = new Html('span', whu, 'class=radio whu')
        var span = new Html('span', '珞珈学术')
        whuDiv.AddContent(span)
        this._html.AddContent(whuDiv)

        var gc = new Html('input', '', 'type=radio', 'name=optionsRadios', 'value=2')
        var gcDiv = new Html('span', gc, 'class=radio gc')
        var span = new Html('span', '馆藏')
        gcDiv.AddContent(span)
        this._html.AddContent(gcDiv)
    }

    //输入框组
    var p = this._config.placeholder ? this._config.placeholder : ""
    var input = new Html("input", "", "class=form-control", "placeholder=" + p)
    var name = this.GetAttr('name')
    if (!name) {
        name = "search"
    }
    input.AddAttr("name", name)
    var button = new Html('button', "搜索")
    button.AddClass("btn btn-default")
    for (var x in this._operate) {
        button.AddAttr("onclick", this.Operate('', x))
        break;
    }
    var span = new Html('span', button, 'class=input-group-btn')
    this._html.AddContent(input)
    this._html.AddContent(span)
    this._html.AddClass('input-group')
    return this._html
}

/**
 * zhangsi  Swiper  {img:string}
 * 阅读翻页  需引入插件swiper.min.js  swiper.min.css
 * var swiper = new Swiper('.swiper-container', {
        slidesPerView: 2,
        slidesPerColumn: 2,
		spaceBetween: 10
    });
 * @constructor
 */
var PartSwiper = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartSwiper.prototype = new Part()
PartSwiper.prototype.Html = function() {
    if (!this._data) {
        console.log("PartSwiper Data is err")
        return new Html('')
    }
    var div = new Html('div', 'class=swiper-wrapper')
    for (var x in this._data) {
        var obj = this._data[x]
        var img = new Html('img')
        img.SetAttr('src', obj.src)
        var div = new Html('div', img, 'class=swiper-slide')
        div.AddContent(div)
    }
    var div = new Html('div', div, 'class=swiper-container')
    this._html.AddContent(div)
    return this._html
}

/**
 * 时间组件
 * @Jiang Youhau
 */
var PartUserLi = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartUserLi.prototype = new Part()
PartUserLi.prototype.Html = function() {
    if (!this._data) {
        console.log("PartSessionList data is nil")
        return this._html
    }
    this._html.SetTag("ul")
    var arr = this._data[0]
    var user = Session.Get('user')
    if (!!user) {
        var url = new Url()
        var arr = this._data[1]
        var name = !user.userName ? user.phone : user.userName
        name = "Hi, " + name
        arr.unshift({ name: name, href: "#" })
    }

    for (var x in arr) {
        var a = new Html('a', arr[x].name, "href=" + arr[x].href)
        if (!!arr[x].onclick) {
            a.AddAttr('onclick', arr[x].onclick)
        }
        var li = new Html('li', a)
        this._html.AddContent(li)
    }

    return this._html
}

/**
 * 菜单，导航条组件
 * data, 显示数据，{id:int, title:string, text:string, file:string}
 * @Jiang youhua
 */
var PartUserPay = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartUserPay.prototype = new Part()
PartUserPay.prototype.Html = function() {
    var data = this._data
    if (!data) {
        data = Session.Get('pay')
    }
    if (!data) {
        return new Html()
    }

    var before = new Html("div", "", "class=pay-before")
    this._html.AddContent(before)
    var span = new Html('span', "￥" + data.fee, "class=pay-price")
    var div = new Html('div', '支付金额：')
    div.AddContent(span)
    before.AddContent(div)
    if (!this._operate) {
        return this._html
    }

    //支付按钮
    var a = { ali: '支付宝支付', wei: '微信支付' }
    var b = { ali: 'primary', wei: 'success' }
    var div = new Html("div", '', 'pay-channel')
    for (var x in this._operate) {
        var b = new Html('button', a[x], "onclick=" + this.Operate(data, x), 'class=btn btn-' + b[x] + ' ppay-' + x)
        div.AddContent(b)
    }
    before.AddContent(div)

    //接收支付的区城
    var after = new Html("div", '', "class=pay-after")
    this._html.AddContent(after)
    var ali = new Html("div", '', 'id=pay-channel-ali')
    var wei = new Html('div', new Html('img'), 'id=pay-channel-wei')
    var explain = new Html("p", "微信扫描二维码，轻松支付", 'class=pay-wei-info')
    var url = new Url()
    if (url.GetProduct() == 'wei') {
        explain = new Html("p", "长按二维码，选择二维码识别", 'class=pay-wei-info')
    }
    wei.AddContent(explain)
    var submit = new Html('button', "支付成功", "class=btn btn-success", "onclick=e.PayConfirm('" + data.orderNo + "')")
    var cancel = new Html('button', "支付失败", "class=btn btn-danger", "onclick=e.PayConfirm('" + data.orderNo + "')")
    after.AddContent(ali)
    after.AddContent(wei)
    after.AddContent(submit)
    after.AddContent(cancel)
    var s = window.location.search
    if (!s) {
        after.AddAttr("style", "display:none")
    } else {
        before.AddAttr("style", "display:none")
        explain.AddAttr("style", "display:none")
    }
    return this._html
}

/**
 * 时间组件
 * @Jiang Youhau
 */
var PartWXCode = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartWXCode.prototype = new Part()
PartWXCode.prototype.Html = function() {
    var url = "http://weixin.bookan.cn/index.php/home/login/getqrcode/id/" + this._data
    $.get(url, function(re) {
        $("#wx-code").attr('src', re.img)
    })
    var img = new Html("img", '', "id=wx-code")
    img.AddAttr("src", "")
    var p = new Html("p", "请扫码登录", "id=scan", "style=margin-top: -20px;width: 430px;text-align: center;background: #fff;padding-bottom: 10px;")
    this._html.AddContent(img)
    this._html.AddContent(p)
        // 定时请求是否登录成功

    this.Login()
    return this._html
}

// 轮询请求，判断是否登录成功
PartWXCode.prototype.Login = function() {
    var user = Session.Get("user")
    if (!!user) {
        return
    }
    var url = "http://weixin.bookan.cn/index.php/home/login/getinfo/id/" + this._data
    var time = new Date()
    var start = time.getTime()
    var invokeCount = 0; // 调用次数限制


    var t = setInterval(function() {
        var end = time.getTime()
        if ((end - start > 3 * 60 * 100) || invokeCount >= 9) {
            Web.Alert("登录超时，请稍后再试！")
            $("#wxcode").remove()
            clearInterval(t)
            return
        }

        $.get(url, function(re) {

            invokeCount++;

            if (re.status == 0) {
                return
            }
            if (re.status == 2) {
                clearInterval(t)
                return
            }

            Session.Set("user", re.data)
            Web.Update('[data-name="PartWXLogin"]', 0)

            // 添加到收藏
            var u = new Url()
            e.CollectAdd(u.GetIid(), re.data.userId)
                // if(u.GetInstance()=="whu"){
                //     Session.Set(u.GetInstance()+"-"+re.data.userId, re.data.headimgurl);
                // }

            re.data.handle = "UserWxInfoSend"
                //写入服务器
            $.post(window.location.href, re.data, function(re) {
                window.location.reload(true);
            })
            clearInterval(t)
                //登录成功
            $("#wxcode").remove()
            Web.Alert("登录成功，请留意！")
        }, 'json')
    }, 2000)
}


/**
 * 时间组件
 * @Jiang Youhau
 */
var PartWXLogin = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartWXLogin.prototype = new Part()
PartWXLogin.prototype.Html = function() {
    this._html.SetTag("ul")
    var url = new Url()
    var arr = [
        { name: '', href: "#", onclick: "e.wxlogin()", _class: 'wl' },
        { name: '', href: url.Path("help"), _class: 'help' }
    ]
    var user = Session.Get("user")
    if (!!user) {
        var arr = [
            { name: user.nickname, href: "javascript:void(0)", _class: 'nick' },
            { name: '我的收藏', href: url.Path("user/0/user@Collect"), _class: 'store' },
            { name: '我的消息', href: url.Path("message"), _class: 'news' },
            { name: '最近阅读', href: url.Path("user/0/user@LastReader"), _class: 'recent' },
            { name: '退出登录', href: "#", onclick: "e.logout()" },
            { name: '', href: url.Path("help"), _class: 'help' }
        ]

        if (!!user.headimgurl) {
            var img = new Html("image", '', "src=" + user.headimgurl, "class=wImg")
            var li = new Html("li", img)
            this._html.AddContent(li)
        }
    }


    for (var x in arr) {
        var a = new Html('a', arr[x].name, "href=" + arr[x].href, "class=" + arr[x]._class)
        if (!!arr[x].onclick) {
            a.AddAttr('onclick', arr[x].onclick)
        }
        var li = new Html('li', a)
        this._html.AddContent(li)
    }
    return this._html
}


// zhangsi

// 微信登录  我的消息
/**
 * data =[{ type: "资源更新", content:"桂林晚报   期刊   更新于2016年9月23日",pTime:"2016-09-29",source:"博看"},]
 * zhangsi List
 * @constructor
 */
var PartTable = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}

PartTable.prototype = new Part()
PartTable.prototype.Html = function() {
    if (!this._data) {
        console.log("PartTable Data is err")
        return new Html('')
    }
    var url = new Url()
    var user = Session.Get("user")
    if (url.GetPage() == "message") {
        var table = new Html('table', '', 'class=update')
        var th = new Html('th', "类型")
        var tr = new Html('tr', th)
        table.AddContent(tr)

        var th = new Html('th', "内容")
        tr.AddContent(th)
        var th = new Html('th', "时间")
        tr.AddContent(th)
        var th = new Html('th', "来源")
        tr.AddContent(th)

        for (x in this._data) {
            // 头部分
            var obj = this._data[x]

            var type = new Html('td', obj.resourceName)
            var tr = new Html('tr', type)


            var content = new Html('td', obj.title)
            tr.AddContent(content)

            var pTime = new Html('td', "2016-09-29")
            tr.AddContent(pTime)

            var source = new Html('td', '来源于：' + obj.text)
            tr.AddContent(source)

            table.AddContent(tr)
        }
        this._html.AddContent(table)
        return this._html
    } else if (url.GetPage() == "detail") {
        var table = new Html('table', '', 'class=update')
        for (x in this._data) {
            // 头部分
            var obj = this._data[x]
            var tr = new Html('tr', '')
            if (!!obj.userCoin) {
                var img = new Html("image", '', "src=" + obj.userCoin, "class=wImg")
                var name = new Html('td', img)
                tr.AddContent(name)
            } else {
                var span = new Html('span', obj.userName, 'class=wName')
                var name = new Html('td', span)
                tr.AddContent(name)
            }


            var comm = new Html('td', obj.content)
            tr.AddContent(comm)

            var pTime = new Html('td', obj.time)
            tr.AddContent(pTime)

            table.AddContent(tr)
        }
        this._html.AddContent(table)
        return this._html
    }

}


// 武大特有
/**
 * zhangsi  message/media/souce
 * 杂志或图书的预览
 * data, [{resourceId:int, resourceName:string, issueId:int, issueName, }]
 * config,{row:2, column:5, title:"", buy:1}
 * operate,{even:func()}
 * @constructor
 */
var PartPre = function() {
    Part.apply(this, arguments);
    (function(self, args) {
        var a = Array.prototype.slice.call(args)
        self.SetArgs(a)
    })(this, arguments)
}
PartPre.prototype = new Part()
PartPre.prototype.Html = function() {
    if (!this._data || this._data.length == 0) {
        console.log("PartPre Data is err")
        return new Html('')
    }
    //预览图
    var col = !this._config || !this._config.column ? 6 : this._config.column
    var row = !this._config || !this._config.row ? 0 : this._config.row
    var title = !this._config || !this._config.title ? "" : this._config.title
    var nav = this.Paging(this._id, this._data.length, col, row)
    if (row == 0) {
        row = 2
    }
    this._html.SetTag('table')

    //上页的分页条
    if (!!title || !!nav) {
        var tr = new Html("tr", new Html("td", title))
        var td = new Html("td", nav, "class=top-paging", "style:text-align:right", "colspan=" + (col - 1))
        tr.AddContent(td)
        this._html.AddContent(tr)
    }

    var m = 0;
    var tr = new Html('tr')
    var width = 100 / 6
    for (var x in this._data) {
        var page = Math.floor(x / (col * row)) + 1
        m = x % col
            //分行
        if (x == 0 || m == 0) {
            tr = new Html('tr', '', "class=page page-" + page)
            if (page > 1 && !!nav) {
                tr.AddAttr("style", "display:none")
            }
            this._html.AddContent(tr)
        }

        var obj = this._data[x]
        var img = new Html('img')
        if (!!this._config.load && x >= this._config.load) {
            img.AddAttr('data-src', obj.jpg)
        } else {
            img.AddAttr('src', obj.jpg)
        }

        var p = new Html('p', img, "class=slicing")
        var a = new Html('a', p, 'href=' + obj.html)
        var input = new Html('input', '', 'type=checkbox', 'style=display:none')
        input.AddAttr("name", "preview-item")
        input.AddAttr("value", obj.genre + "," + obj.issueId)
            // var resource = new Html('span',obj.resource,'class=resource')
        var name = new Html('span', obj.title, 'class=name')
        var span = new Html("span", input)
        span.AddContent(name)
            // span.AddContent(resource)

        var p = new Html('p', span, "class=texting")
        var span = new Html('span', obj.text, 'class=explain')
        p.AddContent(span)
        a.AddContent(p)

        var td = new Html('td', a)
        if (!!this._config && !!this._config.buy) {
            td.AddContent(e.formatPrice(obj.genre, obj.issueId, obj.price1))
        }

        tr.AddContent(td)
    }
    if (!!nav) {
        this._html.AddContent(new Html("tr", new Html("td", nav, "class=bottom-paging", "colspan=" + col)))
    }

    //补全该行td
    m++
    for (m; m < col; m++) {
        tr.AddContent(new Html('td'))
    }
    //只加载部分，剩下滑动再加载
    this._html.AddAttr("ontouchstart", "e.PerviewLoad()")
    this._html.AddAttr("style", "table-layout:fixed;")
    return this._html
}

PartPre.prototype.Paging = function(id, len, column, row) {
    if (!len || len == "0" || !row) {
        console.log("PartPaging Data is err")
        return
    }

    var nav = new Html('nav')
    var ul = new Html('ul')
    var page = Math.ceil(len / (column * row))
    var param = ", " + id + ", " + page + ")"
    ul.AddClass('pagination')

    //向前
    var left = new Html('span', '&laquo;', 'aria-hidden=true')
    var pre = new Html('a', left, 'href=#', 'aria-label=Previous')
    pre.AddAttr('onclick', "e.Paging(this, -1" + param)
        //向后
    var right = new Html('span', '&raquo;', 'aria-hidden=true')
    var next = new Html('a', right, 'href=#', 'aria-label=Next')
    next.AddAttr('onclick', "e.Paging(this, 1" + param)
        //页码
    ul.AddContent(new Html('li', pre))
    for (var i = 1; i <= 7 && i <= page; i++) {
        var n = i
        var m = i
        if (i > 5 && page > 7) {
            n = i == 6 ? '...' : page
            m = i == 6 ? 6 : page
        }
        var a = new Html('a', n, 'href=#')
        a.AddAttr('onclick', "e.Paging(this," + 0 + param)
        var li = new Html('li', a, "class=paging paging-" + i)
        if (i == 1) {
            li.AddClass('active')
        }
        ul.AddContent(li)
    }

    ul.AddContent(new Html('li', next))
    nav.AddContent(ul)
    return nav
}