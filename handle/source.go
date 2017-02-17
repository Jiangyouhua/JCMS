package handle

import (
	"net/url"
	"strings"
)

// Source url请求资源格式化
type Source struct {
	Level [8]string         // 0,product, 1.instance, 2.page, 3,genre 4,category, 5.mid, 6.iid, 7.param
	Args  map[string]string //key@value
	Data  url.Values
}

/**
* 源的解析
 */

// Init 初始化，并资源定位合一
// 以参数为主， url为辅
func (s *Source) Init() {
	for k, v := range s.Data {
		val := strings.Join(v, ",")
		switch k {
		case "handle":
			continue
		case "func":
			continue
		case "genre":
			s.Level[3] = s.ToEmpty(s.Level[3], val)
		case "category":
			s.Level[4] = s.ToEmpty(s.Level[4], val)
		case "mid":
			s.Level[5] = s.ToEmpty(s.Level[5], val)
		case "iid":
			s.Level[6] = s.ToEmpty(s.Level[6], val)
		case "param":
			s.Level[7] = s.ToEmpty(s.Level[7], val)
		default:
			if val != "" && val != "0" {
				s.Args[k] = val
			}
		}
	}
}

// ToEmpty 零值转空
func (s *Source) ToEmpty(a, b string) string {
	if b != "" && b != "0" {
		return b
	}
	if a != "" && a != "0" {
		return a
	}
	return ""
}

// GetProduct 获取产源包含的产品值
func (s *Source) GetProduct() string {
	return s.Level[0]
}

// GetInstance 获取产源包含的实现值
func (s *Source) GetInstance() string {
	return s.Level[1]
}

// GetLayout 获取产源包含的页面值
func (s *Source) GetLayout() string {
	return s.Level[2]
}

// GetGenre 获取产源包含的资源类型值
func (s *Source) GetGenre() string {
	return s.Level[3]
}

// GetCategory 获取产源包含的杂志、报纸、图书分类值
func (s *Source) GetCategory() string {
	return s.Level[4]
}

// GetMid 获取产源包含的magazineid, paperid, bookid值
func (s *Source) GetMid() string {
	return s.Level[5]
}

// GetIid 获取产源包含的issueid, itemid值
func (s *Source) GetIid() string {
	return s.Level[6]
}

// GetParam 获取产源包含的item属性值
func (s *Source) GetParam() string {
	return s.Level[7]
}

// GetArgs 获取产源包含的key@value值
func (s *Source) GetArgs(key string) string {
	return s.Args[key]
}
