'use strict'

var ip = require('ip')
var spawn = require('child_process').spawn
var crypto = require('crypto');

module.exports = Camera

function Camera (hap, conf) {
  this.hap = hap
  this.conf = conf
  this.services = []
  this.streamControllers = []

  this.pendingSessions = {}
  this.ongoingSessions = {}

  let options = {
    proxy: false, // Requires RTP/RTCP MUX Proxy
    disable_audio_proxy: false, // If proxy = true, you can opt out audio proxy via this
    srtp: true, // Supports SRTP AES_CM_128_HMAC_SHA1_80 encryption
    video: {
      resolutions: [
        //[1920, 1080, 30], // Width, Height, framerate
        //[1280, 960, 30],
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
  this._v4l2CTLSetCTRL('rotate', this.conf.rotate || 0)
  this._v4l2CTLSetCTRL('vertical_flip', this.conf.verticalFlip ? 1 : 0)
  this._v4l2CTLSetCTRL('horizontal_flip', this.conf.horizontalFlip ? 1 : 0)
  this.createCameraControlService()
  this._createStreamControllers(2, options)
}

Camera.prototype.handleSnapshotRequest = function (request, callback) {
  let ffmpegCommand = `\
-f video4linux2 -input_format mjpeg -video_size ${request.width}x${request.height} -i /dev/video0 \
-vframes 1 -f mjpeg -`
  console.log(ffmpegCommand)
  let ffmpeg = spawn('ffmpeg', ffmpegCommand.split(' '), {env: process.env})
  var imageBuffer = Buffer(0)
  ffmpeg.stdout.on('data', function (data) { imageBuffer = Buffer.concat([imageBuffer, data]) })
  ffmpeg.stderr.on('data', function (data) { console.log('ffmpeg', String(data)) })
  ffmpeg.on('close', function (code) { callback(undefined, imageBuffer) })
}

Camera.prototype.handleCloseConnection = function (connectionID) {
  this.streamControllers.forEach(function (controller) {
    controller.handleCloseConnection(connectionID)
  })
}

Camera.prototype.prepareStream = function (request, callback) {
  // Invoked when iOS device requires stream

  var sessionInfo = {}

  let sessionID = request['sessionID']
  let targetAddress = request['targetAddress']

  sessionInfo['address'] = targetAddress

  var response = {}

  let videoInfo = request['video']
  if (videoInfo) {
    let targetPort = videoInfo['port']
    let srtpKey = videoInfo['srtp_key']
    let srtpSalt = videoInfo['srtp_salt']

    // SSRC is a 32 bit integer that is unique per stream
    let ssrcSource = crypto.randomBytes(4)
    ssrcSource[0] = 0
    let ssrc = ssrcSource.readInt32BE(0, true)

    let videoResp = {
      port: targetPort,
      ssrc: ssrc,
      srtp_key: srtpKey,
      srtp_salt: srtpSalt
    }

    response['video'] = videoResp

    sessionInfo['video_port'] = targetPort
    sessionInfo['video_srtp'] = Buffer.concat([srtpKey, srtpSalt])
    sessionInfo['video_ssrc'] = ssrc
  }

  let audioInfo = request['audio']
  if (audioInfo) {
    let targetPort = audioInfo['port']
    let srtpKey = audioInfo['srtp_key']
    let srtpSalt = audioInfo['srtp_salt']

    // SSRC is a 32 bit integer that is unique per stream
    let ssrcSource = crypto.randomBytes(4)
    ssrcSource[0] = 0
    let ssrc = ssrcSource.readInt32BE(0, true)

    let audioResp = {
      port: targetPort,
      ssrc: ssrc,
      srtp_key: srtpKey,
      srtp_salt: srtpSalt
    }

    response['audio'] = audioResp

    sessionInfo['audio_port'] = targetPort
    sessionInfo['audio_srtp'] = Buffer.concat([srtpKey, srtpSalt])
    sessionInfo['audio_ssrc'] = ssrc
  }

  let currentAddress = ip.address()
  var addressResp = {
    address: currentAddress
  }

  if (ip.isV4Format(currentAddress)) {
    addressResp['type'] = 'v4'
  } else {
    addressResp['type'] = 'v6'
  }

  response['address'] = addressResp
  this.pendingSessions[this.hap.uuid.unparse(sessionID)] = sessionInfo

  callback(response)
}

Camera.prototype.handleStreamRequest = function (request) {
  var sessionID = request['sessionID']
  var requestType = request['type']
  if (!sessionID) return
  let sessionIdentifier = this.hap.uuid.unparse(sessionID)

  if (requestType === 'start' && this.pendingSessions[sessionIdentifier]) {
    var width = 1280
    var height = 720
    var fps = 30
    var bitrate = 300

    if (request['video']) {
      width = request['video']['width']
      height = request['video']['height']
      fps = Math.min(fps, request['video']['fps']) // TODO define max fps
      bitrate = request['video']['max_bit_rate']
    }

    this._v4l2CTLSetCTRL('video_bitrate', `${bitrate}000`)

    let srtp = this.pendingSessions[sessionIdentifier]['video_srtp'].toString('base64')
    let address = this.pendingSessions[sessionIdentifier]['address']
    let port = this.pendingSessions[sessionIdentifier]['video_port']
    let ssrc = this.pendingSessions[sessionIdentifier]['video_ssrc']

    let ffmpegCommand = `\
-f video4linux2 -input_format h264 -video_size ${width}x${height} -framerate ${fps} -i /dev/video0 \
-vcodec copy -an -payload_type 99 -ssrc ${ssrc} -f rtp \
-srtp_out_suite AES_CM_128_HMAC_SHA1_80 -srtp_out_params ${srtp} \
srtp://${address}:${port}?rtcpport=${port}&localrtcpport=${port}&pkt_size=1378`
    console.log(ffmpegCommand)
    let ffmpeg = spawn('ffmpeg', ffmpegCommand.split(' '), {env: process.env})
    ffmpeg.stderr.on('data', function (data) { console.log('ffmpeg', String(data)) })
    this.ongoingSessions[sessionIdentifier] = ffmpeg

    delete this.pendingSessions[sessionIdentifier]
  }
  if (requestType === 'stop' && this.ongoingSessions[sessionIdentifier]) {
    this.ongoingSessions[sessionIdentifier].kill('SIGKILL')
    delete this.ongoingSessions[sessionIdentifier]
  }
}

Camera.prototype.createCameraControlService = function () {
  var controlService = new this.hap.Service.CameraControl()

  // Developer can add control characteristics like rotation, night vision at here.

  this.services.push(controlService)
}

// Private

Camera.prototype._createStreamControllers = function (maxStreams, options) {
  let self = this

  for (var i = 0; i < maxStreams; i++) {
    var streamController = new this.hap.StreamController(i, options, self)

    self.services.push(streamController.service)
    self.streamControllers.push(streamController)
  }
}

Camera.prototype._v4l2CTLSetCTRL = function (name, value) {
  let v4l2ctlCommand = `--set-ctrl ${name}=${value}`
  console.log(v4l2ctlCommand)
  let v4l2ctl = spawn('v4l2-ctl', v4l2ctlCommand.split(' '), {env: process.env})
  v4l2ctl.on('error', function(err) { console.log(`error while setting bitrate: ${err.message}`) })
  v4l2ctl.stderr.on('data', function (data) { console.log('v4l2-ctl', String(data)) })
}
