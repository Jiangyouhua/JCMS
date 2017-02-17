package userlog

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	// "github.com/jianfengye/web-golang/web/session"
	"Jcms2.1/session"
)

//STATUS_IDEL 无人操作状态
const STATUS_IDEL = 0

//写入操作中
const STATUS_WRITE = 1

//传送操作中
const STATUS_TRANS = 2

/**
 * 资源类型：期刊杂志
 *
 * @var int
 */
const TYPE_MAGAZINE = 1

/**
 * 资源类型：报纸
 *
 * @var int
 */
const TYPE_NEWSPAPER = 2

/**
 * 资源类型：图书
 *
 * @var int
 */
const TYPE_BOOKS = 3

/**
 * 资源类型：文章
 *
 * @var int
 */
const TYPE_ARTICLE = 4

// 触摸屏
/**
 * 操作类型：阅读
 *
 * 统计:阅读PV, 阅读份/本数, 阅读页面数
 *
 * remark:
 * 		pageNum:1,          // int    阅读的页数
 *
 * @var int
 */
const TOUCH_SCREEN_4K_READ = 1001

/**
 * 操作类型：搜索
 *
 * 统计:搜索次数, 搜索top排名
 *
 * remark:
 * 		keyword:xxx,        // string  关键字
 *
 * @var int
 */
const TOUCH_SCREEN_4K_READ_SEACH = 1002

/**
 * 操作类型：点击资源分类(未使用)
 *
 * 统计:资源分类点击次数, 资源分类点击top排行
 *
 * remark:
 * 		categoryId:1,       // int       分类id
 *		categoryName:1,     // string    分类名称
 *
 * @var int
 */
const TOUCH_SCREEN_4K_CATEGORY_CLICK = 1003

/**
 * 操作类型：点击首页模块
 *
 * 统计:首页模块被点次数
 *
 * @var int
 */
const TOUCH_SCREEN_4K_HOME_PAGE = 1004

// 手机app
/**
 * 操作类型：阅读
 *
 * 统计:阅读PV, 阅读份/本数, 阅读页面数
 *
 * remark:
 * 		pageNum:1,          // int    阅读的页数
 *
 * @var int
 */
const APP_READ = 2001

/**
 * 操作类型：搜索
 *
 * 统计:搜索次数, 搜索top排名
 *
 * remark:
 * 		keyword:xxx,        // string  关键字
 *
 * @var int
 */
const APP_SEACH = 2002

/**
 * 操作类型：点击资源分类(未使用)
 *
 * 统计:资源分类点击次数, 资源分类点击top排行
 *
 * remark:
 * 		categoryId:1,       // int       分类id
 *		categoryName:1,     // string    分类名称
 *
 * @var int
 */
const APP_CATEGORY_CLICK = 2003

/**
 * 操作类型：点击收藏
 *
 * 统计:收藏次数
 *
 * remark:
 *
 * @var int
 */
const APP_FAVOR = 2004

/**
 * 操作类型：点击分享
 *
 * 统计:分享次数
 *
 * remark:
 *
 * @var int
 */
const APP_SHARE = 2005

/**
 * 操作类型：点击下载
 *
 * 统计:下载次数
 *
 * remark:
 *
 * @var int
 */
const APP_DOWNLOAD = 2006

/**
 * 操作类型：app启动
 *
 * 统计:app启动次数
 *
 * remark:
 *
 * @var int
 */
const APP_START_UP = 2007

/**
 * 操作类型：扫描4k触摸屏-首页APP二维码
 *
 * 统计:4k触摸屏-首页APP二维码扫码次数
 *
 * remark:
 * 		org:xx,             // string  被扫机构代号
 * 		resourceType:1,     // int     被扫资源类型(没有涉及到资源类型 写0)
 * 		appTypeId:1,        // int     被扫描二维码的apptypeid
 * 		clientPlatformId:1, // int     被扫描二维码的clientPlatform
 *
 * @var int
 */
const APP_TOUCH_SCREEN_4K_HOME_PAGE_SCAN = 2008

/**
 * 操作类型：扫描4k触摸屏-下载二维码
 *
 * 统计:4k触摸屏-下载二维码被扫次数
 *
 * remark:
 * 		org:xx,             // string  被扫机构代号
 * 		resourceType:1,     // int     被扫资源类型(没有涉及到资源类型 写0)
 * 		appTypeId:1,        // int     被扫描二维码的apptypeid
 * 		clientPlatformId:1, // int     被扫描二维码的clientPlatform
 *
 * @var int
 */
const APP_TOUCH_SCREEN_4K_DOWNLOAD_SCAN = 2009

// 微刊
/**
 * 操作类型：阅读
 *
 * 统计:阅读PV, 阅读份/本数, 阅读页面数
 *
 * remark:
 * 		pageNum:1,          // int    阅读的页数
 *
 * @var int
 */
const GO_READ = 3001

/**
 * 操作类型：搜索
 *
 * 统计:搜索次数, 搜索top排名
 *
 * remark:
 * 		keyword:xxx,        // string  关键字
 *
 * @var int
 */
const GO_SEACH = 3002

/**
 * 操作类型：点击收藏
 *
 * 统计:收藏次数
 *
 * remark:
 *
 * @var int
 */
const GO_FAVOR = 3004

/**
 * 操作类型：点击分享
 *
 * 统计:分享次数
 *
 * remark:
 *
 * @var int
 */
const GO_SHARE = 3005

/**
 * 操作类型：访问
 *
 * 统计:访问次数
 *
 * remark:
 *
 * @var int
 */
const GO_ENTER = 3006

// 专区
/**
 * 操作类型：阅读
 *
 * 统计:阅读PV, 阅读份/本数, 阅读页面数
 *
 * remark:
 * 		pageNum:1,          // int    阅读的页数
 *
 * @var int
 */
const WEB_READ = 4001

/**
 * 操作类型：搜索
 *
 * 统计:搜索次数, 搜索top排名
 *
 * remark:
 * 		keyword:xxx,        // string  关键字
 *
 * @var int
 */
const WEB_SEACH = 4002

/**
 * 操作类型：点击收藏
 *
 * 统计:收藏次数
 *
 * remark:
 *
 * @var int
 */
const WEB_FAVOR = 4004

/**
 * 操作类型：点击分享
 *
 * 统计:分享次数
 *
 * remark:
 *
 * @var int
 */
const WEB_SHARE = 4005

/**
 * 操作类型：访问
 *
 * 统计:访问次数
 *
 * remark:
 *
 * @var int
 */
const WEB_ENTER = 4006

/**
 * 操作类型：加入购物车
 *
 * 统计:加入购物车次数
 *
 * @var int
 */
const WEB_SHOPPINGCART_ADD = 4007

/**
 * 操作类型：直接购买
 *
 * 统计:直接购买次数
 *
 * @var int
 */
const WEB_CLICK_BUY = 4008

/**
 * 操作类型：支付点击
 *
 * 统计:支付宝点击次数, 微信支付点击次数
 *
 * remark:
 * 	type: 1 支付宝 2 微信
 *
 * @var int
 */
const WEB_CLICK_PAY = 4009

const WEB_PAY_TYPE_ALI = 1
const WEB_PAY_TYPE_WX = 2

//==================================================================

// 页面类型：阅读页
const VIEW_TYPE_READ_PAGE = 3011 // 原11

// 页面类型：往期清单
const VIEW_TYPE_YEARLIST = 3012

// 页面类型：目录
const VIEW_TYPE_CATALOGUE = 3013 // 原13

// 页面类型：博看书苑界面
const VIEW_TYPE_MAIN_BOOKANLIB = 3701 // 原701

//页面类型：主界面
const VIEW_TYPE_MAIN = 3140 // 原140

const VIEW_TYPE_WEIXIN_LOGIN = 3003

//页面类型：	资源分类菜单
const VIEW_TYPE_CATEGORY = 3702 // 原702

//页面类型：	资源明细页面detail
const VIEW_TYPE_DETAIL = 3014 //

//页面类型：	支付界面
const VIEW_TYPE_PAY = 3015 //

// cookie key name
const COOKEI_NAME = "JCMS"

// log server
const LOGSERVER = "/DataPlatform.recordData"

const TIME_FORMAT = "20060102_150405"

const DEFAULT_PRODUCT = "GO"

const PAY_CHANNEL_ALI = "1"
const PAY_CHANNEL_WEIIXIN = "2"

var actionMap = map[string]map[string]int64{
	"web": {
		"READ":             WEB_READ,
		"SEARCH":           WEB_SEACH,
		"FAVOR":            WEB_FAVOR,
		"SHARE":            WEB_SHARE,
		"ENTER":            WEB_ENTER,
		"SHOPPINGCART_ADD": WEB_SHOPPINGCART_ADD,
		"CLICK_BUY":        WEB_CLICK_BUY,
		"CLICK_PAY":        WEB_CLICK_PAY,
	},
	"GO": {
		"READ":   GO_READ,
		"SEARCH": GO_SEACH,
		"FAVOR":  GO_FAVOR,
		"SHARE":  GO_SHARE,
		"ENTER":  GO_ENTER,
	}}

var ProductMap = map[string]int{
	"web":   1,
	"touch": 1,
	"wei":   1,
}

// 全局session集合
var Sessions *session.SessionSet

type LogRecord struct {
	Time      int64  `json:"time"`
	SessionId string `json:"sessionId"`
	UserId    int64  `json:"userId"`
	// WxId         string                 `json:"wxId"`
	ViewId       int64                  `json:"viewId"`
	ActionId     int64                  `json:"actionId"`
	ScreenStatus int64                  `json:"screenStatus"`
	ResourceType int64                  `json:"resourceType"` //资源类型1:期刊; 2:报纸; 3(没有涉及到资源类型 写0)
	ResourceId   int64                  `json:"resourceId"`   // =issueid  ???
	Remark       map[string]interface{} `json:"remark"`
	ProductName  string                 `json:"productName"`  //产品名称
	InstanceName string                 `json:"instanceName"` //(产品)实例名称
	InstanceId   int64                  `json:"instanceId"`   //(产品)实例id
	Ip           string                 `json:"ip"`           // 客户端ip
}

//PharseActionId 解析用户行为对应的actionID
//@param actionName string 行为名称
func (r *LogRecord) PharseActionId(actionName string) (id int64) {

	if r.ProductName == "" || r.InstanceName == "" {
		return 0
	}
	if m, ok := actionMap[r.ProductName]; ok {
		id, _ = m[actionName]
		return id
	}
	//
	id, _ = actionMap[DEFAULT_PRODUCT][actionName]
	return id
}

type UserLog struct {
	Key    string      // 唯一标准键, 取值为sessionId
	Record []LogRecord // 存储日志记录
}

//存储日志记录的地方,封装成一个类型
type LogStorage struct {
	Data  map[string]UserLog
	mutex *sync.RWMutex
}

type LogInputData struct {
	SessionId  string //sessionId
	UserId     string
	InstanceId string
}

var (
	logs          LogStorage
	writeToServer = false // 调试时候不往日志服务器发送
)

func init() {
	logs = LogStorage{
		mutex: new(sync.RWMutex),
	}
}

//WriteLog 对外接口函数,记录一条日志
func WriteLog(r *http.Request, input LogInputData) {
	// 拦截panic
	defer func() {
		if e := recover(); e != nil {
			// e is the interface{} typed-value we passed to panic()
			fmt.Println("userlog.WriteLog() recover a panic: ", e)
		}
	}()
	// //插入日志
	// if len(sessionId) == 0 {
	// 	sessionId = getSessionID(r)
	// }
	// log.Println(" in WriteLog, sessionId=", sessionId, r.URL)
	// log.Printf("\r\n ***************\r\n logs data = %v  \r\n", logs.Data)
	logs.Insert(r, input)
	// log.Printf("after Insert ,logs data = %v  \r\n", logs.Data[sessionId])
}

//Append  UserLog 添加一条新日志
//@param r *http.Request : 请求项
func (ul *UserLog) Append(record *LogRecord) {
	//第一次启动,没有获取到sessionId, 记录下来没有意义,无法根据sessionId区分客户端
	if record != nil && len(record.SessionId) > 0 {
		ul.Record = append(ul.Record, *record)
	}
}

//Insert LogStorage插入一条新日志
//@param r *http.Request : 请求项
func (ls *LogStorage) Insert(r *http.Request, input LogInputData) {
	var record *LogRecord
	var rSlice []LogRecord

	record = pharseRequest(r, input)
	if record != nil {
		if record.ActionId == 0 {
			return
		}
		ls.mutex.Lock()
		defer ls.mutex.Unlock()
		//已有同一个客户端的日志数据, 添加; ul UserLog
		if ul, ok := ls.Data[record.SessionId]; ok {
			ul.Append(record)
			return
		}
		rSlice = append(rSlice, *record)
		// fmt.Println(" logs is nil ? :", logs.Data == nil)
		if logs.Data == nil {
			logs.Data = make(map[string]UserLog, 1024)
		}
		// 还没有一个客户端的日志数据,新建一个
		ls.Data[record.SessionId] = UserLog{
			Key:    record.SessionId,
			Record: rSlice}
		ls.Data[record.SessionId].Record[0] = *record
	}
	return
}

// Delete LogStorage删除日志
//@param r *http.Request : 请求项
func (ls *LogStorage) Delete(index string) {
	delete(ls.Data, index)
}

//PharseRequest 通过解析r ,得到请求的信息, 返回一条日志数据
//@param r *http.Request : 请求项
//@return *LogRecord 日志数据; 如果是无效的请求, 返回 nil
func pharseRequest(r *http.Request, input LogInputData) *LogRecord {
	var record LogRecord
	var err error
	record.Remark = make(map[string]interface{}, 2)
	path := r.URL.Path
	if path[0] == '/' {
		path = path[1:]
	}
	pathArray := strings.Split(path, "/")
	//按url格式, 肯定要>=3
	if len(pathArray) < 3 {
		return nil
	}
	record.Time = time.Now().Unix()
	//因为r.RemoteAddr 会带端口号, 所以要去掉 192.168.1.123:56584
	record.Ip = strings.Split(r.RemoteAddr, ":")[0]
	yes, _ := regexp.MatchString(`\[`, record.Ip)
	if yes {
		record.Ip = "127.0.0.1"
	}

	record.SessionId = input.SessionId
	record.InstanceId, _ = strconv.ParseInt(input.InstanceId, 10, 64)
	record.UserId, _ = strconv.ParseInt(input.UserId, 10, 64)
	record.ProductName, record.InstanceName = "", ""
	// record.WxId = getWxIDFromSession(record.SessionId)
	record.Remark["url"] = path

	//微信扫码登录,这个post可以发生在任何界面!
	if r.Method == "POST" {
		switch r.FormValue("handle") {
		case "UserWxInfoSend":
			pharseWxLoginRequest(&record, r)
		case "UserShopCartAdd":
			pharseShopCartRequest(&record, r)
		case "UserOrderAdd":
			err = pharseBuyRequest(&record, r, pathArray)
			// 订单行为,产品只要求记录点击直接购买,对非直接购买的请求, 不统计
			if err != nil {
				return nil
			}
		case "UserAliPay":
			pharsePayRequest(&record, r, PAY_CHANNEL_ALI)
		case "UserWeiPay":
			pharsePayRequest(&record, r, PAY_CHANNEL_WEIIXIN)
		case "SourceSearch":
			err = pharseSearchRequest(&record, r)
			if err != nil {
				return nil
			}
		}
		return &record
	}

	//先挑出来非{productName}/{instanceName} 形式的url,特殊处理
	if pathArray[0] == "epub" {
		pharseEpubRequest(&record, pathArray)
	} else if pathArray[0] == "source" {
		// 请求资源(期刊,图书)的(webp)原貌页面
		//如果是读取封面小图,则忽略
		if isOk, _ := regexp.MatchString("_small.(mg|webp|jpeg|jpg)$", path); isOk {
			return nil
		}
		pharseSourceRequest(&record, pathArray)
	} else {
		record.ProductName = pathArray[0]
		record.InstanceName = pathArray[1]
		switch pathArray[2] {
		case "issue":
			pharseIssueRequest(&record, pathArray)
		case "imageReader":
			if r.Method != "GET" {
				return nil
			}
			pharseImageReaderRequest(&record, pathArray)
		case "txtReader":
			pharseTxtReaderRequest(&record, pathArray, r)
		case "epubReader":
			if r.Method != "GET" {
				return nil
			}
			pharseEpubReaderRequest(&record, pathArray, r)
		// case "search":
		// 	if r.Method != "POST" || "SearchItems" != r.FormValue("func") {
		// 		return nil
		// 	}
		// 	// 前端会有空请求(search=0),要过滤掉
		// 	err = pharseSearchRequest(&record, r)
		// 	if err != nil {
		// 		return nil
		// 	}
		case "":
			fallthrough
		case "preview":
			fallthrough
		case "index":

			//触摸屏 有首页  "/touch/whu/"这种情况
			if "touch" == pathArray[0] && len(pathArray) <= 3 {
				pharseMainPageRequest(&record, pathArray)
			} else {
				pharsePreviewRequest(&record, pathArray)
			}
		default:
			pharsePreviewRequest(&record, pathArray)
		}
	}
	return &record
}

//pharseWxLoginRequest 解析微信扫码登录请求
//{productName}/{instanceName}/index
//method: POST
//handle : UserWxInfoSend
//@param pathArray  []string :   pathArray := strings.Split(path, "/")
func pharseWxLoginRequest(record *LogRecord, r *http.Request) (err error) {
	return nil
	record.ViewId = VIEW_TYPE_WEIXIN_LOGIN
	// record.UserId, _ = strconv.ParseInt(r.FormValue("userId"), 10, 64)
	// record.WxId = r.FormValue("openid")
	record.Remark["province"] = r.FormValue("province")
	record.Remark["city"] = r.FormValue("city")
	return nil
}

func pharseShopCartRequest(record *LogRecord, r *http.Request) (err error) {
	record.ViewId = VIEW_TYPE_DETAIL
	record.ActionId = record.PharseActionId("SHOPPINGCART_ADD")
	// record.UserId, _ = strconv.ParseInt(r.FormValue("userId"), 10, 64)
	record.ResourceType, _ = strconv.ParseInt(r.FormValue("resourceType"), 10, 64)
	record.ResourceId, _ = strconv.ParseInt(r.FormValue("issueId"), 10, 64)
	return nil
}

func pharseBuyRequest(record *LogRecord, r *http.Request, pathArray []string) (err error) {
	if strings.ToLower(pathArray[2]) != "detail" {
		return errors.New("not a direct buy action ")
	}
	if len(pathArray) < 7 {
		return errors.New("invalid url")
	}
	//web/bk/detail/1/0/7594/325179
	record.ActionId = record.PharseActionId("CLICK_BUY")
	record.ResourceType, _ = strconv.ParseInt(pathArray[3], 10, 64)
	record.ResourceId, _ = strconv.ParseInt(pathArray[6], 10, 64)
	return nil
}

func pharsePayRequest(record *LogRecord, r *http.Request, channel string) (err error) {
	record.ViewId = VIEW_TYPE_PAY
	record.ActionId = record.PharseActionId("CLICK_PAY")
	// record.UserId, _ = strconv.ParseInt(r.FormValue("userId"), 10, 64)
	record.ResourceType, _ = strconv.ParseInt(r.FormValue("resourceType"), 10, 64)
	record.ResourceId, _ = strconv.ParseInt(r.FormValue("issueId"), 10, 64)
	record.Remark["orderNo"] = r.FormValue("orderNo")
	record.Remark["type"] = channel
	return nil
}

//pharseMainPageRequest 解析首页内容加载的请求
//{productName}/{instanceName}/index
//@param pathArray  []string :   pathArray := strings.Split(path, "/")
func pharseMainPageRequest(record *LogRecord, pathArray []string) (err error) {
	record.ViewId = VIEW_TYPE_MAIN
	record.ActionId = record.PharseActionId("ENTER")
	return nil
}

//pharsePreviewRequest 解析(资源列表)预览页 内容加载的请求
//{productName}/{instanceName}/index/{resourceType}/{categoryId}
//@param pathArray  []string :   pathArray := strings.Split(path, "/")
func pharsePreviewRequest(record *LogRecord, pathArray []string) (err error) {
	record.ActionId = record.PharseActionId("ENTER")
	switch len(pathArray) {
	case 3: // 省略类型没有指明,则默认是期刊
		record.ResourceType = TYPE_MAGAZINE
	case 4: // 首页
		record.ViewId = VIEW_TYPE_MAIN_BOOKANLIB
		record.ResourceType, _ = strconv.ParseInt(pathArray[3], 10, 64)
	case 5: // 资源分类
		record.ViewId = VIEW_TYPE_CATEGORY
		record.ResourceType, _ = strconv.ParseInt(pathArray[3], 10, 64)
		record.Remark["categoryId"], _ = strconv.ParseInt(pathArray[4], 10, 64)
	}
	return nil
}

//pharseIssueRequest 解析issue往期界面 资源列表内容加载的请求
// {productName}/{instanceName}/issue/{resourceType}/{0}/{mid}/0/{year}
//@param pathArray  []string :   pathArray := strings.Split(path, "/")
func pharseIssueRequest(record *LogRecord, pathArray []string) (err error) {
	record.ActionId = record.PharseActionId("READ")
	record.ViewId = VIEW_TYPE_YEARLIST
	record.ResourceType, _ = strconv.ParseInt(pathArray[3], 10, 64)
	record.ResourceId, _ = strconv.ParseInt(pathArray[5], 10, 64)
	if len(pathArray) >= 8 {
		record.Remark["year"], _ = strconv.ParseInt(pathArray[7], 10, 64)
	}
	return nil
}

//解析原貌阅读界面
// {productName}/{instanceName}/imageReader/{resourceType}/{0}/{mid}/{iid}
//@param pathArray  []string :   pathArray := strings.Split(path, "/")
func pharseImageReaderRequest(record *LogRecord, pathArray []string) (err error) {
	if len(pathArray) < 7 {
		s := fmt.Sprintf("userlog.pharseImageReaderRequest() error: pathArray length is not enough. %v", pathArray)
		return errors.New(s)
	}
	record.ActionId = record.PharseActionId("READ")
	record.ResourceType, _ = strconv.ParseInt(pathArray[3], 10, 64)
	//ResourceId:=issueid
	record.ResourceId, _ = strconv.ParseInt(pathArray[6], 10, 64)
	if len(pathArray) >= 8 {
		page := strings.Split(pathArray[7], ".")
		if len(pathArray) < 2 {
			s := fmt.Sprintf("userlog.pharseImageReaderRequest() error:wrong page number format. %v", pathArray)
			return errors.New(s)
		}
		record.Remark["pageNum"], _ = strconv.ParseInt(page[0], 10, 64)
	}
	record.ActionId = record.PharseActionId("READ")
	record.Remark["resourceform"] = "image"
	return nil
}

//解析图文阅读界面
// {productName}/{instanceName}/txtReader/{resourceType}/{0}/{mid}/{iid}
//@param pathArray  []string :   pathArray := strings.Split(path, "/")
//@param r *http.Request : client request
func pharseTxtReaderRequest(record *LogRecord, pathArray []string, r *http.Request) (err error) {
	if len(pathArray) < 7 {
		s := fmt.Sprintf("userlog.pharseTxtReaderRequest() error: pathArray length is not enough. %v", pathArray)
		return errors.New(s)
	}
	record.ResourceType, _ = strconv.ParseInt(pathArray[3], 10, 64)
	//ResourceId:=issueid
	record.ResourceId, _ = strconv.ParseInt(pathArray[6], 10, 64)
	switch r.Method {
	case "GET":
	case "POST":
		record.Remark["articleId"], _ = strconv.ParseInt(r.FormValue("text"), 10, 64)
	}
	record.ActionId = record.PharseActionId("READ")
	record.Remark["resourceform"] = "txt"
	return nil
}

//pharseEpubReaderRequest 解析epub阅读界面
// {productName}/{instanceName}/epubReader/{resourceType}/{0}/{mid}/{iid}
//@param pathArray  []string :   pathArray := strings.Split(path, "/")
//@param r *http.Request : client request
func pharseEpubReaderRequest(record *LogRecord, pathArray []string, r *http.Request) (err error) {
	if len(pathArray) < 7 {
		s := fmt.Sprintf("userlog.pharseTxtReaderRequest() error: pathArray length is not enough. %v", pathArray)
		return errors.New(s)
	}
	record.ResourceType, _ = strconv.ParseInt(pathArray[3], 10, 64)
	//ResourceId:=issueid
	record.ResourceId, _ = strconv.ParseInt(pathArray[6], 10, 64)
	record.ActionId = record.PharseActionId("READ")
	record.Remark["resourceform"] = "epub"
	return nil
}

//pharseSourceRequest 解析原貌阅读界面(web)
// source/page{n}/{mid}/{mid}-{iid}/{pagenum}.mg
//@param pathArray  []string :   pathArray := strings.Split(path, "/")
//@param r *http.Request : client request
func pharseSourceRequest(record *LogRecord, pathArray []string) (err error) {
	var s string
	if len(pathArray) < 5 {
		s := fmt.Sprintf("userlog.pharseSourceRequest() error: pathArray length is not enough. %v", pathArray)
		return errors.New(s)
	}

	//ResourceId:=issueid; {mid}-{issueid}
	midIid := strings.Split(pathArray[3], "-")
	if len(midIid) != 2 {
		s = fmt.Sprintf("userlog.pharseImageReaderRequest() error:wrong page number format. %v", pathArray)
		return errors.New(s)
	}
	record.ResourceId, _ = strconv.ParseInt(midIid[1], 10, 64)
	record.ActionId = record.PharseActionId("READ")
	//像7574050b_big.mg这hash过的,不能得到pagenum,所以改为传入hash_big字符串
	page := strings.Split(pathArray[4], ".")
	if len(pathArray) < 2 {
		s = fmt.Sprintf("userlog.pharseImageReaderRequest() error:wrong page number format. %v", pathArray)
		return errors.New(s)
	}
	record.Remark["pageNum"] = page[0]
	record.Remark["resourceform"] = "webp"
	return nil
}

//pharseSearchRequest 解析search
// {productName}/{instanceName}/epubReader/{resourceType}/{0}/{mid}/{iid}
//@param pathArray  []string :   pathArray := strings.Split(path, "/")
//@param r *http.Request : client request
func pharseSearchRequest(record *LogRecord, r *http.Request) (err error) {
	record.ActionId = record.PharseActionId("SEARCH")
	keyword := r.FormValue("search")
	record.Remark["keyword"] = keyword

	if len(keyword) == 0 {
		return errors.New(" no keyword")
	}
	return nil
}

//pharseEpubRequest 解析epub内容加载的请求
//@param pathArray  []string :   pathArray := strings.Split(path, "/")
func pharseEpubRequest(record *LogRecord, pathArray []string) (err error) {
	var length int
	record.Remark["resourceform"] = "epub"
	length = len(pathArray)
	if length < 6 {
		s := fmt.Sprintf(" epub request url path has not enough params, %v", pathArray)
		err = errors.New(s)
		return err
	}
	record.ResourceType, _ = strconv.ParseInt(pathArray[1], 10, 64)
	record.ResourceId, _ = strconv.ParseInt(pathArray[3], 10, 64)

	// 阅读页
	if pathArray[5] == "Text" {
		record.ActionId = record.PharseActionId("READ")
		record.ViewId = VIEW_TYPE_READ_PAGE
	} else if pathArray[5] == "toc.ncx" {
		record.ActionId = record.PharseActionId("READ")
		record.ViewId = VIEW_TYPE_CATALOGUE
	}
	return nil
}

// func getSessionID(r *http.Request) string {
// 	//从请求获取cookie key
// 	cookie, err := r.Cookie(COOKEI_NAME)
// 	if err == nil {
// 		return cookie.Value
// 	}
// 	return ""
// }

// func getProductInstanceName(r *http.Request, sessionId string) (product, instance string) {
// 	if len(sessionId) > 0 {
// 		product, instance = getProductInstanceNameFromSession(sessionId)
// 	}
// 	if len(product) == 0 || len(instance) == 0 {
// 		product, instance = getProductInstanceNameFromUrl(r)
// 	}
// 	return
// }

//getProductInstanceNameFromSession 获取当前session的ProductInstance, 分别返回
// func getProductInstanceNameFromUrl(r *http.Request) (product, instance string) {
// 	path := r.URL.Path
// 	if path[0] == '/' {
// 		path = path[1:]
// 	}
// 	pathArray := strings.Split(path, "/")
// 	//按url格式, 肯定要>=3
// 	if len(pathArray) < 3 {
// 		return
// 	}
// 	productName := strings.ToLower(pathArray[0])
// 	if _, ok := ProductMap[productName]; ok {
// 		return productName, strings.ToLower(pathArray[1])
// 	}
// 	return

// }

//getProductInstanceNameFromSession 获取当前session的ProductInstance, 分别返回
func getProductInstanceNameFromSession(sessionKey string) (product, instance string) {
	s := Sessions.Get(sessionKey)
	if s == nil {
		return
	}
	p := strings.Split(s.ProductInstance, "-")
	if len(p) != 2 {
		return
	}
	return p[0], p[1]
}

//getInstanceIDFromSession :从sesison中获取实例id
// func getInstanceIDFromSession(sessionKey string) int64 {
// 	s := Sessions.Get(sessionKey)
// 	if s == nil {
// 		return 0
// 	}

// 	instanceID := s.Get("instanceid")
// 	if instanceID == nil {
// 		return 0
// 	}
// 	return instanceID.(int64)
// }

//从sesison中获取userid
// func getUserIDFromSession(sessionKey string) int64 {
// 	s := Sessions.Get(sessionKey)
// 	if s == nil {
// 		return 0
// 	}
// 	u := s.Get("user")
// 	if u == nil {
// 		return 0
// 	}

// 	userInfo, ok := u.(url.Values)
// 	if ok == false || userInfo == nil {
// 		return 0
// 	}
// 	idString := userInfo.Get("userId")
// 	id, _ := strconv.ParseInt(idString, 10, 64)
// 	return id
// }

//从sesison中获取wxId
// func getWxIDFromSession(sessionKey string) string {
// 	s := Sessions.Get(sessionKey)
// 	if s == nil {
// 		return ""
// 	}
// 	u := s.Get("user")
// 	if u == nil {
// 		return ""
// 	}

// 	userInfo, ok := u.(url.Values)
// 	if ok == false || userInfo == nil {
// 		return ""
// 	}
// 	idString := userInfo.Get("wxid")

// 	return idString
// }

//========================================================

//TransLog 周期上传日志程序
//@param s server base url
func TransLog(s string) {
	var filename string
	var server string
	server = strings.TrimRight(s, "/") + LOGSERVER
	//先延时
	time.Sleep(time.Second * 1)

	t := time.Now()
	filename = "useraction." + t.Format(TIME_FORMAT) + ".log"
	f, err1 := os.Create(filename) //, os.O_APPEND, 0666) //打开文件
	if err1 != nil {
		panic(err1.Error())
	}
	defer f.Close()

	//无限循环
	for {
		for _, ul := range logs.Data {
			if len(ul.Record) > 0 {
				go postLog(server, ul, f)
				// go postLog(server, ul, nil)
			}
		}
		time.Sleep(10 * time.Second)
	}
}

//postLog 上传日志数据, 成功后删除
func postLog(server string, ul UserLog, logfile *os.File) {
	var length int
	defer func() {
		if e := recover(); e != nil {
			// e is the interface{} typed-value we passed to panic()
			log.Println("userlog.postLog() recover a panic: ", e)
		}
	}()
	// log.Printf("call in postLog UserLog is :%v \n\r", ul)
	length = len(ul.Record)
	if length == 0 {
		return
	}
	logs.mutex.Lock()
	defer logs.mutex.Unlock()

	b, err := json.Marshal(ul.Record)
	if err != nil {
		log.Println("json.Marshal(   logData) error:", err)
		return
	}
	// 写到文件中
	if logfile != nil {
		logfile.WriteString(string(b))
		logfile.WriteString("\n\r")
	}

	data := make(url.Values)
	data["data"] = []string{string(b)}
	// jsonstr, err := json.Marshal(data)
	// fmt.Printf("%s \n\r", jsonstr)
	if writeToServer {
		res, err := http.PostForm(server, data)
		// fmt.Printf("%v \n\r", data)
		if err != nil {
			log.Println("error in uwrlog.postLog() when call  http.PostForm(server, data):", err)
			return
		}
		defer res.Body.Close()
		// 读取返回值
		result, err := ioutil.ReadAll(res.Body)
		if err != nil {
			log.Println(result)
			log.Printf("writeToServer status=%s, body=%s\n\r", res.Status, result)
			return
		}
		// fmt.Printf("%s", result)
	}

	//成功后要删除这个日志
	logs.Delete(ul.Key)

	return
}

// ================= helper ==================

//WriteOrgProductToSession 由主程序负责完成, 日志模块不再处理
//WriteOrgProductToSession 把OrgProduct中获取的org, 产品实例id等数据保存到Session
//@param re []byte : handle.Data.Run() 调用OrgProduct接口返回的数据
// func WriteOrgProductToSession(s *session.Session, re []byte, handle string) {
// 	var info map[string]interface{}
// 	resJson, err := simplejson.NewJson(re)
// 	if err != nil || resJson == nil {
// 		return
// 	}
// 	status, _ := resJson.Get("status").Int()
// 	if status != 1 {
// 		return
// 	}
// 	data, err := resJson.Get("data").Map()
// 	if err != nil {
// 		return
// 	}
// 	switch handle {
// 	case "OrgProduct":
// 		info = data
// 	case "WebInfo":
// 		if base, ok := data["base"]; ok {
// 			info, ok = base.(map[string]interface{})
// 			if !ok {
// 				return
// 			}
// 		}

// 	default:
// 		return
// 	}
// 	instanceID, _ := info["id"] // json.Number :string
// 	if v, ok := instanceID.(json.Number); ok {
// 		number, _ := strconv.ParseInt(string(v), 10, 64)
// 		s.Set("instanceid", number)
// 	}
// 	productID, _ := info["productId"] // json.Number: string
// 	if v, ok := productID.(json.Number); ok {
// 		number, _ := strconv.ParseInt(string(v), 10, 64)
// 		s.Set("productid", number)
// 	} else if v, ok := productID.(int64); ok {
// 		s.Set("productid", v)
// 	}

// }

//早已弃用, 避免误解,完全注释掉
//WriteWeixinUserInfoToSession 把微信登录后的用户信息写入session中
// func WriteWeixinUserInfoToSession(s *session.Session, r *http.Request) {
// 	r.ParseForm()
// 	s.Set("user", r.Form)
// }

//早已弃用, 避免误解,完全注释掉
//WriteUserInfoToSession 把登录后获得的用户信息保存到Session
//@param re []byte : handle.Data.Run() 调用MicroJournalUser.login接口返回的数据
// func WriteUserInfoToSession(s *session.Session, re []byte, handle string) {
// 	var info map[string]interface{}
// 	resJson, err := simplejson.NewJson(re)
// 	if err != nil || resJson == nil {
// 		return
// 	}
// 	status, _ := resJson.Get("status").Int()
// 	if status != 1 {
// 		return
// 	}
// 	data, err := resJson.Get("data").Map()
// 	if err != nil {
// 		return
// 	}
// 	switch handle {
// 	case "UserLogin":
// 		info = data
// 	case "WebInfo":
// 		if base, ok := data["base"]; ok {
// 			info, ok = base.(map[string]interface{})
// 			if !ok {
// 				return
// 			}
// 		}

// 	default:
// 		return
// 	}
// 	instanceID, _ := info["id"] // json.Number :string
// 	if v, ok := instanceID.(json.Number); ok {
// 		number, _ := strconv.ParseInt(string(v), 10, 64)
// 		s.Set("user", number)
// 	}

// }

/*  WriteOrgProductToSession 接收数据 []byte
OrgProduct
  re {
	"status" : 1,
	"info" : "请求成功",
	"data" : {
		"article" : 0,
		"book" : 2178,
		"endTime" : "2017-08-30 00:00:00",
		"id" : 2178,  // instanceID
		"magazine" : 2178,
		"name" : "sf-wk",
		"paper" : 2178,
		"productId" : 5,
		"startTime" : "2016-08-30 00:00:00",
		"style" : "",
		"title" : "丰味书屋"
	}
}

WebInfo

{
	"status" : 1,
	"info" : "请求成功",
	"data" : {
		"base" : {
			"article" : 0,
			"book" : 0,
			"endTime" : 1.467216e+09,
			"id" : 10265,
			"magazine" : 0,
			"name" : "whu",
			"paper" : 0,
			"productId" : 3,
			"startTime" : 1.3792608e+09,
			"style" : "",
			"title" : "武汉大学图书馆",
			"type" : 0
		},
		"operationList" : [{
				"right" : "trial",
				"value" : 1
			}, {
				"right" : "scanqrcode",
				"value" : 1
			}, {
				"right" : "needlogin",
				"value" : 1
			}
		],
		"orgInfo" : {
			"address" : "",
			"contactMan" : "",
			"name" : "武汉大学图书馆",
			"orgCode" : "whu",
			"orgId" : 2087,
			"phone" : "",
			"slogan" : "武汉大学"
		}
	}
}

*/
