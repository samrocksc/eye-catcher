# Eye Tracking with TensorFlow.js Documentation

## Overview

This project demonstrates how to implement real-time eye tracking in the browser using TensorFlow.js and MediaPipe FaceMesh. Unlike traditional eye tracking solutions that require specialized hardware, this implementation uses only a standard webcam and runs entirely in the browser.

## How It Works

### 1. Technology Stack

- **TensorFlow.js**: Google's JavaScript library for machine learning in the browser
- **MediaPipe FaceMesh**: Pre-trained model for facial landmark detection
- **Web APIs**: getUserMedia for camera access, Canvas for rendering

### 2. Facial Landmark Detection

The MediaPipe FaceMesh model detects 468 facial landmarks in real-time. For eye tracking, we focus on specific landmarks around the eyes:

- **Left Eye Landmarks**: Indices 33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246
- **Right Eye Landmarks**: Indices 263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466

### 3. Eye Position Calculation

Eye positions are calculated by averaging the coordinates of the eye landmark points:

```javascript
function getEyePosition(face, eyeIndices) {
    let xSum = 0;
    let ySum = 0;
    
    for (const index of eyeIndices) {
        const point = face.scaledMesh[index];
        xSum += point[0];
        ySum += point[1];
    }
    
    return {
        x: xSum / eyeIndices.length,
        y: ySum / eyeIndices.length
    };
}
```

## Implementation Details

### 1. Loading the Model

```html
<!-- Load TensorFlow.js -->
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0/dist/tf.min.js"></script>
<!-- Load MediaPipe FaceMesh -->
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559296/face_mesh.min.js"></script>
<!-- Load TensorFlow.js MediaPipe Facemesh -->
<script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/face-landmarks-detection@1.0.2/dist/face-landmarks-detection.min.js"></script>
```

### 2. Model Initialization

```javascript
const faceMesh = await faceLandmarksDetection.load(
    faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
    {
        maxFaces: 1,
        runtime: 'mediapipe',
        solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559296`
    }
);
```

### 3. Real-time Detection Loop

```javascript
async function detectFaces() {
    const predictions = await faceMesh.estimateFaces({
        input: video,
        returnTensors: false,
        flipHorizontal: false,
        predictIrises: true
    });
    
    // Process predictions...
    
    // Continue the loop
    requestAnimationFrame(detectFaces);
}
```

## Key Features

### 1. Real-time Processing
- Processes video frames in real-time using requestAnimationFrame
- Optimized for performance with efficient landmark detection

### 2. Visual Feedback
- Draws eye landmarks on canvas overlay
- Highlights eye centers with colored points
- Provides real-time coordinate display

### 3. Gaze Direction Estimation
- Simplified gaze direction calculation based on eye positions
- Categorizes gaze into 9 directions (Center, Top, Bottom, Left, Right, and corners)

### 4. User Controls
- Start/Stop camera buttons
- Status indicators for tracking state
- Clear error messaging

## Browser Compatibility

This implementation requires:
- Modern browser with WebGL support
- Camera access permission
- HTTPS connection for camera access (in production)

## Performance Considerations

### 1. Model Optimization
- Uses MediaPipe runtime for better performance
- Limits detection to a single face for efficiency

### 2. Frame Rate Management
- Uses requestAnimationFrame for optimal frame timing
- Pauses detection when tab is not visible

### 3. Memory Management
- Properly releases camera resources when stopped
- Cleans up animation frames to prevent memory leaks

## Extending the Implementation

### 1. Improved Gaze Estimation
For more accurate gaze tracking, consider:
- Using iris landmarks for precise gaze direction
- Implementing head pose estimation for normalization
- Calibrating with screen coordinates

### 2. Advanced Features
- Blink detection using eye aspect ratio
- Attention tracking over time
- Integration with web applications for accessibility

### 3. Customization Options
- Adjustable sensitivity settings
- Different visualization styles
- Export functionality for tracking data

## Troubleshooting

### Common Issues

1. **Model Loading Failures**
   - Check internet connection for CDN resources
   - Verify browser compatibility
   - Check console for specific error messages

2. **Camera Access Problems**
   - Ensure HTTPS is used in production
   - Check browser permissions
   - Verify camera is not in use by another application

3. **Performance Issues**
   - Reduce video resolution
   - Limit detection to essential landmarks
   - Optimize rendering code

## Conclusion

This implementation demonstrates the power of running machine learning models directly in the browser. By leveraging TensorFlow.js and MediaPipe FaceMesh, we can create sophisticated eye tracking applications without requiring specialized hardware or server-side processing.

The technology has numerous applications including:
- Accessibility tools for users with motor disabilities
- Attention tracking for educational software
- Gaming interfaces
- Research applications

As browser-based ML continues to evolve, we can expect even more sophisticated capabilities while maintaining the accessibility and privacy benefits of client-side processing.
