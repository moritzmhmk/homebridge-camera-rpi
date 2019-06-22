'use strict'
const packageJSON = require('./package.json')
const CameraSource = require('./CameraSource')

module.exports = (hap, Accessory, log) => class CameraAccessory extends Accessory {
  constructor (conf) {
    conf = conf || {}
    const name = conf.name || 'Pi Camera'
    const id = conf.id || name
    const uuid = hap.uuid.generate('homebridge-camera-rpi:' + id)
    super(name, uuid, hap.Accessory.Categories.CAMERA) // hap.Accessory.Categories.CAMERA only required for homebridge - ignored by hap-nodejs (standalone)
    this.getService(hap.Service.AccessoryInformation)
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Raspberry Pi Foundation')
      .setCharacteristic(hap.Characteristic.Model, 'v2.1')
      .setCharacteristic(hap.Characteristic.SerialNumber, '42')
      .setCharacteristic(hap.Characteristic.FirmwareRevision, packageJSON.version)
    this.on('identify', function (paired, callback) { log('**identify**'); callback() })
    const cameraSource = new CameraSource(hap, conf, log)
    this.configureCameraSource(cameraSource)
  }
}
