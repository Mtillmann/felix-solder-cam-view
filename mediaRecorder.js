let canvas
let recorder
let chunks = []
let mimeType
let downloadTimeoutDuration

let dlTimeout = null

export let isRecording = false

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.querySelector('canvas')
})

// https://stackoverflow.com/a/68236494/8797350
export function supportedCodecs () {
  function getAllSupportedMimeTypes (...mediaTypes) {
    if (!mediaTypes.length) mediaTypes.push('video', 'audio')
    const CONTAINERS = [
      'webm',
      'ogg',
      'mp3',
      'mp4',
      'x-matroska',
      '3gpp',
      '3gpp2',
      '3gp2',
      'quicktime',
      'mpeg',
      'aac',
      'flac',
      'x-flac',
      'wave',
      'wav',
      'x-wav',
      'x-pn-wav',
      'not-supported'
    ]
    const CODECS = [
      'vp9',
      'vp9.0',
      'vp8',
      'vp8.0',
      'avc1',
      'av1',
      'h265',
      'h.265',
      'h264',
      'h.264',
      'opus',
      'vorbis',
      'pcm',
      'aac',
      'mpeg',
      'mp4a',
      'rtx',
      'red',
      'ulpfec',
      'g722',
      'pcmu',
      'pcma',
      'cn',
      'telephone-event',
      'not-supported'
    ]

    return [
      ...new Set(
        CONTAINERS.flatMap(ext =>
          mediaTypes.flatMap(mediaType => [`${mediaType}/${ext}`])
        )
      ),
      ...new Set(
        CONTAINERS.flatMap(ext =>
          CODECS.flatMap(codec =>
            mediaTypes.flatMap(mediaType => [
              // NOTE: 'codecs:' will always be true (false positive)
              `${mediaType}/${ext};codecs=${codec}`
            ])
          )
        )
      ),
      ...new Set(
        CONTAINERS.flatMap(ext =>
          CODECS.flatMap(codec1 =>
            CODECS.flatMap(codec2 =>
              mediaTypes.flatMap(mediaType => [
                `${mediaType}/${ext};codecs="${codec1}, ${codec2}"`
              ])
            )
          )
        )
      )
    ].filter(variation => MediaRecorder.isTypeSupported(variation))
  }

  // To get all mime types, use: getAllSupportedMimeTypes()

  return getAllSupportedMimeTypes('video')
}

export function startRecording () {
  clearTimeout(dlTimeout)
  document.querySelector('.record-video').classList.add('active')
  isRecording = true

  mimeType = localStorage.getItem('cam-view-codec') ?? 'video/mp4'
  downloadTimeoutDuration =
    (parseInt(localStorage.getItem('cam-view-timeout')) || 60) * 1000

  const recordingCtx = canvas.getContext('2d')
  recorder = new MediaRecorder(recordingCtx.canvas.captureStream(30), {
    mimeType
  })
  recorder.addEventListener('dataavailable', saveChunks)
  recorder.start(30)

  dlTimeout = setTimeout(() => {
    endRecording()
    exportVideo()
    alert('Recording has ended automatically due to the timeout')
  }, downloadTimeoutDuration)
}

function saveChunks (evt) {
  if (evt.data.size > 0) {
    chunks.push(evt.data)
  }
}

export function endRecording () {
  document.querySelector('.record-video').classList.remove('active')
  clearTimeout(dlTimeout)
  isRecording = false
  recorder.stop()
}

export function exportVideo () {
  let url = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }))
  let a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  const now = new Date().toLocaleString()

  let extension = mimeType.split(';')[0].split('/')[1]
  if (extension === 'x-matroska') {
    extension = 'mkv'
  }
  if (extension === 'x-mp4') {
    extension = 'mp4'
  }
  if (extension === 'x-3gpp') {
    extension = '3gp'
  }
  if (extension === 'x-quicktime') {
    extension = 'mov'
  }
  if (extension === 'x-wav') {
    extension = 'wav'
  }
  if (extension === 'x-flac') {
    extension = 'flac'
  }

  a.download = `solder-recording-${now}.${extension}`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
}
