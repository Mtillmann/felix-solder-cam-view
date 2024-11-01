export default function () {
  const sequence = ['shift', 'hyper', 'f12']
  let currentSequence = []
  let pressStartTime = null
  const longPressThreshold = 1000 // 1 second
  let sequenceMatched = false

  function handleKeyDown (event) {
    if (sequenceMatched) {
      return
    }
    const key = event.key.toLowerCase()
    currentSequence.push(key)

    if (currentSequence.length > sequence.length) {
      currentSequence.shift()
    }

    if (currentSequence.join(',') === sequence.join(',')) {
      if (!pressStartTime) {
        pressStartTime = Date.now()
        sequenceMatched = true
      }
    }
  }

  function handleKeyUp (event) {
    const key = event.key.toLowerCase()
    if (sequenceMatched && currentSequence.join(',') === sequence.join(',')) {
      const pressDuration = Date.now() - pressStartTime
      if (pressDuration >= longPressThreshold) {
        window.dispatchEvent(
          new CustomEvent('pedal:long', { detail: { key: key } })
        )
      } else {
        window.dispatchEvent(
          new CustomEvent('pedal:short', { detail: { key: key } })
        )
      }
      currentSequence = []
      pressStartTime = null
      sequenceMatched = false
    } else if (sequence.includes(key)) {
      currentSequence = []
      pressStartTime = null
      sequenceMatched = false
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  console.log('Pedal events initialized')
}
