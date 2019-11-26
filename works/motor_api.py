#!/usr/bin/env python3
#-*-coding:utf-8-*-

from http.server import BaseHTTPRequestHandler, HTTPServer
import signal, os, sys, json
import smbus
import time

PORT = 5000

i2c = smbus.SMBus(1)

# ref. https://strawberry-linux.com/pub/drv8830-manual.pdf

class DRV8830:
  __fault_to_string = {
    0x01: "FAULT", # Something Fault
    0x02: "OCP", # Over Current
    0x04: "UVLO", # Low Voltage
    0x08: "OTS", # Over Heat
    0x10: "ILIMIT", # Limited Current
  }
  __control_reg = 0x00
  __status_reg = 0x01
  __reset_fault_value = 0x80
  __hiz_bit = 0x00
  __forward_bit = 0x01
  __backward_bit = 0x02
  __break_bit = 0x03   

  @staticmethod
  def __v_to_cmd(v):
    # 0x06 = 0.48V, 0x3f = 5.06V
    r = 0x06 + (0x3f - 0x06) * (v - 0.48) / (5.06 - 0.48)
    if r < 0x06:
      return 0x06
    if r > 0x3f:
      return 0x3f
    return int(r)

  def __init__(self, i2c, addr = 0x60, minV = 0.5, maxV = 3.0):
    self.__i2c = i2c
    self.__addr = addr
    self.__minV = minV
    self.__maxV = maxV

  def pow_to_cmd(self, pow = 1):
    if pow < 0:
      pow = 0
    if pow > 1:
      pow = 1
    return DRV8830.__v_to_cmd((self.__maxV - self.__minV) * pow + self.__minV)

  @property
  def addr(self):
    return self.__addr

  @property
  def fault_status(self):
    try:
       return i2c.read_byte_data(self.addr, DRV8830.__status_reg)
    except OSError:
       return 0x100

  @property
  def fault_string(self):
    f = self.fault_status
    if f == 0x100:
      return 'IO Error'
    r = []
    for k in DRV8830.__fault_to_string:
      if (f & k) != 0:
        r.append(DRV8830.__fault_to_string[k])
    return ' '.join(r)

  def clear_fault(self):
    i2c.write_byte_data(self.addr, DRV8830.__status_reg, DRV8830.__reset_fault_value)

  def forward(self, power = 1):
    i2c.write_byte_data(self.addr, DRV8830.__control_reg, (self.pow_to_cmd(power) << 2) | DRV8830.__forward_bit)

  def backward(self, power = 1):
    i2c.write_byte_data(self.addr, DRV8830.__control_reg, (self.pow_to_cmd(power) << 2) | DRV8830.__backward_bit)

  def reset(self):
    i2c.write_byte_data(self.addr, DRV8830.__control_reg, DRV8830.__hiz_bit)

  def stop(self):
    i2c.write_byte_data(self.addr, DRV8830.__control_reg, DRV8830.__break_bit)

  def dump(self):
    print( f'address: {self.addr:#x}' )
    print( f'fault: {self.fault_status:#x} {self.fault_string}' )

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
