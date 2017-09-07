var hap = require('hap-nodejs')
var Camera = require('./Camera')

console.log('HAP-NodeJS starting...')

hap.init()

var cameraAccessory = new hap.Accessory('Node Camera foobar', hap.uuid.generate('Node Camera foobar'))

var cameraSource = new Camera(hap)

cameraAccessory.configureCameraSource(cameraSource)

cameraAccessory.on('identify', function (paired, callback) {
  console.log('Node Camera identify')
  callback()
})

cameraAccessory.publish({
  username: 'EC:23:3D:D3:CE:CE',
  pincode: '031-45-154',
  category: hap.Accessory.Categories.CAMERA
}, true)
