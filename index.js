'use strict'
let Accessory, hap

module.exports = function (homebridge) {
  Accessory = homebridge.platformAccessory
  hap = homebridge.hap
  homebridge.registerPlatform('homebridge-camera-rpi', 'rpi-camera', Platform, true)
}

function Platform (log, config, api) {
  this.CameraAccessory = require('./CameraAccessory')(hap, Accessory, log)
  this.config = config || {}
  this.api = api
  if (!api || api.version < 2.1) { throw new Error('Unexpected API version.') }
  api.on('didFinishLaunching', this.didFinishLaunching.bind(this))
}

Platform.prototype.configureAccessory = function (accessory) {}

Platform.prototype.didFinishLaunching = function () {
  if (!this.config.cameras) return
  const configuredAccessories = this.config.cameras.map(conf => new this.CameraAccessory(conf))
  this.api.publishCameraAccessories('rpi-camera', configuredAccessories)
}
