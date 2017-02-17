package handle

/**
* 接收处理epub
* 1. 接收epub特定请求，需要mid, iid
 */

import (
	"Jcms2.1/hash"
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"
	"path"
)

// Epub 资源内容加载，解压处理
type Epub struct {
	Server string
	Index  string
	Mid    string
	Iid    string
}

// Run 启动epub加载
func (e *Epub) Run() bool {
	// 未加载，请求加载并解压
	hash := hash.Picture(e.Iid, e.Mid, 0, "magook")
	url := fmt.Sprintf("%s/epub%s/%s/%s-%s/%s_%s.epub", e.Server, e.Index, e.Mid, e.Mid, e.Iid, e.Iid, hash)
	b, i := e.InstanceResult(url)
	return e.UpzipToRoot(b, i)
}

// InstanceResult 请求Epub数据
func (e *Epub) InstanceResult(url string) (b []byte, i int64) {
	// 请求
	log.Println(url)
	in := &Interface{URL: url, Update: true}
	re := in.Get()
	b, err := ioutil.ReadAll(re.Body)
	if err != nil {
		log.Println(err)
		return nil, 0
	}
	defer re.Body.Close()
	return b, re.ContentLength
}

// UpzipToRoot 解压下载的epub
func (e *Epub) UpzipToRoot(b []byte, i int64) bool {
	if b == nil {
		return false
	}

	// 解压
	r, err := zip.NewReader(bytes.NewReader(b), i)
	if err != nil {
		log.Println(err)
		return false
	}

	// 写入指定目录
	for _, f := range r.File {

		re, err := f.Open()
		if err != nil {
			log.Fatal(err)
		}
		e.WiteFile(re, f.Name)
		re.Close()
	}
	return true
}

// WiteFile 写入服务器
func (e *Epub) WiteFile(re io.ReadCloser, name string) {
	if re == nil || name == "" {
		return
	}
	b, err := ioutil.ReadAll(re)
	if err != nil {
		log.Println(err)
		return
	}
	file := fmt.Sprintf("epub/%s/%s/%s/%s", e.Index, e.Mid, e.Iid, name)
	log.Println(file)

	dir := path.Dir(file)
	if fi, err := os.Stat(dir); err != nil || !fi.IsDir() {
		// 创建文件夹
		if err = os.MkdirAll(dir, os.ModePerm); err != nil {
			log.Println(err)
			return
		}

	}

	// 写入文件
	if err = ioutil.WriteFile(file, b, 0666); err != nil {
		log.Println(err)
		return
	}
	log.Println("epub write is ok :", file)
}
