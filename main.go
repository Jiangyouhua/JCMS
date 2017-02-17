package main

// go build -ldflags "-H windowsgui"
import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	"Jcms2.1/cache"
	"Jcms2.1/handle"
	"Jcms2.1/hash"
	"Jcms2.1/routing"
	"Jcms2.1/session"
	"Jcms2.1/userlog"
	"mime"
	"os/exec"
	"path"
	"time"
)

var (
	server = map[string]string{
		"business": "http://user.magook.com/index.php", // 业务接口服务器
		// "business": "http://192.168.0.172:555/index.php", // 业务接口服务器
		"inner": "http://resource.magook.com",  // 资源后台服务器
		"out":   "http://msharecej.magook.com", // 外部webp,jpg,epub资源服务器
		"paper": "http://pres.bookan.cn:8180",  // 报纸封面服务器
		"epub":  "http://mebookj.magook.com",   // epub服务器
	}

	config    *handle.Configuration // 服务配置文件
	templates *handle.Template      // 当前目录
	caches    *cache.CacheSet       // 全站缓存
	sessions  *session.SessionSet   // 全站sesssion
	data      *handle.StaticQueue   //数据静态化输出
	source    *handle.StaticQueue   //资源静态化输出
	serverlog *handle.StaticQueue   //用户日志静态化输出
	errlog    *handle.StaticQueue   //静态化输出
	port      int                   // web server 监听的接口
)

/**
* 初始处理
* 1. 读取配置文件。web.config, 该文件为xml文件
* 2. 读取当前目录结构并缓存
 */
func init() {
	// 读取配置文件
	config = handle.ConfigForFile("web.config")

	port = 80
	if config == nil {
		return
	}
	handle.RequestDuration = config.System.RequestDuration
	if config.System.Port > 0 {
		port = config.System.Port
	}

	// 缓存
	if config.Memory.Cache.Status {
		caches = cache.New(int64(config.Memory.Cache.Size)*1024*1024, config.Memory.Cache.Duration)
		handle.AllCache = caches
	}
	if config.Memory.Session.Status {
		sessions = session.New(int64(config.Memory.Cache.Size)*1024*1024, config.Memory.Cache.Duration)
	}
	if config.Memory.Template.Status {
		templates = handle.NewTemplate("template", int64(config.Memory.Cache.Size)*1024*1024, config.Memory.Cache.Duration, config.System.DefaultPage)
	}
	// 静态化
	if config.Static.Data.Status {
		data = &handle.StaticQueue{nil, int64(config.Static.Data.Size) * 1024 * 1024, config.Static.Data.Dir}
		handle.AllData = data
		handle.InterfaceServer = server["business"]
	}
	if config.Static.Source.Status {
		source = &handle.StaticQueue{nil, int64(config.Static.Source.Size) * 1024 * 1024, config.Static.Source.Dir}
	}
	if config.Static.ServerLog.Status {
		serverlog = &handle.StaticQueue{nil, int64(config.Static.ServerLog.Size) * 1024 * 1024, config.Static.ServerLog.Dir}
	}
	if config.Static.ErrLog.Status {
		errlog = &handle.StaticQueue{nil, int64(config.Static.ErrLog.Size) * 1024 * 1024, config.Static.ErrLog.Dir}
	}

	err := mime.AddExtensionType(".css", "text/css")
	if err != nil {
		log.Println("mime is err, ", err)
	}
}

// 主线程，启动webServer
func main() {
	routing.Boot(bootHandle)
	routing.Add("/epub/", epubSource)
	routing.Add("/ueditor/", innerSource)
	routing.Add("/upload/", innerSource)
	routing.Add("/source/", outSource)
	routing.Add("/dbtxt/", paperSource)
	routing.Add("/", rootHandle)
	if config != nil {
		go asynchronous()
		go automatic()
	}

	// port
	log.Println("Jcms2.0 running, listen port is", port)
	err := http.ListenAndServe(fmt.Sprintf(":%d", port), routing.Router)
	if err != nil {
		time.Sleep(time.Second * 1)
		log.Println("ListenAndServe err=", err)
	}
}

func automatic() {
	return
	// 调用浏览器
	if config.Auto.Status {
		log.Println("Automatic is run")
		a := fmt.Sprintf("http://127.0.0.1:%v/%s/%s/%s", port, config.Auto.Product, config.Auto.Instance, config.System.DefaultPage)
		cmd := exec.Command(config.Auto.Browser, a)
		cmd.Run()
	}
}

/**
* 异步线程，与main(主线程)同时运行,
* 1. 启动日志异步输出
* 2. 定时检查配置是否更新
* 3. 定时检查cache
* 4. 定时检查缓存
* 5. 定时查检静态文件目录
 */
func asynchronous() {
	// 孙工 用户日志处理
	if config.System.UserLog {
		routing.Go(logHandle)
		go userlog.TransLog(server["business"])
	}

	// 定时检查配置文件, 如果配置文件修改了，就重新加载
	go config.Continued()

	// 缓存定时更新
	if caches != nil {
		go caches.Update()
	}

	// session定时更新
	if sessions != nil {
		go sessions.Update()
	}

	// 样式定时更新
	if templates != nil {
		go templates.Update(false)
	}

	// 接口数持续静态化
	if data != nil {
		data.Continued()
	}
}

/*
* web server 每一次请求的前置处理
 */

// 引导函数， 处理统一事务
func bootHandle(w http.ResponseWriter, r *http.Request) (interface{}, bool) {
	// 非post， get请求则返回
	if r.Method != "POST" && r.Method != "GET" {
		return nil, false
	}

	// 重定向
	r.ParseForm()
	if config.Redirect != nil && r.Method == "GET" {
		for _, v := range config.Redirect.Item {
			if r.Form.Get("wxid") != "" && r.Form.Get("status") != "" {
				break
			}

			k := r.Form.Get(v.Form)
			if k == "" {
				continue
			}
			r.Form.Del(v.Form)
			url := fmt.Sprintf(v.To, k)
			if strings.Index(url, "$") > 0 {
				p := r.URL.Path
				if p[len(p)-1] == '/' {
					p = p[0 : len(p)-1]
				}
				url = strings.Replace(url, "$", r.Host+p, -1)
			} else {
				f := r.Form.Encode()
				if f != "" {
					url += fmt.Sprintf("/?%s", f)
				}
			}

			log.Println("123456", url)
			http.Redirect(w, r, url, http.StatusFound)
			return nil, false
		}
	}

	// 无效请求地址则返回
	if r.URL.Path == "" || r.URL.Path == "/" {
		return nil, false
	}

	// Session
	s := sessions.Start(w, r)
	return s, true
}

func logHandle(w http.ResponseWriter, r *http.Request, data interface{}, b chan bool) {
	// 接收或获取Session
	s, ok := data.(*session.Session)
	if !ok {
		s = sessions.Start(w, r)
	}
	if s == nil {
		return
	}

	// 获取站点信息Session
	a := strings.Split(s.ProductInstance, ",")
	var i *handle.Result
	if len(a) > 1 {
		b := r.Form.Get("cache") != ""
		i = handle.WebInfo(server["business"], a[0], a[1], b)
	}

	// 写入用户日志
	// uId := handle.KeyWithUserInfo(s.Get("user"), "userId")
	// iId := handle.KeyWithInstance(i.Data, "id", "base")
	// iData := userlog.LogInputData{
	// 	SessionId:  s.ID,
	// 	UserId:     handle.KeyWithUserInfo(s.Get("user"), "userId"),
	// 	InstanceId: handle.KeyWithInstance(i.Data, "id", "base"),
	// }
	userlog.WriteLog(r, userlog.LogInputData{
		SessionId:  s.ID,
		UserId:     handle.KeyWithUserInfo(s.Get("user"), "userId"),
		InstanceId: handle.KeyWithInstance(i.Data, "id", "base"),
	})
}

/**
* 主处理函数
* 1. GET 页面、静态资源请求
* 2. POST　数据请求
 */

// 本服务可处理的入口
func rootHandle(w http.ResponseWriter, r *http.Request, data interface{}) {
	// 数据请求
	if r.Method == "POST" {
		postRequests(w, r, data)
		return
	}

	// Template 加载
	key := "html"

	a := strings.Split(r.URL.Path, "/")
	if len(a) < 3 {
		http.NotFound(w, r)
		return
	}
	a = a[1:]
	if len(a) < 3 {
		a = append(a, "index.html")
	}
	if a[2] == "" {
		a[2] = "index.html"
	}

	e := path.Ext(r.URL.Path)
	if e != "" && e != "." && e != ".html" && e != ".htm" {
		a[2] = path.Base(r.URL.Path)
		key = "ui"
	}

	b, f, files := templates.Find(a[0], a[1], a[2], key)

	// 有数据
	if b != nil {
		ext := path.Ext(f)
		if ext != ".html" && ext != ".htm" {
			t := mime.TypeByExtension(ext)
			w.Header().Set("Content-Type", t)
		}

		w.Write(b)
		return
	}
	// 有路径
	if files == nil {
		http.NotFound(w, r)
		return
	}

	for _, fi := range files {
		if _, err := os.Stat(fi); err == nil || os.IsExist(err) {
			fileRequests(w, r, fi)
			return
		}
	}
	http.NotFound(w, r)
}

// 非页面文件请求
func fileRequests(w http.ResponseWriter, r *http.Request, p string) {
	if len(p) == 0 || p == "" || p == "/" {
		http.NotFound(w, r)
		return
	}
	if p[0] == '/' {
		p = p[1:]
	}

	http.ServeFile(w, r, p)
}

// 从接口请求数据
func postRequests(w http.ResponseWriter, r *http.Request, data interface{}) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	s, ok := data.(*session.Session)
	if !ok {
		s = sessions.Start(w, r)
	}
	var re = make([]byte, 0)
	if !config.System.FromFile {
		d := new(handle.Data)
		d.Host = r.Host
		d.Server = server["business"]
		d.Session = s
		d.Source = instanceWithURL(r.URL.Path, r.Form)
		re = d.Run()
	} else {
		d := new(handle.File)
		d.Server = server["business"]
		d.Session = s
		d.Source = instanceWithURL(r.URL.Path, r.Form)
		re = d.Run()
	}
	w.Write(re)
}

// Epub请求，从资源服务器请求后解压至本地
func epubSource(w http.ResponseWriter, r *http.Request, data interface{}) {
	// 日志请求
	q := r.URL.Query()
	if q.Get("log") != "" {
		return
	}

	p := r.URL.Path

	if p[0] == '/' && len(p) > 1 {
		p = p[1:]
	}
	// 有该文件直接返回
	if _, err := os.Stat(p); err == nil || os.IsExist(err) {
		fileRequests(w, r, p)
		return
	}

	// 无请求加载
	a := strings.Split(p, "/")
	if len(a) < 4 {
		http.NotFound(w, r)
		return
	}
	epub := &handle.Epub{server["epub"], a[1], a[2], a[3]}
	if !epub.Run() {
		http.NotFound(w, r)
		return
	}
	fileRequests(w, r, p)
}

// 内容发布的资源路径
func innerSource(w http.ResponseWriter, r *http.Request, data interface{}) {
	url := fmt.Sprintf("%s%s", server["inner"], r.URL.Path)
	in := &handle.Interface{URL: url}
	re := in.Get()
	if re.Body == nil {
		http.NotFound(w, r)
		return
	}
	body, err := ioutil.ReadAll(re.Body)
	if err != nil {
		log.Println("[ERR] innerSource err = ", err)
	}
	w.Write(body)

	//http.Redirect(w, r, url, http.StatusFound)
}

// 杂志、图书的资源路径
func outSource(w http.ResponseWriter, r *http.Request, data interface{}) {
	if staticFile(w, r, "/source/") {
		return
	}
	arr := strings.Split(r.URL.Path, "/")
	if len(arr) < 5 {
		fileRequests(w, r, r.URL.Path)
		return
	}
	arr = arr[len(arr)-4:]
	page := arr[0]
	file := arr[len(arr)-1]
	a := strings.Split(arr[len(arr)-2], "-")
	b := strings.Split(file, ".")

	i, err := strconv.Atoi(b[0])
	if err == nil {
		hash := hash.Picture(a[1], a[0], i, "magook")
		file = fmt.Sprintf("%s_%s.%s", hash, "big", b[1])
	}
	s := server["out"]
	if strings.Index(arr[0], "epub") > -1 {
		s = server["epub"]
	}
	url := fmt.Sprintf("%s/%s/%s/%s-%s/%s", s, page, a[0], a[0], a[1], file)
	// log.Println(url)
	in := &handle.Interface{URL: url}
	re := in.Get()
	body, err := ioutil.ReadAll(re.Body)
	if err != nil {
		panic(err)
	}
	w.Write(body)
}

// 报纸的资源路径
func paperSource(w http.ResponseWriter, r *http.Request, data interface{}) {
	if staticFile(w, r, "/dbtxt/") {
		return
	}
	url := fmt.Sprintf("%s%s", server["paper"], r.URL.Path)
	in := &handle.Interface{URL: url}
	re := in.Get()
	body, err := ioutil.ReadAll(re.Body)
	if err != nil {
		panic(err)
	}
	w.Write(body)

	//http.Redirect(w, r, url, http.StatusFound)
}

func staticFile(w http.ResponseWriter, r *http.Request, key string) bool {
	// 日志请求
	if path.Ext(r.URL.Path) == "" {
		return true
	}
	q := r.URL.Query()
	if q.Get("log") != "" {
		return true
	}
	// 静态资源请求
	if config != nil && config.Static.Source.Status {
		p := strings.Replace(r.URL.Path, key, "", -1)
		file, _ := os.Getwd()
		f := config.Static.Source.Dir
		if strings.Index(f, ":") < 0 {
			a := strings.Split(file, ":")
			f = fmt.Sprintf("%s:%s/%s", a[0], f, p)
		}
		fileRequests(w, r, f)
		return true
	}
	return false
}

// 从url地址获取用户实例名称
func instanceWithURL(url string, data url.Values) *handle.Source {
	if url[0] == '/' {
		url = url[1:]
	}
	a := strings.Split(url, "/")
	var m [8]string
	n := make(map[string]string)
	i := 0
	for _, v := range a {
		if strings.Index(v, "@") > 0 {
			arr := strings.Split(v, "@")
			n[arr[0]] = arr[1]
			continue
		}
		//产品、与页面不参与
		if i > 8 {
			break
		}
		if v == "0" {
			v = ""
		}
		m[i] = v
		i++
	}
	return &handle.Source{m, n, data}
}
