let canvas;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.querySelector('canvas');
});

/** RECORDING & MUXING STUFF */

let muxer = null;
let videoEncoder = null;
let startTime = null;
let recording = false;
let intervalId = null;
let lastKeyFrame = null;
let framesGenerated = 0;

const startRecording = async () => {
    // Check for VideoEncoder availability
    if (typeof VideoEncoder === 'undefined') {
        alert("Looks like your user agent doesn't support VideoEncoder / WebCodecs API yet.");
        return;
    }

    // Create an MP4 muxer with a video track and maybe an audio track
    muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),

        video: {
            codec: 'avc',
            width: canvas.width,
            height: canvas.height
        },
        audio: undefined,

        // Puts metadata to the start of the file. Since we're using ArrayBufferTarget anyway, this makes no difference
        // to memory footprint.
        fastStart: 'in-memory',

        // Because we're directly pumping a MediaStreamTrack's data into it, which doesn't start at timestamp = 0
        firstTimestampBehavior: 'offset'
    });

    videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: e => console.error(e)
    });
    videoEncoder.configure({
        codec: 'avc1.42001f',
        width: canvas.width,
        height: canvas.height,
        bitrate: 1e6
    });

    startTime = document.timeline.currentTime;
    recording = true;
    lastKeyFrame = -Infinity;
    framesGenerated = 0;

    encodeVideoFrame();
    intervalId = setInterval(encodeVideoFrame, 1000 / 30);
};

const encodeVideoFrame = () => {
    let elapsedTime = document.timeline.currentTime - startTime;
    let frame = new VideoFrame(canvas, {
        timestamp: framesGenerated * 1e6 / 30, // Ensure equally-spaced frames every 1/30th of a second
        duration: 1e6 / 30
    });
    framesGenerated++;

    // Ensure a video key frame at least every 5 seconds for good scrubbing
    let needsKeyFrame = elapsedTime - lastKeyFrame >= 5000;
    if (needsKeyFrame) lastKeyFrame = elapsedTime;

    videoEncoder.encode(frame, { keyFrame: needsKeyFrame });
    frame.close();
    /*
        recordingStatus.textContent =
            `${elapsedTime % 1000 < 500 ? '🔴' : '⚫'} Recording - ${(elapsedTime / 1000).toFixed(1)} s`;
            */
};

const endRecording = async () => {
    recording = false;

    clearInterval(intervalId);

    await videoEncoder?.flush();
    muxer.finalize();

    let buffer = muxer.target.buffer;
    downloadBlob(new Blob([buffer]));

    videoEncoder = null;
    muxer = null;
    startTime = null;

};

const downloadBlob = (blob) => {
    let url = window.URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'davinci.mp4';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
};

//export const start = startRecording;

export {
    startRecording,
    endRecording,
    downloadBlob
};

