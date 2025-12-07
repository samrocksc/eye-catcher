// Configuration constants
const CONFIG = {
  // Colors
  FACE_OUTLINE_COLOR: "rgba(0, 0, 0, 0)",
  EYE_LANDMARK_COLOR: "rgba(0, 0, 0, 0)",
  IRIS_LANDMARK_COLOR: "yellow",
  EYE_CENTER_COLOR: "rgba(0, 0, 0, 0)",
  IRIS_POINT_COLOR: "rgba(0, 0, 0, 0)",
  EYE_BOX_COLOR: "green",

  // Sizes
  FACE_OUTLINE_WIDTH: 1,
  EYE_LANDMARK_WIDTH: 1,
  IRIS_POINT_SIZE: 2, // Reduced from 3
  EYE_CENTER_SIZE: 5,
  EYE_BOX_WIDTH: 1,

  // Eye box configuration
  EYE_BOX_HEIGHT_RATIO: 1 / 3, // Height is 1/3 of width

  // Quadrant configuration
  QUADRANT_COLORS: {
    TOP_LEFT: "rgba(255, 0, 0, 0.3)",
    TOP_RIGHT: "rgba(0, 255, 0, 0.3)",
    BOTTOM_LEFT: "rgba(0, 0, 255, 0.3)",
    BOTTOM_RIGHT: "rgba(255, 255, 0, 0.3)",
    CENTER: "rgba(255, 0, 255, 0.3)",
  },
};

// Global variables
let video = null;
let canvas = null;
let ctx = null;
let faceMesh = null;
let animationFrameId = null;
let isTracking = false;
let modelLoaded = false;

// DOM elements
const statusElement = document.getElementById("status");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const leftEyeElement = document.getElementById("left-eye");
const rightEyeElement = document.getElementById("right-eye");
const gazeDirectionElement = document.getElementById("gaze-direction");
const trackingStatusElement = document.getElementById("tracking-status");

// Key facial landmarks indices for eyes
const LEFT_EYE_INDICES = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
];
const RIGHT_EYE_INDICES = [
  263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388,
  466,
];

// Additional indices for more detailed eye tracking (iris edges)
const LEFT_IRIS_INDICES = [468, 469, 470, 471, 472];
const RIGHT_IRIS_INDICES = [473, 474, 475, 476, 477];

// Alternative iris indices that might be used in different versions
const ALT_LEFT_IRIS_INDICES = [468, 469, 470, 471];
const ALT_RIGHT_IRIS_INDICES = [473, 474, 475, 476];

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function () {
  video = document.getElementById("webcam");
  canvas = document.getElementById("overlay");
  ctx = canvas.getContext("2d");

  // Set up button event listeners
  startBtn.addEventListener("click", startTracking);
  stopBtn.addEventListener("click", stopTracking);

  // Load models
  loadModels();
});

// Load TensorFlow.js and FaceMesh models
async function loadModels() {
  try {
    statusElement.textContent =
      "Loading FaceMesh model... This may take a moment.";

    // Check if the required libraries are loaded
    if (typeof faceLandmarksDetection === "undefined") {
      throw new Error("faceLandmarksDetection library not loaded properly");
    }

    console.log("Loading FaceMesh model with createDetector");
    console.log("SupportedModels:", faceLandmarksDetection.SupportedModels);
    console.log(
      "Available models:",
      Object.keys(faceLandmarksDetection.SupportedModels),
    );

    // Get the correct model name - it might be 'MediaPipeFaceMesh' or 'FaceMesh'
    let modelName = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    if (!modelName) {
      modelName = faceLandmarksDetection.SupportedModels.FaceMesh;
    }

    console.log("Using model:", modelName);

    // Use the createDetector API (available in newer versions)
    // Configure detector with iris detection enabled
    // Trying different configuration options for MediaPipe FaceMesh
    const detectorConfig = {
      runtime: "mediapipe",
      solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh",
      maxFaces: 1,
      enableFaceGeometry: false,
      refineLandmarks: true, // This might be needed for iris detection
      shouldLoadIrisModel: true,
      // predictIris: true,
    };

    console.log("Creating detector with config:", detectorConfig);
    faceMesh = await faceLandmarksDetection.createDetector(
      modelName,
      detectorConfig,
    );
    console.log("Detector created successfully");

    // Log available methods on the faceMesh object
    console.log(
      "Available faceMesh methods:",
      Object.getOwnPropertyNames(Object.getPrototypeOf(faceMesh)),
    );

    console.log("FaceMesh model loaded successfully:", faceMesh);
    modelLoaded = true;
    statusElement.textContent =
      'Models loaded successfully. Click "Start Camera" to begin.';
    startBtn.disabled = false;
  } catch (error) {
    console.error("Error loading models:", error);
    statusElement.textContent = "Error loading models: " + error.message;
  }
}

// Start camera and tracking
async function startTracking() {
  try {
    statusElement.textContent = "Accessing camera...";

    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "Camera access not available. Make sure you are using HTTPS and have granted camera permissions.",
      );
    }

    // Get camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false,
    });

    video.srcObject = stream;
    statusElement.textContent = "Camera started. Waiting for video to load...";

    // Wait for video metadata to load
    await new Promise((resolve) => {
      const onLoadedMetadata = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        resolve();
      };
      video.addEventListener("loadedmetadata", onLoadedMetadata);

      // Timeout after 5 seconds
      setTimeout(() => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        resolve();
      }, 5000);
    });

    statusElement.textContent = "Camera started. Initializing tracking...";

    // Enable/disable buttons
    startBtn.disabled = true;
    stopBtn.disabled = false;

    // Start tracking
    isTracking = true;
    trackingStatusElement.textContent = "Active";
    trackingStatusElement.style.color = "green";

    // Start the detection loop
    detectFaces();
  } catch (error) {
    console.error("Error accessing camera:", error);
    statusElement.textContent = "Error accessing camera: " + error.message;
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

// Stop camera and tracking
function stopTracking() {
  // Stop tracking
  isTracking = false;
  trackingStatusElement.textContent = "Inactive";
  trackingStatusElement.style.color = "red";

  // Stop animation frame
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // Stop camera
  if (video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    video.srcObject = null;
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update UI
  statusElement.textContent = "Camera stopped.";
  startBtn.disabled = false;
  stopBtn.disabled = true;

  // Clear data display
  leftEyeElement.textContent = "Not detected";
  rightEyeElement.textContent = "Not detected";
  gazeDirectionElement.textContent = "Not detected";
}

// Main detection loop
async function detectFaces() {
  if (!isTracking) return;

  try {
    // Check if model is loaded
    if (!modelLoaded || !faceMesh) {
      throw new Error("FaceMesh model not loaded properly");
    }

    // Wait for video to be ready before processing
    if (!video || !video.readyState || video.readyState < 2) {
      // Video not ready yet, skip this frame
      animationFrameId = requestAnimationFrame(detectFaces);
      return;
    }

    // Check that video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      // Video dimensions not valid yet
      animationFrameId = requestAnimationFrame(detectFaces);
      return;
    }

    // Run face mesh detection
    // The newer API uses estimateFaces(input) without additional parameters
    const predictorConfig = {
      predictIris: true,
    };
    const predictions = await faceMesh.estimateFaces(video, predictorConfig);
    console.log("Face detection results:", predictions);

    // Log keypoints information for debugging
    if (predictions.length > 0) {
      const face = predictions[0];
      console.log("Full face data:", face);

      // Deep inspection of face data structure
      console.log("Face data keys:", Object.keys(face));
      if (face.annotations) {
        console.log("Face annotations:", Object.keys(face.annotations));
      }
      if (face.mesh) {
        console.log("Mesh data type:", typeof face.mesh);
        if (Array.isArray(face.mesh)) {
          console.log("Mesh length:", face.mesh.length);
        }
      }
      if (face.scaledMesh) {
        console.log("Scaled mesh data type:", typeof face.scaledMesh);
        if (Array.isArray(face.scaledMesh)) {
          console.log("Scaled mesh length:", face.scaledMesh.length);
        }
      }
      if (face.faceGeometry) {
        console.log("Face geometry available");
      }
      if (face.image) {
        console.log("Image data available");
      }

      if (face.keypoints && face.keypoints.length > 0) {
        console.log("Total keypoints:", face.keypoints.length);

        // Log all named keypoints
        const namedKeypoints = face.keypoints.filter((point) => point.name);
        console.log(
          "Named keypoints:",
          namedKeypoints.map((point) => point.name),
        );

        // Log first few keypoints to understand structure
        console.log("First 10 keypoints:", face.keypoints.slice(0, 10));

        // Log iris-related keypoints specifically
        const irisKeypoints = face.keypoints.filter(
          (point) =>
            point.name &&
            (point.name.includes("Iris") || point.name.includes("iris")),
        );
        if (irisKeypoints.length > 0) {
          console.log("Iris keypoints found:", irisKeypoints);
        } else {
          console.log("No iris keypoints found");
        }

        // Log all unique names
        const allNames = [
          ...new Set(face.keypoints.map((point) => point.name).filter(Boolean)),
        ];
        console.log("All unique keypoint names:", allNames);

        // Check specific iris indices
        checkIndices(face.keypoints, LEFT_IRIS_INDICES, "Left iris");
        checkIndices(face.keypoints, RIGHT_IRIS_INDICES, "Right iris");
        checkIndices(face.keypoints, ALT_LEFT_IRIS_INDICES, "Alt left iris");
        checkIndices(face.keypoints, ALT_RIGHT_IRIS_INDICES, "Alt right iris");

        // Also check if there are points at those indices even without names
        const leftIrisPoints = LEFT_IRIS_INDICES.map((index) =>
          face.keypoints[index] ? { ...face.keypoints[index], index } : null,
        ).filter(Boolean);
        const rightIrisPoints = RIGHT_IRIS_INDICES.map((index) =>
          face.keypoints[index] ? { ...face.keypoints[index], index } : null,
        ).filter(Boolean);

        if (leftIrisPoints.length > 0) {
          console.log("Left iris points found at indices:", leftIrisPoints);
        }
        if (rightIrisPoints.length > 0) {
          console.log("Right iris points found at indices:", rightIrisPoints);
        }
      } else {
        console.log("No keypoints found in face data");
      }
    } else {
      console.log("No faces detected");
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (predictions.length > 0) {
      // Process the first face
      const face = predictions[0];

      // Draw face landmarks
      drawFaceLandmarks(face);

      // Extract eye positions
      const leftEye = getEyePosition(face, LEFT_EYE_INDICES);
      const rightEye = getEyePosition(face, RIGHT_EYE_INDICES);

      // Calculate gaze direction (simplified)
      const gazeDirection = calculateGazeDirection(leftEye, rightEye);

      // Update display
      if (leftEye && rightEye) {
        leftEyeElement.textContent = `X: ${Math.round(leftEye.x)}, Y: ${Math.round(leftEye.y)}`;
        rightEyeElement.textContent = `X: ${Math.round(rightEye.x)}, Y: ${Math.round(rightEye.y)}`;
        gazeDirectionElement.textContent = gazeDirection;
      } else {
        leftEyeElement.textContent = "Not detected";
        rightEyeElement.textContent = "Not detected";
        gazeDirectionElement.textContent = "Not detected";
      }
    } else {
      // No face detected
      leftEyeElement.textContent = "Not detected";
      rightEyeElement.textContent = "Not detected";
      gazeDirectionElement.textContent = "Not detected";
    }
  } catch (error) {
    console.error("Detection error:", error);
    // Only update status for the first error to avoid spam
    if (statusElement.textContent.startsWith("Detection error:") === false) {
      statusElement.textContent = "Detection error: " + error.message;
    }
  }

  // Continue the loop
  if (isTracking) {
    animationFrameId = requestAnimationFrame(detectFaces);
  }
}

// Draw face landmarks on canvas
function drawFaceLandmarks(face) {
  // Draw face outline
  ctx.strokeStyle = CONFIG.FACE_OUTLINE_COLOR;
  ctx.lineWidth = CONFIG.FACE_OUTLINE_WIDTH;

  // Draw eye landmarks - handle both old and new formats
  const landmarks = face.scaledMesh || face.keypoints;
  if (landmarks) {
    drawLandmarks(LEFT_EYE_INDICES, landmarks, CONFIG.EYE_LANDMARK_COLOR);
    drawLandmarks(RIGHT_EYE_INDICES, landmarks, CONFIG.EYE_LANDMARK_COLOR);
  }

  // Draw eye centers
  const leftEye = getEyePosition(face, LEFT_EYE_INDICES);
  const rightEye = getEyePosition(face, RIGHT_EYE_INDICES);

  if (leftEye && rightEye) {
    drawPoint(
      leftEye.x,
      leftEye.y,
      CONFIG.EYE_CENTER_COLOR,
      CONFIG.EYE_CENTER_SIZE,
    );
    drawPoint(
      rightEye.x,
      rightEye.y,
      CONFIG.EYE_CENTER_COLOR,
      CONFIG.EYE_CENTER_SIZE,
    );
  }

  // Draw iris positions if available
  if (face.keypoints && Array.isArray(face.keypoints)) {
    const leftIris = getEyePositionByName(face.keypoints, "leftIris");
    const rightIris = getEyePositionByName(face.keypoints, "rightIris");

    if (leftIris) {
      drawPoint(
        leftIris.x,
        leftIris.y,
        CONFIG.IRIS_POINT_COLOR,
        CONFIG.IRIS_POINT_SIZE,
      );
    }

    if (rightIris) {
      drawPoint(
        rightIris.x,
        rightIris.y,
        CONFIG.IRIS_POINT_COLOR,
        CONFIG.IRIS_POINT_SIZE,
      );
    }

    // Draw iris landmarks
    drawLandmarks(
      LEFT_IRIS_INDICES,
      face.keypoints,
      CONFIG.IRIS_LANDMARK_COLOR,
    );
    drawLandmarks(
      RIGHT_IRIS_INDICES,
      face.keypoints,
      CONFIG.IRIS_LANDMARK_COLOR,
    );
  }

  // Draw eye bounding boxes
  if (landmarks) {
    drawEyeBoundingBox(LEFT_EYE_INDICES, landmarks);
    drawEyeBoundingBox(RIGHT_EYE_INDICES, landmarks);
  }
}

// Draw specific landmarks
function drawLandmarks(indices, landmarks, color) {
  if (!landmarks) return;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    const point = getPointFromLandmarks(landmarks, index);

    if (!point) continue;

    if (i === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }

  // Close the path
  ctx.closePath();
  ctx.stroke();
}

// Draw a point on canvas
function drawPoint(x, y, color, size) {
  // Check if coordinates are valid
  if (typeof x !== "number" || typeof y !== "number") {
    return;
  }

  ctx.beginPath();
  ctx.arc(x, y, size, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Calculate and draw a bounding box around the eye
 * The box is 1/3 the height of its width
 * @param {Array} eyeIndices - Indices of the eye landmarks
 * @param {Array} landmarks - All face landmarks
 */
function drawEyeBoundingBox(eyeIndices, landmarks) {
  if (!landmarks || !eyeIndices || eyeIndices.length === 0) return;

  // Find the boundaries of the eye
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (let i = 0; i < eyeIndices.length; i++) {
    const index = eyeIndices[i];
    const point = getPointFromLandmarks(landmarks, index);

    if (!point) continue;

    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  // Calculate width and height of the eye
  const width = maxX - minX;
  const height = maxY - minY;

  // Create a box that is 1/3 the height of the width
  const boxHeight = width / 3;
  const boxWidth = width;

  // Center the box around the eye
  const boxX = minX;
  const boxY = (minY + maxY) / 2 - boxHeight / 2;

  // Draw the bounding box with 1px green border
  ctx.beginPath();
  ctx.rect(boxX, boxY, boxWidth, boxHeight);
  ctx.strokeStyle = "green";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function getEyePosition(face, eyeIndices) {
  if (!face) {
    return null;
  }

  // Handle the new format with named keypoints first
  if (face.keypoints && Array.isArray(face.keypoints)) {
    // Try to find iris points first (more accurate for eye tracking)
    const leftIris = getEyePositionByName(face.keypoints, "leftIris");
    const rightIris = getEyePositionByName(face.keypoints, "rightIris");

    // If we're looking for left eye and found a left iris point
    if (eyeIndices === LEFT_EYE_INDICES && leftIris) {
      return leftIris;
    }

    // If we're looking for right eye and found a right iris point
    if (eyeIndices === RIGHT_EYE_INDICES && rightIris) {
      return rightIris;
    }

    // Try to calculate eye position from iris indices if available
    if (eyeIndices === LEFT_EYE_INDICES) {
      // First try with named iris points
      let leftIrisPosition = calculateEyeCenterFromIris(
        face.keypoints,
        LEFT_IRIS_INDICES,
      );
      if (leftIrisPosition) {
        return leftIrisPosition;
      }

      // Try alternative iris indices
      leftIrisPosition = calculateEyeCenterFromIris(
        face.keypoints,
        ALT_LEFT_IRIS_INDICES,
      );
      if (leftIrisPosition) {
        return leftIrisPosition;
      }
    }

    if (eyeIndices === RIGHT_EYE_INDICES) {
      // First try with named iris points
      let rightIrisPosition = calculateEyeCenterFromIris(
        face.keypoints,
        RIGHT_IRIS_INDICES,
      );
      if (rightIrisPosition) {
        return rightIrisPosition;
      }

      // Try alternative iris indices
      rightIrisPosition = calculateEyeCenterFromIris(
        face.keypoints,
        ALT_RIGHT_IRIS_INDICES,
      );
      if (rightIrisPosition) {
        return rightIrisPosition;
      }
    }

    // Fall back to named eye points
    const leftEye = getEyePositionByName(face.keypoints, "leftEye");
    const rightEye = getEyePositionByName(face.keypoints, "rightEye");

    // If we're looking for left eye indices and found a named left eye point
    if (eyeIndices === LEFT_EYE_INDICES && leftEye) {
      return leftEye;
    }

    // If we're looking for right eye indices and found a named right eye point
    if (eyeIndices === RIGHT_EYE_INDICES && rightEye) {
      return rightEye;
    }

    // If no named points found, fall back to using indices on the keypoints array
    let xSum = 0;
    let ySum = 0;
    let validPoints = 0;

    for (const index of eyeIndices) {
      if (index < face.keypoints.length) {
        const point = face.keypoints[index];
        if (
          point &&
          typeof point.x !== "undefined" &&
          typeof point.y !== "undefined"
        ) {
          xSum += point.x;
          ySum += point.y;
          validPoints++;
        }
      }
    }

    if (validPoints > 0) {
      return {
        x: xSum / validPoints,
        y: ySum / validPoints,
      };
    }
  }

  // Handle old format with scaledMesh
  if (face.scaledMesh) {
    let xSum = 0;
    let ySum = 0;
    let validPoints = 0;

    for (const index of eyeIndices) {
      const point = face.scaledMesh[index];
      if (point && point.length >= 2) {
        xSum += point[0];
        ySum += point[1];
        validPoints++;
      }
    }

    if (validPoints === 0) {
      return null;
    }

    return {
      x: xSum / validPoints,
      y: ySum / validPoints,
    };
  }

  return null;
}

// Calculate simplified gaze direction
function calculateGazeDirection(leftEye, rightEye) {
  // Simple approximation based on eye positions
  // In a real implementation, you would use more sophisticated methods
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const avgX = (leftEye.x + rightEye.x) / 2;
  const avgY = (leftEye.y + rightEye.y) / 2;

  let direction = "";

  if (Math.abs(avgX - centerX) < 50 && Math.abs(avgY - centerY) < 50) {
    direction = "Center";
  } else if (avgX < centerX - 50 && avgY < centerY - 50) {
    direction = "Top Left";
  } else if (avgX > centerX + 50 && avgY < centerY - 50) {
    direction = "Top Right";
  } else if (avgX < centerX - 50 && avgY > centerY + 50) {
    direction = "Bottom Left";
  } else if (avgX > centerX + 50 && avgY > centerY + 50) {
    direction = "Bottom Right";
  } else if (avgX < centerX - 50) {
    direction = "Left";
  } else if (avgX > centerX + 50) {
    direction = "Right";
  } else if (avgY < centerY - 50) {
    direction = "Top";
  } else if (avgY > centerY + 50) {
    direction = "Bottom";
  } else {
    direction = "Center";
  }

  return direction;
}

// Handle page visibility changes to pause/resume tracking
document.addEventListener("visibilitychange", function () {
  if (document.hidden && isTracking) {
    // Pause tracking when tab is hidden
    cancelAnimationFrame(animationFrameId);
  } else if (!document.hidden && isTracking) {
    // Resume tracking when tab is visible
    detectFaces();
  }
});

// Clean up when page is unloaded
window.addEventListener("beforeunload", function () {
  stopTracking();
});

// Helper function to get point from different landmark formats
function getPointFromLandmarks(landmarks, index) {
  if (!landmarks) return null;

  // Handle array format (old)
  if (Array.isArray(landmarks) && landmarks[index]) {
    const point = landmarks[index];
    if (Array.isArray(point) && point.length >= 2) {
      return { x: point[0], y: point[1] };
    }
  }

  // Handle keypoints format (new) - direct array access
  if (Array.isArray(landmarks) && landmarks[index]) {
    const point = landmarks[index];
    if (
      point &&
      typeof point.x !== "undefined" &&
      typeof point.y !== "undefined"
    ) {
      return { x: point.x, y: point.y };
    }
  }

  return null;
}

// New function to get eye position by name from keypoints
function getEyePositionByName(keypoints, eyeName) {
  if (!keypoints || !Array.isArray(keypoints)) return null;

  // Find the eye point by name
  for (const point of keypoints) {
    if (point.name === eyeName) {
      return { x: point.x, y: point.y };
    }
  }

  return null;
}

// Helper function to calculate eye center from iris landmarks
function calculateEyeCenterFromIris(keypoints, irisIndices) {
  if (!keypoints || !Array.isArray(keypoints) || !irisIndices) return null;

  let xSum = 0;
  let ySum = 0;
  let validPoints = 0;

  for (const index of irisIndices) {
    if (index < keypoints.length) {
      const point = keypoints[index];
      if (
        point &&
        typeof point.x !== "undefined" &&
        typeof point.y !== "undefined"
      ) {
        xSum += point.x;
        ySum += point.y;
        validPoints++;
      }
    }
  }

  if (validPoints === 0) {
    return null;
  }

  return {
    x: xSum / validPoints,
    y: ySum / validPoints,
  };
}

// Function to check if specific indices contain valid data (for debugging)
function checkIndices(keypoints, indices, name) {
  if (!keypoints || !indices) return;

  const points = indices.map((index) => {
    if (index < keypoints.length) {
      const point = keypoints[index];
      return {
        index,
        hasData: !!point,
        hasXY:
          point &&
          typeof point.x !== "undefined" &&
          typeof point.y !== "undefined",
        point: point,
      };
    }
    return { index, hasData: false, hasXY: false };
  });

  console.log(`${name} indices check:`, points);
}
