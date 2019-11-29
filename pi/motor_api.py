#!/usr/bin/env python3
#-*-coding:utf-8-*-

from http.server import BaseHTTPRequestHandler, HTTPServer
import signal, os, sys, json
import smbus
import time
from DRV8830 import DRV8830

PORT = 5000

i2c = smbus.SMBus(1)

ch1 = DRV8830(i2c, 0x60)
ch1.clear_fault()
ch1.reset()

ch2 = DRV8830(i2c, 0x65)
ch2.clear_fault()
ch2.reset()

class MotorAPIHandler(BaseHTTPRequestHandler):
    def _set_handlers(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_GET(self):
        self._set_handlers()
        if self.path == '/cmd/forward':
            ch1.reset()
            ch2.forward()
        if self.path == '/cmd/backward':
            ch1.reset()
            ch2.backward()
        if self.path == '/cmd/left':
            ch2.reset()
            ch1.forward()
        if self.path == '/cmd/right':
            ch2.reset()
            ch1.backward()
        if self.path == '/cmd/stop':
            ch1.reset()
            ch2.reset()
        self.wfile.write(json.dumps({"status": "ok"}).encode('utf-8'))

def signal_handler(signum, frame):
    print('Terminating...')
    ch1.clear_fault()
    ch1.reset()
    ch2.clear_fault()
    ch2.reset()
    sys.exit(1)

signal.signal(signal.SIGINT, signal_handler)

httpd = HTTPServer(('', PORT), MotorAPIHandler)
httpd.serve_forever()
