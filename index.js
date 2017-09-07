var Accessory, hap, UUIDGen

var Camera = require('./Camera')

module.exports = function (homebridge) {
  Accessory = homebridge.platformAccessory
  hap = homebridge.hap
  UUIDGen = homebridge.hap.uuid

  homebridge.registerPlatform('homebridge-camera-rpi', 'rpi-camera', ffmpegPlatform, true)
}

function ffmpegPlatform (log, config, api) {
  this.log = log
  this.config = config || {}

  if (api) {
    this.api = api

    if (api.version < 2.1) { throw new Error('Unexpected API version.') }

    this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this))
  }
}

ffmpegPlatform.prototype.configureAccessory = function (accessory) {}

ffmpegPlatform.prototype.didFinishLaunching = function () {
  if (this.config.cameras) {
    var configuredAccessories = []

    var cameras = this.config.cameras
    cameras.forEach(function (conf) {
      if (!conf.name) { this.log('Missing name parameter.') }

      var uuid = UUIDGen.generate(conf.name)
      var cameraAccessory = new Accessory(conf.name, uuid, hap.Accessory.Categories.CAMERA)
      var cameraSource = new Camera(hap) // TODO pass and use conf
      cameraAccessory.configureCameraSource(cameraSource)
      configuredAccessories.push(cameraAccessory)
    })

    this.api.publishCameraAccessories('rpi-camera', configuredAccessories)
  }
}
