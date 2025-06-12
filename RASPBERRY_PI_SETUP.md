# Configuración para WS2801 en Raspberry Pi 4

## 1. Configuración del Sistema

### Habilitar SPI
```bash
sudo raspi-config
# Ir a: Interfacing Options -> SPI -> Enable
# O editar directamente:
echo 'dtparam=spi=on' | sudo tee -a /boot/config.txt
```

### Configurar permisos SPI
```bash
sudo usermod -a -G spi $USER
sudo chmod 666 /dev/spidev0.0
sudo chmod 666 /dev/spidev0.1
```

## 2. Conexiones Físicas

### Pines Raspberry Pi 4 a WS2801:
- **3.3V** (Pin 1) -> **VCC** (WS2801)
- **GND** (Pin 6) -> **GND** (WS2801)  
- **SCLK** (Pin 23, GPIO11) -> **CK/CLK** (WS2801)
- **MOSI** (Pin 19, GPIO10) -> **SI/DAT** (WS2801)

### Importante:
- Usa una fuente de alimentación externa de 5V para los LEDs
- Conecta GND de la fuente externa con GND de la Raspberry Pi
- Para 850 LEDs necesitas al menos 45A @ 5V (225W)

## 3. Configuración de Software

### Instalación de dependencias del sistema:
```bash
sudo apt update
sudo apt install -y build-essential python3-dev
sudo apt install -y libi2c-dev
```

### Instalación de Node.js (si no está instalado):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Instalación de paquetes npm:
```bash
npm install
```

## 4. Configuración SPI avanzada

### Archivo /boot/config.txt:
```
# Habilitar SPI
dtparam=spi=on

# Configuración SPI específica para WS2801
dtoverlay=spi0-hw-cs
dtparam=spi0_speed_hz=1000000

# Aumentar memoria GPU (opcional)
gpu_mem=64
```

### Configurar velocidad SPI (opcional):
```bash
# Crear archivo de configuración
sudo nano /etc/modprobe.d/spi-ws2801.conf

# Añadir:
options spi-bcm2835 spi0_max_freq=1000000
```

## 5. Script de arranque automático

### Crear servicio systemd:
```bash
sudo nano /etc/systemd/system/ws2801-controller.service
```

```ini
[Unit]
Description=WS2801 LED Controller
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/WS2801-led-controller-by-POST-requests
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Habilitar servicio
sudo systemctl daemon-reload
sudo systemctl enable ws2801-controller.service
sudo systemctl start ws2801-controller.service
```

## 6. Testing y Troubleshooting

### Test básico de SPI:
```bash
# Verificar dispositivos SPI
ls -la /dev/spi*

# Test de velocidad
sudo chmod +x test_spi.py
python3 test_spi.py
```

### Comandos de prueba:
```bash
# Probar colores básicos
curl -X POST http://localhost:5001/testColors

# Probar un LED individual
curl -X POST http://localhost:5001/singleFrame \
  -H "Content-Type: application/json" \
  -d '{"array":[{"index":0,"r":255,"g":0,"b":0,"brightness":50}]}'
```

### Problemas comunes:

1. **LEDs no se encienden:**
   - Verificar conexiones
   - Verificar fuente de alimentación
   - Comprobar que SPI está habilitado

2. **Colores incorrectos:**
   - Verificar orden RGB vs GRB
   - Ajustar corrección gamma
   - Verificar voltajes

3. **Parpadeo o inestabilidad:**
   - Reducir velocidad SPI
   - Agregar condensadores de desacoplamiento
   - Verificar calidad de cables

4. **Rendimiento lento:**
   - Aumentar velocidad SPI (máximo 2MHz para WS2801)
   - Optimizar buffer de datos
   - Usar hardware SPI en lugar de bit-banging

## 7. Optimizaciones adicionales

### Para mejor rendimiento:
```javascript
// En el código, ajustar estos parámetros:
const SPI_SPEED = 2000000; // 2MHz para mejor rendimiento
const GAMMA_CORRECTION = 2.2; // Ajustar según tu setup
```

### Para mejor calidad de color:
- Calibrar colores individualmente
- Usar temperature de color apropiada
- Implementar dithering para gradientes suaves

## 8. Monitoreo

### Ver logs del servicio:
```bash
sudo journalctl -u ws2801-controller.service -f
```

### Monitor de sistema:
```bash
htop
watch -n 1 'cat /proc/interrupts | grep spi'
```
