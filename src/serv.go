/****************************************************************************
 *     Created  in  2024-2025  by  Oleg Shirokov   oleg@shirokov.online     *
 ****************************************************************************/

package main

import (
    "log"
    "fmt"
    "net/http"
    "golang.org/x/net/websocket"
    "mime/multipart"
    "bytes"
    "os"
    "io"
)

//  -----------------------------------

const (
    httpserv = ":8080"
    whisperaddr = "http://localhost:8888/inference"
)

//---------------------------------------------------------------------------

func whisperCppTranscribe(name string, buf *[]byte) (string, error) {
/* curl_output=$(curl -s "http://localhost:8888/inference" -H "Content-Type: multipart/form-data" -F "file=@"test.webm"" -F "temperature=0.2" -F "response-format=text") */
    body := new(bytes.Buffer)
    mp := multipart.NewWriter(body)

//    mp.WriteField("temperature","0.2")
    mp.WriteField("response-format", "text")

    part, err := mp.CreateFormFile("file", name)
    if err != nil { return "CreateFormFile", err }
    io.Copy(part, bytes.NewBuffer(*buf))
    mp.Close()

    resp, err := http.Post(whisperaddr, mp.FormDataContentType(), io.Reader(body))
    if err != nil { return "Http.Post", err }
    defer resp.Body.Close()
    if resp.StatusCode == 200 {
        if rr, err := io.ReadAll(resp.Body); err == nil && len(rr) > 9 {
            return string(rr), nil
        }
    }
    return "???", fmt.Errorf("Body ReadAll failed: %d.", resp.StatusCode)
}

//---------------------------------------------------------------------------

func wsHandler(ws *websocket.Conn) {

    var buf []byte
    websocket.Message.Receive(ws, &buf)

    txt := "Ошибка обработки!"
    if len(buf) > 100 {
        fname := "test.webm"
        if msg, err := whisperCppTranscribe(fname, &buf); err != nil {
            log.Println("ERROR  whisperCppTranscribe:", err)
        }else{
            log.Printf("Res: %s", msg)	// {"text":" Раз, два, три.\n"}
            txt = msg
        }
    }
    websocket.Message.Send(ws, txt)
}

//---------------------------------------------------------------------------

func rootHandler(w http.ResponseWriter, r *http.Request) {
//log.Printf("URI:%s\n",r.RequestURI)
    if r.RequestURI == `/index.html` || r.RequestURI == `/` {
        w.Header().Set("Content-type", "text/html")
        indexFile, err := os.Open("./index.html")
        if err != nil {
            w.Write([]byte( "<h1> ERROR!!!</h1>"))
            return
        }
        defer indexFile.Close()
        fi, err := indexFile.Stat()
        if err != nil || fi.Size() < 500 || fi.Size() > 400000 {
            w.Write([]byte("<h1> ERROR!!!</h1>"))
            return
        }
        var buff = make([]uint8, fi.Size())
        indexFile.Read(buff)
        w.Write([]byte(buff))
    }else{
        w.Write([]byte("{}"))
    }
}

//---------------------------------------------------------------------------

//---------------------------------------------------------------------------
func main() {
    log.SetFlags(log.Ldate | log.Ltime)
    log.Println("Start Alerts service.")

//  -- Старт http сервер ------------------
    log.Println("Start httpServ.")
    fs := http.FileServer(http.Dir("./pub"))
    http.Handle("/pub/", http.StripPrefix("/pub/", fs))
    http.Handle("/ws", websocket.Handler(wsHandler))
    http.HandleFunc("/", rootHandler)
    err := http.ListenAndServe(httpserv, nil)
    if err != nil {
        log.Fatalf("ListenAndServe: %v", err)
    }
    defer log.Println("Stop all services.\n")
}// end
//---------------------------------------------------------------------------
