const wsurl = "ws://"+ window.location.hostname +":8080/ws";

const record = document.querySelector(".record");
const canvas = document.querySelector(".visualizer");
//const soundClips = document.querySelector(".sound-clips");
const mainSection = document.querySelector(".main-controls");

let audioCtx;
const canvasCtx = canvas.getContext("2d");

if (navigator.mediaDevices.getUserMedia) {

  const constraints = { audio: true };
  let chunks = [];

  let onSuccess = function (stream) {
    const mediaRecorder = new MediaRecorder(stream, { audioBitsPerSecond: 16000 });

    visualize(stream);

    record.onclick = () => {
      const isPlaying = record.getAttribute("isPlaying");

      if (isPlaying === "off") {
        mediaRecorder.start();
        record.setAttribute("isPlaying", "on");
        record.classList.add("recording");
        record.innerText = "Стоп";
        record.style.background = "red";
        status.innerText = "Запись...";

//        soundClips.replaceChildren();
        // console.log(mediaRecorder.state);
        // console.log("recorder started");
      } else {
        mediaRecorder.stop();
        record.setAttribute("isPlaying", "off");
        record.classList.remove("recording");
        record.style.background = "";
        record.style.color = "";
        record.innerText = "Микрофон";
        // console.log(mediaRecorder.state);
        // console.log("recorder stopped");
        // mediaRecorder.requestData();
      }
    };

    mediaRecorder.onstop = function (e) {
//      console.log("data available after MediaRecorder.stop() called.");

      const clipContainer = document.createElement("article");
      const audio = document.createElement("audio");
      audio.setAttribute("controls", "");
      clipContainer.appendChild(audio);
//      soundClips.appendChild(clipContainer);
      audio.controls = true;
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType });

      uploadFile(blob);
//      sendMediaBlob(blob);

      chunks = [];
      const audioURL = window.URL.createObjectURL(blob);
      audio.src = audioURL;
//      console.log("recorder stopped");
    };


    mediaRecorder.ondataavailable = function (e) {
      chunks.push(e.data);
    };
  };

  let onError = function (err) {
    console.log("The following error occured: " + err);
  };

  navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
} else {
  console.log("MediaDevices.getUserMedia() not supported on your browser!");
}


function saveTextAsFile() {
  var textToSave = editor.innerHTML;
  var blob = new Blob([textToSave], { type: "text/plain;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "saved_text.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


async function sendMediaBlob(blob) {
    try {
        const response = await fetch('/upload-media', {
            method: 'POST',
            body: blob,
            headers: {
                'Content-Type': blob.type // Set the correct content type
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Upload successful:', result);

        hstr = eval('(' + result + ')');
        editor.innerText += hstr.text;


    } catch (error) {
        console.error('Error uploading media:', error);
    }
};


function uploadFile(file) {
  var ws = new WebSocket( wsurl );    // wsurl in const
  ws.binaryType = "arraybuffer";
  ws.onopen = function() {
    ws.send(file);
  };

  ws.onmessage = function(evt) {
    hstr = eval('(' + evt.data + ')');
    editor.innerText += hstr.text;
    ws.close(1000)
  };
}



function visualize(stream) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const source = audioCtx.createMediaStreamSource(stream);

  const bufferLength = 2048;
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = bufferLength;
  const dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);

  draw();

  function draw() {
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "rgb(250, 250, 250)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(150, 0, 80)";

    canvasCtx.beginPath();

    let sliceWidth = (WIDTH * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      let v = dataArray[i] / 128.0;
      let y = (v * HEIGHT) / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
}

window.onresize = function () {
  canvas.width = mainSection.offsetWidth;
};

window.onresize();
