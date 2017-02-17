package handle

import (
	"testing"
)

func TestModel(t *testing.T) {
	a := []string{
		"http://121.42.8.240:8086/businesscache/bookan/bookan_nlc/booklist/booklist_nlc_7_0.txt",
		"http://121.42.8.240:8086/index.html",
		"http://121.42.8.240:8086/index.php",
	}
	mod := new(Model)
	for _, v := range a {
		mod.Url = v
		b := mod.Request()
		t.Log(string(b))
	}
}
