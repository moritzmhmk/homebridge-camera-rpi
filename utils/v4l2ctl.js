const spawn = require('child_process').spawn

const setCtrl = (name, value, log = console.log, debug = false) => {
  let v4l2ctlCommand = `--set-ctrl ${name}=${value}`
  if (debug) {
    log('v4l2-ctl', v4l2ctlCommand)
  }
  let v4l2ctl = spawn('v4l2-ctl', v4l2ctlCommand.split(' '), { env: process.env })
  v4l2ctl.on('error', err => {
    log(`Failed to set '${name}' to '${value}'`)
    if (debug) {
      log('Error:', err.message)
    }
  })
  if (debug) {
    v4l2ctl.stderr.on('data', function (data) { log(String(data)) })
  }
  return v4l2ctl
}

module.exports = { setCtrl }
