package handle

/**
* 处理资源数据静态化
* 1. {org}_data.txt, 机构表
* 2. {instanid}_data.txt， 每个机构一个数据化，包含：机构信息，机构分类，分类资源，分类排序，机机构选刊
* 3. {source}_data.txt,  每个品种一个数据化，包含：品种年信息，期信息，目录
* 4. {sourcelatest}_data, 资源最新表
 */

import (
	"database/sql"
	"encoding/json"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
)

// FormatData 格式化处理函数
type FormatData func(rows *sql.Rows, re *interface{}) bool

// DbInstance 实例信息
type DbInstance struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Title       string `json:"title"`
	ProductID   string `json:"productId"`
	Style       string `json:"style"`
	Type        int    `json:"type"`
	StartTime   int    `json:"startTime"`
	EndTime     int    `json:"endTime"`
	Magazine    int    `json:"magazine"`
	Paper       int    `json:"paper"`
	Book        int    `json:"book"`
	Article     int    `json:"article"`
	ProductCode string `json:"productCode"`
}

// Genne 返回资源类别
func (in *DbInstance) Genne() int {
	if in.Magazine > -1 {
		return 1
	}
	if in.Paper > -1 {
		return 2
	}
	if in.Book > -1 {
		return 3
	}
	if in.Article > -1 {
		return 4
	}
	return 0
}

// Unit 返回分类单元
func (in *DbInstance) Unit(i int) int {
	switch i {
	case 1:
		return in.Magazine
	case 2:
		return in.Paper
	case 3:
		return in.Book
	case 4:
		return in.Article
	default:
		return -1
	}
}

// DbOrg 机构信息
type DbOrg struct {
	OrgID      int    `json:"orgID"`
	Name       string `json:"name"`
	OrgCode    string `json:"orgCode"`
	Address    string `json:"address"`
	Slogan     string `json:"slogan"`
	Phone      string `json:"phone"`
	ContactMan string `json:"contactMan"`
	Magazines  string `json:"magazines"`
	Papers     string `json:"papers"`
	Books      string `json:"books"`
}

func (org *DbOrg) Items(genre int) []string {
	s := ""
	switch genre {
	case 1:
		s = org.Magazines
	case 2:
		s = org.Papers
	case 3:
		s = org.Books
	}
	if s == "" {
		return nil
	}
	return strings.Split(s, ",")
}

// DbTree 树状结构
type DbTree struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	leftside  int
	rightside int
	Category  int       `json:"category"`
	SubLevels []*DbTree `json:"sublevels"`
	status    int
}

// DbCatalog 目录结构
type DbCatalog struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	leftside  int
	rightside int
	Category  int          `json:"category"`
	SubLevels []*DbCatalog `json:"sublevels"`
	Page      int          `json:"page"`
	status    int
}

// DbIssue 期结构
type DbIssue struct {
	ResourceID   int    `json:"resourceId"`
	ResourceName string `json:"resourceName"`
	ResourceCode string `json:"resourceCode"`
	IssueName    string `json:"issueName"`
	IssueID      int    `json:"issueId"`
	IssueYear    int    `json:"issueYear"`
	IssueNo      int    `json:"issueNo"`
	Count        int    `json:"count"`
	Start        int    `json:"start"`
	Price0       int    `json:"price0"`
	Price1       int    `json:"price1"`
	Toll         int    `json:"toll"`
	Sort         int    `json:"sort"`
	Webp         int    `json:"webp"`
	Jpg          string `json:"jpg"`
	HTML         string `json:"html"`
	Txt          int    `json:"txt"`
	Pdf          int    `json:"pdf"`
	qishu        int
	Hash         string `json:"hash"`
}

// DbSingle 每个issue
type DbSingle struct {
	Info    *DbIssue     `json:"info"`
	Catalog []*DbCatalog `json:"catalog"`
}

// DbInfo 信息结构
type DbInfo struct {
	Base          *DbInstance   `json:"base"`
	OperationList []interface{} `json:"operationList"`
	OrgInfo       *DbOrg        `json:"orgInfo"`
}

// DbCategory 机构分类信息
type DbCategory struct {
	Tree   []*DbTree         `json:"tree"`
	Source map[string]string `json:"source"`
	Sort   map[string]string `json:"sort"`
}

// DbLatest 最新期刊
type DbLatest struct {
	Sort []int               `json:"sort"`
	List map[string]*DbIssue `json:"list"`
}

/**
* 配置文件
 */

// Duration 同步的时间起止
type Duration struct {
	Start int `xml:"start,attr"`
	End   int `xml:"end,attr"`
}

// Model 数据处理结构
type Model struct {
	DB        *sql.DB
	ID        int       `xml:"id,attr"`
	Prouduct  string    `xml:"product,attr"`
	Name      string    `xml:"name,attr"`
	Dir       string    `xml:"dir,attr"`
	Refresh   bool      `xml:"method,attr"`
	Magazines *Duration `xml:"magazines"`
	Papers    *Duration `xml:"papers"`
}

// Config 数据文件
type Config struct {
	Orgs []*Model `xml:"org"`
}

var (
	db          *sql.DB
	dir         = "" // 静态化的目录
	environment = "ali"
	server      = map[string]string{
		"root":      "Jcms21:J@C#m$S%2&1*@tcp(rds14472zy8944a37hv4o.mysql.rds.aliyuncs.com:3306)/app_server?charset=utf8",
		"ali":       "dev:dev@rds123@tcp(rds14472zy8944a37hv4o.mysql.rds.aliyuncs.com:3306)/app_server?charset=utf8",
		"develop":   "jyh:great$lth@8899@tcp(120.27.30.248:3306)/app_server?charset=utf8",
		"localhost": "root:@tcp(localhost:3306)/app_server?charset=utf8",
	}
	columns = []string{
		"*",
		"magazineid resourceId, magazineName resourceName, magazinecode resourceCode, CONCAT(issueyear, '年', issueno, '期')issueName, issueid issueId, issueyear issueYear, issueno issueNo, `count`, start, price0, price1, toll, sort, 0 webp, jpg, html, 0 txt, 0 pdf, issueyear * 1000 + issueno qishu",
		"paperid resourceId, paperName resourceName, papercode resourceCode, CONCAT(issueyear, '年', issuemonth, '月', issueday, '日')issueName, issueid issueId, issueyear issueYear, issuemonth*1000+issueday issueNo, `count`, start, price0, price1, toll, sort, 0 webp, 0 jpg, html, txt, pdf, qishu",
		"magazineid resourceId, magazineName resourceName, magazinecode resourceCode, CONCAT(issueyear, '年', issueno, '期')issueName, issueid issueId, issueyear issueYear, issueno issueNo, `count`, start, price0, price1, toll, sort, 0 webp, jpg, html, 0 txt, 0 pdf, issueyear * 1000 + issueno qishu",
	}
	marks  = []string{"", "magazine", "book", "paper"}
	wheres = []string{
		"status = 1",
		"(webp > 0 || jpg > 0 || html > 0) AND issueid > 0 AND catalog > 0 AND `count` > 0 AND status = 1",
		"(pdf > 0 || html > 0 || txt > 0) AND `article` > 0 AND status = 1",
		"(webp > 0 || jpg > 0 || html > 0) AND issueid > 0 AND catalog > 0 AND `count` > 0 AND status = 1",
	}
	orgs map[string]string
)

// Conn 数据库连接池
func Conn() *sql.DB {
	db, err := sql.Open("mysql", server[environment])
	if err != nil {
		log.Println("Model Open is err, ", err)
		return nil
	}
	return db
}

/**
* 独立方法
 */

// GetMapValue 从map获取数据，如无则返回re
func GetMapValue(m map[string]interface{}, key string, re interface{}) interface{} {
	if m == nil || key == "" {
		return re
	}
	v, ok := m[key]
	if !ok {
		return re
	}
	return v
}

/**
* 基本操作
 */

// Query 执行查操作
func (m *Model) Query(s string) []interface{} {
	if err := m.DB.Ping(); err != nil {
		return nil
	}
	rows, err := m.DB.Query(s)
	if err != nil {
		log.Println("Model Query is err, ", err)
		return nil
	}
	defer rows.Close()
	/**
	* 解析对象为多维数组对象
	 */

	columns, err := rows.Columns() // 区取列名称
	var data []interface{}         // 返回的数据集

	for rows.Next() {
		re := make([]interface{}, len(columns)) // 接收的参数
		m := make(map[string]interface{})       // 接收解析当前row
		if err := rows.Scan(re...); err != nil {
			log.Println("Model Scan is err, ", err)
			continue
		}
		if len(columns) != len(re) {
			continue
		}
		for k, v := range columns {
			m[v] = re[k]
		}
		data = append(data, m)
	}
	return data
}

// QueryFunc 执行查操作
func (m *Model) QueryFunc(s string, re *interface{}, f FormatData) {
	if s == "" {
		return
	}

	if err := m.DB.Ping(); err != nil {
		log.Println("QueryFunc Ping is err, ", err)
		return
	}

	rows, err := m.DB.Query(s)
	if err != nil {
		log.Println("Model Query is err, ", err)
		return
	}
	defer rows.Close()

	/**
	* 解析对象为多维数组对象
	 */

	// 返回的数据集
	for rows.Next() {
		// 返回false则退出，可实现只处理1行
		if !f(rows, re) {
			return
		}
	}
	return
}

// Exec 执行增、删、改操作
func (m *Model) Exec(s string) int64 {
	if s == "" {
		return 0
	}

	if err := m.DB.Ping(); err != nil {
		return 0
	}

	re, err := m.DB.Exec(s)
	if err != nil {
		log.Println("Model Exec is err, ", err)
		return 0
	}
	i, err := re.LastInsertId()
	if err != nil {
		log.Println("Model LastInsertID is err, ", err)
		return 0
	}
	return i
}

/**
* 格式化处理
 */

// 格式实现id对应产品名称与实现名称
func (m *Model) forInstance(rows *sql.Rows, re *interface{}) bool {
	if rows == nil {
		return false
	}
	var (
		id      int
		name    string
		product string
	)

	err := rows.Scan(&id, &name, &product)
	if err != nil {
		log.Println("forInstance Scan is err, ", err)
		return true
	}

	a, ok := (*re).(map[string]interface{})
	if !ok || a == nil {
		a = make(map[string]interface{})
	}
	a[strconv.Itoa(id)] = fmt.Sprintf("%s,%s", string(name), string(product))
	*re = a
	return true
}

// 格式数据为接口返回模式
func (m *Model) forInstanceInfo(rows *sql.Rows, re *interface{}) bool {
	if rows == nil {
		return false
	}

	var (
		i         = new(DbInstance)
		operation string
		o         = new(DbOrg)
	)

	err := rows.Scan(&i.ID, &i.ProductID, &i.Name, &i.Title, &i.Style, &i.Type, &i.Magazine, &i.Paper, &i.Book, &i.Article, &i.StartTime, &i.EndTime, &i.ProductCode, &operation, &o.Name, &o.Address, &o.OrgCode, &o.OrgID, &o.ContactMan, &o.Phone, &o.Slogan, &o.Magazines, &o.Papers, &o.Books)
	if err != nil {
		log.Println("formatInstanceInfo Scan is err, ", err)
		return true
	}

	// 处理权限为数组
	var oper []interface{}
	op := strings.Split(string(operation), ",")
	if op != nil && len(op) > 0 {
		for _, v := range op {
			oper = append(oper, map[string]interface{}{
				"right": v,
				"value": 1,
			})
		}
	}

	a := &DbInfo{i, oper, o}
	*re = a
	return true
}

// 格式分类左右值为树状结构
func (m *Model) forTree(rows *sql.Rows, re *interface{}) bool {
	if rows == nil {
		return false
	}

	v := new(DbTree)
	err := rows.Scan(&v.ID, &v.Name, &v.leftside, &v.rightside, &v.Category, &v.status)
	if err != nil {
		log.Println("forTree Scan is err, ", err)
		return false
	}

	r, ok := (*re).([]*DbTree)
	if !ok {
		r = make([]*DbTree, 0, 0)
	}

	m.treeSet(&r, v)
	*re = r
	return true
}

// TreeSet 树设置，判断当前项为前一项的子项，兄弟项
func (m *Model) treeSet(set *[]*DbTree, current *DbTree) bool {
	if set == nil || len(*set) == 0 {
		*set = append(*set, current)
		return true
	}
	item := (*set)[len(*set)-1]

	// 同为第一级
	if item.rightside < current.leftside {
		*set = append(*set, current)
		return true
	}

	return m.treeSet(&item.SubLevels, current)
}

// 格式分类选刊
func (m *Model) forNoteItem(rows *sql.Rows, re *interface{}) bool {
	if rows == nil {
		return false
	}
	a, ok := (*re).(map[string]string)
	if !ok {
		a = make(map[string]string)
	}

	var (
		node  sql.RawBytes
		items sql.RawBytes
	)
	err := rows.Scan(&node, &items)
	if err != nil {
		log.Println("forNoteItem Scan is err, ", err)
		return true
	}
	a[string(node)] = string(items)
	*re = a
	return true
}

func (m *Model) forSourceLatest(rows *sql.Rows, re *interface{}) bool {
	if rows == nil {
		return false
	}
	a, ok := (*re).(*DbLatest)
	if !ok {
		a = new(DbLatest)
		a.List = make(map[string]*DbIssue)
		a.Sort = make([]int, 0)
	}

	v := new(DbIssue)
	err := rows.Scan(&v.ResourceID, &v.ResourceName, &v.ResourceCode, &v.IssueName, &v.IssueID, &v.IssueYear, &v.IssueNo, &v.Count, &v.Start, &v.Price0, &v.Price1, &v.Toll, &v.Sort, &v.Webp, &v.Jpg, &v.HTML, &v.Txt, &v.Pdf, &v.qishu)
	if err != nil {
		log.Println("forSourceLatest Scan is err, ", err)
		return true
	}
	a.List[strconv.Itoa(v.ResourceID)] = v
	a.Sort = append(a.Sort, v.ResourceID)
	*re = a
	return true
}

func (m *Model) forSourceIssue(rows *sql.Rows, re *interface{}) bool {
	if rows == nil {
		return false
	}
	a, ok := (*re).([]interface{})
	if !ok {
		a = make([]interface{}, 0)
	}

	v := new(DbIssue)
	err := rows.Scan(&v.ResourceID, &v.ResourceName, &v.ResourceCode, &v.IssueName, &v.IssueID, &v.IssueYear, &v.IssueNo, &v.Count, &v.Start, &v.Price0, &v.Price1, &v.Toll, &v.Sort, &v.Webp, &v.Jpg, &v.HTML, &v.Txt, &v.Pdf, &v.qishu)
	if err != nil {
		log.Println("forSourceLatest Scan is err, ", err)
		return true
	}
	*re = append(a, v)
	return true
}

// 格式品种与期
func (m *Model) formatSourceItem(rows *sql.Rows, re *interface{}) bool {
	if rows == nil {
		return false
	}
	a, ok := (*re).(map[string]interface{})
	if !ok {
		a = make(map[string]interface{})
	}

	var (
		source string
		issues string
	)
	err := rows.Scan(source, issues)
	if err != nil {
		log.Println("formatSourceItem Scan is err, ", err)
		return true
	}
	a[string(source)] = string(issues)
	*re = a
	return true
}

// 格式目录左右值为树状结构
func (m *Model) forCatalog(rows *sql.Rows, re *interface{}) bool {
	if rows == nil {
		return false
	}

	v := new(DbCatalog)
	err := rows.Scan(&v.ID, &v.Name, &v.leftside, &v.rightside, &v.Page, &v.Category, &v.status)
	if err != nil {
		log.Println("forTree Scan is err, ", err)
		return false
	}

	r, ok := (*re).([]*DbCatalog)
	if !ok {
		r = make([]*DbCatalog, 0, 300)
	}

	m.catalogSet(&r, v)
	*re = r
	return true
}

// TreeSet 树设置，判断当前项为前一项的子项，兄弟项
func (m *Model) catalogSet(set *[]*DbCatalog, current *DbCatalog) bool {
	if set == nil || len(*set) == 0 {
		*set = append(*set, current)
		return true
	}
	item := (*set)[len(*set)-1]

	// 同为第一级
	if item.rightside < current.leftside {
		*set = append(*set, current)
		return true
	}

	return m.catalogSet(&item.SubLevels, current)
}

/**
* 机构实例数据请求
 */

// FileNameInstance 所有静态文件名称
func FileNameInstance() string {
	return "Instance_all.txt"
}

// FileNameInstanceSingle 单个应用实例的信息静态文件名称
func FileNameInstanceSingle(product, instance string) string {
	return fmt.Sprintf("Instance_%s_%s.txt", product, instance)
}

// FileNameUnitCategory 每个分类单元静态文件名称
func FileNameUnitCategory(genre, unit string) string {
	return fmt.Sprintf("Category_%s_%s.txt", genre, unit)
}

// FileNameSourceLatest 最近资源静态文件名称
func FileNameSourceLatest(genre string) string {
	return fmt.Sprintf("Source_%s_latest.txt", genre)
}

// FileNameSourceSingle 单个品种静态文件名称
func FileNameSourceSingle(genre, mid string) string {
	return fmt.Sprintf("Source_%s_%s.txt", genre, mid)
}

// FileNameIssueSingle 单个册静态文件名称
func FileNameIssueSingle(genre, iid string) string {
	return fmt.Sprintf("Issue_%s_%s.txt", genre, iid)
}

// FileExist 判断文件是否存在
func (m *Model) FileExist(file string) string {
	file = fmt.Sprintf("%s/%s", m.Dir, file)
	if m.Refresh {
		return file
	}
	if _, err := os.Stat(file); err != nil && os.IsNotExist(err) {
		return file
	}
	return ""
}

// Instance 实例id对应实例名称与产品名称
func (m *Model) Instance() (interface{}, string) {
	f := m.FileExist(FileNameInstance())
	s := "SELECT a.id, a.`name`, b.code product FROM org_product a LEFT JOIN map_product b ON a.product = b.id WHERE a.`status` = 1"
	var re interface{}
	m.QueryFunc(s, &re, m.forInstance)
	return re, f
}

// InstanceInfo 实例信息
func (m *Model) InstanceInfo() (interface{}, string) {
	f := ""
	w := m.InstanceInfoByID()
	if w == "" {
		w, f = m.InstanceInfoByName()
	}
	if w == "" {
		return nil, ""
	}
	s := fmt.Sprintf("SELECT a.id, a.product productID, a.`name`, a.title, a.style, a.type, a.magazine, a.paper, a.book, a.article, UNIX_TIMESTAMP(a.startdate), UNIX_TIMESTAMP(a.enddate), "+
		"b.code productCode, IFNULL(GROUP_CONCAT(d.operation),'') operation, "+
		"IFNULL(c.`name`, '') orgname, IFNULL(c.address, '') address, IFNULL(c.org, '') orgCode, IFNULL(c.id, 0) orgID, IFNULL(c.contactman,'') contactMan, IFNULL(c.phone, '') phone, IFNULL(c.slogan, '') slogan,"+
		"IFNULL(e.magazine, '') mids, IFNULL(e.paper, '') pids, IFNULL(e.book, '') bids "+
		"FROM org_product a "+
		"LEFT JOIN map_product b ON a.product = b.id "+
		"LEFT JOIN org_info c ON a.org = b.id "+
		"LEFT JOIN map_operation d ON FIND_IN_SET(d.id, a.operation) "+
		"LEFT JOIN org_source e ON a.org = e.org "+
		"WHERE %s AND a.`status` = 1", w)
	// log.Println(s)
	var re interface{}
	m.QueryFunc(s, &re, m.forInstanceInfo)
	if f != "" {
		return re, f
	}

	// 获取机构实例名称与产品id
	set, ok := re.(DbInfo)
	if !ok {
		return re, f
	}
	return re, FileNameInstanceSingle(set.Base.ProductCode, set.Base.Name)
}

// InstanceInfoByName 根据产品名称，实例名称获取实例信息
func (m *Model) InstanceInfoByName() (string, string) {
	if m.Prouduct == "" || m.Name == "" {
		return "", ""
	}
	f := m.FileExist(FileNameInstanceSingle(m.Prouduct, m.Name))
	return fmt.Sprintf("b.code = '%s' AND a.name='%s'", m.Prouduct, m.Name), f

}

// InstanceInfoByID  根据实例id获取实例信息
func (m *Model) InstanceInfoByID() string {
	if m.ID == 0 {
		return ""
	}
	return fmt.Sprintf("a.id='%v'", m.ID)
}

// CategoryInfo 分类信息
func (m *Model) CategoryInfo(genre, unit int) (interface{}, string) {
	if genre < 1 || genre > 4 || unit < 0 {
		return nil, ""
	}
	f := m.FileExist(FileNameUnitCategory(strconv.Itoa(genre), strconv.Itoa(unit)))
	var re = new(DbCategory)
	tree := m.CategoryTree(genre, unit)
	re.Tree, _ = tree.([]*DbTree)

	source := m.CategorySource(genre, unit)
	v1, ok := source.(map[string]string)
	if ok {
		re.Source = v1
	}

	sort := m.CategorySort(genre, unit)
	v2, ok := sort.(map[string]string)
	if ok {
		re.Sort = v2
	}
	return re, f
}

// CategoryTree 根据分类单元获取实例分类
func (m *Model) CategoryTree(genre, unit int) interface{} {
	if genre == 0 || genre > 4 || unit < 0 {
		return nil
	}
	genres := []string{
		"",
		"map_category",
		"map_category_paper",
		"map_category_book",
		"map_category_article",
	}
	s := fmt.Sprintf("SELECT id, name, leftside, rightside, category, status FROM %s WHERE category = %v AND status = 1 ORDER BY leftside", genres[genre], unit)
	var re interface{}
	m.QueryFunc(s, &re, m.forTree)
	return re
}

// CategorySource 获取页分类的与issueid的绑定关系
func (m *Model) CategorySource(genre, unit int) interface{} {
	if genre == 0 || genre > 4 || unit < 0 {
		return nil
	}
	genres := []string{
		"",
		"magazine_source_category",
		"paper_source_category",
		"book_source_category",
		"article_source_category",
	}
	s := fmt.Sprintf("SELECT node, GROUP_CONCAT(item) items FROM %s WHERE category = %v AND `status` = 1 GROUP BY node", genres[genre], unit)
	var re interface{}
	m.QueryFunc(s, &re, m.forNoteItem)
	return re
}

// CategorySort 获取页分类的与issueid的绑定关系
func (m *Model) CategorySort(genre, unit int) interface{} {
	if genre == 0 || genre > 4 || unit < 0 {
		return nil
	}
	genres := []string{
		"",
		"magazine_source_sort",
		"paper_source_sort",
		"book_source_sort",
		"article_source_sort",
	}
	s := fmt.Sprintf("SELECT node, GROUP_CONCAT(item) items FROM (SELECT node, item FROM  %s WHERE category = %v AND `status` = 1 ORDER BY sort DESC) a GROUP BY node", genres[genre], unit)
	var re interface{}
	m.QueryFunc(s, &re, m.forNoteItem)
	return re
}

// SourceLatest 资源最新期数
func (m *Model) SourceLatest(genre int) (interface{}, string) {
	if genre < 1 || genre > 3 {
		return nil, ""
	}
	f := m.FileExist(FileNameSourceLatest(strconv.Itoa(genre)))
	if f == "" {
		return nil, ""
	}
	s := fmt.Sprintf("SELECT %s FROM %s_issue_latest ORDER BY DATEDIFF(NOW(), online), sort", columns[genre], marks[genre])
	var re interface{}
	m.QueryFunc(s, &re, m.forSourceLatest)
	return re, f
}

// SourceIssue 资源期信息
func (m *Model) SourceIssue(genre, mid int) (interface{}, string) {
	if genre < 1 || genre > 3 {
		return nil, ""
	}
	f := m.FileExist(FileNameSourceSingle(strconv.Itoa(genre), strconv.Itoa(mid)))
	if f == "" {
		return nil, ""
	}
	var d = &Duration{0, 0}
	if genre == 1 {
		d = m.Magazines
	}
	if genre == 2 {
		d = m.Papers
	}

	end := "1"
	if d.End > 0 {
		end = fmt.Sprintf("qishu  <= %v", d.End)
	}
	s := fmt.Sprintf("SELECT * FROM (SELECT %s FROM %s_issue WHERE %s AND %sid = %v ) a WHERE qishu >= %v AND %s ORDER BY qishu DESC", columns[genre], marks[genre], wheres[genre], marks[genre], mid, d.Start, end)
	log.Println(s)
	var re interface{}
	m.QueryFunc(s, &re, m.forSourceIssue)
	return re, f
}

// IssueInfo 资源目录
func (m *Model) IssueInfo(genre, issue int, data *DbIssue) (interface{}, string) {
	if genre < 1 || genre > 3 {
		return nil, ""
	}
	f := m.FileExist(FileNameIssueSingle(strconv.Itoa(genre), strconv.Itoa(issue)))
	if f == "" {
		return nil, ""
	}
	s := fmt.Sprintf("SELECT id, name, leftside, rightside, page, category, status FROM %s_catalog WHERE category = %v AND status = 1 ORDER BY  leftside", marks[genre], issue)
	log.Println(s)
	var re interface{}
	m.QueryFunc(s, &re, m.forCatalog)
	d := new(DbSingle)

	r, _ := re.([]*DbCatalog)
	d.Catalog = r
	if data != nil {
		d.Info = data
		return d, f
	}

	s = fmt.Sprintf("SELECT %s FROM %s_issue WHERE %s AND issueid = %v", columns[genre], marks[genre], wheres[genre], issue)
	log.Println(s)
	re = nil
	m.QueryFunc(s, &re, m.forSourceIssue)
	if re != nil {
		r, _ := re.([]*DbIssue)
		d.Info = r[0]
	}
	return d, f
}

// Resource 获取资源
func (m *Model) Resource(issue *DbIssue) (interface{}, string) {
	if issue == nil {
		return nil, ""
	}

	form := ""
	to := ""

	// web图片处理
	if issue.Webp > 0 {

	}

	// web图片处理
	if issue.Webp > 0 && issue.Jpg == "" {
		return nil, ""
	}

	// epub处理
	if issue.HTML != "" {
		return nil, ""
	}

	// 文本处理
	if issue.Txt > 0 {
		return nil, ""
	}

	// pdf处理
	if issue.Pdf > 0 {
		return nil, ""
	}

	m.CopyFile(form, to)
	return nil, ""
}

// CopyFile 拷贝文件
func (m *Model) CopyFile(from, to string) (bool, string) {
	if from == "" || to == "" {
		return false, ""
	}

	f, err := os.Open(from)
	if err != nil {
		log.Println("CopyFile io.Open is err, ", err)
		return false, ""
	}
	defer f.Close()

	t, err := os.Create(to)
	if err != nil {
		log.Println("CopyFile os.Create is err, ", err)
		return false, ""
	}
	defer t.Close()
	_, err = io.Copy(f, t)
	if err != nil {
		log.Println("CopyFile io.Copy is err, ", err)
		return false, ""
	}
	return true, ""
}

// GetALLReourceID 获取所有资源id
func (m *Model) GetALLReourceID(genre int) string {
	if genre < 1 || genre > 3 {
		return ""
	}
	k := "jpg"
	if genre == 2 {
		k = "txt"
	}
	s := fmt.Sprintf("SELECT GROUP_CONCAT(%sid) mid FROM %s_issue_latest WHERE %s > 0", marks[genre], marks[genre], k)
	re := m.Query(s)
	if len(re) == 0 {
		return ""
	}

	a, ok := re[0].(map[string]interface{})
	if !ok {
		return ""
	}
	i, ok := a["mid"]
	if !ok {
		return ""
	}
	str, ok := i.(string)
	if !ok {
		return ""
	}
	return str
}

// EachSourceIssue 每个分类对资源
func (m *Model) EachSourceIssue(genre int, sources string) bool {
	if genre < 1 || genre > 4 {
		log.Println("eachSourceIssue is not run", genre)
		return false
	}
	if sources == "" {
		sources = m.GetALLReourceID(genre)
	}
	if sources == "" {
		return false
	}
	re := strings.Split(sources, ",")
	for _, v := range re {
		id, err := strconv.Atoi(v)
		if err != nil {
			continue
		}
		re, f := m.SourceIssue(genre, id)
		log.Println(re)
		b, err := json.Marshal(re)
		if err != nil {
			continue
		}
		WriteFile(f, b)
		arr, ok := re.([]interface{})
		if !ok {
			continue
		}
		m.EachIssueCatalog(genre, arr)
	}
	return true
}

// EachIssueCatalog 每期目录
func (m *Model) EachIssueCatalog(genre int, re []interface{}) bool {
	if genre < 1 || genre > 4 || re == nil {
		log.Println("eachSourceIssue is not run", genre, re)
		return false
	}
	for _, v := range re {
		if v == nil {
			return true
		}
		val, ok := v.(*DbIssue)
		if !ok {
			return false
		}
		re, f := m.IssueInfo(genre, val.IssueID, val)
		log.Println(re)
		b, err := json.Marshal(re)
		if err != nil {
			continue
		}
		WriteFile(f, b)
	}
	return true
}

// EachIssueImage 每期图片
func (m *Model) EachIssueImage(genre int, re []DbIssue) bool {
	if genre < 1 || genre > 4 || re == nil {
		log.Println("eachSourceIssue is not run", genre, re)
		return false
	}
	for _, v := range re {
		if v.IssueID == 0 {
			return true
		}
		// GetFile()
	}
	return true
}
