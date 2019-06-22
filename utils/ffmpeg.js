const spawn = require('child_process').spawn

const ffmpeg = (command, log = console.log, debug = false) => {
  if (debug) {
    log('ffmpeg', command)
  }
  let ffmpeg = spawn('ffmpeg', command.split(' '), { env: process.env })
  ffmpeg.stderr.on('data', data => {
    if (debug) {
      log(String(data))
    }
  })
  ffmpeg.on('error', error => {
    if (debug) {
      log('Error:', error.message)
    }
  })
  return ffmpeg
}

module.exports = ffmpeg
