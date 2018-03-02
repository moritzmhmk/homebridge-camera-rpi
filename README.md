# homebridge-camera-rpi
raspberry pi camera plugin for homebridge

Note: An SD card image is available [here](https://github.com/moritzmhmk/buildroot-camera-rpi/releases).

## Prerequisite

* camera module activated (`raspi-config`)
* module `bcm2835-v4l2` loaded (`sudo modprobe bcm2835-v4l2`)
* ffmpeg installed (`sudo apt install ffmpeg`)

## Installation (as homebridge plugin)

```bash
npm install -g homebridge-camera-rpi
```

edit ``config.json`` and add platform ``rpi-camera``

```json
{
  ...
  "platforms": [
    ...
    {
      "platform": "rpi-camera",
      "cameras": [{"name": "Pi Camera"}]
    }
  ]
}
```

restart `homebridge`

add extra camera accessory in the home app (the setup code is the same as for homebridge)

## Installation (standalone)

optionally install in `opt`:

```bash
cd /opt
sudo mkdir homebridge-camera-rpi
sudo chown pi homebridge-camera-rpi
```

install:

```bash
git clone https://github.com/moritzmhmk/homebridge-camera-rpi
cd homebridge-camera-rpi
npm install
```

test:

```bash
node standalone.js
```

 optionally create systemd service `/etc/systemd/system/hap-camera-rpi.service`:
 
 ```ini
[Unit]
Description=HAP Camera RPi

[Service]
ExecStart=/usr/local/bin/node /opt/homebridge-camera-rpi/standalone.js -c /etc/homebridge-camera-rpi.conf.json
WorkingDirectory=/opt/homebridge-camera-rpi
Restart=always
RestartSec=10
User=pi

[Install]
WantedBy=multi-user.target
 ```
 
 create config file `/etc/homebridge-camera-rpi.conf.json`:

```json
{
  "name": "Pi Camera",
  "id": "Pi Camera",
  "pincode": "031-45-154",
  "username": "EC:23:3D:D3:CE:CE"
}
```

`id` is used to generate the uuid and defaults to `name` when not defined
 
 enable and start the service:
 
 ```bash
sudo systemctl enable hap-camera-rpi
sudo systemctl start hap-camera-rpi
```

## Options
```json
{
  "name": "Pi Camera",
  "id": "Pi Camera",
  "rotate": 0,
  "verticalFlip": false,
  "horizontalFlip": false
}
```

Note: `rotate` currently only works for `0` and `180` degrees.
