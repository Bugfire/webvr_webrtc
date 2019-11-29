// https://raw.githubusercontent.com/mrdoob/three.js/e319f670f4e0230ffe277e790b2840110568cafa/examples/js/vr/WebVR.js

import * as THREE from "three";

function setupButtonAsMessage(
  button: HTMLButtonElement,
  message: string
): void {
  button.style.display = "";
  button.style.cursor = "auto";
  button.style.opacity = "0.5";
  button.textContent = message;
  button.onmouseenter = null;
  button.onmouseleave = null;
  button.onclick = null;
}

function setupButtonWithCallback(
  button: HTMLButtonElement,
  text: string,
  onclick: () => void
): void {
  button.style.display = "";
  button.style.cursor = "pointer";
  button.style.opacity = "0.5";
  button.textContent = text;
  button.onmouseenter = (): void => {
    button.style.opacity = "1.0";
  };
  button.onmouseleave = (): void => {
    button.style.opacity = "0.5";
  };
  button.onclick = (): void => {
    onclick();
  };
}

function showEnterVR(
  renderer: THREE.WebGLRenderer,
  button: HTMLButtonElement,
  device: VRDisplay
): void {
  setupButtonWithCallback(button, "ENTER VR", () => {
    device.isPresenting
      ? device.exitPresent()
      : device.requestPresent([{ source: renderer.domElement }]);
  });
  renderer.vr.setDevice(device);
}

async function setupVR(
  renderer: THREE.WebGLRenderer,
  button: HTMLButtonElement
): Promise<void> {
  window.addEventListener(
    "vrdisplayconnect",
    (event): void => {
      const display = event["display"] as VRDisplay;
      showEnterVR(renderer, button, display);
    },
    false
  );
  window.addEventListener(
    "vrdisplaydisconnect",
    (event): void => {
      console.log(event);
      setupButtonAsMessage(button, "VR NOT FOUND");
      renderer.vr.setDevice(null);
    },
    false
  );
  window.addEventListener(
    "vrdisplaypresentchange",
    (event): void => {
      const display = event["display"] as VRDisplay;
      button.textContent = display.isPresenting ? "EXIT VR" : "ENTER VR";
    },
    false
  );
  window.addEventListener(
    "vrdisplayactivate",
    (event): void => {
      const display = event["display"] as VRDisplay;
      display.requestPresent([{ source: renderer.domElement }]);
    },
    false
  );
  const displays = await navigator.getVRDisplays();
  if (displays.length == 0) {
    setupButtonAsMessage(button, "VR NOT FOUND");
    renderer.vr.setDevice(null);
    return;
  }
  showEnterVR(renderer, button, displays[0]);
}

function setupXR(
  renderer: THREE.WebGLRenderer,
  button: HTMLButtonElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  xr: any
): void {
  setupButtonAsMessage(button, "XR...");

  let currentSession = null;
  xr.addEventListener(
    "devicechange",
    async (): Promise<void> => {
      try {
        if (currentSession !== null) {
          currentSession.end();
          renderer.vr.setDevice(null);
          currentSession = null;
        }

        const device = await xr.requestDevice();
        await device.supportsSession({ exclusive: true });
        renderer.vr.setDevice(device);

        setupButtonWithCallback(button, "ENTER XR", async () => {
          const onSessionEnded = (): void => {
            currentSession.removeEventListener("end", onSessionEnded);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (renderer.vr as any).setSession(null);
            button.textContent = "ENTER XR";
            currentSession = null;
          };
          if (currentSession === null) {
            const session = await device.requestSession({ exclusive: true });
            session.addEventListener("end", onSessionEnded);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (renderer.vr as any).setSession(session);
            button.textContent = "EXIT XR";
            currentSession = session;
          } else {
            currentSession.end();
          }
        });
      } catch (error) {
        console.log(error);
        setupButtonAsMessage(button, "XR NOT FOUND");
        renderer.vr.setDevice(null);
      }
    }
  );
}

export function setupButton(renderer: THREE.WebGLRenderer): HTMLButtonElement {
  const button = document.getElementById("button") as HTMLButtonElement;
  if (navigator["xr"]) {
    setupXR(renderer, button, navigator["xr"]);
  } else if (typeof navigator.getVRDisplays !== "undefined") {
    setupVR(renderer, button);
  } else {
    setupButtonAsMessage(button, "WEBVR NOT SUPPORTED");
  }
  return button;
}
