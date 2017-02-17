package cache

/**
* Cache类，Cache集合类
* 2016.09.30， 添加同一Cache多站点应用的支持
* 1. 数据按指定时间更新，更新时为直接从缓存读取并缓存
* 2. 数据按指定时间检查是超出指定内存，如超，删除最久未使用的数据
 */

import (
	"container/list"
	"sync"
	"time"
)

// CacheData 网页Cache类
type CacheData struct {
	Value   []byte        // Cache 数据集
	Element *list.Element // 本用例的元素
	Time    time.Time     // 数据更新时间
	Last    time.Time     // 数据最近被使用的时间
}

// CacheSet 页面Cache类集合
type CacheSet struct {
	Size     int64                 // 缓存大小, b
	List     *list.List            // 从旧到新排列的缓存元素
	Values   map[string]*CacheData // Cache数据集合
	Duration int                   //缓存寿命
	Time     time.Time             //缓存最近检查的时间
	sync     *sync.RWMutex         //多线程操作锁
	count    int64                 //缓存实际的大小
}

// 启用一个全局变量Cache集合
func New(s int64, d int) *CacheSet {
	c := &CacheSet{
		Size:     s,
		count:    0,
		List:     new(list.List),
		Values:   make(map[string]*CacheData),
		sync:     new(sync.RWMutex),
		Duration: d,
		Time:     time.Now(),
	}
	return c
}

// Update 定时更新，每小时处理一次，每晚三点清空缓存
func (c *CacheSet) Update() {
	// 如何当前缓存有时间，则到了缓存寿命后更新
	if !c.Time.IsZero() && int(time.Now().Sub(c.Time)) < c.Duration {
		return
	}

	// 临时元素，保证遍历时的当前元素不被改变
	var n = new(list.Element)
	for e := c.List.Front(); e != nil; e = n {
		n = e.Next()
		// 关键键未能获得
		k, ok := e.Value.(string)
		if !ok || k == "" {
			c.List.Remove(e)
		}

		// 通过关键健获取数据
		c.sync.RLock()
		val, ok := c.Values[k]
		c.sync.RUnlock()
		if !ok || val.Value == nil {
			c.List.Remove(e)
			continue
		}

		// 当前数据的大小，删除当前节点，删除当前内容，缓存总大小减去当前值
		s := int64(len(val.Value))
		c.List.Remove(e)
		c.sync.Lock()
		delete(c.Values, k)
		c.sync.Unlock()
		c.count -= s

		// 判断是否到了设定缓存大小的范围
		if c.count < c.Size {
			break
		}
	}
}

// Get 从CacheSet集合中获取Cache
func (c *CacheSet) Get(key string) *CacheData {
	// 未初始缓存集合，则初始
	if c.Values == nil {
		return c.Set(key, nil)
	}

	// 判断是否有值
	c.sync.RLock()
	s, ok := c.Values[key]
	c.sync.RUnlock()
	// 没有
	if !ok {
		return nil
	}
	// 已过期
	t := time.Now()
	if !s.Time.IsZero() && int(t.Sub(s.Time).Seconds()) > c.Duration {
		return nil
	}
	s.Last = t
	return s
}

// Set 向CacheSet集合添加新的Cache
func (c *CacheSet) Set(key string, data []byte) *CacheData {
	// 未初始缓存集合，则初始
	if c.Values == nil {
		c.Values = make(map[string]*CacheData)
	}

	// 判断当前key是否有值存在
	c.sync.RLock()
	s, ok := c.Values[key]
	c.sync.RUnlock()
	var e *list.Element
	if ok {
		e = s.Element
		s.Value = data
		c.List.MoveToBack(e)
	} else {
		e = c.List.PushBack(key)
		s = &CacheData{data, e, time.Now(), time.Now()}
		c.count += int64(len(data))
	}

	// 设置缓存集合中当前键的值
	s.Time = time.Now()
	c.sync.Lock()
	c.Values[key] = s
	c.sync.Unlock()
	return s
}
