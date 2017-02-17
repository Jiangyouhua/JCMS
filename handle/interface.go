package handle

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"crypto/md5"
	"encoding/hex"
	"fmt"
	"net"
	"path"
)

// Interface 数据请求结构
type Interface struct {
	URL             string      // 请求的地址
	Data            interface{} // 请求的基址数据
	Update          bool        // 前端强制要求更新
	Page            int         //分页页面数
	Number          int         //每页的数量
	Word            string      // 搜索的关键词
	Local           string      // 本地信息
	ProductInstance string      // 第三方需要的数据
}

// OldResult 解析接收的数据
type OldResult struct {
	Status    int         `json:"status"`
	Data      interface{} `json:"data"`
	ErrorCode string      `json:"errorCode"`
}

// PathKeyValue 将map[string]interface{}, url.Values转为/kye/value/.....
func PathKeyValue(i interface{}) string {
	if i == nil {
		return ""
	}

	// 断言是否可以转map
	m, ok := i.(map[string]interface{})
	var (
		n      url.Values
		key    []string
		values = make(map[string]string)
	)
	if !ok {
		// 断言是否可转url.Values
		n, ok = i.(url.Values)
		if !ok {
			// 无效数，返回空字符串
			return ""
		}
		for k, _ := range n {
			key = append(key, k)
			values[k] = n.Get(k)
		}
	} else {
		for k, v := range m {
			key = append(key, k)
			values[k] = ToString(v)
		}
	}

	a := sort.StringSlice(key)
	s := ""
	for _, v := range a {
		if val, ok := values[v]; ok {
			s += fmt.Sprintf("/%s/%s", v, val)
		}

	}
	h := md5.New()
	h.Write([]byte(s))
	cipherStr := h.Sum(nil)
	return hex.EncodeToString(cipherStr)
}

// ResourceNameFind 查找资源
func ResourceNameFind(a []interface{}, word, str string) []interface{} {
	if a == nil || len(a) == 0 {
		return nil
	}
	var re []interface{}
	for _, v := range a {
		// 解析数据库行数据
		m, ok := v.(map[string]interface{})
		if !ok {
			return nil
		}
		// 判断是否有资源名称字段
		name, ok := m["resourceName"]
		if !ok {
			return nil
		}

		// 能否转为字符串
		s, ok := name.(string)
		if !ok {
			return nil
		}
		if strings.Index(s, word) > -1 {
			val := v
			// 转换数据格式为第三方所有
			if str != "" {
				m := ReOneMap(v)
				mid, ok1 := m["resourceId"]
				mname, ok2 := m["resourceName"]
				iid, ok3 := m["issueId"]
				iname, ok4 := m["issueName"]
				html, _ := m["html"]
				if ok1 && ok2 && ok3 && ok4 {
					reader := "imageReader"
					h := fmt.Sprintf(str, reader, mid, iid)
					if html == "0" {
						reader = "epubReader"
					}

					val = map[string]string{
						"name": mname,
						"date": iname,
						"href": h,
					}
				}
			}
			re = append(re, val)
		}
	}
	return re
}

// LocalPaperFirst 本地报纸优先
func LocalPaperFirst(a []interface{}, local string) []interface{} {
	if a == nil || len(a) == 0 {
		return nil
	}
	if local == "" {
		return a
	}
	var (
		province       string                  // 省名称
		city           string                  //城市名称
		localProvinces []interface{}           //本省的报纸
		localCitys     []interface{}           //本市的报纸
		other          []interface{}           //其它的报纸
		provinces      = make(map[string]bool) //本省的报纸映射
		citys          = make(map[string]bool) //本市的报纸映射
	)

	// 分解本地信息
	p := strings.Split(local, ",")
	if len(p) < 1 {
		return a
	}
	province = p[1]
	if len(p) > 2 {
		city = p[2]
	}

	// 获取 所有报纸的地区对应关系
	r := (&Interface{URL: p[0]}).Request()
	if r.Status > 0 || r.Data == nil {
		return a
	}
	data, ok := r.Data.([]interface{})
	if !ok || data == nil || len(data) == 0 {
		return a
	}

	for _, v := range data {
		val := ReOneMap(v)
		if val == nil {
			break
		}
		var area = val["formalName"]
		var source = val["resourceId"]
		if area == city {
			citys[source] = true
			continue
		}
		if area == province {
			provinces[source] = true
			continue
		}
	}

	if citys == nil && provinces == nil {
		return a
	}

	for _, v := range a {
		val := ReOneMap(v)
		if val == nil {
			return a
		}

		s, ok := val["resourceId"]
		if !ok {
			return a
		}
		if val, ok := citys[s]; ok && val {
			localCitys = append(localCitys, v)
			continue
		}
		if val, ok := provinces[s]; ok && val {
			localProvinces = append(localProvinces, v)
			continue
		}
		other = append(other, v)
	}
	re := append(localCitys, localProvinces...)
	return append(re, other...)
}

// Result 旧转新返回结构
func (old *OldResult) Result() *Result {
	s := 0
	if old.Status == 0 {
		s = 1
	}
	i := old.ErrorCode
	if s == 1 {
		i = "请求成功"
	}
	return &Result{s, i, old.Data}
}

// Request Web客户端请求，按数据自动使用Get, Post， Form
func (in *Interface) Request() *OldResult {
	var b []byte
	key := in.staticPath()
	// 缓存已准备好,且前端没有要求更新
	if AllCache != nil && !in.Update {
		c := AllCache.Get(key)
		if c != nil && c.Value != nil && !c.Time.IsZero() && int(time.Now().Sub(c.Time).Seconds()) < AllCache.Duration {
			b = c.Value
			log.Println("*** Data Request Form AllCache, ", in.URL, in.Data)
		}
	}
	if b != nil {
		return in.oldResult(b)
	}

	// 从接口获取数据
	b = in.RequestByte()
	// 并将数缓存在全局缓存中, 或放入静态化对列
	if b != nil && AllCache != nil {
		AllCache.Set(key, b)
	}
	return in.oldResult(b)
}

// RequestByte 客户端请求，按数据自动使用
func (in *Interface) RequestByte() []byte {
	if AllData == nil {
		return in.withRequest()
	}
	b := in.withFile()
	if b != nil {
		return b
	}
	b = in.withRequest()
	if b == nil {
		return nil
	}
	AllData.Add(in.staticPath(), b)
	return b
}

func (in *Interface) withRequest() []byte {
	var r *http.Response
	if in.Data == nil {
		r = in.Get()
	} else {
		if _, ok := in.Data.(url.Values); !ok {
			r = in.Post()
		} else {
			r = in.Form()
		}
	}
	if r == nil || r.StatusCode == 0 {
		return nil
	}
	// 判断请求是否成功
	switch {
	case r.StatusCode >= 500:
		log.Println(r.Status)
		return nil
	case r.StatusCode >= 400:
		log.Println(r.Status)
		return nil
	}

	if r.Body == nil {
		return nil
	}
	defer r.Body.Close()
	b, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Println(err)
		return nil
	}
	log.Println("### Data Request Form Interface, ", in.URL, in.Data)
	return b
}

func (in *Interface) withFile() []byte {
	// 如果没有指定配置，则返回空
	if AllData == nil {
		return nil
	}

	//将请求url转为本址静态化路径
	s := in.staticPath()
	if s == "" {
		return nil
	}
	b, err := ioutil.ReadFile(s)
	if err != nil {
		return nil
	}
	log.Println("$$$ Data Request Form cacheFile, ", s)
	return b
}

// staticPath 静态化路经格式化
func (in *Interface) staticPath() string {
	//将请求url转为本址静态化路径
	p := ""
	if AllData != nil {
		p = AllData.Dir
	}
	u := strings.Replace(in.URL, InterfaceServer, "", -1)
	s := p + u
	if in.Data != nil {
		s += PathKeyValue(in.Data)
	}
	if path.Ext(s) == "" {
		s += ".txt"
	}
	return s
}

func (in *Interface) oldResult(body []byte) *OldResult {
	if body == nil {
		return &OldResult{1, nil, "data is null"}
	}
	re := new(OldResult)
	err := json.Unmarshal(body, re)
	if err != nil {
		return &OldResult{1, nil, "json.Unmarshal is err," + err.Error()}
	}

	// 不分页，搜索
	if in.Page == 0 && in.Number == 0 && in.Word == "" {
		return re
	}

	// 数据是否有数组，不是则返回空
	data, ok := re.Data.([]interface{})
	if !ok {
		re.Data = nil
		re.Status = 0
		re.ErrorCode = "re.Data is not array"
		return re
	}
	if in.Word != "" {
		data = ResourceNameFind(data, in.Word, in.ProductInstance)
	} else {
		if in.Local != "" {
			data = LocalPaperFirst(data, in.Local)
		}
	}

	// 没有分页数，返回全部
	if in.Number == 0 {
		re.Data = data
		return re
	}

	// 没有页面数，返回总数
	if in.Page == 0 {
		re.Data = map[string]interface{}{"total": len(data), "num": in.Number}
		return re
	}

	start := (in.Page - 1) * in.Number
	end := in.Page * in.Number
	if len(data) < start {
		re.Data = nil
		return re
	}
	if len(data) < end {
		re.Data = data[start:]
	} else {
		re.Data = data[start:end]
	}
	return re
}

/**
 *以下为http 请求部分
 */

// Get 客户端Get请求
func (in *Interface) Get() *http.Response {
	// fmt.Println(url)
	c := in.Setting(RequestDuration)
	req, err := http.NewRequest("GET", in.URL, nil)
	if err != nil {
		log.Println(err)
		return nil
	}
	r, err := c.Do(req)
	if err != nil {
		log.Println(err)
		return nil
	}
	return r
}

// Post 客户端Post请求
func (in *Interface) Post() *http.Response {
	j, err := json.Marshal(in.Data)
	if err != nil {
		log.Println(err)
		return nil
	}
	s := string(j)
	c := in.Setting(RequestDuration)
	req, err := http.NewRequest("Post", in.URL, strings.NewReader(s))
	if err != nil {
		log.Println(err)
		return nil
	}
	req.Header.Add("Accept", "application/x-www-form-urlencoded")
	r, err := c.Do(req)
	if err != nil {
		log.Println(err)
		return nil
	}
	return r
}

// Form 客户端Form请求
func (in *Interface) Form() *http.Response {
	c := in.Setting(RequestDuration)
	r, err := c.PostForm(in.URL, in.Data.(url.Values))
	if err != nil {
		log.Println(err)
		return nil
	}
	return r
}

// Setting 请求初始设置
func (in *Interface) Setting(i int) http.Client {
	if i == 0 {
		i = 30
	}
	t := time.Duration(i)
	return http.Client{
		Transport: &http.Transport{
			Dial: func(netw, addr string) (net.Conn, error) {
				deadline := time.Now().Add(t * time.Second)
				c, err := net.DialTimeout(netw, addr, time.Second*t)
				if err != nil {
					return nil, err
				}
				c.SetDeadline(deadline)
				return c, nil
			},
		},
	}
}
