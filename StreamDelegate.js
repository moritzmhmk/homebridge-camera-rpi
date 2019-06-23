'use strict'

const ip = require('ip')
const crypto = require('crypto')

const v4l2ctl = require('./utils/v4l2ctl')
const ffmpeg = require('./utils/ffmpeg')

class StreamDelegate {
  constructor (hap, conf, log) {
    this.hap = hap
    this.conf = conf
    this.log = log
    this.debug = conf.debug === true

    this.stream = {}
    this.videoFormat = {
      width: 1280,
      height: 720,
      fps: 30,
      max_bit_rate: 300
    }
    this.audioFormat = {}
  }

  prepareStream (request, callback) {
    let video = getStreamInfo(request['video'])
    let audio = getStreamInfo(request['audio'])
    this.stream = {
      sessionID: request['sessionID'],
      targetAddress: request['targetAddress'],
      video,
      audio
    }
    callback({
      video,
      audio,
      address: getCurrentAddress()
    })
  }

  handleStreamRequest (request) {
    if (!this.stream.sessionID || !this.stream.sessionID.equals(request['sessionID'])) {
      console.error('handleStreamRequest: sessionIDs do not match!', this.stream.sessionID, request.sessionID)
      return
    }
    var requestType = request['type']

    if (requestType === 'start') {
      this.videoFormat = {
        ...this.videoFormat,
        ...request['video']
      }

      v4l2ctl.setCtrl('video_bitrate', `${this.videoFormat.max_bit_rate}000`, this.log, this.debug)

      let width = this.videoFormat.width
      let height = this.videoFormat.height
      let fps = this.videoFormat.fps
      let maxBitRate = this.videoFormat.max_bit_rate

      this.log(`Starting video stream (${width}x${height}, ${fps} fps, ${maxBitRate} kbps)`)

      let ffmpegCommand = `\
-f video4linux2 -input_format h264 -video_size ${width}x${height} -framerate ${fps} -i /dev/video0 \
-vcodec copy -copyts -an \
-payload_type ${this.videoFormat.pt} \
${getFFMPEGsrtpCommand(this.stream.targetAddress, this.stream.video)}`

      this.stream.video.ffmpeg = ffmpeg(ffmpegCommand, this.log, this.debug)
      this.stream.video.ffmpeg.on('close', code => {
        if (!code || code === 255) {
          this.log('Video stream stopped')
        } else {
          this.log(`ffmpeg exited with code ${code}`)
        }
      })
      this.stream.video.ffmpeg.on('error', () => { this.log('Failed to start video stream') })
    }

    if (requestType === 'stop') {
      if (this.stream.audio.ffmpeg) {
        this.stream.audio.ffmpeg.on('close', () => { delete this.stream.audio.ffmpeg })
        this.stream.audio.ffmpeg.kill('SIGKILL')
      }
      if (this.stream.video.ffmpeg) {
        this.stream.video.ffmpeg.on('close', () => { delete this.stream.video.ffmpeg })
        this.stream.video.ffmpeg.kill('SIGKILL')
      }
    }
  }
}

const getStreamInfo = ({ port, srtp_key, srtp_salt }) => ({ // eslint-disable-line camelcase
  port,
  ssrc: generateSSRC(),
  srtp_key,
  srtp_salt
})

const generateSSRC = () => {
  let ssrcSource = crypto.randomBytes(4)
  ssrcSource[0] = 0
  return ssrcSource.readInt32BE(0, true)
}

const getCurrentAddress = () => {
  let address = ip.address()
  return {
    address,
    type: ip.isV4Format(address) ? 'v4' : 'v6'
  }
}

const getFFMPEGsrtpCommand = (targetAddress, streamParams) => {
  return `\
-ssrc ${streamParams.ssrc} \
-f rtp \
-srtp_out_suite AES_CM_128_HMAC_SHA1_80 \
-srtp_out_params ${Buffer.concat([streamParams.srtp_key, streamParams.srtp_salt]).toString('base64')} \
\
srtp://${targetAddress}:${streamParams.port}\
?rtcpport=${streamParams.port}\
&localrtcpport=${streamParams.port}\
&pkt_size=1378`
}

module.exports = StreamDelegate
