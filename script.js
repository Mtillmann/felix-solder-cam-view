import { isRecording, startRecording, endRecording, exportVideo, supportedCodecs } from './mediaRecorder.js';
import registerPedalEvents from './pedal-events.js';





export async function camView() {

    registerPedalEvents();
    

    

    let flipY = false;
    let flipX = false;

    const video = document.querySelector('video')
    const canvas = document.querySelector('canvas')
    const ctx = canvas.getContext('2d')

    function setState() {
        const data = JSON.stringify({
            flipY,
            flipX
        })

        localStorage.setItem('cam-view-state', data)
    }

    function applyCanvasTransforms() {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        ctx.translate(canvas.width / 2, canvas.height / 2)
        if (flipY) {
            ctx.scale(-1, 1)
        }
        if (flipX) {
            ctx.scale(1, -1)
        }
        ctx.translate(-canvas.width / 2, -canvas.height / 2)
    }


    document.documentElement.setAttribute('data-bs-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
        new bootstrap.Tooltip(el, { trigger: 'hover' })
    });




    const constraints = {
        video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60 },
        }
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    video.srcObject = stream;


    video.addEventListener('play', function () {
        let draw = function (now, metadata) {
            if (video.paused || video.ended) return;
            ctx.drawImage(video, 0, 0)
            video.requestVideoFrameCallback(draw);
        };
        video.requestVideoFrameCallback(draw);
    });

    await video.play()

    //get current video resolution
    const videoTrack = stream.getVideoTracks()[0]
    const settings = videoTrack.getSettings()

    //get all camera capabilities
    const capabilities = await videoTrack.getCapabilities()

    //get all current camera settings
    let cameraSettings = Object.entries(videoTrack.getSettings()).reduce((acc, [key, value]) => {

        if (['resizeMode', 'frameRate', 'aspectRatio', 'width', 'height', 'deviceId', 'groupId'].includes(key)) {
            //console.log('skipping', key)
            return acc
        }

        if (!capabilities[key]) {
            //console.log('no capability for', key)
            return acc
        }

        //console.log('using', key, value);
        acc[key] = value
        return acc
    }, {});


    if (Object.keys(capabilities).length === 0) {
        document.querySelector('#noCameraSettings').classList.remove('d-none')
    }
    else {
        const editor = new Editor("sample", "Cam Settings", () => cameraSettings);
        editor.top().left();
        editor.theme("dark");


        for (const key in cameraSettings) {
            if (Array.isArray(capabilities[key])) {
                const input = editor.root
                    .addProperty(key, key, "select")
                    .change(setCameraSettings);
                capabilities[key].forEach((item) => {
                    input.addItem(item);
                });
            } else if (typeof cameraSettings[key] === 'number') {
                const input = editor.root.addProperty(key, key, 'number')
                    .change(setCameraSettings)
                    .min(capabilities[key].min)
                    .max(capabilities[key].max)
                    .step(capabilities[key].step ?? 1);
            }
        }

        let defaultCameraSettings = JSON.parse(localStorage.getItem('cam-view-default-cam-settings')) ?? structuredClone(cameraSettings)
        if (!localStorage.getItem('cam-view-default-cam-settings')) {
            localStorage.setItem('cam-view-default-cam-settings', JSON.stringify(defaultCameraSettings))
        }

        function setCameraSettings(writeSettings = true) {
            for (const key in cameraSettings) {
                videoTrack.applyConstraints({ [key]: cameraSettings[key] })
            }

            if (writeSettings) {
                localStorage.setItem('cam-view-cam-settings', JSON.stringify(cameraSettings))
            }
        }

        let storedCameraSettings = JSON.parse(localStorage.getItem('cam-view-cam-settings'));
        cameraSettings = storedCameraSettings ?? cameraSettings;
        editor.root.addButton('reset', "Reset").click(() => {
            console.log('resetting camera settings')
            for (const key in defaultCameraSettings) {
                videoTrack.applyConstraints({ [key]: defaultCameraSettings[key] })
                //reload because there's is no apparent way to set the value on the editor
                window.location.reload();
            }
        });

        editor.root.toggleCollapse(true)
    }

    //get aspect ratio
    const aspectRatio = settings.aspectRatio
    let ratio = '16x9'
    if (aspectRatio <= 4 / 3) {
        ratio = '4x3';
    }
    document.querySelector('.ratio').classList.add(`ratio-${ratio}`)


    const storedCodec = localStorage.getItem('cam-view-codec')
    const storedTimeout = localStorage.getItem('cam-view-timeout')  

    window.videoEditor = new Editor("video", "Record Settings", () => {
        return {
            codec: storedCodec ?? 'video/webm;codecs=vp9',
            timeout: storedTimeout ?? 60
        }
    });
    videoEditor.top().right();
    videoEditor.theme("dark");
    videoEditor.root.toggleCollapse(true)

    const codecSelector = videoEditor.root
        .addProperty('codec', 'Output', "select")
        .change(storeCodec);
    supportedCodecs().forEach((item) => {
        codecSelector.addItem(item);
    });

    const timeoutSlider = videoEditor.root.addProperty('timeout', 'timeout (sec)', 'number')
    .change(storeTimeout)
    .min(10)
    .max(600)
    .step(1);

    function storeCodec() {
        localStorage.setItem('cam-view-codec', codecSelector.value)
    }
    
    function storeTimeout() {
        localStorage.setItem('cam-view-timeout', parseInt(timeoutSlider.value))
    }



    function setInfo() {
        const settings = videoTrack.getSettings()
        //get current frame rate
        const frameRate = settings.frameRate


        //get actual size of video
        const domDims = video.getBoundingClientRect()

        const actualSize = Math.min(domDims.width / settings.width, domDims.height / settings.height)

        const perc = (Math.round(actualSize * 10000) * 0.01).toFixed(2) + '%'

        const actualWidth = Math.round(settings.width * actualSize)
        const actualHeight = Math.round(settings.height * actualSize)

        document.querySelector('#videoInfo').innerHTML = `${settings.width}x${settings.height}@${frameRate.toFixed(2)}fps (${perc}: ${actualWidth}x${actualHeight})`
    }

    setInfo()

    document.querySelector('.download').addEventListener('click', () => {
        const a = document.createElement('a')
        a.href = canvas.toDataURL()
        const now = new Date().toLocaleString()
        a.download = `solder-screenshot-${now}.png`
        a.click()
    });

    document.querySelector('.flip-vertical').addEventListener('click', (e) => {
        flipY = !flipY
        e.currentTarget.classList.toggle('active', flipY)
        //canvas.classList.toggle('flipped-vertical', flipY)
        applyCanvasTransforms()
        setState()
    });

    document.querySelector('.flip-horizontal').addEventListener('click', (e) => {
        flipX = !flipX
        e.currentTarget.classList.toggle('active', flipX)
        //canvas.classList.toggle('flipped-horizontal', flipX)
        applyCanvasTransforms()
        setState()
    });

    document.querySelector('.record-video').addEventListener('click', (e) => {
        if (isRecording) {
            endRecording()
            exportVideo()
            
        } else {
            startRecording()
        }
    });


    document.addEventListener('fullscreenchange', (e) => {

        document.querySelector('.toggle-fullscreen').classList.toggle('active', document.fullscreenElement)
        document.querySelector('body').classList.toggle('is-fullscreen', document.fullscreenElement)

        setInfo()
    })

    window.addEventListener('resize', () => {
        setInfo()
    })

    window.addEventListener('pedal:short', function(event) {
        if(isRecording) {
            return document.querySelector('.record-video').click()
        }
        document.querySelector('.download').click()
    });

    window.addEventListener('pedal:long', function(event) {
        document.querySelector('.record-video').click()
    });
    

    document.addEventListener('keydown', (e) => {
        if (e.key === 'f') {
            document.querySelector('.toggle-fullscreen').click()
        }

        if (e.key === 'v') {
            document.querySelector('.flip-vertical').click()
        }

        if (e.key === 'h') {
            document.querySelector('.flip-horizontal').click()
        }

        if (e.key === 'd') {
            document.querySelector('.download').click()
        }

        if (e.key === 'r') {
            document.querySelector('.record-video').click()
        }

    })

    document.querySelector('.toggle-fullscreen').addEventListener('click', (e) => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
        } else {
            document.exitFullscreen()
        }
    })

    const storedState = JSON.parse(localStorage.getItem('cam-view-state') ?? '{}')

    if (storedState.flipY) {
        document.querySelector('.flip-vertical').click()
    }
    if (storedState.flipX) {
        document.querySelector('.flip-horizontal').click()
    }

    applyCanvasTransforms()
}




export function registerSW() {
    if (/localhost|127\.0\.0\.1/.test(new URL(window.location).host)) {
        console.log(`skipping service worker for localhost...`);
        return;
    }

    (async () => {
        if ("serviceWorker" in navigator) {
            try {
                const registration = await navigator.serviceWorker.register("/felix-solder-cam-view/sw.js", {
                    scope: "/felix-solder-cam-view/",
                });
                if (registration.installing) {
                    console.log("Service worker installing");
                } else if (registration.waiting) {
                    console.log("Service worker installed");
                } else if (registration.active) {
                    console.log("Service worker active");
                }
            } catch (error) {
                console.error(`Registration failed with ${error}`);
            }
        }
    })();
}