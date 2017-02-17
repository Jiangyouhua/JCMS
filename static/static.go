package static

import (
	"io/ioutil"
	"log"
	"os"
	"path"
	"time"
)

// WriteFile 数据写入文件
func WriteFile(file string, data []byte) error {
	// 判断文件是否存在
	if _, err := os.Stat(path.Dir(file)); err != nil && os.IsNotExist(err) {
		if err := os.MkdirAll(path.Dir(file), os.ModePerm); err != nil {
			return err
		}
	}
	return ioutil.WriteFile(file, data, os.ModePerm)
}

// StaticData 静态化入口
type StaticData struct {
	File string //本地化的文件名
	Data []byte //本地化的文件内容
}

// StaticSet 静态化处理集合
type StaticSet struct {
	Queue []*StaticData // 需要静态化的数据对列
	Size  int64         // 容量
	Dir   string        // 静态化的根路径
}

// Add 添加至写的对列
func (s *StaticSet) Add(file string, data []byte) {
	if file == "" || data == nil {
		return
	}
	if s.Queue == nil {
		s.Queue = make([]*StaticData, 0)
	}
	v := &StaticData{file, data}
	s.Queue = append(s.Queue, v)
}

func (s *StaticSet) Write() {
	if s.Queue == nil || len(s.Queue) == 0 {
		return
	}
	v := s.Queue[0]
	s.Queue = s.Queue[1:]
	if err := WriteFile(v.File, v.Data); err != nil {
		log.Println("static Write is err, ", err)
		return
	}
	s.Write()
}

// Continued 缓存持续输出
func (s *StaticSet) Continued() {
	s.Write()
	time.Sleep(time.Second * 1)
	s.Continued()
}
