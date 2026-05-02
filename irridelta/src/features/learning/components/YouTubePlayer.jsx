import React, { useEffect, useRef, useState } from "react";

let youtubeApiPromise = null;

function getYouTubeVideoId(youtubeUrl) {
  if (!youtubeUrl) {
    return null;
  }

  try {
    const url = new URL(youtubeUrl);

    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (url.pathname.includes("/embed/")) {
      return url.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
    }

    if (url.pathname.includes("/shorts/")) {
      return url.pathname.split("/shorts/")[1]?.split("/")[0] ?? null;
    }

    return url.searchParams.get("v");
  } catch {
    return null;
  }
}

function loadYouTubeIframeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") {
        previousCallback();
      }

      resolve(window.YT);
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("No se pudo cargar YouTube API."));
      document.body.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

function YouTubePlayer({ youtubeUrl, onComplete, onTrackingReady }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onTrackingReadyRef = useRef(onTrackingReady);
  const [trackingError, setTrackingError] = useState("");

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onTrackingReadyRef.current = onTrackingReady;
  }, [onTrackingReady]);

  useEffect(() => {
    const videoId = getYouTubeVideoId(youtubeUrl);
    let isMounted = true;

    const stopTracking = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const completeVideo = () => {
      if (completedRef.current) {
        return;
      }

      completedRef.current = true;
      onCompleteRef.current?.();
    };

    const checkProgress = () => {
      const player = playerRef.current;

      if (!player?.getDuration || !player?.getCurrentTime) {
        return;
      }

      const duration = Number(player.getDuration());
      const currentTime = Number(player.getCurrentTime());

      if (!Number.isFinite(duration) || duration <= 0) {
        return;
      }

      if (currentTime / duration >= 0.9) {
        completeVideo();
        stopTracking();
      }
    };

    if (!videoId) {
      setTrackingError("No se pudo cargar el video.");
      onTrackingReadyRef.current?.(false);
      return undefined;
    }

    completedRef.current = false;
    setTrackingError("");
    onTrackingReadyRef.current?.(false);

    loadYouTubeIframeApi()
      .then((YT) => {
        if (!isMounted || !containerRef.current) {
          return;
        }

        playerRef.current = new YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              if (isMounted) {
                onTrackingReadyRef.current?.(true);
              }
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                checkProgress();
                stopTracking();
                intervalRef.current = window.setInterval(checkProgress, 1000);
                return;
              }

              if (event.data === YT.PlayerState.ENDED) {
                completeVideo();
              }

              stopTracking();
            },
            onError: () => {
              if (isMounted) {
                setTrackingError("No se pudo reproducir el video embebido.");
                onTrackingReadyRef.current?.(false);
              }
            },
          },
        });
      })
      .catch(() => {
        if (isMounted) {
          setTrackingError("No se pudo cargar el reproductor de YouTube.");
          onTrackingReadyRef.current?.(false);
        }
      });

    return () => {
      isMounted = false;
      stopTracking();
      onTrackingReadyRef.current?.(false);

      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }

      playerRef.current = null;
    };
  }, [youtubeUrl]);

  return (
    <div className="w-full">
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {trackingError && (
        <p className="mt-2 text-sm font-semibold text-red-700">
          {trackingError}
        </p>
      )}
    </div>
  );
}

export default YouTubePlayer;
