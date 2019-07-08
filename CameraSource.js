'use strict'

const v4l2ctl = require('./utils/v4l2ctl')
const ffmpeg = require('./utils/ffmpeg')
const StreamDelegate = require('./StreamDelegate')

class Camera {
  constructor (hap, conf, log) {
    this.hap = hap
    this.conf = conf
    this.log = log
    this.services = []
    this.streamControllers = []
    this.debug = conf.debug === true

    let options = {
      proxy: false, // Requires RTP/RTCP MUX Proxy
      disable_audio_proxy: false, // If proxy = true, you can opt out audio proxy via this
      srtp: true, // Supports SRTP AES_CM_128_HMAC_SHA1_80 encryption
      video: {
        resolutions: [
          // [1920, 1080, 30], // Width, Height, framerate
          // [1280, 960, 30],
          [1280, 720, 30],
          [1024, 768, 30],
          [640, 480, 30],
          [640, 360, 30],
          [480, 360, 30],
          [480, 270, 30],
          [320, 240, 30],
          [320, 240, 15], // Apple Watch requires this configuration
          [320, 180, 30]
        ],
        codec: {
          profiles: [0, 1, 2], // Enum, please refer StreamController.VideoCodecParamProfileIDTypes
          levels: [0, 1, 2] // Enum, please refer StreamController.VideoCodecParamLevelTypes
        }
      },
      audio: {
        comfort_noise: false,
        codecs: [
          {
            type: 'OPUS', // Audio Codec
            samplerate: 24 // 8, 16, 24 KHz
          },
          {
            type: 'AAC-eld',
            samplerate: 16
          }
        ]
      }
    }
    v4l2ctl.setCtrl('rotate', this.conf.rotate || 0, this.log, this.debug)
    v4l2ctl.setCtrl('vertical_flip', this.conf.verticalFlip ? 1 : 0, this.log, this.debug)
    v4l2ctl.setCtrl('horizontal_flip', this.conf.horizontalFlip ? 1 : 0, this.log, this.debug)
    this._createCameraControlService()
    this._createStreamControllers(2, options)
  }

  handleSnapshotRequest (request, callback) {
    let ffmpegCommand = `\
-f video4linux2 -input_format yuv420p -video_size ${request.width}x${request.height} -i /dev/video1 \
-vframes 1 -f mjpeg -`
    let _ffmpeg = ffmpeg(ffmpegCommand, this.log, this.debug)
    let imageBuffer = Buffer.alloc(0)
    _ffmpeg.stdout.on('data', function (data) { imageBuffer = Buffer.concat([imageBuffer, data]) })
    _ffmpeg.on('close', code => {
      if (!code || code === 255) {
        this.log(`Took snapshot at ${request.width}x${request.height}`)
        callback(null, imageBuffer)
      } else {
        this.log(`ffmpeg exited with code ${code}`)
      }
    })
    _ffmpeg.on('error', () => { this.log('Failed to take a snapshot') })
  }

  handleCloseConnection (connectionID) {
    this.streamControllers.forEach(function (controller) {
      controller.handleCloseConnection(connectionID)
    })
  }

  _createCameraControlService () {
    var controlService = new this.hap.Service.CameraControl()

    // Developer can add control characteristics like rotation, night vision at here.

    this.services.push(controlService)
  }

  _createStreamControllers (maxStreams, options) {
    for (var i = 0; i < maxStreams; i++) {
      var streamDelegate = new StreamDelegate(this.hap, this.conf, this.log, `/dev/video${i + 2}`)
      var streamController = new this.hap.StreamController(i, options, streamDelegate)

      this.services.push(streamController.service)
      this.streamControllers.push(streamController)
    }
  }
}

module.exports = Camera
