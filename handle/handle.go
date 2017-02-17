package handle

import (
	"bytes"
	"io/ioutil"

	"Jcms2.1/cache"
	"encoding/json"
	"fmt"
	"golang.org/x/text/encoding/simplifiedchinese"
	"golang.org/x/text/transform"
	"log"
	"net/url"
	"strconv"
)

var (
	AllCache        *cache.CacheSet // 全局缓存
	AllData         *StaticQueue    // 静态化处理
	InterfaceServer string          // 全接口服务器
	RequestDuration int             // 请求超时
)

// MapString 定义返回数据的最后结构
type MapString map[string]string

// Router 路由定义
type Router struct {
	f func(args ...string) *Result //处理该接口的函数
	k string                       //获取接口数哪部分，默认全部
}

// Result 请求返回的标准结构
type Result struct {
	Status int         `json:"status"` //状态
	Info   string      `json:"info"`   //状态值
	Data   interface{} `json:"data"`   //相关数据
}

// GbkToUtf8 GBK转UTF8
func GbkToUtf8(s []byte) ([]byte, error) {
	reader := transform.NewReader(bytes.NewReader(s), simplifiedchinese.GBK.NewDecoder())
	d, e := ioutil.ReadAll(reader)
	if e != nil {
		return nil, e
	}
	return d, nil
}

// Utf8ToGbk UTF8转GBK，GBK为中文字符集
func Utf8ToGbk(s []byte) ([]byte, error) {
	reader := transform.NewReader(bytes.NewReader(s), simplifiedchinese.GBK.NewEncoder())
	d, e := ioutil.ReadAll(reader)
	if e != nil {
		return nil, e
	}
	return d, nil
}

// ReOneMap 解析接口数据为map[string]string
func ReOneMap(data interface{}) MapString {
	if data == nil {
		log.Println("ReOneMap is nil")
		return nil
	}
	var m = make(map[string]string)
	d, ok := data.(map[string]interface{})
	if !ok {
		return m
	}
	for k, v := range d {
		m[k] = ToString(v)
	}
	return MapString(m)
}

// ToString 转字符串
func ToString(i interface{}) string {
	if i == nil {
		return ""
	}
	switch inst := i.(type) {
	case string:
		return inst
	case int:
		return strconv.Itoa(inst)
	case int32:
		return strconv.Itoa(int(inst))
	case int64:
		return strconv.FormatInt(inst, 10)
	case float64:
		return strconv.FormatFloat(inst, 'f', 0, 64)
	case float32:
		return strconv.FormatFloat(float64(inst), 'f', 0, 32)
	default:
		return ""
	}
}

// ReArrayMap 解析为[]map[string]string
func ReArrayMap(data interface{}) []MapString {
	if data == nil {
		log.Println("ReArrayMap is nil")
		return nil
	}
	var a = make([]MapString, 0)
	d, ok := data.([]interface{})
	if !ok {
		return nil
	}
	for _, v := range d {
		a = append(a, ReOneMap(v))
	}
	return a
}

// ReMapMap 解析为[]map[string]string
func ReMapMap(data interface{}) map[string]MapString {
	if data == nil {
		log.Println("ReArrayMap is nil")
		return nil
	}
	var a = make(map[string]MapString)
	d, ok := data.(map[string]interface{})
	if !ok {
		return a
	}
	for k, v := range d {
		a[k] = ReOneMap(v)
	}
	return a
}

// CacheOrFile 从缓存或文件获取数据
func CacheOrFile(file string, v interface{}) bool {
	if file == "" {
		return false
	}
	file = fmt.Sprintf("%s/%s", AllData.Dir, file)
	// 从缓存读取
	c := AllCache.Get(file)
	var b []byte
	if c != nil && c.Value != nil {
		// 有则返回
		b = c.Value
	} else {
		// 文件读取
		var err error
		b, err = ioutil.ReadFile(file)
		if err != nil || len(b) == 0 {
			log.Println("model CacheOrFIle ioutil.ReadFile is err, ", err)
			return false
		}
		AllCache.Set(file, b)
	}

	err := json.Unmarshal(b, v)
	if err != nil {
		log.Println("model CacheOrFile json.Unmarshal is err, ", err)
		return false
	}
	return true
}

// WebInfo 站点信息
func WebInfo(server, product, instance string, update bool) *Result {
	u := fmt.Sprintf("%s/Organization.instanceByCode/productCode_%s/orgCode_%s.txt", server, product, instance)
	return InstanceResult(&Interface{URL: u, Update: update})
}

// KeyWithInstance 从webInfo获取值， tag表示webInfo的不同部分
func KeyWithInstance(info interface{}, key, tag string) string {
	//  没有数据集返回空
	if info == nil || key == "" || tag == "" {
		return ""
	}

	re, ok := info.(map[string]interface{})
	if !ok {
		return ""
	}

	data := ReOneMap(re[tag])
	if data == nil {
		return ""
	}

	// 对资源类别特别处理
	if key == "genre" {
		magazine, ok := data["magazine"]
		if ok && magazine != "-1" {
			return "1"
		}
		paper, ok := data["paper"]
		if ok && paper != "-1" {
			return "2"
		}
		book, ok := data["book"]
		if ok && book != "-1" {
			return "3"
		}
		article, ok := data["article"]
		if ok && article != "-1" {
			return "4"
		}
		return "0"
	}
	return data[key]
}

// KeyWithUserInfo 从用户信息中获取值
func KeyWithUserInfo(info interface{}, key string) string {
	data, ok := info.(url.Values)
	if ok {
		return data.Get(key)
	}
	da := ReOneMap(info)
	return da[key]
}
