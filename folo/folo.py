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
ch2 = DRV8830(i2c, 0x65)

def reset_motors():
    ch1.clear_fault()
    ch1.reset()
    ch2.clear_fault()
    ch2.reset()

def signal_handler(signum, frame):
    print('Terminating...')
    reset_motors()
    sys.exit(1)

class MotorAPIHandler(BaseHTTPRequestHandler):
    def _set_handlers(self, status):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_GET(self):
        if self.path == '/cmd/forward':
            ch1.reset()
            ch2.forward()
        elif self.path == '/cmd/backward':
            ch1.reset()
            ch2.backward()
        elif self.path == '/cmd/left':
            ch2.reset()
            ch1.forward()
        elif self.path == '/cmd/right':
            ch2.reset()
            ch1.backward()
        elif self.path == '/cmd/stop':
            ch1.reset()
            ch2.reset()
        else:
            self._set_handlers(400)
            self.wfile.write(json.dumps({"status": "error"}).encode("utf-8"))
            return
        self._set_handlers(200)
        self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))

reset_motors()

signal.signal(signal.SIGINT, signal_handler)

httpd = HTTPServer(('', PORT), MotorAPIHandler)
httpd.serve_forever()
