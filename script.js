
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
    if (/localhost/.test(new URL(window.location).host)) {
        console.log(`skipping service worker for localhost...`);
        return;
    }

    (async () => {
        if ("serviceWorker" in navigator) {
            try {
                const registration = await navigator.serviceWorker.register("/chaptertool/sw.js", {
                    scope: "/chaptertool/",
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