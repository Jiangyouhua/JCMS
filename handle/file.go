package handle

/**
* 1. url解析资源: product/instance/page/genre/category/mid/iid/param/key@value
* 2. 资源缓存： instance/page/genre/category/mid/iid/param/
 */
import (
	"encoding/json"
	"log"
	"strconv"
	"strings"

	"Jcms2.1/hash"
	"Jcms2.1/session"
)

// File 数据处理类
type File struct {
	Server   string             // 服务器地址
	Session  *session.Session   // 用户session
	Source   *Source            //数据源
	Routings map[string]*Router // 数据处理由路
	update   bool               //是否更新数
}

/**
* 返回结构
 */

// Byte 将结果输出为byte
func (r *Result) Byte() []byte {
	b, err := json.Marshal(r)
	if err != nil {
		log.Println(err)
		return nil
	}
	return b
}

/**
* Data类处理开始
* 非空值即有效
* 两个左划线（a//c）中间即为空值
 */

// Run 获取数据
func (d *File) Run() []byte {
	//获取页面数据的两个基本条件
	if d.Source.GetProduct() == "" || d.Source.GetInstance() == "" {
		return nil
	}

	// 资源数据部分
	d.Routings = make(map[string]*Router)
	d.Routings["WebInfo"] = &Router{d.WebInfo, ""}                      //站点全部
	d.Routings["OrgInfo"] = &Router{d.OrgInfo, ""}                      //product/instance/page/0，机构值
	d.Routings["OrgProduct"] = &Router{d.OrgProduct, ""}                //product/instance/page，机构产品实例值
	d.Routings["SourceCategory"] = &Router{d.SourceCategory, ""}        //product/instance/page/1，资源分类，分类单id从instance info中取
	d.Routings["CategorySub"] = &Router{d.CategorySub, ""}              //product/instance/page/1/1,2,3，资源分类，基于分类id获取其子类
	d.Routings["CategoryIssue"] = &Router{d.CategoryIssue, ""}          //product/instance/page/1/，资源分类期列表，默认分类， issue值为最新有效期
	d.Routings["CategoryIssueTotal"] = &Router{d.CategoryIssue, ""}     //product/instance/page/1/total，资源分类期列表项总数，默认分类， issue值为最新有效期
	d.Routings["SourceInfo"] = &Router{d.SourceInfo, ""}                //product/instance/page/1/0/137，杂志值，中国经济周刊id为137
	d.Routings["SourceIssue"] = &Router{d.SourceIssue, ""}              //product/instance/page/1/0/137/，杂志期列表
	d.Routings["SourceYear"] = &Router{d.SourceYear, ""}                //product/instance/page/1/0/137/0/，杂志年度列表
	d.Routings["YearMonthIssue"] = &Router{d.YearMonthIssue, ""}        //product/instance/page/1/0/137/0/201512，杂志年度月份列表
	d.Routings["YearIssue"] = &Router{d.YearIssue, ""}                  //product/instance/page/1/0/137/0/2016，杂志该年期列表
	d.Routings["IssueInfo"] = &Router{d.IssueInfo, ""}                  //product/instance/page/1/0/137/208156，杂志期值
	d.Routings["IssueCatalog"] = &Router{d.IssueCatalog, ""}            //product/instance/page/1/0/137/208156/catagory，杂志期目录
	d.Routings["PaperCatalog"] = &Router{d.PaperCatalog, ""}            //product/instance/page/1/0/137/208156/catagory，杂志期目录
	d.Routings["SourceSearch"] = &Router{d.SourceSearch, ""}            //product/instance/page/0/search@key,资源搜索
	d.Routings["SourceSearchInCategory"] = &Router{d.CategoryIssue, ""} //product/instance/page/0/0/search@key,分类内资源搜索

	d.Source.Init()
	index := d.Source.Data.Get("handle")
	d.update = !(d.Source.GetArgs("cache") == "")
	re := d.Router(index, "")
	return re.Byte()
}

// Router 路由器
func (d *File) Router(index, key string) *Result {
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
	return re
}

// ResourceHash 页面hash
func (d *File) ResourceHash(iid, mid, start, end string) string {
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

// InstanceInfo 机构实例信息
func (d *File) InstanceInfo(args ...string) *DbInfo {
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
		return nil
	}

	if instance == "" {
		instance = d.Source.GetInstance()
	}
	if instance == "" {
		log.Println("Instance func instance is nil")
		return nil
	}
	file := FileNameInstanceSingle(product, instance)
	re := new(DbInfo)
	ok := CacheOrFile(file, re)
	if !ok {
		return nil
	}
	return re
}

// CategoryInfo 实例分数据
func (d *File) CategoryInfo(args ...string) *DbCategory {
	var (
		genre string // 资源种类
	)

	// 从参数获取值
	if args != nil && len(args) > 2 {
		if len(args) > 2 {
			genre = args[2]
		}
	}

	info := d.InstanceInfo(args...)
	if info == nil {
		return nil
	}

	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = strconv.Itoa(info.Base.Genne())
	}

	i, err := strconv.Atoi(genre)
	if err != nil {
		return nil
	}
	c := info.Base.Unit(i)
	if c < 0 {
		return nil
	}
	category := strconv.Itoa(info.Base.Unit(i))
	file := FileNameUnitCategory(genre, category)
	re := new(DbCategory)
	ok := CacheOrFile(file, re)
	if !ok {
		return nil
	}
	return re
}

// SubCategoryInfo 分类子类
func (d *File) SubCategoryInfo(args ...string) []*DbTree {
	var (
		category string // 资源种类
	)

	// 从参数获取值
	if args != nil && len(args) > 3 {
		if len(args) > 3 {
			category = args[3]
		}
	}
	info := d.CategoryInfo(args...)
	if info == nil {
		return nil
	}
	if category == "" {
		category = d.Source.GetCategory()
	}
	if category == "" {
		return info.Tree
	}
	c := strings.Split(category, ",")
	var ids []int
	for _, v := range c {
		val, err := strconv.Atoi(v)
		if err != nil {
			continue
		}
		ids = append(ids, val)
	}
	var re = make([]*DbTree, 0)
	d.SubTree(info.Tree, &re, ids)
	return re
}

// LatestSource 最新资源
func (d *File) LatestSource(args ...string) *DbLatest {
	var (
		genre string // 资源种类
	)

	// 从参数获取值
	if args != nil && len(args) > 2 {
		genre = args[2]
	}
	if genre == "" {
		genre = d.Source.GetGenre()
	}

	info := d.InstanceInfo(args...)
	if info == nil {
		return nil
	}
	if genre == "" {
		genre = strconv.Itoa(info.Base.Genne())
	}
	file := FileNameSourceLatest(genre)
	var re = new(DbLatest)
	ok := CacheOrFile(file, re)
	if !ok {
		return nil
	}
	return re
}

// IssuesList 资源列
func (d *File) IssuesList(args ...string) interface{} {
	var (
		product  string // 产品名称
		instance string //实例名称
		genre    string // 资源种类
		category string //分类id组
		index    string // 索引（返回一第一个分类还是全部）
		word     string // 搜索的关键词
		page     string // 第几页 （如无则返回总数）
		number   string //分页面数
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			product = args[0]
		}
		if len(args) > 1 {
			instance = args[1]
		}
		if len(args) > 2 {
			genre = args[2]
		}
		if len(args) > 3 {
			category = args[3]
		}
		if len(args) > 4 {
			index = args[4]
		}
		if len(args) > 5 {
			word = args[5]
		}
		if len(args) > 6 {
			page = args[6]
		}
		if len(args) > 7 {
			number = args[7]
		}
	}

	instanceInfo := d.InstanceInfo(product, instance)
	if instanceInfo == nil {
		return nil
	}
	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = strconv.Itoa(instanceInfo.Base.Genne())
	}

	categoryInfo := d.CategoryInfo(product, instance, genre)
	if categoryInfo == nil {
		return nil
	}
	// 有效目录，搜索时基于所有所选期刊
	if word == "" {
		word = d.Source.GetArgs("search")
	}
	categorys := categoryInfo.Tree
	if category == "" && word == "" {
		category = d.Source.GetCategory()
	}
	if category == "" && word == "" {
		if index == "" {
			index = d.Source.GetArgs("index")
		}
		if index != "" {
			i, _ := strconv.Atoi(index)
			if i > 0 {
				category = strconv.Itoa(categorys[0].ID)
			}
		}
	}
	if category != "" {
		categorys = d.SubCategoryInfo(product, instance, genre, category)
	}
	latestSource := d.LatestSource(product, instance, genre)
	if latestSource == nil {
		return nil
	}

	if page == "" {
		page = d.Source.GetArgs("page")
	}
	if number == "" {
		number = d.Source.GetArgs("num")
	}

	// 获取有效性
	i, err := strconv.Atoi(genre)
	if err != nil {
		return nil
	}

	// 机构选刊ID
	orgSource := instanceInfo.OrgInfo.Items(i)
	// 目录选刊ID
	var (
		source []string
		sort   []string
	)

	var a []string
	d.TreeIssue(categorys, &a, categoryInfo.Source)
	if a != nil || len(a) > 0 {
		source = strings.Split(strings.Join(a, ","), ",")
	}

	if a, ok := categoryInfo.Sort[category]; ok && a != "" {
		sort = strings.Split(a, ",")
	}

	// 机构选刊后, 并搜索
	var set = make(map[string]*DbIssue)
	for _, v := range orgSource {
		if val, ok := latestSource.List[v]; ok && val != nil {
			if word != "" && strings.Index(val.ResourceName, word) < 0 {
				continue
			}
			set[v] = val
		}
	}

	// 目录选刊后
	var b = make(map[string]*DbIssue)
	if source != nil {
		for _, v := range source {
			if val, ok := set[v]; ok && val != nil {
				b[v] = val
			}
		}
		set = b
	}
	b = nil
	// 按sort排序
	var re []*DbIssue
	if sort != nil && len(sort) > 0 {
		for _, v := range sort {
			if val, ok := set[v]; ok && val != nil {
				re = append(re, val)
				delete(set, v)
			}
		}
	}

	// 按默认排序
	for _, v := range latestSource.Sort {
		s := strconv.Itoa(v)
		if val, ok := set[s]; ok && val != nil {
			re = append(re, val)
		}
	}
	set = nil

	// 返回全部数
	p, _ := strconv.Atoi(page)
	n, _ := strconv.Atoi(number)
	if p < 1 && n < 1 {
		return re
	}

	// 返回分页总数
	if p < 1 {
		return len(re)
	}

	// 返回当前分页的数据 limit
	start := (p - 1) * n
	end := p * n
	if start >= len(re)-1 {
		return nil
	}
	if end > len(re) {
		end = len(re)
	}
	return re[start:end]
}

// SingleSource 单品种资源, 与机构无关，不需要product, instance
func (d *File) SingleSource(args ...string) []*DbIssue {
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
		info := d.InstanceInfo()
		if info == nil {
			return nil
		}
		genre = strconv.Itoa(info.Base.Genne())
	}

	if mid == "" {
		mid = d.Source.GetMid()
	}
	if mid == "" {
		return nil
	}

	f := FileNameSourceSingle(genre, mid)
	var re []*DbIssue
	b := CacheOrFile(f, &re)
	if !b {
		return nil
	}
	return re
}

// SingleIssue 单个期刊数据
func (d *File) SingleIssue(args ...string) *DbSingle {
	var (
		genre string // 资源种类
		iid   string // 资源id
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
		info := d.InstanceInfo()
		if info == nil {
			return nil
		}
		genre = strconv.Itoa(info.Base.Genne())
	}

	if iid == "" {
		iid = d.Source.GetIid()
	}
	if iid == "" {
		return nil
	}

	f := FileNameIssueSingle(genre, iid)
	var re = new(DbSingle)
	b := CacheOrFile(f, re)
	if !b {
		return nil
	}
	return re
}

/**
* 最终数据
 */

// WebInfo 机构值
func (d *File) WebInfo(args ...string) *Result {
	re := d.InstanceInfo(args...)
	if re == nil {
		return &Result{0, "", nil}
	}

	re.OrgInfo.Magazines = ""
	re.OrgInfo.Papers = ""
	re.OrgInfo.Books = ""
	return &Result{1, "", re}
}

// OrgProduct 机构值
func (d *File) OrgProduct(args ...string) *Result {
	re := d.InstanceInfo(args...)
	if re == nil {
		return &Result{0, "", nil}
	}
	return &Result{1, "", re.Base}
}

// OrgInfo 机构值
func (d *File) OrgInfo(args ...string) *Result {
	re := d.InstanceInfo(args...)
	if re == nil {
		return &Result{0, "", nil}
	}

	re.OrgInfo.Magazines = ""
	re.OrgInfo.Papers = ""
	re.OrgInfo.Books = ""
	return &Result{1, "", re.OrgInfo}
}

// SourceCategory 资源分类
func (d *File) SourceCategory(args ...string) *Result {
	data := d.CategoryInfo(args...)
	if data == nil {
		return &Result{0, "数据解析错误", nil}
	}
	return &Result{1, "", data.Tree}
}

// CategorySub 资源分类子类
func (d *File) CategorySub(args ...string) *Result {
	re := d.SubCategoryInfo(args...)
	if re == nil {
		return &Result{0, "", re}
	}
	return &Result{1, "", re}
}

// CategoryIssue 实例资源分类列表
func (d *File) CategoryIssue(args ...string) *Result {
	re := d.IssuesList(args...)
	if re == nil {
		return &Result{0, "", re}
	}
	return &Result{1, "", re}
}

// SourceSearch 实例资源分类列表
func (d *File) SourceSearch(args ...string) *Result {
	re := d.IssuesList(args...)
	var (
		product  string
		instance string
		genre    string // 资源种类
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			product = args[0]
		}
		if len(args) > 1 {
			instance = args[1]
		}
		if len(args) > 2 {
			genre = args[2]
		}
	}

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			product = args[0]
		}
		if len(args) > 1 {
			instance = args[1]
		}
		if len(args) > 2 {
			genre = args[2]
		}
	}

	instanceInfo := d.InstanceInfo(product, instance)
	if instanceInfo == nil {
		return nil
	}
	if genre == "" {
		genre = d.Source.GetGenre()
	}
	if genre == "" {
		genre = strconv.Itoa(instanceInfo.Base.Genne())
	}

	if re == nil {
		return &Result{0, "", re}
	}
	data := map[string]interface{}{
		"magazines": make([]interface{}, 0),
		"papers":    make([]interface{}, 0),
		"books":     make([]interface{}, 0),
	}

	g, err := strconv.Atoi(genre)
	if err != nil {
		return &Result{0, "", data}
	}
	if g == 1 {
		data["magazines"] = re
	}
	if g == 2 {
		data["magazines"] = re
	}
	if g == 3 {
		data["magazines"] = re
	}
	return &Result{1, "", data}
}

// SourceInfo 品种信息
func (d *File) SourceInfo(args ...string) *Result {
	var (
		product  string // 产品名称
		instance string //实例名称
		genre    string // 资源种类
		mid      string // 品种
	)

	// 从参数获取值
	if args != nil {
		if len(args) > 0 {
			product = args[0]
		}
		if len(args) > 1 {
			instance = args[1]
		}
		if len(args) > 2 {
			genre = args[2]
		}
		if len(args) > 3 {
			mid = args[3]
		}
	}
	latest := d.LatestSource(product, instance, genre)
	if latest == nil {
		return &Result{0, "", nil}
	}
	if mid == "" {
		mid = d.Source.GetArgs("mid")
	}
	if mid == "" {
		return &Result{0, "", nil}
	}
	re, ok := latest.List[mid]
	if !ok {
		return &Result{0, "", nil}
	}
	return &Result{1, "", re}
}

// SourceIssue 杂志期列表
func (d *File) SourceIssue(args ...string) *Result {
	data := d.SingleSource(args...)
	if data == nil {
		return &Result{0, "", nil}
	}
	return &Result{1, "", data}
}

// SourceYear 资源年列表
func (d *File) SourceYear(args ...string) *Result {
	data := d.SingleSource(args...)
	if data == nil || len(data) == 0 {
		return &Result{0, "", nil}
	}

	var (
		year  = 0
		count = 0
		re    []interface{}
	)
	for _, v := range data {
		if year == v.IssueYear {
			count++
		} else {
			if year > 0 {
				re = append(re, map[string]interface{}{
					"count":   count,
					"year":    year,
					"version": "1",
				})
			}
			year = v.IssueYear
			count = 0
		}
	}
	count++
	re = append(re, map[string]interface{}{
		"count":   count,
		"year":    year,
		"version": "1",
	})

	if re == nil {
		return &Result{0, "", nil}
	}
	return &Result{1, "", re}
}

// YearIssue 资源年的册列表
func (d *File) YearIssue(args ...string) *Result {
	var (
		year string // 年度
	)
	if args != nil && len(args) > 2 {
		year = args[2]
	}
	data := d.SingleSource(args...)
	if data == nil || len(data) == 0 {
		return &Result{0, "", nil}
	}

	if year == "" {
		year = d.Source.GetParam()
	}
	if year == "" {
		year = strconv.Itoa(data[0].IssueYear)
	}

	y, err := strconv.Atoi(year)
	if err != nil || y < 1800 {
		return &Result{0, "", nil}
	}

	var re []*DbIssue
	for _, v := range data {
		if v.IssueYear == y {
			re = append(re, v)
		}
	}
	if re == nil {
		return &Result{0, "", nil}
	}
	return &Result{1, "", re}
}

// YearMonthIssue 资源某年某月列表
func (d *File) YearMonthIssue(args ...string) *Result {
	return &Result{0, "该方法未实现", nil}
}

// IssueInfo 期册信息
func (d *File) IssueInfo(args ...string) *Result {
	data := d.SingleIssue(args...)
	if data == nil {
		return &Result{0, "", nil}
	}
	data.Info.Hash = d.ResourceHash(strconv.Itoa(data.Info.IssueID), strconv.Itoa(data.Info.ResourceID), "0", strconv.Itoa(data.Info.Count))
	return &Result{1, "", []interface{}{data.Info}}
}

// IssueCatalog 资源各册目录
func (d *File) IssueCatalog(args ...string) *Result {
	data := d.SingleIssue(args...)
	if data == nil {
		return &Result{0, "", nil}
	}
	return &Result{1, "", data.Catalog}
}

// PaperCatalog 资源各册目录
func (d *File) PaperCatalog(args ...string) *Result {
	args = append([]string{"2"}, args...)
	return d.IssueInfo(args...)
}

/**
* 获取资源定位值
 */

// OrgProductWithMagazineInfo 将品种信息适实例信息
func (d *File) OrgProductWithMagazineInfo(data interface{}) interface{} {
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

// SubTree 获取树状表的子类
func (d *File) SubTree(from []*DbTree, to *[]*DbTree, value []int) {
	if from == nil || len(from) == 0 || value == nil || len(value) == 0 {
		return
	}
	for m, n := range from {
		for k, v := range value {
			if n.ID == v {
				*to = append(*to, n)
				// 删除已有项
				if m == 0 {
					from = from[1:]
				} else if m == len(from)-1 {
					from = from[:k]
				} else {
					from = append(from[:m], from[m+1:]...)
				}
				if k == 0 {
					value = value[1:]
				} else if k == len(value)-1 {
					value = value[:k]
				} else {
					value = append(value[:k], value[k+1:]...)
				}
				continue
			}
		}
		d.SubTree(n.SubLevels, to, value)
	}
}

// TreeIssue 获取树状表的子类
func (d *File) TreeIssue(from []*DbTree, to *[]string, value map[string]string) {
	if from == nil || len(from) == 0 || value == nil {
		return
	}
	for _, n := range from {
		s := strconv.Itoa(n.ID)
		if v, ok := value[s]; ok {
			*to = append(*to, v)
		}
		d.TreeIssue(n.SubLevels, to, value)
	}
}
