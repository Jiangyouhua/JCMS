package handle

import (
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Template 所有静态页面的缓存集
type Template struct {
	Path        string            // 样式文件夹
	Values      map[string][]byte // 样式缓存路径
	Size        int64             // 占用内容的大小
	Duration    int               // 生命周期
	DefaultPage string            // 默认页面
	sync        *sync.RWMutex     // 读写锁
	Time        time.Time         // 最近更新时间
}

// NewTemplate 全局样式
func NewTemplate(p string, s int64, d int, f string) *Template {
	if p == "" {
		p = "."
	}
	if f == "" {
		f = "index"
	}
	t := &Template{
		Path:        p,
		Values:      make(map[string][]byte),
		Size:        s,
		Duration:    d,
		DefaultPage: p,
		sync:        new(sync.RWMutex),
		Time:        time.Now(),
	}
	t.Update(true)
	return t
}

// Update 页面数据整体更新
func (t *Template) Update(init bool) {
	// 如何当前缓存有时间，则到了缓存寿命后更新
	if !init && !t.Time.IsZero() && int(time.Now().Sub(t.Time)) < t.Duration {
		return
	}

	err := filepath.Walk(t.Path, func(path string, f os.FileInfo, err error) error {
		if f == nil {
			return err
		}
		if f.IsDir() {
			return nil
		}
		b, err := ioutil.ReadFile(path)
		if err != nil {
			return err
		}
		if strings.Index(path, "_base") > 0 {
			return nil
		}
		t.sync.Lock()
		p := strings.Replace(path, "\\", "/", -1)
		t.Values[p] = b
		t.sync.Unlock()
		return nil
	})

	// 如果出错 10 秒后试
	if err != nil {
		log.Println("Template is err, ", err)
		t.Time = t.Time.Add(time.Second * 10)
	}
	t.Time = time.Now()
}

// Find 打到样式页面或风格文件的内容
func (t *Template) Find(product, instance, layout, k string) ([]byte, string, []string) {
	if product == "" || instance == "" {
		return nil, "", nil
	}
	if layout == "" {
		layout = "index.html"
		if t != nil && t.DefaultPage != "" {
			layout = t.DefaultPage
		}
	}

	// 没有默认指定的文件格式，使用默认的文件格式
	if path.Ext(layout) == "" {
		layout += ".html"
	}

	// 判断样式的目录为主文件还是风格文件
	if k == "" {
		k = "html"
	}
	tp := "template"
	if t != nil {
		tp = t.Path
	}
	paths := []string{
		fmt.Sprintf("%s/%s/%s/%s/%s", tp, k, product, instance, layout),
		fmt.Sprintf("%s/%s/%s/%s", tp, k, product, layout),
		fmt.Sprintf("%s/%s/%s", tp, k, layout),
	}
	p := fmt.Sprintf("%s/ui/_base/%s", tp, layout)

	if t == nil {
		if k == "ui" {
			paths = append([]string{p}, paths...)
		}
		return nil, "", paths
	}

	t.sync.RLock()
	defer t.sync.RUnlock()
	for _, v := range paths {
		if b, ok := t.Values[v]; ok {
			return b, v, nil
		}
	}

	// ui中的第三方类库
	if k == "ui" {
		return nil, "", []string{p}
	}
	return nil, "", nil
}
