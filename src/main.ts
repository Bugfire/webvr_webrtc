import { WebRtc, WebRtcCodec } from "./webrtc";
import { SimpleScene } from "./webvr";
import { setupButton } from "./webvr_util";

declare let config: {
  codec: WebRtcCodec;
  target: string;
  xscale: number;
  yscale: number;
  xofs: number;
  yofs: number;
};

let alreadyInitialized = false;

document.addEventListener(
  "DOMContentLoaded",
  async (): Promise<void> => {
    if (alreadyInitialized) {
      return;
    }
    alreadyInitialized = true;

    const remoteVideo = document.getElementById(
      "remote_video"
    ) as HTMLVideoElement;

    document.getElementById("forward").onclick = (): void => {
      console.log("forward");
    };
    document.getElementById("backward").onclick = (): void => {
      console.log("backward");
    };
    document.getElementById("right").onclick = (): void => {
      console.log("right");
    };
    document.getElementById("left").onclick = (): void => {
      console.log("left");
    };
    document.getElementById("stop").onclick = (): void => {
      console.log("stop");
    };
    const label = document.getElementById("info");

    const simpleScene = new SimpleScene();
    document.body.appendChild(simpleScene.domElement);
    setupButton(simpleScene.renderer);

    window.addEventListener(
      "resize",
      () => {
        simpleScene.onWindowResize();
      },
      false
    );

    let videoIsStarted = false;
    const onVideoStart = (): void => {
      if (videoIsStarted) {
        return;
      }
      label.style.display = "none";
      videoIsStarted = true;
      new WebRtc(
        config.target,
        mediaStream => {
          console.log(mediaStream);
          remoteVideo.pause();
          remoteVideo.srcObject = mediaStream;
          remoteVideo.play();
          simpleScene.setVideo(remoteVideo, config);
        },
        error => {
          console.error(error);
        },
        config.codec
      );
    };

    simpleScene.domElement.addEventListener("click", onVideoStart);
    simpleScene.domElement.addEventListener("touchend", onVideoStart);
  }
);
