
var FrameExporter = function() {
    this.player = document.getElementById('player');
    this.createUi();
};

FrameExporter.prototype.enablePreview = function() {
    this.preview = true;
    this.frameUpdated = true;

    // Start frame counter
    this.frameCounter = new FrameCounter(this.fpsInput.value, this.secondsInput.value);
    this.frameCounter.start();

    this.startPatch();

    // Seek to the beginning
    gShaderToy.resetTime();
    gShaderToy.mTo = 0;
};

FrameExporter.prototype.disablePreview = function() {
    this.preview = false;
    this.stopPatch();
};

FrameExporter.prototype.genSound = function() {
    console.log("genSound");

    let wav = new WaveFile();
    const numSamples = 500;
    var samples = [];
    samples.push([]);
    samples.push([]);

    for(var i = 0 ; i < numSamples; i++)
    {
        samples[0].push(Math.sin(80.0*3.14*i/48000.0));
        samples[1].push(Math.sin(440.0*3.14*i/48000.0));
    }

    wav.fromScratch(2, 48000, '32f', samples);
    // https://stackoverflow.com/questions/23451726/saving-binary-data-as-file-using-javascript-from-a-browser
    var blob = new Blob([wav.toBuffer()], {type: "application/octet-stream"});

    console.log(wav.toBuffer()); // Uint8Array(4044)
    saveAs(blob,"output2.wav");
};

FrameExporter.prototype.startRecording = function() {
    this.record = true;
    this.frameUpdated = true;

    // Start frame counter
    this.frameCounter = new FrameCounter(this.fpsInput.value, this.secondsInput.value);
    this.frameCounter.start();

    this.startPatch();

    // Start playback if it's currently paused
    this.original_mIsPaused = gShaderToy.mIsPaused;
    if (gShaderToy.mIsPaused) {
        gShaderToy.pauseTime();
    }

    // Seek to the beginning
    gShaderToy.resetTime();
    gShaderToy.mTo = 0;

    // Store current settings
    this.prefix = this.prefixInput.value;
};

FrameExporter.prototype.stopRecording = function() {
    this.record = false;

    if ( ! this.preview) {
        this.stopPatch();
    }

    // Pause playback if it was originally paused
    if (this.original_mIsPaused) {
        gShaderToy.pauseTime();
    }
};

FrameExporter.prototype.startPatch = function() {
    if (this.patched) {
        return;
    }
    this.patched = true;

    // Add canvas layout styles
    this.addClass(this.player, 'sfe-recording');

    // Resize canvas to desired size
    this.original_width = gShaderToy.mCanvas.width;
    this.original_height = gShaderToy.mCanvas.height;
    var width = parseInt(this.widthInput.value, 10);
    var height = parseInt(this.heightInput.value, 10);
    gShaderToy.resize(width, height);

    // Patch the time counter, so we can step through frames
    this.original_getRealTime = window.getRealTime;
    window.getRealTime = this.getRealTime.bind(this);

    // Patch raf-loop, so we can intercept renders
    this.original_RequestAnimationFrame = gShaderToy.mEffect.RequestAnimationFrame;
    gShaderToy.mEffect.RequestAnimationFrame = this.RequestAnimationFrame.bind(this);
};


FrameExporter.prototype.stopPatch = function() {
    if ( ! this.patched) {
        return;
    }
    this.patched = false;

    // Remove canvas layout styles
    this.removeClass(this.player, 'lr-recording');

    // Reset canvas to original size
    gShaderToy.resize(this.original_width, this.original_height);

    // Remove time counter patch
    window.getRealTime = this.original_getRealTime;

    // Remove raf-loop patch
    gShaderToy.mEffect.RequestAnimationFrame = this.original_RequestAnimationFrame;
};


/* Shadertoy patches
   ========================================================================== */

// Will be called for every animation frame, but we don't always want to draw.

// When previewing, only draw when we reach a new frame to simulate reduced
// frame rate.

// When recording, only increment the frame and draw, after each save is complete.

FrameExporter.prototype.render = function(original_render) {
    if ( ! this.patched) {
        original_render();
        return;
    }

    if (this.preview) {

        if (this.frameUpdated) {
            original_render();
        } else {
            this.RequestAnimationFrame(original_render);
        }

        var lastFrame = this.frameCounter.frameNumber;
        this.frameCounter.updateTime();
        this.frameUpdated = lastFrame !== this.frameCounter.frameNumber;
    }

    if (this.record) {

        if (this.frameUpdated) {

            this.frameUpdated = false;
            var ct = this.frameCounter.frameNumber/this.frameCounter.fps;
            //console.log(ct);

                gShaderToy.mEffect.mPasses.forEach(function mPass(pass) {
                    pass.mInputs.forEach(function mInput(input){
                        var media = null;
                        if (input) {
                            //media = input.audio || input.video;
                            if (input.audio) {
                                input.audio.currentTime = ct; 
                                //console.log(input.audio.currentTime);
                                //media.controls = true;
                                //media.currentTime = value / 1000.0;
                            }
                        }
                    });
                });

            //gShaderToy.mEffect.mAudioContext.currentTime = value;
            original_render();

            this.saveFrame(gShaderToy.mCanvas, function() {
                this.frameCounter.incrementFrame();
                if (this.frameCounter.looped) {
                    this.stopRecording();
                }
                this.frameUpdated = true;
            }.bind(this));

        } else {
            this.RequestAnimationFrame(original_render);
        }
    }
};

// Inject our own render function
FrameExporter.prototype.RequestAnimationFrame = function(original_render) {
    var render = this.render.bind(this, original_render);
    this.original_RequestAnimationFrame.call(gShaderToy.mEffect, render);
};

FrameExporter.prototype.getRealTime = function() {
    return this.frameCounter.milliseconds();
};


/* Frame Counter
   ========================================================================== */

var FrameCounter = function(fps, loopSeconds) {
    this.fps = parseFloat(fps);
    this.loopSeconds = parseFloat(loopSeconds);
    this.frameLength = 1 / this.fps;
    this.totalFrames = Math.floor(this.fps * this.loopSeconds);
};

FrameCounter.prototype.start = function() {
    this.startTime = performance.now();
    this.looped = false;
    this.frameNumber = 0;
};

FrameCounter.prototype.updateTime = function() {
    var timeSeconds = (performance.now() - this.startTime) / 1000;
    this.frameNumber = Math.floor(timeSeconds / this.frameLength);
    this.loopFrames();
};

FrameCounter.prototype.incrementFrame = function() {
    this.frameNumber += 1;
    this.loopFrames();
};

FrameCounter.prototype.loopFrames = function() {
    if (this.frameNumber > this.totalFrames - 1) {
        this.looped = true;
        this.startTime = performance.now();
        this.frameNumber = 0;
    }
};

FrameCounter.prototype.milliseconds = function() {
    return (this.frameNumber * this.frameLength) * 1000;
};


/* User interface
   ========================================================================== */

FrameExporter.prototype.createUi = function() {
    this.controls = document.createElement('div');
    this.addClass(this.controls, 'sfe-controls');
    this.insertAfter(this.controls, this.player);

    var n = 2;
    this.widthInput = this.createInput('width', 'number', 1920*n);
    this.heightInput = this.createInput('height', 'number', 1080*n);
    this.fpsInput = this.createInput('fps', 'number', 50);
    this.secondsInput = this.createInput('seconds', 'number',500);
    this.startFrameInput = this.createInput('startFrame', 'number',0);
    this.skipInput = this.createInput('skip', 'number',1);

    var url = document.location.toString().split('/');
    this.prefixInput = this.createInput('prefix', 'text',url[url.length-1] + '_' );

    var previewInput = this.createInput('preview', 'checkbox');
    previewInput.addEventListener('click', function() {
        if (previewInput.checked) {
            this.enablePreview();
        } else {
            this.disablePreview();
        }
    }.bind(this));

    var button = document.createElement('button');
    button.textContent = 'Go!';
    this.addClass(button, 'sfe-save');
    this.controls.appendChild(button);
    button.addEventListener('click', this.startRecording.bind(this));

    button = document.createElement('button');
    button.textContent = 'Sound!';
    this.addClass(button, 'sfe-save');
    this.controls.appendChild(button);
    button.addEventListener('click', this.genSound.bind(this));

    button = document.createElement('button');
    button.textContent = 'Stop!';
    this.addClass(button, 'sfe-save');
    this.controls.appendChild(button);
    button.addEventListener('click', this.stopRecording.bind(this));

    this.settingsChanged();
};

FrameExporter.prototype.settingsChanged = function() {
    var settings = {
        width: this.widthInput.value,
        height: this.heightInput.value,
        fps: this.fpsInput.value,
        seconds: this.secondsInput.value,
        startFrame: this.startFrameInput.value,
        skip: this.skipInput.value
    };

    if (this.preview && JSON.stringify(this.settings) != JSON.stringify(settings)) {
        this.disablePreview();
        this.enablePreview();
    }

    this.settings = settings;
};

FrameExporter.prototype.createInput = function(name, type, value) {
    var id = name;

    var label = document.createElement('label');
    label.textContent = name;
    label.setAttribute('for', id);
    this.addClass(label, 'sfe-label');

    var input = document.createElement('input');
    input.id = id;
    input.type = type;
    input.value = value;
    this.addClass(input, 'sfe-input');

    input.addEventListener('change', this.settingsChanged.bind(this));
    input.addEventListener('blur', this.settingsChanged.bind(this));

    var control = document.createElement('div');
    this.addClass(control, 'sfe-control');
    this.addClass(control, 'sfe-control--' + type);

    control.appendChild(label);
    control.appendChild(input);
    this.controls.appendChild(control);

    return input;
};


/* Utilities
   ========================================================================== */

FrameExporter.prototype.saveFrame = function(canvas, done) {
    //console.log(this.settings.startFrame,parseInt(this.settings.startFrame));
    var startFrame = parseInt(this.settings.startFrame);
    var ShouldWeSaveFrame = true;
    if(this.frameCounter.frameNumber < startFrame)
    {
        ShouldWeSaveFrame = false;
    }

    var frameNumber = this.frameCounter.frameNumber;
    var skip = parseInt(this.settings.skip);
    //frameNumber = ;
    if( skip > 1)
    {
        // get back to 0 whatever startFrame is
        frameNumber -= startFrame;
        if(frameNumber % skip > 0)
        {
            ShouldWeSaveFrame = false;
        }
        else
        {
            frameNumber /= skip;
        }
    }

    if(!ShouldWeSaveFrame)
    {
        done();
        return;
    }

    var totalFrames = this.frameCounter.totalFrames;
    var digits = totalFrames.toString().length;
    var frameString = this.pad(frameNumber, digits);
    var filename = this.prefix + frameString + '.jpg';
    canvas.toBlob(function(blob) {
        saveAs(blob, filename);
        setTimeout(done, 300);
    },'image/jpeg',0.96);
};

FrameExporter.prototype.insertAfter = function(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
};

FrameExporter.prototype.addClass = function(el, className) {
    if (el.classList) {
        el.classList.add(className);
    } else {
        el.className += ' ' + className;
    }
};

FrameExporter.prototype.removeClass = function(el, className) {
    if (el.classList) {
        el.classList.remove(className);
    } else {
        el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    }
};

FrameExporter.prototype.pad = function(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
};


/* Init
   ========================================================================== */

window.frameExporter = new FrameExporter();
