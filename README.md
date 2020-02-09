# webrtc の画像を webvr で見たり色々する自分用プロジェクト

- Raspberry Pi で撮影した動画を
- Momo で配信したものを
- WebVR で見るためのものです

## Raspberry Pi & Camera

Raspberry Pi Zero W と、[Entaniyaさん](https://products.entaniya.co.jp/ja/products/raspberry-pi/) の VR220 カメラを使っています。

## Momo

[時雨堂さん](https://shiguredo.jp/) の [momo](https://github.com/shiguredo/momo) を使って WebRTC を配信しています。

## WebVR

このプロジェクトのファイルですが、単なる html なので、どこから配信しても構いません。

自分は、webpack-dev-server で動作させていますが、momo の html 以下に置くのが自然だと思います。

## 動作確認

### 通常

- chrome
- safari

### WebVR

- Oculus Quest
- Pixel(chrome://flags で WebVR を on に)

http/ws で動作しました。

### WebXR

は未試験

## TODO

- momo fork、HD系だとカメラの上下が見切れるので 4:3 系で解像度をあげてみたい。
可能なら1:1のモード(エンコード前にclip?)をそのうち試したい。
- momo fork、ws で pi 側に色々送り込んでみたい。
- momo fork、log_level を file sink に適用するや、いなや。
- nginx のリバプロで https/wss (pi 側に音声送り込むには必要そう)
- 右目と左目で2stream送り込んで立体視したい
- ここに書くものでもないが、shutdown/reset button 実装 (LED でコントロール)
- ここに書くものでもないが、audio driver install

## 参考

以下、ほぼそのまま使わせていただいた参照元です

- webrtc.ts [momo の webrtc.js](https://github.com/shiguredo/momo/blob/develop/html/webrtc.js)
- webvr_util.s [WebVR.js](https://raw.githubusercontent.com/mrdoob/three.js/e319f670f4e0230ffe277e790b2840110568cafa/examples/js/vr/WebVR.js)
