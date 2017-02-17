package handle

/**
* 1. url解析资源: product/instance/page/genre/category/mid/iid/param/key@value
* 2. 资源缓存： instance/page/genre/category/mid/iid/param/
 */
import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"math/rand"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"

	"Jcms2.1/hash"
	"Jcms2.1/session"
	"crypto/md5"
	"encoding/hex"
	"time"
)

// Data 数据处理类
type Data struct {
	Host     string             // 请求基址
	Server   string             // 服务器地址
	Session  *session.Session   // 用户session
	Source   *Source            //数据源
	Routings map[string]*Router // 数据处理由路
	update   bool               //是否更新数
}

/**
* 返回结构
 */

/**
* Data类处理开始
* 非空值即有效
* 两个左划线（a//c）中间即为空值
 */

// Run 获取数据
func (d *Data) Run() []byte {
	//获取页面数据的两个基本条件
	if d.Source.GetProduct() == "" || d.Source.GetInstance() == "" {
		return nil
	}

	// 资源数据部分
	d.Routings = make(map[string]*Router)
	d.Routings["WebInfo"] = &Router{d.OrgProduct, ""}                  //站点全部
	d.Routings["OrgInfo"] = &Router{d.OrgProduct, "orgInfo"}           //product/instance/page/0，机构值
	d.Routings["OrgProduct"] = &Router{d.OrgProduct, "base"}           //product/instance/page，机构产品实例值
	d.Routings["SourceCategory"] = &Router{d.SourceCategory, ""}       //product/instance/page/1，资源分类，分类单id从instance info中取
	d.Routings["CategorySub"] = &Router{d.CategorySub, ""}             //product/instance/page/1/1,2,3，资源分类，基于分类id获取其子类
	d.Routings["CategoryIssue"] = &Router{d.CategoryIssue, ""}         //product/instance/page/1/，资源分类期列表，默认分类， issue值为最新有效期
	d.Routings["CategoryIssueTotal"] = &Router{d.CategoryIssue, ""}    //product/instance/page/1/total，资源分类期列表项总数，默认分类， issue值为最新有效期
	d.Routings["SourceInfo"] = &Router{d.SourceInfo, ""}               //product/instance/page/1/0/137，杂志值，中国经济周刊id为137
	d.Routings["SourceIssue"] = &Router{d.SourceIssue, ""}             //product/instance/page/1/0/137/，杂志期列表
	d.Routings["SourceYear"] = &Router{d.SourceYear, ""}               //product/instance/page/1/0/137/0/，杂志年度列表
	d.Routings["YearMonthIssue"] = &Router{d.YearMonthIssue, ""}       //product/instance/page/1/0/137/0/201512，杂志年度月份列表
	d.Routings["YearIssue"] = &Router{d.YearIssue, ""}                 //product/instance/page/1/0/137/0/2016，杂志该年期列表
	d.Routings["IssueInfo"] = &Router{d.IssueInfo, ""}                 //product/instance/page/1/0/137/208156，杂志期值
	d.Routings["IssueCatalog"] = &Router{d.IssueCatalog, ""}           //product/instance/page/1/0/137/208156/catagory，杂志期目录
	d.Routings["IssueText"] = &Router{d.IssueText, ""}                 //product/instance/page/1/0/137/208156/text，整本杂志的文本文件
	d.Routings["PaperCatalog"] = &Router{d.PaperCatalog, ""}           //product/instance/page/2/0/137/208156/catagory，杂志期目录
	d.Routings["PaperArea"] = &Router{d.PaperArea, ""}                 //product/instance/page/2/0/0/0/area，报纸地址信息
	d.Routings["PaperText"] = &Router{d.PaperText, ""}                 //product/instance/page/1/0/137/208156/text，整本报纸的文本文件
	d.Routings["PaperProvince"] = &Router{d.PaperProvince, ""}         //product/instance/page/0/province, 报纸省份
	d.Routings["PaperInMagazine"] = &Router{d.PaperInMagazine, ""}     //product/instance/page/0/province, 签约报纸
	d.Routings["SourceSearch"] = &Router{d.SourceSearch, ""}           //product/instance/page/0/search@key,资源搜索
	d.Routings["SourceSearchInCategory"] = &Router{d.SourceSearch, ""} //product/instance/page/0/0/search@key,分类内资源搜索
	d.Routings["SourceIsFree"] = &Router{d.SourceIsFree, ""}           //product/instance/page/0/search@key,免费资源

	// 用户数据部分
	d.Routings["UserCookie"] = &Router{d.UserCookie, ""}                   //product/instance/page/1/key@value，用户cookie
	d.Routings["UserInfo"] = &Router{d.UserInfo, ""}                       //个人信息
	d.Routings["UserPasswordSet"] = &Router{d.UserPasswordSet, ""}         //设置个人信息
	d.Routings["UserLogin"] = &Router{d.UserLogin, ""}                     // 用户登录
	d.Routings["UserLogout"] = &Router{d.UserLogout, ""}                   // 用户登录
	d.Routings["OrgLogin"] = &Router{d.OrgLogin, ""}                       // 机构登录
	d.Routings["UserWxInfoSend"] = &Router{d.UserWxInfoSend, ""}           // 用户微信信息上传
	d.Routings["UserSourceItems"] = &Router{d.UserSourceItems, ""}         // 用户收集信息，获取
	d.Routings["UserCollectAdd"] = &Router{d.UserCollectAdd, ""}           // 用户收集信息，添加
	d.Routings["UserCollectDel"] = &Router{d.UserCollectDel, ""}           // 用户收集信息，删除
	d.Routings["UserCollectClear"] = &Router{d.UserCollectClear, ""}       // 用户收集信息，清空
	d.Routings["UserLastReaderAdd"] = &Router{d.UserLastReaderAdd, ""}     // 用户最近阅读信息，添加
	d.Routings["UserLastReaderDel"] = &Router{d.UserLastReaderDel, ""}     // 用户最近阅读信息，删除
	d.Routings["UserLastReaderClear"] = &Router{d.UserLastReaderClear, ""} // 用户最近阅读信息，清空
	d.Routings["UserShopCartAdd"] = &Router{d.UserShopCartAdd, ""}         // 添加到购物车
	d.Routings["UserShopCartDel"] = &Router{d.UserShopCartDel, ""}         // 从购物车删除
	d.Routings["UserShopCartClear"] = &Router{d.UserShopCartClear, ""}     // 清空购物车
	d.Routings["UserOrderAdd"] = &Router{d.UserOrderAdd, ""}               // 用户最添加订单
	d.Routings["UserOrderDel"] = &Router{d.UserOrderDel, ""}               // 用户最取消订单
	d.Routings["UserOrderConfirm"] = &Router{d.UserOrderConfirm, ""}       // 用户最确认订单支付是否成功
	d.Routings["UserBuyOrder"] = &Router{d.UserBuyOrder, ""}               // 获取用户订单
	d.Routings["UserInfoSetting"] = &Router{d.UserInfoSetting, ""}         // 获取用户信息
	d.Routings["UserVerifyCode"] = &Router{d.UserVerifyCode, ""}           // 获取验证码
	d.Routings["UserFromTouchQrcode"] = &Router{d.UserFromTouchQrcode, ""} // 获取验证码

	// 资源部分
	d.Routings["ResourceOperateTimes"] = &Router{d.ResourceOperateTimes, ""}       //对资源项进行点赞，分享，评论，收藏，笔记的次数记录
	d.Routings["ResourceAddComment"] = &Router{d.ResourceAddComment, ""}           //对资源添加评论
	d.Routings["ResourceGetComment"] = &Router{d.ResourceGetComment, ""}           //获取资源评论
	d.Routings["ResourceGetCommentTotal"] = &Router{d.ResourceGetCommentTotal, ""} //获取资源评论项总数
	d.Routings["ResourceByHtml"] = &Router{d.ResourceByHtml, ""}                   //根据资源内容项获取资源评论
	d.Routings["ResourceNotesCount"] = &Router{d.ResourceNotesCount, ""}           //根据资源内容项获取笔记总数
	d.Routings["ResourceNotesList"] = &Router{d.ResourceNotesList, ""}             //根据资源内容项获取笔记列表

	d.Routings["WhuSearch"] = &Router{d.WhuSearch, ""}   //武大图书馆搜索页面随机数获取
	d.Routings["FileUpload"] = &Router{d.FileUpload, ""} //插件文件上传

	// 插件点赞,收藏,分享,评论,笔记等操作
	d.Routings["MicroJournalUserOperateCount"] = &Router{d.MicroJournalUserOperateCount, ""}   // 获取总数
	d.Routings["MicroJournalUserOperateList"] = &Router{d.MicroJournalUserOperateList, ""}     // 获取列表
	d.Routings["MicroJournalUserAddOperate"] = &Router{d.MicroJournalUserAddOperate, ""}       // 添加
	d.Routings["MicroJournalUserDeleteOperate"] = &Router{d.MicroJournalUserDeleteOperate, ""} // 删除

	d.Source.Init()
	index := d.Source.Data.Get("handle")
	log.Println(".............", d.Source.GetArgs("cache"))
	d.update = !(d.Source.GetArgs("cache") == "")
	switch index {
	case "UserWeiPay":
		return d.UserWeiPay()
	case "UserAliPay":
		return d.UserAliPay()
	case "ResourceHash":
		re := d.ResourceHash(d.Source.GetIid(), d.Source.GetMid(), d.Source.GetArgs("start"), d.Source.GetArgs("end"))
		return []byte(re)
	}
	re := d.Router(index, "")
	return re.Byte()
}

// Router 路由器
func (d *Data) Router(index, key string) *Result {
	if index == "" {
		return &Result{0, "没有指定路由器分路的值", nil}
	}

	// 获取路由
	router, ok := d.Routings[index]
	if !ok {
		return &Result{0, "该值在路由器中未定义：" + index, nil}
	}

	// 返回接口原始数据
	re := router.f()
	if re == nil {
		return &Result{0, "没有相关数据，请留意", nil}
	}

	//指定内容
	if key == "" {
		key = router.k
	}

	// 出错或无指定内容
	if re.Status == 0 || key == "" {
		return re
	}

	//返回指定
	r, ok := re.Data.(map[string]interface{})
	if !ok {
		return re
	}
	re.Data = r[key]
	return re
}

// InstanceResult 请求接口
func InstanceResult(in *Interface) *Result {
	re := in.Request()
	if re.Status > 0 {
		return &Result{0, re.ErrorCode, nil}
	}
	return &Result{1, "请求成功", re.Data}
}

// ResourceHash 页面hash
func (d *Data) ResourceHash(iid, mid, start, end string) string {
	if iid == "" || mid == "" {
		return ""
	}
	s, _ := strconv.Atoi(start)
	e, _ := strconv.Atoi(end)
	var a []string
	for ; s <= e; s++ {
		a = append(a, hash.Picture(iid, mid, s, "magook"))
	}
	return strings.Join(a, ",")
}

// OrgProduct 机构值
func (d *Data) OrgProduct(args ...string) *Result {
	var (
		product  string // 产品名称
		instance string // 实例名称
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			product = args[0]
		}
		if len(args) > 1 {
			instance = args[1]
		}
	}

	if product == "" {
		product = d.Source.GetProduct()
	}
	if product == "" {
		log.Println("Instance func product is nil")
		return &Result{0, "Product is nil", nil}
	}

	if instance == "" {
		instance = d.Source.GetInstance()
	}
	if instance == "" {
		log.Println("Instance func instance is nil")
		return &Result{0, "Instance is nil", nil}
	}

	// 获取杂志信息, 单品种微刊
	if instance == "magazine" {
		re := d.Router("SourceInfo", "")
		r := d.OrgProductWithMagazineInfo(re.Data)
		if r == nil {
			return nil
		}
		return &Result{
			1,
			"杂志信息转机构信息",
			r,
		}
	}
	return WebInfo(d.Server, product, instance, d.update)
}

// SourceCategory 资源分类
func (d *Data) SourceCategory(args ...string) *Result {
	var (
		instance string // 实例id
		genre    string // 资源种类
		category string //分类id组
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			instance = args[0]
		}
		if len(args) > 1 {
			genre = args[1]
		}
		if len(args) > 2 {
			category = args[2]
		}
	}

	if instance == "" {
		instance = d.KeyWithInstance("id")
	}

	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}

	if category == "" {
		var a = [...]string{"", "magazine", "paper", "book", "article"}
		i, _ := strconv.Atoi(genre)
		category = d.KeyWithInstance(a[i])
	}
	if category == "" {
		log.Println("SourceCategory func category is nil")
		return &Result{0, "没有资源分类单元值", nil}
	}

	u := fmt.Sprintf("%s/Resource.categoryList/instanceId_%s/resourceType_%s/categoryId_%s.txt", d.Server, instance, genre, category)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// CategorySub 资源分类子类
func (d *Data) CategorySub(args ...string) *Result {
	var (
		instance string // 实例id
		genre    string // 资源种类
		category string // 分类组id
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			instance = args[0]
		}
		if len(args) > 1 {
			genre = args[1]
		}
		if len(args) > 2 {
			category = args[2]
		}
	}
	instance = d.KeyWithInstance("id")
	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}
	if category == "" {
		category = d.InstanceCategory(genre, "0")
	}
	if category == "" {
		return &Result{0, "Category is nil", nil}
	}

	u := fmt.Sprintf("%s/Resource.catalogByIds/instanceId_%s/resourceType_%s/ids_%s.txt", d.Server, instance, genre, category)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// CategoryIssue 实例资源分类列表
func (d *Data) CategoryIssue(args ...string) *Result {
	var (
		instance string // 实例id
		genre    string // 资源品种
		category string // 分类id组
		page     string //分页的页码
		number   string //按多少数目分页
		local    string // 本地信息
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			instance = args[0]
		}
		if len(args) > 1 {
			genre = args[1]
		}
		if len(args) > 2 {
			category = args[2]
		}
		if len(args) > 3 {
			page = args[3]
		}
		if len(args) > 4 {
			number = args[4]
		}
		if len(args) > 5 {
			local = args[5]
		}
	}

	instance = d.KeyWithInstance("id")
	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}

	if category == "" {
		category = d.InstanceCategory()
	}
	if category == "" {
		return &Result{0, "分类参数未能获得", nil}
	}

	if page == "" {
		page = d.Source.GetArgs("page")
	}
	p, _ := strconv.Atoi(page)
	if page != "" && p == 0 {
		p = 1
	}

	if number == "" {
		number = d.Source.GetArgs("num")
	}
	n, _ := strconv.Atoi(number)
	if page != "" && n == 0 {
		n = 20
	}

	if local == "" {
		local = d.Source.GetArgs("local")
	}
	if genre != "2" {
		local = ""
	}
	if local != "" {
		local = fmt.Sprintf("%s/Resource.paperIssuesMap,%s", d.Server, local)
	}

	u := fmt.Sprintf("%s/Resource.categoryIssues/instanceId_%s/resourceType_%s/categoryId_%s.txt", d.Server, instance, genre, category)
	return InstanceResult(&Interface{URL: u, Update: d.update, Page: p, Number: n, Local: local})
}

// SourceInfo 品种信息
func (d *Data) SourceInfo(args ...string) *Result {
	var (
		genre string // 资源种类
		mid   string // 资源id
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			genre = args[0]
		}
		if len(args) > 1 {
			mid = args[1]
		}
	}

	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}

	if mid == "" {
		mid = d.Source.GetMid()
	}
	if mid == "" {
		mid = d.Source.GetArgs("mid")
	}

	if mid == "" {
		log.Println("SourceInfo func mid is nil")
		return &Result{0, "没有资源Id", nil}
	}
	u := fmt.Sprintf("%s/Resource.resourcesById/resourceType_%s/resourceId_%s.txt", d.Server, genre, mid)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// SourceIssue 杂志期列表
func (d *Data) SourceIssue(args ...string) *Result {
	return &Result{1, "空方法， 未写实现", nil}
}

// SourceYear 资源年列表
func (d *Data) SourceYear(args ...string) *Result {
	var (
		genre string // 资源种类
		mid   string // 资源id
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			genre = args[0]
		}
		if len(args) > 1 {
			mid = args[1]
		}
	}

	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}

	if mid == "" {
		mid = d.Source.GetMid()
	}
	if mid == "" {
		re := d.Router("CategoryIssue", "")
		data := ReArrayMap(re.Data)
		if data == nil || len(data) == 0 {
			return &Result{0, "没有资源品种id值为空", nil}
		}
		v, ok := data[0]["magazineid"]
		if !ok {
			log.Println("SourceYear func mid is nil")
			return &Result{0, "没有资源品种id值", nil}
		}
		mid = v
	}
	u := fmt.Sprintf("%s/Resource.pastYearList/resourceType_%s/resourceId_%s.txt", d.Server, genre, mid)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// YearIssue 资源年的册列表
func (d *Data) YearIssue(args ...string) *Result {
	var (
		genre string // 资源种类
		mid   string // 资源id
		year  string // 年度
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			genre = args[0]
		}
		if len(args) > 1 {
			mid = args[1]
		}
		if len(args) > 2 {
			year = args[2]
		}
	}

	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}

	if mid == "" {
		mid = d.Source.GetMid()
	}
	if mid == "" {
		log.Println("YearIssue func mid is nil")
		return &Result{0, "没有资源品种id值", nil}
	}

	if year == "" {
		year = d.Source.GetParam()
	}
	if year == "" {
		re := d.Router("SourceYear", "")
		data := ReArrayMap(re.Data)
		if data == nil || len(data) == 0 {
			return &Result{0, "没有资源品种年度值为空", nil}
		}
		v, ok := data[0]["year"]
		if !ok {
			log.Println("YearMonthIssue func year is nil")
			return &Result{0, "没有资源品种年度值", nil}
		}
		year = v
	}
	u := fmt.Sprintf("%s/Resource.yearList/resourceType_%s/resourceId_%s/year_%s.txt", d.Server, genre, mid, year)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// YearMonthIssue 资源某年某月列表
func (d *Data) YearMonthIssue(args ...string) *Result {
	var (
		genre string // 资源种类
		mid   string // 资源id
		ym    string // 年度及月份
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			genre = args[0]
		}
		if len(args) > 1 {
			mid = args[1]
		}
		if len(args) > 2 {
			ym = args[2]
		}
	}

	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}

	if mid == "" {
		mid = d.Source.GetMid()
	}
	if mid == "" {
		re := d.Router("CategoryIssue", "")
		data := ReArrayMap(re.Data)
		if data == nil || len(data) == 0 {
			return &Result{0, "没有资源品种id值为空", nil}
		}
		v, ok := data[0]["magazineid"]
		if !ok {
			log.Println("YearMonthIssue func mid is nil")
			return &Result{0, "没有资源品种id值", nil}
		}
		mid = v
	}

	if ym == "" {
		ym = d.Source.GetParam()
	}
	if ym == "" {
		re := d.Router("SourceYear", "")
		data := ReArrayMap(re.Data)
		if data == nil || len(data) == 0 {
			return &Result{0, "没有资源品种年度值为空", nil}
		}
		v, ok := data[0]["year"]
		if !ok {
			log.Println("YearMonthIssue func year is nil")
			return &Result{0, "没有资源品种年度值", nil}
		}
		ym = v + "01"
	}
	u := fmt.Sprintf("%s/Resource.yearList/resourceType_%s/resourceId_%s/yearMonth_%s.txt", d.Server, genre, mid, ym)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// IssueInfo 期册信息
func (d *Data) IssueInfo(args ...string) *Result {
	var (
		genre  string // 资源种类
		iid    string // 资源项id
		detail string // 是否显示明细
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			genre = args[0]
		}
		if len(args) > 1 {
			iid = args[1]
		}
		if len(args) > 2 {
			detail = args[2]
		}
	}

	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}

	if iid == "" {
		iid = d.Source.GetIid()
	}
	if iid == "" {
		return &Result{0, "没有资源期本值", nil}
	}

	if detail == "" {
		detail = d.Source.GetArgs("detail")
	}
	if detail == "" {
		detail = "0"
	}

	u := fmt.Sprintf("%s/Resource.issueInfoList/resourceType_%s/issueIds_%s/isDetail_%s.txt", d.Server, genre, iid, detail)
	re := InstanceResult(&Interface{URL: u, Update: d.update})
	data := ReArrayMap(re.Data)
	for k, v := range data {
		data[k]["hash"] = d.ResourceHash(iid, d.Source.GetMid(), "0", v["count"])
	}
	re.Data = data
	return re
}

// IssueCatalog 资源各册目录
func (d *Data) IssueCatalog(args ...string) *Result {
	var (
		genre string // 资源种类
		iid   string // 资源项id
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			genre = args[0]
		}
		if len(args) > 1 {
			iid = args[1]
		}
	}

	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}

	if iid == "" {
		iid = d.Source.GetIid()
	}
	if iid == "" {
		log.Println("IssueCatalog func mid is nil")
		return &Result{0, "没有资源issueid值", nil}
	}

	u := fmt.Sprintf("%s/Resource.catalogInfo/resourceType_%s/categoryId_%s.txt", d.Server, genre, iid)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// PaperCatalog 资源各册目录
func (d *Data) PaperCatalog(args ...string) *Result {
	args = append([]string{"2"}, args...)
	return d.IssueInfo(args...)
}

// IssueText 资源整本文本文件
func (d *Data) IssueText(args ...string) *Result {
	var (
		genre string // 资源种类
		iid   string // 资源项id
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			genre = args[0]
		}
		if len(args) > 1 {
			iid = args[1]
		}
	}

	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}

	if iid == "" {
		iid = d.Source.GetIid()
	}
	if iid == "" {
		log.Println("IssueCatalog func mid is nil")
		return &Result{0, "没有资源issueid值", nil}
	}

	u := fmt.Sprintf("%s/Resource.issueText/resourceType_%s/categoryId_%s.txt", d.Server, genre, iid)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// PaperText 资源整本文本文件
func (d *Data) PaperText(args ...string) *Result {
	//资源种类ext
	genre := d.Source.GetGenre()
	if genre == "" || genre != "2" {
		genre = "2"
	}
	// 品种

	page := d.Source.GetArgs("text")
	if page == "" {
		log.Println("PaperText func textPage is nil")
		return &Result{0, "没有资源issueid值", nil}
	}

	u := fmt.Sprintf("%s/Resource.articleContent/resourceType_%s/articleId_%s.txt", d.Server, genre, page)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// PaperProvince 根据省份获取报纸资源(Resource.paperIssuesByArea)
func (d *Data) PaperProvince(args ...string) *Result {
	var (
		instance string
		province string // 资源项id
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			province = args[0]
		}
	}
	if instance == "" {
		instance = d.KeyWithInstance("id")
	}

	if province == "" {
		province = d.Source.GetArgs("province")
	}
	if province == "" {
		return &Result{0, "省份名字不能为空", nil}
	}

	u := fmt.Sprintf("%s/Resource.paperIssuesByArea/instanceId_%s/province_%s.txt", d.Server, instance, province)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// PaperInMagazine 签约的报纸
func (d *Data) PaperInMagazine(args ...string) *Result {
	u := fmt.Sprintf("%s/Resource.paperInfoListByCodes", d.Server)
	return InstanceResult(&Interface{URL: u})
}

// PaperArea 根据省份获取报纸资源(Resource.paperIssuesByArea)
func (d *Data) PaperArea(args ...string) *Result {
	u := fmt.Sprintf("%s/Resource.paperIssuesMap", d.Server)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// SourceSearch 资源搜索
func (d *Data) SourceSearch(args ...string) *Result {
	var (
		instance string // 实例id
		genre    string // 资源种类
		category string // 资源分类id
		word     string // 搜索的关键词
		third    string // 第三方需要的数据
	)

	//
	if args != nil {
		if len(args) > 0 {
			instance = args[0]
		}
		if len(args) > 1 {
			genre = args[1]
		}
		if len(args) > 2 {
			category = args[2]
		}
		if len(args) > 3 {
			word = args[3]
		}
		if len(args) > 4 {
			third = args[4]
		}
	}

	var (
		a []string
		m = map[string]interface{}{
			"magazines": make([]interface{}, 0),
			"books":     make([]interface{}, 0),
			"papers":    make([]interface{}, 0),
		}
	)

	if instance == "" {
		instance = d.KeyWithInstance("id")
	}

	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		a = []string{"1", "2", "3"}
	} else {
		a = strings.Split(genre, ",")
	}

	if word == "" {
		word = d.Source.GetArgs("search")
	}
	if word == "" || word == "0" {
		return &Result{0, "没有搜索的关键词", nil}
	}

	if third == "" {
		third = d.Source.GetArgs("third")
	}

	if third != "" && third != "0" {
		third = "http://" + d.Host + "/" + d.Source.GetProduct() + "/" + d.Source.GetInstance() + "/%s/" + d.Source.GetGenre() + "/0/%s/%s"
	}

	for _, v := range a {
		category = d.InstanceCategory("0", instance, v)
		if category == "" {
			continue
		}
		u := fmt.Sprintf("%s/Resource.categoryIssues/instanceId_%s/resourceType_%s/categoryId_%s.txt", d.Server, instance, v, category)
		r := InstanceResult(&Interface{URL: u, Update: d.update, Word: word, ProductInstance: third})
		// 返回错误信息
		if r.Status == 0 {
			continue
		}
		// 初始数据
		switch v {
		case "1":
			m["magazines"] = r.Data
		case "2":
			m["papers"] = r.Data
		case "3":
			m["books"] = r.Data
		}
	}
	if m == nil {
		return &Result{0, "数据输出错误，请留意", nil}
	}
	return &Result{1, "请求成功，请留意", m}
}

// SourceIsFree 资源各册目录
func (d *Data) SourceIsFree(args ...string) *Result {
	var (
		instance string // 实例id
		genre    string // 资源种类
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			instance = args[0]
		}
		if len(args) > 1 {
			genre = args[1]
		}
	}

	if instance == "" {
		instance = d.KeyWithInstance("id")
	}

	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = "1,2,3"
	}
	u := fmt.Sprintf("%s/Resource.freeIssueInfoList/instanceId_%s/resourceTypes_%s.txt", d.Server, instance, genre)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

/**
* 用户部分
 */

// UserCookie 返回Session值
func (d *Data) UserCookie(args ...string) *Result {
	if d.Session.ID == "" {
		return &Result{1, "未获取到cookies id, 请留意", nil}
	}
	return &Result{1, "", d.Session.ID}
}

// UserInfo 用户信息
func (d *Data) UserInfo(args ...string) *Result {
	re := d.Session.Get("user")
	return &Result{1, "", re}
}

// UserPasswordSet 用户信息
func (d *Data) UserPasswordSet(args ...string) *Result {
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		log.Println("UserInfoSet userId is null")
		return nil
	}
	password := d.Source.GetArgs("password")
	if password == "" {
		log.Println("UserInfoSet password is null")
		return nil
	}
	u := fmt.Sprintf("%s/MicroJournalUser.reviseUserInfo/userId_%s/password_%s.txt", d.Server, user, password)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserLogout 用户退出，
func (d *Data) UserLogout(args ...string) *Result {
	d.Session.Set("user", nil)
	return &Result{1, "已安全退出，请留意", nil}
}

// OrgUserLogin 机构用户登录，
func (d *Data) OrgUserLogin(args ...string) *Result {
	product := d.KeyWithInstance("productId")
	if product == "" || product == "0" {
		log.Println("OrgUserLogin func product is nil")
		return &Result{0, "没有实例名称", nil}
	}
	username := d.Source.GetArgs("username")
	password := d.Source.GetArgs("password")
	if username == "" || password == "" {
		return &Result{0, "用户名称或密码为空", nil}
	}
	u := fmt.Sprintf("%s/OrganizationUser.login/productId_%s/userName_%s/password_%s/loginType_3.txt", d.Server, product, username, password)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

/**
* type:登录方式， 1. 机器码登录方式, 2. ip地址， 3. 账号+密码， 4. 手机号+验证码，  5. 手机号+密码， 6. 第三方id(微信id)
* instanceId, 实例
 */
// UserLogin 个人用户信息(MicroJournalUser.userInfo)
func (d *Data) UserLogin(args ...string) *Result {
	instanceID := d.KeyWithInstance("id")
	userName := d.Source.GetArgs("username")
	password := d.Source.GetArgs("password")
	t := d.Source.GetArgs("type")

	if instanceID == "" || userName == "" {
		log.Println("instanceId or username is nil")
		return nil
	}
	u := fmt.Sprintf("%s/MicroJournalUser.login/instanceId_%s/userName_%s/password_%s/loginType_%s.txt", d.Server, instanceID, userName, password, t)
	re := InstanceResult(&Interface{URL: u, Update: d.update})
	if re.Status == 0 {
		return re
	}
	log.Println(re.Data)
	d.Session.Set("user", re.Data)
	return re
}

// OrgLogin 机构用户信息
func (d *Data) OrgLogin(args ...string) *Result {
	productId := d.KeyWithInstance("productId")
	userName := d.Source.GetArgs("username")
	password := d.Source.GetArgs("password")
	t := d.Source.GetArgs("type")

	if productId == "" || userName == "" {
		log.Println("instanceId or username is nil")
		return nil
	}
	u := fmt.Sprintf("%s/OrganizationUser.login/productId_%s/userName_%s/password_%s/loginType_%s.txt", d.Server, productId, userName, password, t)
	re := InstanceResult(&Interface{URL: u, Update: d.update})
	if re.Status == 0 {
		return re
	}
	var data = map[string]interface{}{
		"userId":   d.KeyWithInstance("id"),
		"userName": d.KeyWithInstance("name"),
	}
	d.Session.Set("user", data)
	return &Result{1, "机构登录成功", data}
}

// UserWxInfoSend 用户微信信息上传
func (d *Data) UserWxInfoSend(args ...string) *Result {
	d.Session.Set("user", d.Source.Data)
	return &Result{1, "", d.Source.Data}
}

// UserSourceItems 用户资源请求
func (d *Data) UserSourceItems(args ...string) *Result {
	tag := d.Source.GetArgs("user")
	log.Println("UserSourceItems", tag)
	if tag == "" {
		log.Println("UserSourceItems func user is nil")
		return nil
	}
	var m = map[string]*Router{
		"Collect":       &Router{d.UserCollectGet, ""},       //收藏
		"LastReader":    &Router{d.UserLastReadGet, ""},      //最近阅读
		"ShopCart":      &Router{d.UserShopCartGet, ""},      //购物车
		"ResourceShelf": &Router{d.UserResourceShelfGet, ""}, //资源架
		"ResourceVip":   &Router{d.UserResourceShelfGet, ""}, //资源架
	}
	f, ok := m[tag]
	if !ok {
		log.Println("UserSourceItems func, map func is nil", tag)
		return nil
	}
	return f.f()
}

// UserInfoSettingGet 用户收集信息，获取
func (d *Data) UserInfoSetting(args ...string) *Result {
	return d.UserInfo()
}

// UserCollectGet 用户收集信息，获取
func (d *Data) UserCollectGet(args ...string) *Result {
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		user = d.KeyWithUserInfo("userId")
		if user == "" {
			log.Println("UserLastReaderAdd func user is nil")
			return nil
		}
	}
	genre := d.Source.GetGenre()
	if genre == "" {
		genre = "1,2,3"
	}
	instance := d.KeyWithInstance("id")
	u := fmt.Sprintf("%s/MicroJournalUser.collectList/userId_%s/instanceId_%s/resourceTypes_%s.txt", d.Server, user, instance, genre)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserCollectAdd 用户收集信息，添加
func (d *Data) UserCollectAdd(args ...string) *Result {
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		user = d.KeyWithUserInfo("userId")
		if user == "" {
			log.Println("UserLastReaderAdd func user is nil")
			return nil
		}
	}
	genre := d.Source.GetGenre()
	if genre == "" {
		log.Println("UserCollectAdd func genre is nil")
		return &Result{0, "没有资源种类值", nil}
	}
	iid := d.Source.GetIid()
	if iid == "" {
		log.Println("UserCollectAdd func iid is nil")
		return &Result{0, "没有资源种类值", nil}
	}
	u := fmt.Sprintf("%s/MicroJournalUser.collectAdd/userId_%s/resourceType_%s/issueIds_%s.txt", d.Server, user, genre, iid)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserCollectDel 用户收集信息，删除
func (d *Data) UserCollectDel(args ...string) *Result {
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		user = d.KeyWithUserInfo("userId")
		if user == "" {
			log.Println("UserLastReaderAdd func user is nil")
			return nil
		}
	}
	magazines := d.Source.GetArgs("magazines")
	papers := d.Source.GetArgs("papers")
	books := d.Source.GetArgs("books")
	articles := d.Source.GetArgs("articles")
	//if magazines == "" && papers == "" && books == "" {
	//	log.Println("UserOrderAdd magazines, papers, books is nil")
	//	return nil
	//}
	u := fmt.Sprintf("%s/MicroJournalUser.collectRemove/userId_%s/magzines_%s/papers_%s/books_%s/articles_%s.txt", d.Server, user, magazines, papers, books, articles)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserCollectClear 用户收集信息，清空
func (d *Data) UserCollectClear(args ...string) *Result {
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		user = d.KeyWithUserInfo("userId")
		if user == "" {
			log.Println("UserLastReaderAdd func user is nil")
			return nil
		}
	}
	genre := d.Source.GetGenre()
	if genre == "" {
		log.Println("UserCollectClear func genre is nil")
		return &Result{0, "没有资源种类值", nil}
	}
	u := fmt.Sprintf("%s/MicroJournalUser.collectEmpty/userId_%s/resourceTypes_%s.txt", d.Server, user, genre)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserLastReadGet 用户最近阅读信息，获取
func (d *Data) UserLastReadGet(args ...string) *Result {
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		user = d.KeyWithUserInfo("userId")
		if user == "" {
			log.Println("UserLastReaderAdd func user is nil")
			return nil
		}
	}
	genre := d.Source.GetGenre()
	if genre == "" {
		genre = "1,2,3"
	}
	instance := d.KeyWithInstance("id")
	u := fmt.Sprintf("%s/MicroJournalUser.lastReadList/userId_%s/instanceId_%s/resourceTypes_%s.txt", d.Server, user, instance, genre)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserLastReaderAdd 用户最近阅读信息，添加
func (d *Data) UserLastReaderAdd(args ...string) *Result {
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		log.Println("UserLastReaderAdd func user is nil")
		return nil
	}

	genre := d.Source.GetGenre()
	if genre == "" {
		log.Println("UserLastReaderAdd func genre is nil")
		return &Result{0, "没有资源种类值", nil}
	}
	iid := d.Source.GetIid()
	if iid == "" {
		log.Println("UserLastReaderAdd func iid is nil")
		return &Result{0, "没有资源种类值", nil}
	}
	u := fmt.Sprintf("%s/MicroJournalUser.lastReadAdd/userId_%s/resourceType_%s/issueIds_%s.txt", d.Server, user, genre, iid)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserLastReaderDel 用户最近阅读信息，删除
func (d *Data) UserLastReaderDel(args ...string) *Result {
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		log.Println("UserLastReaderAdd func user is nil")
		return nil
	}

	magazines := d.Source.GetArgs("magazines")
	papers := d.Source.GetArgs("papers")
	books := d.Source.GetArgs("books")
	articles := d.Source.GetArgs("articles")
	//if magazines == "" && papers == "" && books == "" {
	//	log.Println("UserOrderAdd magazines, papers, books is nil")
	//	return nil
	//}
	u := fmt.Sprintf("%s/MicroJournalUser.lastReadRemove/userId_%s/magazines_%s/papers_%s/books_%s/articles_%s.txt", d.Server, user, magazines, papers, books, articles)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserLastReaderClear 用户最近阅读信息，清空
func (d *Data) UserLastReaderClear(args ...string) *Result {
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		user = d.KeyWithUserInfo("userId")
		if user == "" {
			log.Println("UserLastReaderAdd func user is nil")
			return nil
		}
	}
	genre := d.Source.GetGenre()
	if genre == "" {
		log.Println("UserLastReaderClear func genre is nil")
		return &Result{0, "没有资源种类值", nil}
	}
	u := fmt.Sprintf("%s/MicroJournalUser.lastReadEmpty/userId_%s/resourceTypes_%s.txt", d.Server, user, genre)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserShopCartGet 购物车列表(MicroJournalUser.shoppingCartList)
func (d *Data) UserShopCartGet(args ...string) *Result {
	userid := d.KeyWithUserInfo("userId")
	if userid == "" {
		log.Println("userid or resourceTypes is nil")
		return nil
	}
	genre := d.Source.GetGenre()
	if genre == "" {
		genre = "1,2,3"
	}
	instance := d.KeyWithInstance("id")
	u := fmt.Sprintf("%s/MicroJournalUser.shoppingCartList/userId_%s/instanceId_%s/resourceTypes_%s.txt", d.Server, userid, instance, genre)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserShopCartAdd 添加到购物车(MicroJournalUser.UserShopCartAdd)
func (d *Data) UserShopCartAdd(args ...string) *Result {
	userid := d.KeyWithUserInfo("userId")
	resourceType := d.Source.GetArgs("resourceType")
	issueIds := d.Source.GetArgs("issueIds")

	if userid == "" || resourceType == "" || issueIds == "" {
		log.Println("userid or resourceTypes and issueIds is nil")
		return nil
	}

	u := fmt.Sprintf("%s/MicroJournalUser.shoppingCartAdd/userId_%s/resourceType_%s/issueIds_%s.txt", d.Server, userid, resourceType, issueIds)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserShopCartDel 从购物车删除(MicroJournalUser.shoppingCartRemove)
func (d *Data) UserShopCartDel(args ...string) *Result {
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		log.Println("UserLastReaderAdd func user is nil")
		return nil
	}

	magazines := d.Source.GetArgs("magazines")
	papers := d.Source.GetArgs("papers")
	books := d.Source.GetArgs("books")
	articles := d.Source.GetArgs("articles")
	//if magazines == "" && papers == "" && books == "" {
	//	log.Println("UserOrderAdd magazines, papers, books is nil")
	//	return nil
	//}
	u := fmt.Sprintf("%s/MicroJournalUser.shoppingCartRemove/userId_%s/magazines_%s/papers_%s/books_%s/articles_%s.txt", d.Server, user, magazines, papers, books, articles)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserShopCartClear 清空购物车(MicroJournalUser.shoppingCartEmpty)
func (d *Data) UserShopCartClear(args ...string) *Result {
	userid := d.KeyWithUserInfo("userId")
	genre := d.Source.GetGenre()

	if userid == "" || genre == "" {
		log.Println("UserShopCartClear userid or resourceTypes is nil")
		return nil
	}
	u := fmt.Sprintf("%s/MicroJournalUser.shoppingCartEmpty/userId_%s/resourceTypes_%s.txt", d.Server, userid, genre)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserResourceShelfGet 已购买的资源
func (d *Data) UserResourceShelfGet(args ...string) *Result {
	userid := d.KeyWithUserInfo("userId")
	genre := d.Source.GetGenre()
	if genre == "" {
		genre = "1,2,3"
	}
	if userid == "" {
		log.Println("UserShopCartClear userid or resourceTypes is nil")
		return nil
	}
	instance := d.KeyWithInstance("id")
	u := fmt.Sprintf("%s/MicroJournalUser.buyList/userId_%s/instanceId_%s/resourceTypes_%s.txt", d.Server, userid, instance, genre)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserBuyOrder 订单列表(Pay.orderList)
func (d *Data) UserBuyOrder(args ...string) *Result {
	instance := d.KeyWithInstance("id")
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		log.Println("userid or resourceTypes is nil")
		return nil
	}
	date := d.Source.GetArgs("date")
	if date == "" {
		date = "0"
	}
	u := fmt.Sprintf("%s/Pay.orderList/userId_%s/instanceId_%s/startTime_%s.txt", d.Server, user, instance, date)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserOrderAdd 订单添加
func (d *Data) UserOrderAdd(args ...string) *Result {
	instance := d.KeyWithInstance("id")
	if instance == "" {
		log.Println("UserOrderAdd instanceID is nil")
		return nil
	}
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		log.Println("UserOrderAdd userId is nil")
		return nil
	}

	magazines := d.Source.GetArgs("magazines")
	papers := d.Source.GetArgs("papers")
	books := d.Source.GetArgs("books")
	if magazines == "" && papers == "" && books == "" {
		log.Println("UserOrderAdd magazines, papers, books is nil")
		return nil
	}

	u := fmt.Sprintf("%s/Pay.buyOrder/userId_%s/instanceId_%s/magazines_%s/papers_%s/books_%s.txt", d.Server, user, instance, magazines, papers, books)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserOrderDel 订单添加
func (d *Data) UserOrderDel(args ...string) *Result {
	instance := d.KeyWithInstance("id")
	if instance == "" {
		log.Println("UserOrderDel instanceID is nil")
		return nil
	}
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		log.Println("UserOrderDel userId is nil")
		return nil
	}
	no := d.Source.GetArgs("order")
	u := fmt.Sprintf("%s/Pay.cancelOrder/userId_%s/instanceId_%s/orderNo_%s.txt", d.Server, user, instance, no)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserOrderConfirm 订单添加
func (d *Data) UserOrderConfirm(args ...string) *Result {
	no := d.Source.GetArgs("orderNo")
	if no == "" {
		log.Println("UserOrderConfirm orderNo is nil")
		return nil
	}
	u := fmt.Sprintf("%s/Pay.confirmOrder/payStatus_1/orderNo_%s.txt", d.Server, no)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserVerifyCode 获取验证码
func (d *Data) UserVerifyCode(args ...string) *Result {
	phone := d.Source.GetArgs("phone")
	if phone == "" || len(phone) != 11 {
		return &Result{0, "手机号码不正确", nil}
	}
	u := fmt.Sprintf("%s/MicroJournalUser.verifyCode/phone_%s/type_1", d.Server, phone)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// UserFromTouchQrcode 获取验证码
func (d *Data) UserFromTouchQrcode(args ...string) *Result {
	touch := d.Source.GetArgs("touch")
	if touch == "" {
		return &Result{0, "没有来自触摸屏应用的信息", nil}
	}
	a := strings.Split(touch, "@")
	if len(a) != 2 || len(a[1]) != 32 {
		return &Result{0, "来自触摸屏应用的信息无效", nil}
	}
	instance := a[0]
	touch = a[1]
	iid := d.Source.GetIid()
	if iid == "" {
		log.Println("UserFromTouchQrcode iid is nil")
		return nil
	}
	mid := d.Source.GetMid()
	if mid == "" {
		log.Println("UserFromTouchQrcode mid is nil")
		return nil
	}
	t := time.Now()
	key := hash.Picture(iid, mid, t.Day(), "magook")
	h := md5.New()
	s := fmt.Sprintf("%s%s%s%s", instance, key, iid, t.Format("20060102"))
	h.Write([]byte(s))
	hs := hex.EncodeToString(h.Sum(nil))
	log.Println(touch, hs, t.Day())
	b := touch == hs
	return &Result{1, "", map[string]bool{"role": b}}
}

// UserAliPay  用户支付宝支付订单
// 不缓存，不走InstanceResult
func (d *Data) UserAliPay() []byte {
	orderNo := d.Source.GetArgs("orderNo")
	if orderNo == "" {
		log.Println("UserWeiPay orderNo is nil")
		return nil
	}
	u := d.Source.GetArgs("returnUrl")
	if u == "" {
		return nil
	}

	user := d.KeyWithUserInfo("userName")
	if user == "" {
		user = d.KeyWithUserInfo("phone")
	}
	if user == "" {
		log.Println("UserWeiPay userName, phone is nil")
		return nil
	}
	var data = url.Values{
		"orderNo":   {orderNo},
		"returnUrl": {u},
		"subject":   {user},
		"body":      {"1"},
	}
	url := fmt.Sprintf("%s/Pay.alipayPay", d.Server)
	// log.Println(url, data)
	in := &Interface{URL: url, Data: data, Update: d.update}
	return in.RequestByte()
}

// UserWeiPay 用户微信支付订单
// 不缓存, 不走InstanceResult
func (d *Data) UserWeiPay() []byte {
	orderNo := d.Source.GetArgs("orderNo")
	if orderNo == "" {
		log.Println("UserWeiPay orderNo is nil")
		return nil
	}
	payType := d.Source.GetArgs("payType")
	if payType == "" {
		payType = "0"
	}
	openId := d.Source.GetArgs("openId")
	if openId == "" {
		openId = "0"
	}
	createQrcode := d.Source.GetArgs("createQrcode")
	if createQrcode == "" {
		createQrcode = "0"
	}
	u := fmt.Sprintf("%s/Pay.weChatPrePayment/orderNo_%s/payType_%s/openId_%s/createQrcode_%s.txt", d.Server, orderNo, payType, openId, createQrcode)
	in := &Interface{URL: u, Update: d.update}
	return in.RequestByte()
}

/**
* 对资源的操作
 */

// ResourceOperateTimes 对资源添加评论
func (d *Data) ResourceOperateTimes(args ...string) *Result {
	tag := d.Source.GetArgs("tag")
	iid := d.Source.GetIid()
	user := d.KeyWithUserInfo("userId")
	if iid == "" || tag == "" || user == "" {
		log.Println("ResourceOperateTimes iid, user, tag is nil", iid, user, tag)
		return nil
	}
	genre := d.Source.GetGenre()
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}
	u := fmt.Sprintf("%s/Resource.operate/userId_%s/resourceType_%s/issueId_%s/type_%s.txt", d.Server, user, genre, iid, tag)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// ResourceAddComment 对资源项进行点赞，分享，评论，收藏，笔记的次数记录
// 不缓存, 不走InstanceResult
func (d *Data) ResourceAddComment(args ...string) *Result {
	content := d.Source.GetArgs("content")
	iid := d.Source.GetIid()
	user := d.KeyWithUserInfo("userId")
	if user == "" {
		user = d.KeyWithUserInfo("userid")
	}

	genre := d.Source.GetGenre()
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}
	name := d.KeyWithUserInfo("userName")
	if name == "" {
		name = d.KeyWithUserInfo("nickname")
	}

	if iid == "" {
		iid = d.Source.GetArgs("issueId")
	}
	if user == "" {
		user = d.Source.GetArgs("userId")
	}
	if genre == "" {
		genre = d.Source.GetArgs("resourceType")
	}
	if name == "" {
		name = d.Source.GetArgs("userName")
	}
	userCoin := d.Source.GetArgs("userCoin")

	if iid == "" || content == "" || user == "" {
		log.Println("ResourceAddComment iid, content, user is nil", iid, content, user)
		return nil
	}

	var data = url.Values{
		"resourceType": {genre},
		"userId":       {user},
		"userName":     {name},
		"issueId":      {iid},
		"content":      {content},
		"userCoin":     {userCoin},
	}
	u := fmt.Sprintf("%s/Resource.addComment", d.Server)
	in := Interface{URL: u, Data: data, Update: d.update}
	return in.Request().Result()
}

// ResourceGetComment 对资源项进行评论的记录
func (d *Data) ResourceGetComment(args ...string) *Result {
	iid := d.Source.GetIid()
	if iid == "" {
		log.Println("ResourceGetComment iid is nil")
		return nil
	}
	genre := d.Source.GetGenre()
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}
	page := d.Source.GetArgs("page")
	p, _ := strconv.Atoi(page)
	if page != "" && p == 0 {
		p = 1
	}
	num := d.Source.GetArgs("num")
	n, _ := strconv.Atoi(num)
	if page != "" && n == 0 {
		n = 20
	}
	u := fmt.Sprintf("%s/Resource.commentList/resourceType_%s/issueId_%s.txt", d.Server, genre, iid)
	return InstanceResult(&Interface{URL: u, Update: d.update, Page: p, Number: n})
}

// ResourceGetCommentTotal 对资源项进行评论的总数
func (d *Data) ResourceGetCommentTotal(args ...string) *Result {
	iid := d.Source.GetIid()
	if iid == "" {
		log.Println("ResourceGetComment iid is nil")
		return nil
	}
	genre := d.Source.GetGenre()
	if genre == "" {
		genre = d.KeyWithInstance("genre")
	}
	num := d.Source.GetArgs("num")
	n, _ := strconv.Atoi(num)
	if n == 0 {
		n = 20
	}
	u := fmt.Sprintf("%s/Resource.commentList/resourceType_%s/issueId_%s.txt", d.Server, genre, iid)
	return InstanceResult(&Interface{URL: u, Update: d.update, Number: n})
}

// ResourceByHtml 根据内容获取资源明细
func (d *Data) ResourceByHtml(args ...string) *Result {
	html := d.Source.GetArgs("html")
	data := url.Values{
		"html": {html},
	}
	u := fmt.Sprintf("%s/Resource.getArticleByCover", d.Server)
	in := &Interface{URL: u, Data: data, Update: d.update}
	return in.Request().Result()
}

// ResourceNotesCount 获取笔记总数
func (d *Data) ResourceNotesCount(args ...string) *Result {
	resourceType := d.Source.GetGenre()
	if resourceType == "" {
		resourceType = d.KeyWithInstance("genre")
	}
	iid := d.Source.GetIid()
	if iid == "" {
		log.Println("ResourceNotesCount iid is nil")
		return nil
	}
	u := fmt.Sprintf("%s/Resource.notesCount/resourceType_%s/issueId_%s.txt", d.Server, resourceType, iid)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

// ResourceNotesList 获取笔记列表
func (d *Data) ResourceNotesList(args ...string) *Result {
	resourceType := d.Source.GetGenre()
	if resourceType == "" {
		resourceType = d.KeyWithInstance("genre")
	}
	iid := d.Source.GetIid()
	if iid == "" {
		log.Println("ResourceNotesCount iid is nil")
		return nil
	}
	page := d.Source.GetArgs("page")
	if page == "" {
		page = "1"
	}
	num := d.Source.GetArgs("num")
	if num == "" {
		num = "20"
	}
	u := fmt.Sprintf("%s/Resource.notesList/resourceType_%s/issueId_%s.txt/pageNum_%s/limitNum_%s", d.Server, resourceType, iid, page, num)
	return InstanceResult(&Interface{URL: u, Update: d.update})
}

/**
 * 武大图书馆搜索页面随机数获取
 */
func (d *Data) WhuSearch(args ...string) *Result {
	session := rand.Intn(999999999)
	url := "http://opac.lib.whu.edu.cn/F?RN=" + string(session)
	client := &http.Client{}
	request, _ := http.NewRequest("GET", url, nil)
	resp, err := client.Do(request)
	if err != nil {
		log.Println(err)
		return nil
	}
	defer resp.Body.Close()
	bytes, err := ioutil.ReadAll(resp.Body)
	rege := regexp.MustCompile(`[a-zA-z]+://[^\s]*`)
	regeResult := rege.FindAllString(string(bytes), -1)
	re := strings.Split(regeResult[0], "url=")[1]
	stringss := strings.Split(re, "/")
	return &Result{1, "", strings.Split(stringss[4], "?")[0]}
}

/**
 * 插件文件上传
 */
func (d *Data) FileUpload(args ...string) *Result {
	fileUploadBaseURI := "http://resource.magook.com"
	data := d.Source.GetArgs("data")     // imgBase64
	fileName := d.Source.GetArgs("name") // filename
	if data == "" || len(data) <= 0 {
		return &Result{0, "data 数据为空", nil}
	}
	bys, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return &Result{0, "data base64 decoding bytes err", nil}
	}

	tempName := "../" + fileName
	err = ioutil.WriteFile(tempName, bys, 0666)
	if err != nil {
		return &Result{0, "writeFile err", nil}
	}

	bodyBuf := &bytes.Buffer{}
	contentWriter := multipart.NewWriter(bodyBuf)
	fileWriter, err := contentWriter.CreateFormFile("file", tempName)
	if err != nil {
		return &Result{0, "error writing to buffer", nil}
	}
	fi, err := os.Open(tempName)
	if err != nil {
		return &Result{0, "error opening file", nil}
	}
	defer func() {
		fi.Close()
		os.Remove(tempName)
	}()

	_, err = io.Copy(fileWriter, fi)
	if err != nil {
		return &Result{0, "error copy to destWriter", nil}
	}
	contentType := contentWriter.FormDataContentType()
	contentWriter.Close()

	// 上传文件到资源服务器
	resp, err := http.Post(fileUploadBaseURI+"/upload2.php", contentType, bodyBuf)
	if err != nil {
		os.Remove(tempName)
		return &Result{0, "error post upload server", nil}
	}
	defer resp.Body.Close()
	respData, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return &Result{0, "error read RespBody", nil}
	}
	fmt.Printf("上传文件成功 %s\n", string(respData))

	type uploadObj struct {
		Status int    `json:"status"`
		Info   string `json:"info"`
		Data   struct {
			Path string `json:"path"`
		} `json:"data"`
	}
	var upObj uploadObj
	json.Unmarshal(respData, &upObj)
	if upObj.Data.Path != "" {
		//upObj.Data.Path = fileUploadBaseURI + upObj.Data.Path
		// success handle
		return &Result{1, "upload file success", upObj}
	}

	// default handle
	return &Result{0, "default return", upObj}
}

// MicroJournalUserOperateCount 返回用户操作数
func (d *Data) MicroJournalUserOperateCount(args ...string) *Result {
	typeId := d.Source.GetArgs("type")   // 类型 1. 点赞  2 分享  3 评论  4 收藏 5 笔记
	u := d.Source.GetArgs("url")         // url地址  如果需要根据url查询 需要传该字段
	userId := d.Source.GetArgs("userId") // 用户id

	data := url.Values{
		"type":   {typeId},
		"url":    {u},
		"userId": {userId},
	}

	url := fmt.Sprintf("%s/MicroJournalUser.operateCount", d.Server)
	return InstanceResult(&Interface{URL: url, Data: data, Update: d.update})
}

// MicroJournalUserOperateList 返回用户操作列表
func (d *Data) MicroJournalUserOperateList(args ...string) *Result {
	typeId := d.Source.GetArgs("type")       // 类型 1. 点赞  2 分享  3 评论  4 收藏 5 笔记
	userId := d.Source.GetArgs("userId")     // 用户id
	u := d.Source.GetArgs("url")             // url地址  如果需要根据url查询 需要传该字段
	pageNum := d.Source.GetArgs("pageNum")   // 页数 0 获取全部
	limitNum := d.Source.GetArgs("limitNum") // 每页的数量
	if pageNum == "" {
		pageNum = "1"
	}
	if limitNum == "" {
		limitNum = "20"
	}

	data := url.Values{
		"type":     {typeId},
		"url":      {u},
		"userId":   {userId},
		"pageNum":  {pageNum},
		"limitNum": {limitNum},
	}

	url := fmt.Sprintf("%s/MicroJournalUser.operateList", d.Server)
	return InstanceResult(&Interface{URL: url, Data: data, Update: d.update})
}

// MicroJournalUserAddOperate 添加用户操作
func (d *Data) MicroJournalUserAddOperate(args ...string) *Result {
	typeId := d.Source.GetArgs("type")     // 类型 1. 点赞  2 分享  3 评论  4 收藏 5 笔记
	userId := d.Source.GetArgs("userId")   // 用户id
	u := d.Source.GetArgs("url")           // url地址  如果需要根据url查询 需要传该字段
	ip := d.Source.GetArgs("ip")           // 用户ip
	title := d.Source.GetArgs("title")     // 标题(笔记需要该字段)
	content := d.Source.GetArgs("content") // 内容(评论 笔记,分享需要该字段)
	file := d.Source.GetArgs("file")       // 内容地址(笔记时为图片保存的地址, 分享时该字段为分享到的url地址)

	data := url.Values{
		"type":    {typeId},
		"url":     {u},
		"userId":  {userId},
		"ip":      {ip},
		"title":   {title},
		"content": {content},
		"file":    {file},
	}

	url := fmt.Sprintf("%s/MicroJournalUser.addOperate", d.Server)
	return InstanceResult(&Interface{URL: url, Data: data, Update: d.update})
}

// MicroJournalUserDeleteOperate 删除用户操作
func (d *Data) MicroJournalUserDeleteOperate(args ...string) *Result {
	typeId := d.Source.GetArgs("type")   // 类型   1. 点赞  2 分享  3 评论  4 收藏 5 笔记
	userId := d.Source.GetArgs("userId") // 用户id
	ids := d.Source.GetArgs("ids")       // 主键id

	data := url.Values{
		"type":   {typeId},
		"userId": {userId},
		"ids":    {ids},
	}

	u := fmt.Sprintf("%s/MicroJournalUser.deleteOperate", d.Server)
	return InstanceResult(&Interface{URL: u, Data: data, Update: d.update})
}

/**
* 获取资源定位值
 */

// KeyWithInstance 从Instance获取值
func (d *Data) KeyWithInstance(key string) string {
	re := d.Router("WebInfo", "")
	return KeyWithInstance(re.Data, key, "base")
}

// KeyWithUserInfo 从userInfo获取值
func (d *Data) KeyWithUserInfo(key string) string {
	re := d.Session.Get("user")
	log.Println("1:", re)
	return KeyWithUserInfo(re, key)
}

// InstanceCategory 获取机构所有分类, index, instance, genre
func (d *Data) InstanceCategory(args ...string) string {
	category := d.Source.GetCategory()
	if category != "" {
		return category
	}

	index := ""
	if len(args) > 0 {
		index = args[0]
		args = args[1:]
	}
	if index == "" {
		index = d.Source.GetArgs("index")
	}

	re := d.SourceCategory(args...)
	data := ReArrayMap(re.Data)
	if data == nil || len(data) == 0 {
		return ""
	}
	//获取第一个值为默认值
	s := ""
	i, _ := strconv.Atoi(index)
	if i > 0 {
		i--
		s = data[i]["id"]
	} else {
		for _, val := range data {
			if v, ok := val["id"]; ok {
				if s == "" {
					s = v
				} else {
					s = fmt.Sprintf("%s,%s", s, v)
				}
			}
		}
	}

	if s == "" {
		log.Println("CategoryIssue func category is nil")
		return ""
	}
	return s
}

// OrgProductWithMagazineInfo 将品种信息适实例信息
func (d *Data) OrgProductWithMagazineInfo(data interface{}) interface{} {
	if data == nil {
		return nil
	}
	re := ReOneMap(data)
	if re == nil {
		return nil
	}
	base := map[string]interface{}{
		"id":        re["resourceId"],
		"productId": 5,
		"type":      0,
		"name":      "magazine",
		"title":     re["resourceName"],
		"magazine":  0,
		"paper":     -1,
		"book":      -1,
		"article":   -1,
		"startTime": 1000000000,
		"endTime":   2000000000,
		"style":     "",
	}
	return map[string]interface{}{
		"base": base,
	}
}
