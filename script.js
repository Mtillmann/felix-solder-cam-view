
function setState() {
    const data = JSON.stringify({
        flipY,
        flipX
    })

    localStorage.setItem('cam-view-state', data)
}



export async function camView() {

    let flipY = false;
    let flipX = false;


    document.documentElement.setAttribute('data-bs-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

    const video = document.querySelector('video')
    const canvas = document.querySelector('canvas')
    const button = document.querySelector('button')

    const constraints = {
        video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60 },
        }
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    video.srcObject = stream;
    await video.play()

    //get current video resolution
    const videoTrack = stream.getVideoTracks()[0]
    const settings = videoTrack.getSettings()


    //get all camera capabilities
    const capabilities = videoTrack.getCapabilities()

    //get all current camera settings
    let cameraSettings = Object.entries(videoTrack.getSettings()).reduce((acc, [key, value]) => {

        if (['resizeMode', 'frameRate', 'aspectRatio', 'width', 'height', 'deviceId', 'groupId'].includes(key)) {
            console.log('skipping', key)
            return acc
        }

        if (!capabilities[key]) {
            console.log('no capability for', key)
            return acc
        }

        acc[key] = value
        return acc
    }, {});

    const editor = new Editor("sample", "Cam Settings", () => cameraSettings);
    editor.top().left();
    editor.theme("neu-dark");
    

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

    //get aspect ratio
    const aspectRatio = settings.aspectRatio
    let ratio = '16x9'
    if (aspectRatio <= 4 / 3) {
        ratio = '4x3';
    }
    document.querySelector('.ratio').classList.add(`ratio-${ratio}`)

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

    editor.root.addButton('reset', "Reset").click(() => {
        console.log('resetting camera settings')
        for (const key in defaultCameraSettings) {
            videoTrack.applyConstraints({ [key]: defaultCameraSettings[key] })
            //reload because there's is no apparent way to set the value on the editor
            window.location.reload();
        }
    });
    setInfo()

    document.querySelector('.download').addEventListener('click', () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        ctx.translate(canvas.width / 2, canvas.height / 2)
        if (flipY) {
            ctx.scale(-1, 1)
        }
        if (flipX) {
            ctx.scale(1, -1)
        }
        ctx.translate(-canvas.width / 2, -canvas.height / 2)
        ctx.drawImage(video, 0, 0)


        const a = document.createElement('a')
        a.href = canvas.toDataURL()
        const now = new Date().toLocaleString()
        a.download = `solder-screenshot-${now}.png`
        a.click()
    });

    document.querySelector('.flip-vertical').addEventListener('click', (e) => {
        flipY = !flipY
        e.currentTarget.classList.toggle('active', flipY)
        video.classList.toggle('flipped-vertical', flipY)
        setState()
    });

    document.querySelector('.flip-horizontal').addEventListener('click', (e) => {
        flipX = !flipX
        e.currentTarget.classList.toggle('active', flipX)
        video.classList.toggle('flipped-horizontal', flipX)
        setState()
    });

    document.addEventListener('fullscreenchange', (e) => {

        document.querySelector('.toggle-fullscreen').classList.toggle('active', document.fullscreenElement)
        document.querySelector('body').classList.toggle('is-fullscreen', document.fullscreenElement)

        setInfo()
    })

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