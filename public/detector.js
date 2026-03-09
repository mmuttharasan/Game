/**
 * detector.js
 * Handles webcam access, TensorFlow.js MoveNet pose detection,
 * and movement analysis between frames.
 */

const Detector = (() => {

  // ── Config ──────────────────────────────────────────────────────────────────
  const KEYPOINT_SCORE_THRESHOLD = 0.3;   // min confidence to use a keypoint
  const CONSECUTIVE_FRAMES_CAUGHT = 3;    // N frames over threshold → caught

  // Keypoint indices used for movement detection (MoveNet layout):
  // 0=nose, 5=l_shoulder, 6=r_shoulder, 7=l_elbow, 8=r_elbow,
  // 9=l_wrist, 10=r_wrist, 11=l_hip, 12=r_hip, 13=l_knee, 14=r_knee
  const TRACKED_KEYPOINTS = [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  // ── State ────────────────────────────────────────────────────────────────────
  let detector     = null;
  let videoEl      = null;
  let canvasEl     = null;
  let ctx          = null;
  let rafId        = null;
  let isWatching   = false;   // true only during RED LIGHT
  let baseline     = null;    // keypoint positions captured at start of RED
  let consecutiveMoving = 0;
  let movementThreshold = 18; // pixels — adjusted by difficulty
  let onMovementCaught  = null;
  let lastPoses    = [];

  // ── Public: Init ─────────────────────────────────────────────────────────────
  async function init(videoElement, canvasElement) {
    videoEl  = videoElement;
    canvasEl = canvasElement;
    ctx      = canvasElement.getContext('2d');

    await loadModel();
    await startCamera();
    startDetectionLoop();
  }

  // ── Load MoveNet Model ────────────────────────────────────────────────────────
  async function loadModel() {
    const model = poseDetection.SupportedModels.MoveNet;
    const config = {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing: true,
    };
    detector = await poseDetection.createDetector(model, config);
    console.log('[Detector] MoveNet model loaded ✓');
  }

  // ── Camera Setup ─────────────────────────────────────────────────────────────
  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    });
    videoEl.srcObject = stream;

    await new Promise(resolve => {
      videoEl.onloadedmetadata = () => {
        videoEl.play();
        // Match canvas to video
        canvasEl.width  = videoEl.videoWidth  || 640;
        canvasEl.height = videoEl.videoHeight || 480;
        resolve();
      };
    });
    console.log('[Detector] Camera started ✓', canvasEl.width, 'x', canvasEl.height);
  }

  function stopCamera() {
    if (videoEl && videoEl.srcObject) {
      videoEl.srcObject.getTracks().forEach(t => t.stop());
      videoEl.srcObject = null;
    }
  }

  // ── Detection Loop ────────────────────────────────────────────────────────────
  function startDetectionLoop() {
    async function loop() {
      if (videoEl.readyState >= 2 && detector) {
        try {
          const poses = await detector.estimatePoses(videoEl, { flipHorizontal: false });
          lastPoses = poses;

          // Resize canvas if needed
          if (canvasEl.width !== videoEl.videoWidth && videoEl.videoWidth > 0) {
            canvasEl.width  = videoEl.videoWidth;
            canvasEl.height = videoEl.videoHeight;
          }

          drawPoses(poses);

          if (isWatching) {
            analyzeMovement(poses);
          }
        } catch (e) {
          console.warn('[Detector] Estimation error:', e);
        }
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  function stopDetectionLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // ── Draw Pose Skeleton ────────────────────────────────────────────────────────
  const SKELETON_EDGES = [
    [0,1],[0,2],[1,3],[2,4],           // face
    [5,6],[5,7],[7,9],[6,8],[8,10],    // arms
    [5,11],[6,12],[11,12],             // torso
    [11,13],[13,15],[12,14],[14,16],   // legs
  ];

  function drawPoses(poses) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    if (!poses || poses.length === 0) return;

    const pose = poses[0];
    const kp   = pose.keypoints;

    // Color depends on watch state
    const lineColor  = isWatching ? 'rgba(255,80,80,0.85)'   : 'rgba(0,230,118,0.85)';
    const dotColor   = isWatching ? 'rgba(255,150,150,1)'    : 'rgba(150,255,200,1)';

    // Draw skeleton edges
    ctx.lineWidth   = 3;
    ctx.strokeStyle = lineColor;
    for (const [a, b] of SKELETON_EDGES) {
      const kpA = kp[a], kpB = kp[b];
      if (kpA.score > KEYPOINT_SCORE_THRESHOLD && kpB.score > KEYPOINT_SCORE_THRESHOLD) {
        ctx.beginPath();
        ctx.moveTo(kpA.x, kpA.y);
        ctx.lineTo(kpB.x, kpB.y);
        ctx.stroke();
      }
    }

    // Draw keypoints
    for (const point of kp) {
      if (point.score > KEYPOINT_SCORE_THRESHOLD) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  // ── Movement Analysis ─────────────────────────────────────────────────────────
  function captureBaseline(poses) {
    if (!poses || poses.length === 0) { baseline = null; return; }
    baseline = extractKeypoints(poses[0]);
    consecutiveMoving = 0;
    console.log('[Detector] Baseline captured');
  }

  function analyzeMovement(poses) {
    if (!baseline || !poses || poses.length === 0) return;

    const current = extractKeypoints(poses[0]);
    const delta   = computeDelta(baseline, current);

    const moving = delta > movementThreshold;

    // Emit movement level for the indicator UI
    if (typeof onMovementLevel === 'function') {
      onMovementLevel(delta, movementThreshold);
    }

    if (moving) {
      consecutiveMoving++;
      if (consecutiveMoving >= CONSECUTIVE_FRAMES_CAUGHT) {
        consecutiveMoving = 0;
        if (typeof onMovementCaught === 'function') {
          onMovementCaught(delta);
        }
      }
    } else {
      consecutiveMoving = Math.max(0, consecutiveMoving - 1);
    }
  }

  function extractKeypoints(pose) {
    return TRACKED_KEYPOINTS.map(i => {
      const kp = pose.keypoints[i];
      return (kp && kp.score > KEYPOINT_SCORE_THRESHOLD)
        ? { x: kp.x, y: kp.y, valid: true }
        : { x: 0, y: 0, valid: false };
    });
  }

  function computeDelta(base, current) {
    let total = 0, count = 0;
    for (let i = 0; i < base.length; i++) {
      if (base[i].valid && current[i].valid) {
        const dx = current[i].x - base[i].x;
        const dy = current[i].y - base[i].y;
        total += Math.sqrt(dx * dx + dy * dy);
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  function startWatching(poses) {
    captureBaseline(poses || lastPoses);
    isWatching = true;
    consecutiveMoving = 0;
  }

  function stopWatching() {
    isWatching = false;
    baseline = null;
    consecutiveMoving = 0;
  }

  function setThreshold(value) {
    movementThreshold = value;
  }

  function setOnCaught(callback) {
    onMovementCaught = callback;
  }

  // Expose movement level updates for live indicator
  let onMovementLevel = null;
  function setOnMovementLevel(callback) {
    onMovementLevel = callback;
  }

  function getLastPoses() { return lastPoses; }

  function destroy() {
    stopDetectionLoop();
    stopCamera();
    if (detector) { detector.dispose && detector.dispose(); detector = null; }
  }

  return {
    init,
    startWatching,
    stopWatching,
    setThreshold,
    setOnCaught,
    setOnMovementLevel,
    getLastPoses,
    destroy,
  };

})();
