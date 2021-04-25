//'use strict';

var webcamElement  = document.getElementById('webcam');
var videoSelect    = document.querySelector('select#videoSource');
var main_canvas    = document.getElementById("main_canvas");
var mini_canvas    = document.getElementById("mini_canvas");
var ai_canvas      = document.getElementById("ai_canvas");

var main_ctx       = main_canvas.getContext('2d');
var mini_ctx       = mini_canvas.getContext('2d');
var ai_ctx         = ai_canvas.getContext('2d');

var new_meter     = null;



var meter_model = null;
videoSelect.onchange = getStream;

function extractReadingFromImage() {

    tf.engine().startScope(); // Ensure tensors are disposed of ( memory leak prevention)

    main_canvas.width  = webcamElement.videoWidth;
    main_canvas.height = webcamElement.videoHeight;

    var capture_width  = 100;
    var capture_height = 100;
    var pX = main_canvas.width/2  - capture_width/2;
    var pY = main_canvas.height/2 - capture_height/2;

    main_ctx.drawImage(webcamElement, 0, 0, main_canvas.width, main_canvas.height );
    mini_canvas.width  = capture_width;
    mini_canvas.height = capture_height;
    mini_ctx.drawImage(main_canvas,  pX, pY, capture_width, capture_height, 0, 0, capture_width, capture_height  );

    var image = tf.browser.fromPixels( mini_canvas, 3 ).toFloat() //mean(2)//.toFloat()

    image = image.resizeBilinear([ capture_width, capture_height ])

    image = image.mean(2)

    ai_canvas.width = capture_width;
    ai_canvas.height = capture_width;

    image = image.div(255.0)
    //image = tf.stack( [ image, image, image ], 2)

    if ( meter_model != null ) {
      image =image.expandDims(0);
      image =image.expandDims(3);
      result = meter_model.predict( image, { batch_size:1});
      result = result.dataSync();
      new_meter   = result[0]*90
      console.log(  new_meter  )

    } else {
      console.log("No result")
    }

    main_ctx.lineWidth = "3";
    main_ctx.strokeStyle = "red";

    // Clock target image
    main_ctx.beginPath();
    main_ctx.arc(pX+capture_width/2, pY+capture_height/2, capture_width/2, 0, 2 * Math.PI);
    main_ctx.stroke();

    main_ctx.beginPath();
    main_ctx.moveTo(pX+capture_width/2, pY+capture_height/2);
    main_ctx.lineTo(pX+capture_width/2 + mini_canvas.width/2, pY+capture_height/2);
    main_ctx.stroke();

    main_ctx.beginPath();
    main_ctx.moveTo(pX+capture_width/2, pY+capture_height/2);
    main_ctx.lineTo(pX+capture_width/2 - mini_canvas.width/2, pY+capture_height/2);
    main_ctx.stroke();

    main_ctx.beginPath();
    main_ctx.moveTo(pX+capture_width/2, pY+capture_height/2);
    main_ctx.lineTo(pX+capture_width/2, pY+capture_height/2 +   mini_canvas.width/2);
    main_ctx.stroke();

    main_ctx.beginPath();
    main_ctx.moveTo(pX+capture_width/2, pY+capture_height/2);
    main_ctx.lineTo(pX+capture_width/2, pY+capture_height/2 -   mini_canvas.width/2);
    main_ctx.stroke();

    main_ctx.font = "50px Arial";
    if ( new_meter != null ) {
      var text = " Reading:- " + (  new_meter.toString()).padStart(3, '0');
      main_ctx.fillText( text,200, 40);
    } else {
      var text = " Reading:- Unknown ";
      main_ctx.fillText( text,200, 40);
    }
    //
    var meterElement    = document.getElementById("meter");
    meterElement.innerHTML = text;

    tf.engine().endScope(); // Prevent memory leak

    setTimeout( extractReadingFromImage , 500);
}

function getDevices() {
  return navigator.mediaDevices.enumerateDevices();
}

function gotDevices(deviceInfos) {
  console.log('Got Devices ');
  window.deviceInfos = deviceInfos; // make available to console

  for (const deviceInfo of deviceInfos) {
    const option = document.createElement('option');
    console.log( deviceInfo );
    if (deviceInfo.kind === 'videoinput') {
      option.value = deviceInfo.deviceId;
      console.log(" Source  ", deviceInfo.deviceId );
      console.log(" Source  ", deviceInfo );
      console.log(" Source  ", deviceInfo.label );
      option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    }
  }
}

function gotStream( stream ) {
  console.log('Got stream ');
  window.stream = stream;
  console.log("Selected items");
  console.log(videoSelect.options);
  videoSelect.selectedIndex = [ ...videoSelect.options].findIndex(option => option.text == stream.getVideoTracks()[0].label);
  webcamElement.srcObject = stream;
}

function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  const videoSource = videoSelect.value;
  const constraints = {
      video: {deviceId: videoSource ? {exact: videoSource} : undefined}
  };
  return navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(handleError);
}

function handleError(error) {
  console.log('Error: ', error);
}

async function app() {
  getStream().then(getDevices).then(gotDevices);
  tf.loadGraphModel('scalem/model.json').then(function(model) {
    meter_model = model;
  });

  var video =  webcamElement
   video.onplay = function() {
    // Timer to Extract time from image
    setTimeout( extractReadingFromImage , 500);
   };
}

app();
