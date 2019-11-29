//
// momo/html/webrtc.js をほぼそのまま

export type WebRtcCodec = "H264" | "VP8" | "VP9";
const WebRtcCodecs: WebRtcCodec[] = ["H264", "VP8", "VP9"];

export type OnStreamChanged = (mediaStream: MediaStream) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OnError = (error: any) => void;

// iceServer を定義
const iceServers: RTCIceServer[] = [
  {
    urls: "stun:stun.l.google.com:19302"
  }
];

// peer connection の 設定
const peerConnectionConfig: RTCConfiguration = {
  iceServers: iceServers
};

const rtcOfferOptions: RTCOfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

export class WebRtc {
  private codec?: WebRtcCodec;
  private onStreamChanged: OnStreamChanged;
  private onError: OnError;

  private peerConnection: RTCPeerConnection;

  private readonly ws: WebSocket;
  private hasReceivedSdp = false;
  private candidates: RTCIceCandidate[] = [];

  constructor(
    wsUrl: string,
    onStreamChanged: OnStreamChanged,
    onError: OnError,
    codec?: WebRtcCodec
  ) {
    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = (event): void => {
      this.onWsOpen(event);
    };
    this.ws.onerror = (error): void => {
      this.onWsError(error);
      this.onError(error);
    };
    this.ws.onmessage = (event): void => {
      this.onWsMessage(event);
    };
    this.onStreamChanged = onStreamChanged;
    this.onError = onError;
    this.codec = codec;
  }

  // WebSocket Event Handlers

  private onWsError(error: Event): void {
    console.error("ws.onerror() ERROR:", error);
  }

  private onWsOpen(event: Event): void {
    console.log("ws.onopen() event:", event);
    this.connect();
  }

  private onWsMessage(event: MessageEvent): void {
    console.log("ws.onmessage() data:", event.data);
    const message = JSON.parse(event.data);
    switch (message.type) {
      case "offer":
        this.onWsMessageOffer(message);
        break;
      case "answer":
        this.onWsMessageAnswer(message);
        break;
      case "candidate":
        this.onWsMessageCandidate(message);
        break;
      case "close":
        console.log("peer connection is closed ...");
        break;
      default:
        break;
    }
  }

  private sendSdp(sessionDescription: RTCSessionDescription): void {
    console.log("---sending sdp ---");
    const message = JSON.stringify(sessionDescription);
    console.log("sending SDP=" + message);
    this.ws.send(message);
  }

  private async connect(): Promise<void> {
    console.log("connect");
    if (this.peerConnection) {
      console.error("this.peerConnection is already exists");
      return;
    }
    try {
      this.prepareNewConnection();
    } catch (error) {
      console.error("prepareNewConnection() ERROR:", error);
      return;
    }
    try {
      await this.makeOffer();
    } catch (error) {
      console.error("makeOffer() ERROR:", error);
      return;
    }
  }

  private async makeOffer(): Promise<void> {
    console.log("makeOffer");
    const sessionDescription = await this.peerConnection.createOffer(
      rtcOfferOptions
    );
    console.log(
      "createOffer() success in promise, SDP=",
      sessionDescription.sdp
    );
    if (this.codec && WebRtcCodecs.indexOf(this.codec) >= 0) {
      WebRtcCodecs.filter(v => v !== this.codec).forEach(codec => {
        sessionDescription.sdp = WebRtc.removeCodec(
          sessionDescription.sdp,
          codec
        );
      });
    }
    await this.peerConnection.setLocalDescription(sessionDescription);
    console.log("setLocalDescription() success in promise");
    this.sendSdp(this.peerConnection.localDescription);
  }

  private onWsMessageOffer(message): void {
    console.log("Received offer ...");
    const offer = new RTCSessionDescription(message);
    console.log("offer: ", offer);
    // offer sdp を生成する
    if (this.peerConnection) {
      console.error("peerConnection already exists!");
      this.peerConnection.close();
    }
    this.prepareNewConnection();

    this.peerConnection.onnegotiationneeded = async (): Promise<void> => {
      try {
        await this.peerConnection.setRemoteDescription(offer);
        console.log("setRemoteDescription(offer) success in promise");
      } catch (error) {
        console.error("setRemoteDescription(offer) ERROR: ", error);
        return;
      }
      console.log("sending Answer. Creating remote session description...");
      try {
        const sessionDescription = await this.peerConnection.createAnswer();
        console.log("createAnswer() success in promise");
        await this.peerConnection.setLocalDescription(sessionDescription);
        console.log("setLocalDescription() success in promise");
        this.sendSdp(this.peerConnection.localDescription);
        this.drainCandidate();
      } catch (error) {
        console.error("makeAnswer() ERROR:", error);
      }
    };
  }

  private async onWsMessageAnswer(message): Promise<void> {
    console.log("Received answer ...");
    const answer = new RTCSessionDescription(message);
    console.log("answer: ", answer);
    if (!this.peerConnection) {
      console.error("peerConnection DOES NOT exist!");
      return;
    }
    try {
      await this.peerConnection.setRemoteDescription(answer);
      console.log("setRemoteDescription(answer) success in promise");
      this.drainCandidate();
    } catch (error) {
      console.error("setRemoteDescription(answer) ERROR: ", error);
    }
  }

  private onWsMessageCandidate(message): void {
    console.log("Received ICE candidate ...");
    const candidate = new RTCIceCandidate(message.ice);
    console.log("candidate: ", candidate);
    if (this.hasReceivedSdp) {
      this.addIceCandidate(candidate);
    } else {
      this.candidates.push(candidate);
    }
  }

  private drainCandidate(): void {
    this.hasReceivedSdp = true;
    this.candidates.forEach((candidate): void => {
      this.addIceCandidate(candidate);
    });
    this.candidates = [];
  }

  private addIceCandidate(candidate: RTCIceCandidate): void {
    if (this.peerConnection) {
      this.peerConnection.addIceCandidate(candidate);
    } else {
      console.error("PeerConnection does not exist!");
    }
  }

  // Stack Overflow より引用: https://stackoverflow.com/a/52760103
  // https://stackoverflow.com/questions/52738290/how-to-remove-video-codecs-in-webrtc-sdp
  private static removeCodec(orgsdp: string, codec: WebRtcCodec): string {
    const internalFunc = (sdp: string): string => {
      const codecre = new RegExp("(a=rtpmap:(\\d*) " + codec + "/90000\\r\\n)");
      const rtpmaps = sdp.match(codecre);
      if (rtpmaps == null || rtpmaps.length <= 2) {
        return sdp;
      }
      const rtpmap = rtpmaps[2];
      let modsdp = sdp.replace(codecre, "");

      const rtcpre = new RegExp("(a=rtcp-fb:" + rtpmap + ".*\r\n)", "g");
      modsdp = modsdp.replace(rtcpre, "");

      const fmtpre = new RegExp("(a=fmtp:" + rtpmap + ".*\r\n)", "g");
      modsdp = modsdp.replace(fmtpre, "");

      const aptpre = new RegExp("(a=fmtp:(\\d*) apt=" + rtpmap + "\\r\\n)");
      const aptmaps = modsdp.match(aptpre);
      let fmtpmap = "";
      if (aptmaps != null && aptmaps.length >= 3) {
        fmtpmap = aptmaps[2];
        modsdp = modsdp.replace(aptpre, "");

        const rtppre = new RegExp("(a=rtpmap:" + fmtpmap + ".*\r\n)", "g");
        modsdp = modsdp.replace(rtppre, "");
      }

      const videore = /(m=video.*\r\n)/;
      const videolines = modsdp.match(videore);
      if (videolines != null) {
        //If many m=video are found in SDP, this program doesn't work.
        const videoline = videolines[0].substring(0, videolines[0].length - 2);
        const videoelems = videoline.split(" ");
        let modvideoline = videoelems[0];
        videoelems.forEach((videoelem, index) => {
          if (index === 0) return;
          if (videoelem == rtpmap || videoelem == fmtpmap) {
            return;
          }
          modvideoline += " " + videoelem;
        });
        modvideoline += "\r\n";
        modsdp = modsdp.replace(videore, modvideoline);
      }
      return internalFunc(modsdp);
    };
    return internalFunc(orgsdp);
  }

  private static browser(): string {
    const ua = window.navigator.userAgent.toLocaleLowerCase();
    if (ua.indexOf("edge") !== -1) {
      return "edge";
    } else if (ua.indexOf("chrome") !== -1) {
      return "chrome";
    } else if (ua.indexOf("safari") !== -1) {
      return "safari";
    } else if (ua.indexOf("opera") !== -1) {
      return "opera";
    } else if (ua.indexOf("firefox") !== -1) {
      return "firefox";
    }
    return;
  }

  private static isSafari(): boolean {
    return WebRtc.browser() === "safari";
  }

  private createNewConnection(): void {
    console.log("createNewConnection");
    this.peerConnection = new RTCPeerConnection(peerConnectionConfig);
    if (typeof this.peerConnection.ontrack !== "undefined") {
      if (WebRtc.isSafari()) {
        const tracks = [];
        this.peerConnection.ontrack = (event: RTCTrackEvent): void => {
          console.log("-- peer.ontrack()");
          tracks.push(event.track);
          // safari で動作させるために、ontrack が発火するたびに MediaStream を作成する
          this.onStreamChanged(new MediaStream(tracks));
        };
      } else {
        const mediaStream = new MediaStream();
        this.onStreamChanged(mediaStream);
        this.peerConnection.ontrack = (event: RTCTrackEvent): void => {
          console.log("-- peer.ontrack()");
          mediaStream.addTrack(event.track);
        };
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.peerConnection as any).onaddstream = (event): void => {
        console.log("-- peer.onaddstream()");
        this.onStreamChanged(event.stream);
      };
    }
    return;
  }

  private prepareNewConnection(): void {
    console.log("prepareNewConnection");
    this.createNewConnection();
    this.peerConnection.onicecandidate = (
      event: RTCPeerConnectionIceEvent
    ): void => {
      console.log("-- peer.onicecandidate()");
      if (event.candidate) {
        console.log(event.candidate);
        console.log("---sending ICE candidate ---");
        const message = JSON.stringify({
          type: "candidate",
          ice: event.candidate
        });
        console.log("sending candidate=" + message);
        this.ws.send(message);
      } else {
        console.log("empty ice event");
      }
    };

    this.peerConnection.oniceconnectionstatechange = (): void => {
      console.log("-- peer.oniceconnectionstatechange()");
      console.log(
        "ICE connection Status has changed to " +
          this.peerConnection.iceConnectionState
      );
      switch (this.peerConnection.iceConnectionState) {
        case "connected":
          break;
        case "closed":
        case "failed":
        case "disconnected":
          break;
      }
    };
    this.peerConnection.addTransceiver("video", { direction: "recvonly" });
    this.peerConnection.addTransceiver("audio", { direction: "recvonly" });
  }
}
