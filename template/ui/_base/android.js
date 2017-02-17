var android = {
    connectWebViewJavascriptBridge: function (callback) {
        if (window.WebViewJavascriptBridge) {
            callback(WebViewJavascriptBridge)
        } else {
            document.addEventListener('WebViewJavascriptBridgeReady',
                function () {
                    callback(WebViewJavascriptBridge)
                },
                false);
        }
    },

    /**
     * 从native获取消息通知数据
     * @params callback 回调function
     */
    getNotifyMessage: function (callback) {
        connectWebViewJavascriptBridge(function (WebViewJavascriptBridge) {
            WebViewJavascriptBridge.callHandler('getNotifyMessage', '',
                function (responseData) {
                    callback(responseData);
                });
        });
    },

    /**
     * 输入数据
     */


    /**
     * 从native获取机构信息
     * @params callback 回调function
     */
    getOrganInfo: function (callback) {
        connectWebViewJavascriptBridge(function (WebViewJavascriptBridge) {
            WebViewJavascriptBridge.callHandler('getOrganInfo', '',
                function (responseData) {
                    callback(responseData);
                });
        });
    },

    /*
     * js与 natvive通信方法
     */
    toJava: function (index, title, vlaue) {
        var b = Web.w > Web.h
        var data = { tag: "", key: "activity", value: "", }
        var val = { urlid: index, }
        switch (index) {
            case 1:
                data.tag = "电子期刊"
                val.classname = !b ? 'MagzineActivity' : 'LandIssueEntranceActivity'
                break
            case 2:
                data.tag = "电子报纸"
                val.classname = !b ? 'PaperActivity' : 'LandPaperEntranceActivity'
                break
            case 3:
                data.tag = "电子图书"
                val.classname = !b ? 'BookActivity' : 'LandBookEntranceActivity'
                break
            case 4:
                data.tag = "消息通知"
                val.classname = !b ? 'MessageListActivity' : 'LandMessageListActivity';
                break
            default:
                data.tag = title
                data.key = "url"
                val.url = value
                val.title = title
        }
        var v = JSON.stringify(val)
        data.value = v
        window.WebViewJavascriptBridge.callHandler('submitFromWeb', JSON.stringify(data));
    },

    /**
     * js调用native层后退方法
     */
    onBack: function () {
        window.WebViewJavascriptBridge.callHandler('onBack', '');
    },
}