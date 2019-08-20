
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

// from EffectPass.prototype.Paint_Sound
EffectPass.prototype.Generate_Sound = function( wa, d, filename, duration )
{
    //console.log("hey!");
    //todo
    var dates = [ d.getFullYear(), // the year (four digits)
                  d.getMonth(),    // the month (from 0-11)
                  d.getDate(),     // the day of the month (from 1-31)
                  d.getHours()*60.0*60 + d.getMinutes()*60 + d.getSeconds() ];

    var resos = [ 0.0,0.0,0.0, 0.0,0.0,0.0, 0.0,0.0,0.0, 0.0,0.0,0.0 ];

    this.mRenderer.SetRenderTarget(this.mRenderFBO);

    this.mRenderer.SetViewport([0, 0, this.mTextureDimensions, this.mTextureDimensions]);
    this.mRenderer.AttachShader(this.mProgram);
    this.mRenderer.SetBlend( false );

    var texID = [null, null, null, null];
    for (var i = 0; i < this.mInputs.length; i++)
    {
        var inp = this.mInputs[i];

        if( inp==null )
        {
        }
        else if( inp.mInfo.mType=="texture" )
        {
            if( inp.loaded==true  )
            {
                texID[i] = inp.globject;
                resos[3*i+0] = inp.image.width;
                resos[3*i+1] = inp.image.height;
                resos[3*i+2] = 1;
            }
        }
        else if( inp.mInfo.mType=="volume" )
        {
            if( inp.loaded==true  )
            {
                texID[i] = inp.globject;
                resos[3*i+0] = inp.mImage.mXres;
                resos[3*i+1] = inp.mImage.mYres;
                resos[3*i+2] = inp.mImage.mZres;
            }
        }
    }

    this.mRenderer.AttachTextures(4, texID[0], texID[1], texID[2], texID[3]);

    var l2 = this.mRenderer.SetShaderConstantLocation(this.mProgram, "iBlockOffset");
    this.mRenderer.SetShaderConstant4FV("iDate", dates);
    this.mRenderer.SetShaderConstant3FV("iChannelResolution", resos);
    this.mRenderer.SetShaderConstant1F("iSampleRate", this.mSampleRate);
    this.mRenderer.SetShaderTextureUnit("iChannel0", 0);
    this.mRenderer.SetShaderTextureUnit("iChannel1", 1);
    this.mRenderer.SetShaderTextureUnit("iChannel2", 2);
    this.mRenderer.SetShaderTextureUnit("iChannel3", 3);

    var l1 = this.mRenderer.GetAttribLocation(this.mProgram, "pos");


    //--------------------------------
    //var numSamples = this.mTmpBufferSamples;
    console.log(duration,this.mSampleRate);
    var numSamples = Math.floor(duration * this.mSampleRate); //var numSamples = this.mTmpBufferSamples;
    var numSamplesMaxPerFile = 8820000; //todo
    //for now I can do 200 seconds at 44100 Hz and stereo... good enough!!

    var bufL = this.mBuffer.getChannelData(0); // Float32Array
    var bufR = this.mBuffer.getChannelData(1); // Float32Array
    var numBlocks = numSamples / this.mTmpBufferSamples;

    console.log(bufL.length,bufR.length);

    //added
    let wav = new WaveFile();
    var samplesForWave = [];
    samplesForWave.push([]);
    samplesForWave.push([]);
    ///added

    for( var j=0; j<numBlocks; j++ )
    {
        var off = j*this.mTmpBufferSamples;

        this.mRenderer.SetShaderConstant1F_Pos(l2, off / this.mSampleRate);
        this.mRenderer.DrawUnitQuad_XY(l1);

        this.mRenderer.GetPixelData(this.mData, 0, this.mTextureDimensions, this.mTextureDimensions);

        //dorni
        //Sound buffer : previous function is where this.mData (sound values) are generated
        /*for( var i=0; i<4*numSamples; i++ )
        {
            this.mData[i] = 0.0;//Math.sin(3.14*440.0*i);
        }*/
        ///dorni


        for( var i=0; i<this.mTmpBufferSamples; i++ )
        {
            samplesForWave[0][off+i] = (-1.0 + 2.0*(this.mData[4*i+0]+256.0*this.mData[4*i+1])/65535.0);
            samplesForWave[1][off+i] = (-1.0 + 2.0*(this.mData[4*i+2]+256.0*this.mData[4*i+3])/65535.0);
        }

    }


    //added
    console.log(samplesForWave[0].length,samplesForWave[1].length,this.mSampleRate,numSamples,this.mTmpBufferSamples);
    //console.log(bufL.length,bufR.length);

    //samplesForWave.push(bufL);
    //samplesForWave.push(bufR);
    console.log("wav.fromScratch");
    wav.fromScratch(2, this.mSampleRate, '32f', samplesForWave);
    //wav.fromScratch(2, this.mSampleRate, '32f', [bufL,bufR]);

    var blob = new Blob([wav.toBuffer()], {type: "application/octet-stream"});
    //var filenameFull = filename+"_"+j+".wav";
    var filenameFull = filename+".wav";
    console.log(filenameFull);
    saveAs(blob,filenameFull);
    ///added

    this.mRenderer.DetachShader();
    this.mRenderer.DettachTextures();
    this.mRenderer.SetRenderTarget(null);

    //-------------------------------

    /*if( this.mPlayNode!=null ) { this.mPlayNode.disconnect(); this.mPlayNode.stop(); }

    this.mPlayNode = wa.createBufferSource();
    this.mPlayNode.buffer = this.mBuffer;
    this.mPlayNode.connect( this.mGainNode );
    this.mPlayNode.state = this.mPlayNode.noteOn;
    this.mPlayNode.start(0);*/


}

FrameExporter.prototype.genSound = function() {
    console.log("genSound");

    let wav = new WaveFile();
    /*const numSamples = 500;
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
    saveAs(blob,"output2.wav");*/

    var duration = parseFloat(this.secondsInput.value);

    gShaderToy.mEffect.mPasses.forEach(function mPass(pass) {
        //console.log(pass);
        if( pass.mType==="sound" )
        {
            //console.log("found!");

            //me.mEffect.Paint(ltime/1000.0, dtime/1000.0, me.mFPS.GetFPS(), me.mMouseOriX, me.mMouseOriY, me.mMousePosX, me.mMousePosY, me.mIsPaused );
            //Effect.prototype.Paint = function(time, dtime, fps, mouseOriX, mouseOriY, mousePosX, mousePosY, isPaused)
            //let wa = this.mAudioContext;
            //let da = new Date();

            pass.Generate_Sound(gShaderToy.mEffect.mAudioContext,new Date(),this.prefix.value,duration);
        }   
    });

/*example of ffmpeg command line : ffmpeg -i input1.wav -i input2.wav -i input3.wav -i input4.wav \
-filter_complex '[0:0][1:0][2:0][3:0]concat=n=4:v=0:a=1[out]' \
-map '[out]' output.wav*/
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

/*
Soundcloud Private tracks
*/

/*
EffectPass.prototype.NewTexture copy
*/

EffectPass.prototype.NewTexture_ = function( wa, slot, url, buffers, cubeBuffers, keyboard )
{
    var me = this;
    var renderer = this.mRenderer;

    if( renderer==null ) return;

    var texture = null;

    if( url==null || url.mType==null )
    {
        if( me.mTextureCallbackFun!=null )
            me.mTextureCallbackFun( this.mTextureCallbackObj, slot, null, true, 0, 0, -1.0, me.mID );
        me.DestroyInput( slot );
        me.mInputs[slot] = null;
        me.MakeHeader();
        return { mFailed:false, mNeedsShaderCompile:false };
    }
    else if( url.mType=="texture" )
    {
        texture = {};
        texture.mInfo = url;
        texture.globject = null;
        texture.loaded = false;
        texture.image = new Image();
        texture.image.crossOrigin = '';
        texture.image.onload = function()
        {
            var rti = me.Sampler2Renderer(url.mSampler);

            // O.M.G. IQIQ FIX THIS
            var channels = renderer.TEXFMT.C4I8;
            if (url.mID == "Xdf3zn" || url.mID == "4sf3Rn" || url.mID == "4dXGzn" || url.mID == "4sf3Rr")
                channels = renderer.TEXFMT.C1I8;
            
            texture.globject = renderer.CreateTextureFromImage(renderer.TEXTYPE.T2D, texture.image, channels, rti.mFilter, rti.mWrap, rti.mVFlip);

            texture.loaded = true;
            if( me.mTextureCallbackFun!=null )
                me.mTextureCallbackFun( me.mTextureCallbackObj, slot, texture.image, true, 1, 1, -1.0, me.mID );
        }
        texture.image.src = url.mSrc;


        var returnValue = { mFailed:false, mNeedsShaderCompile: (this.mInputs[slot]==null ) || (
                                                                (this.mInputs[slot].mInfo.mType!="texture") && 
                                                                (this.mInputs[slot].mInfo.mType!="webcam") && 
                                                                (this.mInputs[slot].mInfo.mType!="mic") && 
                                                                (this.mInputs[slot].mInfo.mType!="music") && 
                                                                (this.mInputs[slot].mInfo.mType!="musicstream") && 
                                                                (this.mInputs[slot].mInfo.mType!="keyboard") && 
                                                                (this.mInputs[slot].mInfo.mType!="video")) };
        this.DestroyInput( slot );
        this.mInputs[slot] = texture;
        this.MakeHeader();
        return returnValue;
    }
    else if( url.mType=="volume" )
    {
        texture = {};
        texture.mInfo = url;
        texture.globject = null;
        texture.loaded = false;
        texture.mImage = { mData:null, mXres:1, mYres:0, mZres:0 };
        texture.mPreview = new Image();
        texture.mPreview.crossOrigin = '';

        var xmlHttp = new XMLHttpRequest();
        if( xmlHttp==null ) return { mFailed:true };

        xmlHttp.open('GET', url.mSrc, true);
        xmlHttp.responseType = "arraybuffer";
        xmlHttp.onerror = function()
        {
        }
        xmlHttp.onload = function()
        {
            var data = xmlHttp.response;
            if (!data ) return;

            var file = piFile(data);

            var signature = file.ReadUInt32();
            texture.mImage.mXres = file.ReadUInt32();
            texture.mImage.mYres = file.ReadUInt32();
            texture.mImage.mZres = file.ReadUInt32();
            var binNumChannels = file.ReadUInt8();
            var binLayout = file.ReadUInt8();
            var binFormat = file.ReadUInt16();
            var format = renderer.TEXFMT.C1I8;
                 if( binNumChannels==1 && binFormat==0 )  format = renderer.TEXFMT.C1I8;
            else if( binNumChannels==2 && binFormat==0 )  format = renderer.TEXFMT.C2I8;
            else if( binNumChannels==3 && binFormat==0 )  format = renderer.TEXFMT.C3I8;
            else if( binNumChannels==4 && binFormat==0 )  format = renderer.TEXFMT.C4I8;
            else if( binNumChannels==1 && binFormat==10 ) format = renderer.TEXFMT.C1F32;
            else if( binNumChannels==2 && binFormat==10 ) format = renderer.TEXFMT.C2F32;
            else if( binNumChannels==3 && binFormat==10 ) format = renderer.TEXFMT.C3F32;
            else if( binNumChannels==4 && binFormat==10 ) format = renderer.TEXFMT.C4F32;
            else return;

            var buffer = new Uint8Array(data, 20); // skip 16 bytes (header of .bin)

            var rti = me.Sampler2Renderer(url.mSampler);

            texture.globject = renderer.CreateTexture(renderer.TEXTYPE.T3D, texture.mImage.mXres, texture.mImage.mYres, format, rti.mFilter, rti.mWrap, buffer);

            if( texture.globject==null ) return { mFailed:true };

            if (me.mTextureCallbackFun != null)
            {
                me.mTextureCallbackFun( me.mTextureCallbackObj, slot, texture.mPreview, true, 1, 1, -1.0, me.mID );
            }

            texture.loaded = true;

            // load icon for it
            texture.mPreview.onload = function()
            {
                if( me.mTextureCallbackFun!=null )
                    me.mTextureCallbackFun( me.mTextureCallbackObj, slot, texture.mPreview, true, 1, 1, -1.0, me.mID );
            }
            texture.mPreview.src = url.mPreviewSrc;
        }
        xmlHttp.send("");


        var returnValue = { mFailed:false, mNeedsShaderCompile: (this.mInputs[slot]==null ) || (
                                                                (this.mInputs[slot].mInfo.mType!="volume")) };
        this.DestroyInput( slot );
        this.mInputs[slot] = texture;
        this.MakeHeader();
        return returnValue;
    }
    else if( url.mType=="cubemap" )
    {
        texture = {};
        texture.mInfo = url;
        texture.globject = null;
        texture.loaded = false;

        var rti = me.Sampler2Renderer(url.mSampler);

        if( assetID_to_cubemapBuferID(url.mID)!=-1 )
        {
            texture.mImage = new Image();
            texture.mImage.onload = function()
            {
                texture.loaded = true;
                if( me.mTextureCallbackFun!=null )
                    me.mTextureCallbackFun( me.mTextureCallbackObj, slot, texture.mImage, true, 2, 1, -1.0, me.mID );
            }
            texture.mImage.src = "/media/previz/cubemap00.png";

            this.mEffect.ResizeCubemapBuffer(0, 1024, 1024 );

        }
        else
        {
            texture.image = [ new Image(), new Image(), new Image(), new Image(), new Image(), new Image() ];

            var numLoaded = 0;
            for( var i=0; i<6; i++ )
            {
                texture.image[i].mId = i;
                texture.image[i].crossOrigin = '';
                texture.image[i].onload = function()
                {
                    var id = this.mId;
                    numLoaded++;
                    if( numLoaded==6 )
                    {
                        texture.globject = renderer.CreateTextureFromImage(renderer.TEXTYPE.CUBEMAP, texture.image, renderer.TEXFMT.C4I8, rti.mFilter, rti.mWrap, rti.mVFlip);
                        texture.loaded = true;
                        if (me.mTextureCallbackFun != null)
                            me.mTextureCallbackFun(me.mTextureCallbackObj, slot, texture.image[0], true, 2, 1, -1.0, me.mID);
                    }
                }

                if( i == 0) 
                {
                    texture.image[i].src = url.mSrc;
                } 
                else 
                {
                    var n = url.mSrc.lastIndexOf(".");
                    texture.image[i].src = url.mSrc.substring(0, n) + "_" + i + url.mSrc.substring(n, url.mSrc.length);
                }
            }
        }

        var returnValue = { mFailed:false, mNeedsShaderCompile: (this.mInputs[slot]==null ) || (
                                                                (this.mInputs[slot].mInfo.mType!="cubemap")) };

        this.DestroyInput( slot );
        this.mInputs[slot] = texture;
        this.MakeHeader();
        return returnValue;
    }
    else if( url.mType==="webcam" )
    {
        texture = {};
        texture.mInfo = url;
        texture.globject = null;
        texture.loaded = false;

        texture.video = document.createElement('video');
        texture.video.width = 320;
        texture.video.height = 240;
        texture.video.autoplay = true;
        texture.video.loop = true;
        texture.video.stream = null;
        texture.mForceMuted = this.mForceMuted;
        texture.mImage = null;

        var rti = me.Sampler2Renderer(url.mSampler);

        var loadImageInsteadOfWebCam = function()
        {
            texture.mImage = new Image();
            texture.mImage.onload = function()
            {
                texture.loaded = true;
                texture.globject = renderer.CreateTextureFromImage(renderer.TEXTYPE.T2D, texture.mImage, renderer.TEXFMT.C4I8, rti.mFilter, rti.mWrap, rti.mVFlip);
                if( me.mTextureCallbackFun!=null )
                    me.mTextureCallbackFun( me.mTextureCallbackObj, slot, texture.mImage, true, 7, 1, -1.0, me.mID );
            }
            texture.mImage.src = "/media/previz/webcam.png";
        }
        
        loadImageInsteadOfWebCam();

        if( typeof navigator.getUserMedia !== "undefined"  && texture.mForceMuted===false )
        {
            texture.video.addEventListener("canplay", function (e)
            {
                try
                {
                    texture.mImage = null;
                    if( texture.globject != null )
                        renderer.DestroyTexture( texture.globject );
                    texture.globject = renderer.CreateTextureFromImage(renderer.TEXTYPE.T2D, texture.video, renderer.TEXFMT.C4I8, rti.mFilter, rti.mWrap, rti.mVFlip);
                    texture.loaded = true;
                }
                catch(e)
                {
                    loadImageInsteadOfWebCam();
                    alert( 'Your browser can not transfer webcam data to the GPU.');
                }
            } );

            navigator.mediaDevices.getUserMedia( 
                                { "video": { width:     { min: 640, ideal:1280, max:1920 },
                                             height:    { min: 480, ideal: 720, max:1080 },
                                             frameRate: { min:  10, ideal:  30, max:  30 } },
                                  "audio": false } )
                                .then( function(stream)
                                       {
                                            texture.video.srcObject = stream;
                                       } )
                                .catch( function(error)
                                        {
                                            loadImageInsteadOfWebCam();
                                            alert( 'Unable to capture WebCam. Please reload the page.' );
                                        } );
        }
        var returnValue = { mFailed:false, mNeedsShaderCompile: (this.mInputs[slot]==null ) || (
                                                                (this.mInputs[slot].mInfo.mType!="texture") && 
                                                                (this.mInputs[slot].mInfo.mType!="webcam") && 
                                                                (this.mInputs[slot].mInfo.mType!="mic") && 
                                                                (this.mInputs[slot].mInfo.mType!="music") && 
                                                                (this.mInputs[slot].mInfo.mType!="musicstream") && 
                                                                (this.mInputs[slot].mInfo.mType!="keyboard") && 
                                                                (this.mInputs[slot].mInfo.mType!="video")) };
        this.DestroyInput( slot );
        this.mInputs[slot] = texture;
        this.MakeHeader();
        return returnValue;
    }
    else if( url.mType=="mic" )
    {
        texture = {};
        texture.mInfo = url;
        texture.globject = null;
        texture.loaded = false;
        texture.mForceMuted = this.mForceMuted;
        texture.mAnalyser = null;
        var num = 512;
        texture.mFreqData = new Uint8Array( num );
        texture.mWaveData = new Uint8Array( num );

        if( wa == null || typeof navigator.getUserMedia === "undefined" )
        {
            if( !texture.mForceMuted ) alert( "Shadertoy: Web Audio not implement in this browser" );
            texture.mForceMuted = true; 
        }


        if( texture.mForceMuted )
        {
            texture.globject = renderer.CreateTexture(renderer.TEXTYPE.T2D, num, 2, renderer.TEXFMT.C1I8, renderer.FILTER.LINEAR, renderer.TEXWRP.CLAMP, null)
            texture.loaded = true;
        }
        else
        {
        navigator.getUserMedia( { "audio": true },
                                function(stream)
                                {
                                  texture.globject = renderer.CreateTexture(renderer.TEXTYPE.T2D, 512, 2, renderer.TEXFMT.C1I8, renderer.FILTER.LINEAR, null)
                                  texture.mic = wa.createMediaStreamSource(stream);
                                  texture.mAnalyser = wa.createAnalyser();
                                  texture.mic.connect( texture.mAnalyser );
                                  texture.loaded = true;
                                },
                                function(error)
                                {
                                    alert( 'Unable open Mic. Please reload the page.' );
                                } );
        }
        var returnValue = { mFailed:false, mNeedsShaderCompile: (this.mInputs[slot]==null ) || (
                                                                (this.mInputs[slot].mInfo.mType!="texture") && 
                                                                (this.mInputs[slot].mInfo.mType!="webcam") && 
                                                                (this.mInputs[slot].mInfo.mType!="mic") && 
                                                                (this.mInputs[slot].mInfo.mType!="music") && 
                                                                (this.mInputs[slot].mInfo.mType!="musicstream") && 
                                                                (this.mInputs[slot].mInfo.mType!="keyboard") && 
                                                                (this.mInputs[slot].mInfo.mType!="video")) };
        this.DestroyInput( slot );
        this.mInputs[slot] = texture;
        this.MakeHeader();
        return returnValue;
    }
    else if( url.mType=="video" )
    {
        texture = {};
        texture.mInfo = url;
        texture.globject = null;
        texture.loaded = false;
        texture.video = document.createElement('video');
        texture.video.loop = true;
        texture.video.mPaused = this.mForcePaused;
        texture.video.mMuted = this.mForceMuted;
        texture.video.muted  = this.mForceMuted;
        if( this.mForceMuted==true )
            texture.video.volume = 0;
        texture.video.autoplay = false;
        texture.video.hasFalled = false;
        
        var rti = me.Sampler2Renderer(url.mSampler);

        texture.video.addEventListener("canplay", function (e)
        {
            texture.video.play();
            texture.video.mPaused = false;

            //var rti = me.Sampler2Renderer(url.mSampler);

            texture.globject = renderer.CreateTextureFromImage(renderer.TEXTYPE.T2D, texture.video, renderer.TEXFMT.C4I8, rti.mFilter, rti.mWrap, rti.mVFlip);
            texture.loaded = true;
            
            if( me.mTextureCallbackFun!=null )
                me.mTextureCallbackFun( me.mTextureCallbackObj, slot, texture.video, true, 3, 1, -1.0, me.mID );

        } );

        texture.video.addEventListener( "error", function(e)
        {
               if( texture.video.hasFalled==true ) { alert("Error: cannot load video" ); return; }
               var str = texture.video.src;
               str = str.substr(0,str.lastIndexOf('.') ) + ".mp4";
               texture.video.src = str;
               texture.video.hasFalled = true;
        } );

        texture.video.src = url.mSrc;

        var returnValue = { mFailed:false, mNeedsShaderCompile: (this.mInputs[slot]==null ) || (
                                                                (this.mInputs[slot].mInfo.mType!="texture") && 
                                                                (this.mInputs[slot].mInfo.mType!="webcam") && 
                                                                (this.mInputs[slot].mInfo.mType!="mic") && 
                                                                (this.mInputs[slot].mInfo.mType!="music") && 
                                                                (this.mInputs[slot].mInfo.mType!="musicstream") && 
                                                                (this.mInputs[slot].mInfo.mType!="keyboard") && 
                                                                (this.mInputs[slot].mInfo.mType!="video")) };
        this.DestroyInput( slot );
        this.mInputs[slot] = texture;
        this.MakeHeader();
        return returnValue;
    }
    else if( url.mType=="music" || url.mType=="musicstream" )
    {
        texture = {};
        texture.mInfo = url;
        texture.globject = null;
        texture.loaded = false;
        texture.audio = document.createElement('audio');
        texture.audio.loop = true;
        texture.audio.mMuted = this.mForceMuted;
        texture.audio.mForceMuted = this.mForceMuted;
        texture.audio.muted = this.mForceMuted;
        if( this.mForceMuted==true )
            texture.audio.volume = 0;
        texture.audio.autoplay = false;
        texture.audio.hasFalled = false;
        texture.audio.mPaused = false;
        texture.audio.mSound = {};

        if( this.mForceMuted==false )
        {
            if(url.mType=="musicstream" && SC == null)
            {
                alert( "Shadertoy: Soundcloud could not be reached" );
                texture.audio.mForceMuted = true;
            }
            }

        if( wa == null && this.mForceMuted==false )
        {
            alert( "Shadertoy: Web Audio not implement in this browser" );
            texture.audio.mForceMuted = true;
        }

        if( texture.audio.mForceMuted )
        {
            texture.globject = renderer.CreateTexture(renderer.TEXTYPE.T2D, 512, 2, renderer.TEXFMT.C1I8, renderer.FILTER.LINEAR, renderer.TEXWRP.CLAMP, null);
            var num = 512;
            texture.audio.mSound.mFreqData = new Uint8Array( num );
            texture.audio.mSound.mWaveData = new Uint8Array( num );
            texture.loaded = true;
        }

        texture.audio.addEventListener( "canplay", function()
        {
            if( texture==null || texture.audio==null ) return;
            if( this.mForceMuted  ) return;
            if( texture.loaded === true ) return;

            texture.globject = renderer.CreateTexture(renderer.TEXTYPE.T2D, 512, 2, renderer.TEXFMT.C1I8, renderer.FILTER.LINEAR, renderer.TEXWRP.CLAMP, null)

            texture.audio.mSound.mSource   = wa.createMediaElementSource( texture.audio );
            texture.audio.mSound.mAnalyser = wa.createAnalyser();
            texture.audio.mSound.mGain     = wa.createGain();

            texture.audio.mSound.mSource.connect(   texture.audio.mSound.mAnalyser );
            texture.audio.mSound.mAnalyser.connect( texture.audio.mSound.mGain );
            //texture.audio.mSound.mGain.connect( wa.destination );
            texture.audio.mSound.mGain.connect(me.mGainNode);

            texture.audio.mSound.mFreqData = new Uint8Array( texture.audio.mSound.mAnalyser.frequencyBinCount );
            texture.audio.mSound.mWaveData = new Uint8Array( texture.audio.mSound.mAnalyser.frequencyBinCount );

            if( texture.audio.mPaused )
            {
                texture.audio.pause();
            }
            else
            {
                texture.audio.play().then( function() {/*console.log("ok");*/} ).catch( function(e){console.log("error " + e);} );
            }
            texture.loaded = true;
        } );

        texture.audio.addEventListener( "error", function(e)
        {
               if( this.mForceMuted  ) return;

               if( texture.audio.hasFalled==true ) { /*alert("Error: cannot load music" ); */return; }
               var str = texture.audio.src;
               str = str.substr(0,str.lastIndexOf('.') ) + ".ogg";
               texture.audio.src = str;
               texture.audio.hasFalled = true;
        } );

        if( !texture.audio.mForceMuted )
        {
            if(url.mType=="musicstream")
            {
                SC.resolve(url.mSrc).then( function(song) 
                                           {
                                                if( song.streamable==true )
                                                {
                                                    texture.audio.crossOrigin = '';
                                                    texture.audio.src = song.stream_url + "?client_id=" + SC.client_id;
                                                    texture.audio.soundcloudInfo = song;
                                                }
                                                else
                                                {
                                                    alert('Shadertoy: Soundcloud - This track cannot be streamed' );
                                                }
                                            } 
                                            ).catch( 
                                            function(error)
                                            {
                                                //console.log('Shadertoy: Soundcloud - ' + error.message);
                                                if (me.mTextureCallbackFun!=null)
                                                {
                                                    me.mTextureCallbackFun(me.mTextureCallbackObj, slot, {wave:null}, false, 4, 0, -1.0, me.mID);
                                                }
                                            } );
            } 
            else
            {
                texture.audio.src = url.mSrc;
            }
        }

        if (me.mTextureCallbackFun!=null)
        {
            if (url.mType == "music")            me.mTextureCallbackFun(me.mTextureCallbackObj, slot, {wave:null}, false, 4, 0, -1.0, me.mID);
            else if (url.mType == "musicstream") me.mTextureCallbackFun(me.mTextureCallbackObj, slot, {wave:null, info: texture.audio.soundcloudInfo}, false, 8, 0, -1.0, me.mID);
        }

        var returnValue = { mFailed:false, mNeedsShaderCompile: (this.mInputs[slot]==null ) || (
                                                                (this.mInputs[slot].mInfo.mType!="texture") && 
                                                                (this.mInputs[slot].mInfo.mType!="webcam") && 
                                                                (this.mInputs[slot].mInfo.mType!="mic") && 
                                                                (this.mInputs[slot].mInfo.mType!="music") && 
                                                                (this.mInputs[slot].mInfo.mType!="musicstream") && 
                                                                (this.mInputs[slot].mInfo.mType!="keyboard") && 
                                                                (this.mInputs[slot].mInfo.mType!="video")) };
        this.DestroyInput( slot );
        this.mInputs[slot] = texture;
        this.MakeHeader();
        return returnValue;
    }
    else if( url.mType=="keyboard" )
    {
        texture = {};
        texture.mInfo = url;
        texture.globject = null;
        texture.loaded = true;

        texture.keyboard = {};

        if( me.mTextureCallbackFun!=null )
            me.mTextureCallbackFun( me.mTextureCallbackObj, slot, {mImage: keyboard.mIcon, mData: keyboard.mData}, false, 6, 1, -1.0, me.mID );

        var returnValue = { mFailed:false, mNeedsShaderCompile: (this.mInputs[slot]==null ) || (
                                                                (this.mInputs[slot].mInfo.mType!="texture") && 
                                                                (this.mInputs[slot].mInfo.mType!="webcam") && 
                                                                (this.mInputs[slot].mInfo.mType!="mic") && 
                                                                (this.mInputs[slot].mInfo.mType!="music") && 
                                                                (this.mInputs[slot].mInfo.mType!="musicstream") && 
                                                                (this.mInputs[slot].mInfo.mType!="keyboard") && 
                                                                (this.mInputs[slot].mInfo.mType!="video")) };
        this.DestroyInput( slot );
        this.mInputs[slot] = texture;
        this.MakeHeader();
        return returnValue;
    }
    else if( url.mType=="buffer" )
    {
        texture = {};
        texture.mInfo = url;

        texture.image = new Image();
        texture.image.onload = function()
        {
            if( me.mTextureCallbackFun!=null )
                me.mTextureCallbackFun( me.mTextureCallbackObj, slot, {texture: texture.image, data:null}, true, 9, 1, -1.0, me.mID );
        }
        texture.image.src = url.mSrc;
        texture.id = assetID_to_bufferID( url.mID );
        texture.loaded = true;

        var returnValue = { mFailed:false, mNeedsShaderCompile: (this.mInputs[slot]==null ) || (
                                                                (this.mInputs[slot].mInfo.mType!="texture") && 
                                                                (this.mInputs[slot].mInfo.mType!="webcam") && 
                                                                (this.mInputs[slot].mInfo.mType!="mic") && 
                                                                (this.mInputs[slot].mInfo.mType!="music") && 
                                                                (this.mInputs[slot].mInfo.mType!="musicstream") && 
                                                                (this.mInputs[slot].mInfo.mType!="keyboard") && 
                                                                (this.mInputs[slot].mInfo.mType!="video")) };

        this.DestroyInput( slot );
        this.mInputs[slot] = texture;

        this.mEffect.ResizeBuffer(texture.id, this.mEffect.mXres, this.mEffect.mYres, false );

        // Setting the passes samplers
        this.SetSamplerFilter(slot, url.mSampler.filter, buffers, cubeBuffers, true);
        this.SetSamplerVFlip(slot, url.mSampler.vflip);
        this.SetSamplerWrap(slot, url.mSampler.wrap, buffers);

        this.MakeHeader();
        return returnValue;
    }
    else
    {
        alert( "input type error" );
        return { mFailed: true };
    }

    return { mFailed: true };

}

/* Init
   ========================================================================== */

window.frameExporter = new FrameExporter();
