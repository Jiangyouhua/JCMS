package handle

import (
	"encoding/xml"
	"io/ioutil"
	"log"
	"os"
	"time"
)

var configTime time.Time //配置文件最近编辑时间

/**
* 配置文件的结构
 */

// System 配置文件的系统参数
type System struct {
	Port            int    `xml:"port,attr"`            // 端口
	UserLog         bool   `xml:"userlog,attr"`         // 是否开启用户日志
	DefaultPage     string `xml:"defaultpage,attr"`     // 默认页面
	RequestDuration int    `xml:"requestduration,attr"` // 请求超时时间
	FromFile        bool   `xml:"fromfile,attr"`        // 启动从服务器请求
}

// Automatic 自动启动匹置
type Automatic struct {
	Product  string `xml:"product,attr"`  // 产品名称
	Instance string `xml:"instance,attr"` // 实例名称
	Browser  string `xml:"browser,attr"`  // 浏览器位置
	Status   bool   `xml:"status,attr"`   // 是否启用
}

// MemoryItem 配置文件的缓存参数
type MemoryItem struct {
	Status   bool `xml:"status,attr"`   // 是否开启
	Size     int  `xml:"size,attr"`     // 缓存大小， k
	Duration int  `xml:"duration,attr"` //缓存寿命
}

// MemorySet 配置文件集合
type MemorySet struct {
	Cache    *MemoryItem `xml:"cache"`
	Template *MemoryItem `xml:"template"`
	Session  *MemoryItem `xml:"session"`
}

// StaticItem 配置文件的静态化输出参数
type StaticItem struct {
	Status bool   `xml:"status,attr"` // 是否启用
	Dir    string `xml:"dir,attr"`    // 目录路径
	Size   int    `xml:"size,attr"`   // 最大使用空间
}

// StaticSet 配置文件集合
type StaticSet struct {
	Data      *StaticItem `xml:"data"`
	Source    *StaticItem `xml:"source"`
	ServerLog *StaticItem `xml:"serverlog"`
	ErrLog    *StaticItem `xml:"errlog"`
}

// RedirectItem 配置文件重定向参数
type RedirectItem struct {
	Explain string `xml:"explain,attr"` // 接口说明
	Status  bool   `xml:"status,attr"`  // 是否启用
	Form    string `xml:"form,attr"`    // 定向的条件
	To      string `xml:"to,attr"`      // 定向的结果
}

// RedirectSet 配置文件重定向集合
type RedirectSet struct {
	Item []RedirectItem `xml:"item"`
}

// Configuration 配置文件的结构
type Configuration struct {
	System   *System      `xml:"system"`    // 系统设置
	Auto     *Automatic   `xml:"automatic"` // 自动启动浏览器
	Memory   *MemorySet   `xml:"memory"`    //缓存设置
	Static   *StaticSet   `xml:"static"`    // 静态化设置
	Redirect *RedirectSet `xml:"redirect"`  //重定向设置
	file     string       //配置文件名称
	time     time.Time    // 配置文件最后编辑的时间
}

// ConfigForFile 从配置文件获取配置参数
func ConfigForFile(f string) *Configuration {
	c := new(Configuration)
	c.file = f
	c.File()
	return c
}

// File 从配置文件读取配置数据
func (c *Configuration) File() {
	if c.file == "" {
		return
	}
	// 没有该文件
	info, err := os.Stat(c.file)
	if err != nil {
		return
	}
	t := info.ModTime()
	// 文件未更新
	if !c.time.IsZero() && t.Equal(c.time) {
		return
	}

	// 更新
	log.Println("config is update")
	b, err := ioutil.ReadFile(c.file)
	if err != nil {
		log.Println("config.file read is err, ", err)
		return
	}
	err = xml.Unmarshal(b, c)
	if err != nil {
		log.Println("config.file load is err, ", err)
		return
	}
	c.time = t
}

// Continued 配置文件持续加载最新
func (c *Configuration) Continued() {
	time.Sleep(time.Second * 10)
	c.File()
	c.Continued()
}
