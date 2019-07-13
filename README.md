# homebridge-camera-rpi
raspberry pi camera plugin for homebridge

Note: An SD card image is available [here](https://github.com/moritzmhmk/buildroot-camera-rpi/releases).

## Prerequisite

* camera module activated (`raspi-config`)
* module `bcm2835-v4l2` loaded (add `bcm2835-v4l2` to `/etc/modules` and reboot)
* ffmpeg installed (`sudo apt install ffmpeg`)

* v4l2loopback installed (`sudo apt install v4l2loopback-dkms`, test with `sudo modprobe v4l2loopback devices=3`)
* create file `/etc/systemd/system/camera-loopback.service`:
```ini
[Unit]
Description=Set up loopback cameras

[Service]
ExecStartPre=/sbin/modprobe v4l2loopback devices=3
ExecStart=/usr/bin/ffmpeg -f video4linux2 -input_format yuv420p -video_size 1280x720 -i /dev/video0 -codec copy -f v4l2 /dev/video1 -codec copy -f v4l2 /dev/video2 -codec copy -f v4l2 /dev/video3
Restart=always
RestartSec=2

[Install]
WantedBy=default.target
```
* activate with `sudo systemctl enable camera-loopback` `sudo systemctl start camera-loopback` 

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

make sure `git` and `node` are installed. (Type ``sudo apt install git`` to install git and read [this](https://gist.github.com/moritzmhmk/2711aad2b2745c7d02f7062fb33ffad5) to install node)

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
  "horizontalFlip": false,
  "debug": false
}
```

Note: `rotate` currently only works for `0` and `180` degrees.
