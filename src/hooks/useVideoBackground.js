import { useRef, useCallback, useEffect, useState } from "react";

/**
 * useVideoBackground - Processes a camera stream through MediaPipe Selfie Segmentation
 * to apply background blur or virtual background images.
 *
 * @returns {Object} { applyBackground, removeBackground, isProcessing, currentBg }
 */
const useVideoBackground = () => {
    const segmenterRef = useRef(null);
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const animFrameRef = useRef(null);
    const videoElRef = useRef(null);
    const bgImageRef = useRef(null);
    const bgTypeRef = useRef("none"); // 'none' | 'blur' | 'image'
    const processedStreamRef = useRef(null);
    const originalStreamRef = useRef(null);
    const isRunningRef = useRef(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [currentBg, setCurrentBg] = useState("none");

    // Initialize MediaPipe segmenter
    const initSegmenter = useCallback(async () => {
        if (segmenterRef.current) return segmenterRef.current;

        const SelfieSegmentation = window.SelfieSegmentation;
        if (!SelfieSegmentation) {
            console.error("MediaPipe SelfieSegmentation not loaded. Check CDN script in index.html");
            return null;
        }

        const segmenter = new SelfieSegmentation({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${file}`,
        });

        segmenter.setOptions({
            modelSelection: 1, // 1 = landscape model (faster, good quality)
            selfieMode: true,
        });

        await segmenter.initialize();
        segmenterRef.current = segmenter;
        return segmenter;
    }, []);

    // Load a background image
    const loadBgImage = useCallback((url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }, []);

    // Process frame with segmentation
    const processFrame = useCallback(async () => {
        if (!isRunningRef.current || !videoElRef.current || !segmenterRef.current) return;
        if (videoElRef.current.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(processFrame);
            return;
        }

        try {
            await segmenterRef.current.send({ image: videoElRef.current });
        } catch (e) {
            // Silently retry
        }

        animFrameRef.current = requestAnimationFrame(processFrame);
    }, []);

    /**
     * Apply a background effect to a video stream.
     * @param {MediaStream} stream - The raw camera stream
     * @param {string} bgType - 'none' | 'blur' | image URL
     * @returns {MediaStream} - The processed stream (or original if 'none')
     */
    const applyBackground = useCallback(
        async (stream, bgType) => {
            if (!stream) return stream;

            // If 'none', return original stream
            if (bgType === "none") {
                removeBackground();
                setCurrentBg("none");
                return stream;
            }

            setIsProcessing(true);
            originalStreamRef.current = stream;

            try {
                const segmenter = await initSegmenter();
                if (!segmenter) {
                    setIsProcessing(false);
                    return stream;
                }

                // Setup hidden video element to feed to MediaPipe
                if (!videoElRef.current) {
                    const video = document.createElement("video");
                    video.setAttribute("playsinline", "");
                    video.setAttribute("autoplay", "");
                    video.muted = true;
                    video.style.display = "none";
                    document.body.appendChild(video);
                    videoElRef.current = video;
                }

                videoElRef.current.srcObject = stream;
                await videoElRef.current.play();

                const vw = videoElRef.current.videoWidth || 640;
                const vh = videoElRef.current.videoHeight || 480;

                // Setup canvas
                if (!canvasRef.current) {
                    canvasRef.current = document.createElement("canvas");
                }
                canvasRef.current.width = vw;
                canvasRef.current.height = vh;
                ctxRef.current = canvasRef.current.getContext("2d", { willReadFrequently: true });

                // Load background image if needed
                if (bgType !== "blur") {
                    try {
                        bgImageRef.current = await loadBgImage(bgType);
                    } catch {
                        bgImageRef.current = null;
                    }
                    bgTypeRef.current = "image";
                } else {
                    bgTypeRef.current = "blur";
                    bgImageRef.current = null;
                }

                // Set segmenter results callback
                segmenter.onResults((results) => {
                    const ctx = ctxRef.current;
                    const canvas = canvasRef.current;
                    if (!ctx || !canvas) return;

                    ctx.save();
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Draw the segmentation mask
                    ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

                    // Where mask is opaque (person), keep original
                    ctx.globalCompositeOperation = "source-in";
                    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

                    // Where mask is transparent (background), draw bg
                    ctx.globalCompositeOperation = "destination-over";

                    if (bgTypeRef.current === "blur") {
                        // Draw blurred camera for background
                        ctx.filter = "blur(12px)";
                        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
                        ctx.filter = "none";
                    } else if (bgImageRef.current) {
                        // Draw virtual background image
                        const img = bgImageRef.current;
                        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                        const x = (canvas.width - img.width * scale) / 2;
                        const y = (canvas.height - img.height * scale) / 2;
                        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                    }

                    ctx.restore();
                });

                // Start processing loop
                isRunningRef.current = true;
                processFrame();

                // Capture the canvas as a stream
                const canvasStream = canvasRef.current.captureStream(30);

                // Preserve original audio tracks
                const audioTracks = stream.getAudioTracks();
                audioTracks.forEach((track) => canvasStream.addTrack(track));

                processedStreamRef.current = canvasStream;
                setCurrentBg(bgType);
                setIsProcessing(false);

                return canvasStream;
            } catch (err) {
                console.error("Error applying background:", err);
                setIsProcessing(false);
                return stream;
            }
        },
        [initSegmenter, loadBgImage, processFrame]
    );

    // Remove background effect, cleanup
    const removeBackground = useCallback(() => {
        isRunningRef.current = false;

        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        setCurrentBg("none");
        bgTypeRef.current = "none";
        bgImageRef.current = null;
        processedStreamRef.current = null;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            removeBackground();
            if (videoElRef.current) {
                videoElRef.current.srcObject = null;
                videoElRef.current.remove();
                videoElRef.current = null;
            }
            segmenterRef.current = null;
        };
    }, [removeBackground]);

    return {
        applyBackground,
        removeBackground,
        isProcessing,
        currentBg,
        processedStreamRef,
        originalStreamRef,
    };
};

export default useVideoBackground;
