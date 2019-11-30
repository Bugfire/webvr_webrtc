import axios from "axios";
import { WebRtc, WebRtcCodec } from "./webrtc";
import { SimpleScene } from "./webvr";
import { setupButton } from "./webvr_util";

declare let config: {
  codec: WebRtcCodec;
  target: string;
  controller: string;
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

    ["forward", "backward", "right", "left", "stop"].forEach((cmd): void => {
      document.getElementById(cmd).onclick = (): void => {
        axios.get(`${config.controller}/cmd/${cmd}`);
      };
    });
    const label = document.getElementById("info");

    const simpleScene = new SimpleScene();
    document.body.appendChild(simpleScene.domElement);
    setupButton(simpleScene.renderer);

    const setLabelText = (text: string): void => {
      label.style.display = "";
      label.innerText = text;
    };

    const clearLabel = (): void => {
      label.style.display = "none";
    };

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
      setLabelText("Connecting...");
      new WebRtc(
        config.target,
        (mediaStream): void => {
          console.log(mediaStream);
          remoteVideo.pause();
          remoteVideo.srcObject = mediaStream;
          remoteVideo.play();
          simpleScene.setVideo(remoteVideo, config);
          clearLabel();
        },
        error => {
          console.error(error);
          setLabelText("Connection Error");
        },
        config.codec
      );
    };

    simpleScene.domElement.addEventListener("click", onVideoStart);
    simpleScene.domElement.addEventListener("touchend", onVideoStart);
  }
);
