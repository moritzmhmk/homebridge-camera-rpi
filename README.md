# homebridge-camera-rpi
raspberry pi camera plugin for homebridge

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

## Installation (standalone)

```
git clone https://github.com/moritzmhmk/homebridge-camera-rpi
cd homebridge-camera-rpi
npm install
node standalone.js
```
