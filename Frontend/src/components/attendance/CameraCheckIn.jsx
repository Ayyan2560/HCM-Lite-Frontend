/**
 * CameraCheckIn — face-detection + GPS camera attendance for HCM Lite.
 *
 * What this collects:
 *  - A live camera preview (front-facing). No photo is stored or transmitted.
 *  - The count of faces detected in the current frame (must be exactly 1).
 *  - GPS latitude, longitude and accuracy from the browser Geolocation API.
 *
 * Nothing is uploaded to the server except: { latitude, longitude, accuracy,
 * faceCount: 1, source: 'camera' }. No image data leaves the browser.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X
} from 'lucide-react'

// Lazily load face-api to avoid blocking the initial page render.
let faceApiModule = null
async function loadFaceApi () {
  if (faceApiModule) return faceApiModule
  faceApiModule = await import('@vladmandic/face-api')
  const api = faceApiModule
  // Load only the tiny face detector — fast and small (~190 KB weights).
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
  await api.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
  return api
}

const STATUS = {
  idle: 'idle',
  loadingModel: 'loadingModel',
  requestingCamera: 'requestingCamera',
  detecting: 'detecting',
  ready: 'ready', // exactly 1 face + GPS OK
  submitting: 'submitting',
  success: 'success',
  error: 'error'
}

export default function CameraCheckIn ({
  organization,
  onSuccess,
  onCancel,
  onFallback
}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectLoopRef = useRef(null)

  const [phase, setPhase] = useState(STATUS.idle)
  const [faceCount, setFaceCount] = useState(0)
  const [gps, setGps] = useState(null)
  const [gpsError, setGpsError] = useState('')
  const [message, setMessage] = useState('')
  const [submitError, setSubmitError] = useState('')

  const geofenceEnabled = organization?.geofenceEnabled
  const gpsMandatory = geofenceEnabled

  // ── GPS ──────────────────────────────────────────────────────────────────
  const acquireGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser.')
      return
    }
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords
     if (accuracy > 300) {  
          setGpsError(
            `GPS accuracy ${Math.round(
              accuracy
            )} m is too low (need ≤ 100 m). Move to an open area.`
          )
          setGps(null)
        } else {
          setGps({ latitude, longitude, accuracy: Math.round(accuracy) })
          setGpsError('')
        }
      },
      err => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Allow location access and retry.'
            : 'Could not get your location. Move to an open area and retry.'
        )
        setGps(null)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  // ── Camera + model ────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setPhase(STATUS.loadingModel)
    setMessage('Loading face detection model…')
    setSubmitError('')
    try {
      const api = await loadFaceApi()

      setPhase(STATUS.requestingCamera)
      setMessage('Requesting camera access…')

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await new Promise(resolve => {
          videoRef.current.onloadedmetadata = resolve
        })
        videoRef.current.play()
      }

      setPhase(STATUS.detecting)
      setMessage('')
      acquireGps()

      // Detection loop — runs every 400 ms.
      const opts = new api.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.5
      })
      detectLoopRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return
        try {
          const detections = await api.detectAllFaces(videoRef.current, opts)
          const count = detections.length
          setFaceCount(count)
          if (count === 1) setPhase(STATUS.ready)
          else setPhase(STATUS.detecting)

          // Draw overlay.
          if (canvasRef.current && videoRef.current) {
            const dims = {
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight
            }
            api.matchDimensions(canvasRef.current, dims)
            const resized = api.resizeResults(detections, dims)
            const ctx = canvasRef.current.getContext('2d')
            ctx.clearRect(0, 0, dims.width, dims.height)
            resized.forEach(det => {
              const { x, y, width, height } = det.box
              ctx.strokeStyle = count === 1 ? '#07875d' : '#c4261d'
              ctx.lineWidth = 3
              ctx.strokeRect(x, y, width, height)
            })
          }
        } catch {
          // Detection errors are non-fatal; skip this frame.
        }
      }, 400)
    } catch (err) {
      setPhase(STATUS.error)
      setMessage(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access in your browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera was found on this device.'
          : `Camera error: ${err.message}`
      )
    }
  }, [acquireGps])

  const stopCamera = useCallback(() => {
    clearInterval(detectLoopRef.current)
    detectLoopRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    startCamera()
    return stopCamera
  }, [startCamera, stopCamera])

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (faceCount !== 1) return
    if (gpsMandatory && !gps) {
      setSubmitError(
        'Location is required for camera check-in. Please wait for GPS.'
      )
      return
    }

    setPhase(STATUS.submitting)
    setSubmitError('')
    stopCamera()

    try {
      const payload = {
        source: 'camera',
        faceCount: 1,
        ...(gps || {})
      }
      const result = await onSuccess(payload)
      setPhase(STATUS.success)
      setMessage(
        `Checked in at ${
          result?.checkIn
            ? new Date(result.checkIn).toLocaleTimeString()
            : 'now'
        }.`
      )
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Check-in failed.'
      setSubmitError(msg)
      setPhase(STATUS.detecting)
      startCamera()
    }
  }, [faceCount, gps, gpsMandatory, onSuccess, stopCamera, startCamera])

  // ── Status text ───────────────────────────────────────────────────────────
  const faceMsg =
    phase === STATUS.loadingModel
      ? 'Loading model…'
      : phase === STATUS.requestingCamera
      ? 'Starting camera…'
      : faceCount === 0
      ? 'No face detected — face the camera'
      : faceCount === 1
      ? 'Face detected ✓'
      : `${faceCount} faces detected — only 1 allowed`

  const gpsMsg = gpsError
    ? gpsError
    : gps
    ? `Location ✓ (±${gps.accuracy} m)`
    : 'Getting location…'

  const canSubmit =
    phase === STATUS.ready && (!gpsMandatory || gps) && !gpsError

  if (phase === STATUS.success) {
    return (
      <div className='camera-checkin-success'>
        <CheckCircle2 size={48} color='var(--success)' />
        <p>{message}</p>
        <button className='btn btn-secondary' onClick={onCancel}>
          Close
        </button>
      </div>
    )
  }

  if (phase === STATUS.error) {
    return (
      <div className='camera-checkin-error'>
        <AlertCircle size={32} color='var(--danger)' />
        <p>{message}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            className='btn btn-primary'
            onClick={() => {
              setPhase(STATUS.idle)
              startCamera()
            }}
          >
            Retry
          </button>
          <button className='btn btn-secondary' onClick={onFallback}>
            Use standard check-in
          </button>
          <button className='btn btn-ghost' onClick={onCancel}>
            <X size={15} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='camera-checkin'>
      <div className='camera-checkin-header'>
        <h3>
          <Camera size={18} /> Camera check-in
        </h3>
        <button className='btn-icon' onClick={onCancel} title='Cancel'>
          <X size={18} />
        </button>
      </div>

      <p className='camera-checkin-privacy'>
        <strong>Privacy:</strong> Your live camera feed is processed locally in
        your browser. No photo or video is captured, stored or sent to the
        server — only a face count and your GPS coordinates are transmitted.
      </p>

      <div className='camera-preview-wrap'>
        <video
          ref={videoRef}
          className='camera-preview'
          autoPlay
          muted
          playsInline
          style={{ transform: 'scaleX(-1)' /* mirror for selfie view */ }}
        />
        <canvas
          ref={canvasRef}
          className='camera-overlay'
          style={{ transform: 'scaleX(-1)' }}
        />
      </div>

      <div className='camera-status-row'>
        <div
          className={`camera-status-item ${
            faceCount === 1 ? 'is-ok' : 'is-warn'
          }`}
        >
          {phase === STATUS.loadingModel ||
          phase === STATUS.requestingCamera ? (
            <Loader2 size={14} className='spin' />
          ) : faceCount === 1 ? (
            <CheckCircle2 size={14} />
          ) : (
            <AlertCircle size={14} />
          )}
          {faceMsg}
        </div>
        <div
          className={`camera-status-item ${
            gps && !gpsError ? 'is-ok' : gpsError ? 'is-warn' : ''
          }`}
        >
          <MapPin size={14} />
          {gpsMsg}
        </div>
      </div>

      {submitError && (
        <div className='alert alert-danger' style={{ marginTop: 8 }}>
          <AlertCircle size={14} /> {submitError}
          {submitError.includes('outside') || submitError.includes('m from') ? (
            <button
              className='btn btn-sm btn-secondary'
              style={{ marginLeft: 8 }}
              onClick={onFallback}
            >
              Request HR correction instead
            </button>
          ) : null}
        </div>
      )}

      <div className='camera-checkin-actions'>
        <button
          className='btn btn-in'
          onClick={handleSubmit}
          disabled={!canSubmit || phase === STATUS.submitting}
        >
          {phase === STATUS.submitting ? (
            <>
              <Loader2 size={15} className='spin' /> Checking in…
            </>
          ) : (
            <>
              <Camera size={15} /> Check in with camera
            </>
          )}
        </button>
        <button className='btn btn-secondary' onClick={onFallback}>
          Standard check-in instead
        </button>
      </div>
    </div>
  )
}
