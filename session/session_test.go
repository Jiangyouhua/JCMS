package session

import (
	"fmt"
	// "net/http"
	"testing"
	"time"
)

func TestSession(t *testing.T) {
	Validity = 5
	for i := 0; i < 10; i++ {
		t := time.Now()
		s := new(Session)
		s.Set(fmt.Sprintf("%v", i), fmt.Sprintf("%d", t.UnixNano()))
		id := Sessions.ID()
		Sessions.Set(id, s)
		time.Sleep(time.Second)
	}
	t.Log("0", Sessions)
	Sessions.Update()
	t.Log("1", Sessions)
	Sessions.UpdateAll()
	t.Log("2", Sessions)
}
