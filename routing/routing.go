package routing

/**
* 自定义由路
* 说明：尽量不要使用正则表达式，测试1亿条数据表明strings.index()为regexp.MatchString()的34倍
 */

import (
	"net/http"
	"sort"
	"strings"
	"sync"
)

var Router *Routing

// Routing 路由类
type Routing struct {
	mu *sync.RWMutex      // 异步锁
	m  map[string]Handler // 字符串对应方法映射
	s  []string           // 映射排序
	f  Bootstrap          // 初步处理方法, 返回处理数据集，及判断是否需要继续
	g  []Goroutines       //并行处理函数
}

// Handler 映射的处理方法
type Handler func(http.ResponseWriter, *http.Request, interface{})

// Goroutines 与handler并行的程序，handler结束前将判断所有这类函数是否处理完成
type Goroutines func(http.ResponseWriter, *http.Request, interface{}, chan bool)

// Bootstrap 引导程序
type Bootstrap func(http.ResponseWriter, *http.Request) (interface{}, bool)

func init() {
	Router = &Routing{
		new(sync.RWMutex),
		make(map[string]Handler),
		make([]string, 0),
		nil,
		nil,
	}
}

// Boot 仿类方法由路前置处理函数
func Boot(f Bootstrap) {
	Router.Boot(f)
}

// Go 与handle一起的并发处理函数
func Go(f Goroutines) {
	Router.Go(f)
}

// Add 仿类方法添加路由
func Add(p string, h Handler) {
	Router.Add(p, h)
}

/**
* handler 类处理
 */
func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h(w, r, nil)
}

// Boot 由路前置处理函数
func (rou *Routing) Boot(f Bootstrap) {
	rou.f = f
}

// Go 由路前置处理函数
func (rou *Routing) Go(f Goroutines) {
	if rou.g == nil {
		rou.g = make([]Goroutines, 0)
	}
	rou.g = append(rou.g, f)
}

// Add  添加路由
func (rou *Routing) Add(p string, h Handler) {
	if p == "" || h == nil {
		return
	}
	rou.mu.Lock()
	defer rou.mu.Unlock()
	rou.m[p] = h

	// 排序，选匹配复杂的
	rou.s = append(rou.s, p)
	rou.s = sort.StringSlice(rou.s)
}

// ServeHTTP 路由匹配入口
func (rou *Routing) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var data interface{}

	// 从前置函数获取数据及判断请求是否继续
	b := true
	if rou.f != nil {
		data, b = rou.f(w, r)
	}
	if !b {
		http.NotFound(w, r)
		return
	}

	// 匹配处理函数
	var h Handler
	for _, v := range rou.s {
		if strings.Index(r.URL.Path, v) == 0 {
			h = rou.m[v]
			break
		}
	}
	if h == nil {
		http.NotFound(w, r)
		return
	}

	// 运行
	if rou.g != nil {
		for _, v := range rou.g {
			v(w, r, data, make(chan bool))
		}
	}
	h(w, r, data)
}
