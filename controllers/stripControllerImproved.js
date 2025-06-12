const { getPostData, timer } = require('../utils');
const SPI = require('spi-device');
const color = require('onecolor');

class WS2801Controller {
    constructor(numberOfLeds = 850, spiDevice = '/dev/spidev0.0') {
        this.numberOfLeds = numberOfLeds;
        this.spiDevice = spiDevice;
        this.ledBuffer = Buffer.alloc(numberOfLeds * 3); // 3 bytes por LED (RGB)
        
        // Configuración SPI optimizada para WS2801
        this.spi = SPI.openSync(0, 0, {
            mode: SPI.MODE0,
            chipSelectHigh: false,
            lsbFirst: false,
            bitsPerWord: 8,
            maxSpeedHz: 1000000, // 1MHz - velocidad óptima para WS2801
            setupDelay: 0,
            holdDelay: 0,
            bitOrder: 'msb'
        });

        // Tabla de corrección gamma mejorada
        this.gammaTable = this.generateGammaTable(2.8); // Gamma más apropiado para LEDs
        
        // Inicializar todos los LEDs apagados
        this.clearStrip();
    }

    // Genera tabla de corrección gamma más precisa
    generateGammaTable(gamma = 2.8) {
        const table = new Array(256);
        for (let i = 0; i < 256; i++) {
            table[i] = Math.round(Math.pow(i / 255.0, gamma) * 255.0);
        }
        return table;
    }

    // Aplica corrección gamma a un valor RGB
    applyGamma(value) {
        return this.gammaTable[Math.max(0, Math.min(255, Math.round(value)))];
    }

    // Convierte HSV a RGB con mejor precisión
    hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        
        let r, g, b;
        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }

    // Establece el color de un LED específico
    setPixel(index, r, g, b, brightness = 1.0) {
        if (index < 0 || index >= this.numberOfLeds) {
            console.warn(`Índice LED fuera de rango: ${index}`);
            return;
        }

        // Aplicar brillo antes de la corrección gamma
        r = Math.round(r * brightness);
        g = Math.round(g * brightness);
        b = Math.round(b * brightness);

        // Aplicar corrección gamma
        r = this.applyGamma(r);
        g = this.applyGamma(g);
        b = this.applyGamma(b);

        // WS2801 usa orden RGB
        const bufferIndex = index * 3;
        this.ledBuffer[bufferIndex] = r;
        this.ledBuffer[bufferIndex + 1] = g;
        this.ledBuffer[bufferIndex + 2] = b;
    }

    // Limpia toda la tira LED
    clearStrip() {
        this.ledBuffer.fill(0);
        this.updateStrip();
    }

    // Llena toda la tira con un color
    fillStrip(r, g, b, brightness = 1.0) {
        for (let i = 0; i < this.numberOfLeds; i++) {
            this.setPixel(i, r, g, b, brightness);
        }
    }

    // Actualiza la tira LED enviando datos por SPI
    updateStrip() {
        try {
            // Enviar datos
            this.spi.transferSync([{
                sendBuffer: this.ledBuffer,
                receiveBuffer: Buffer.allocUnsafe(this.ledBuffer.length),
                byteLength: this.ledBuffer.length,
                speedHz: 1000000
            }]);

            // Latch - pausa para que los LEDs procesen los datos
            // WS2801 necesita al menos 500µs de pausa
            const latchBuffer = Buffer.alloc(1);
            latchBuffer[0] = 0x00;
            setTimeout(() => {
                this.spi.transferSync([{
                    sendBuffer: latchBuffer,
                    receiveBuffer: Buffer.allocUnsafe(1),
                    byteLength: 1,
                    speedHz: 1000000
                }]);
            }, 1); // 1ms de pausa es suficiente

        } catch (error) {
            console.error('Error actualizando la tira LED:', error);
        }
    }

    // Cierra la conexión SPI
    close() {
        if (this.spi) {
            this.spi.closeSync();
        }
    }
}

// Instancia global del controlador
const ledController = new WS2801Controller(850);

// Función para limpiar al salir
process.on('SIGINT', () => {
    console.log('Limpiando tira LED...');
    ledController.clearStrip();
    ledController.close();
    process.exit();
});

// @desc    Renderiza un frame individual
// @route   POST /singleFrame
async function singleFrame(req, res) {
    try {
        const body = await getPostData(req);
        const { array: arr } = JSON.parse(body);
        
        // Limpiar buffer
        ledController.ledBuffer.fill(0);
        
        // Establecer colores de cada LED
        arr.forEach(led => {
            const brightness = parseFloat(led.brightness || 100) / 100.0;
            ledController.setPixel(
                parseInt(led.index),
                parseInt(led.r || 0),
                parseInt(led.g || 0),
                parseInt(led.b || 0),
                brightness
            );
        });
        
        // Actualizar tira
        ledController.updateStrip();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
            render: true, 
            ledsUpdated: arr.length,
            timestamp: Date.now()
        }));

    } catch (error) {
        console.error('Error en singleFrame:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
            error: 'Error rendering frame',
            details: error.message 
        }));
    }
}

// @desc    Renderiza un espectáculo completo
// @route   POST /spectacle
async function spectacle(req, res) {
    try {
        const body = await getPostData(req);
        const { array: frames, fps = 30 } = JSON.parse(body);
        const frameDelay = 1000 / fps; // ms por frame
        
        // Responder inmediatamente
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            spectacle: 'started', 
            frames: frames.length,
            fps: fps
        }));

        // Ejecutar espectáculo de manera asíncrona
        for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
            const frame = frames[frameIndex];
            
            // Limpiar buffer
            ledController.ledBuffer.fill(0);
            
            // Establecer colores del frame
            frame.forEach(led => {
                const brightness = parseFloat(led.brightness || 100) / 100.0;
                ledController.setPixel(
                    parseInt(led.index),
                    parseInt(led.r || 0),
                    parseInt(led.g || 0),
                    parseInt(led.b || 0),
                    brightness
                );
            });
            
            // Actualizar tira
            ledController.updateStrip();
            
            console.log(`Frame ${frameIndex + 1}/${frames.length} renderizado`);
            
            // Esperar antes del siguiente frame
            if (frameIndex < frames.length - 1) {
                await timer(frameDelay);
            }
        }
        
        console.log('Espectáculo completado');

    } catch (error) {
        console.error('Error en spectacle:', error);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ 
                error: 'Error rendering spectacle',
                details: error.message 
            }));
        }
    }
}

// @desc    Función de prueba de colores
// @route   POST /testColors
async function testColors(req, res) {
    try {
        console.log('Iniciando test de colores...');
        
        // Test de colores básicos
        const colors = [
            { name: 'Rojo', r: 255, g: 0, b: 0 },
            { name: 'Verde', r: 0, g: 255, b: 0 },
            { name: 'Azul', r: 0, g: 0, b: 255 },
            { name: 'Blanco', r: 255, g: 255, b: 255 },
            { name: 'Amarillo', r: 255, g: 255, b: 0 },
            { name: 'Magenta', r: 255, g: 0, b: 255 },
            { name: 'Cian', r: 0, g: 255, b: 255 }
        ];

        for (const testColor of colors) {
            console.log(`Probando color: ${testColor.name}`);
            ledController.fillStrip(testColor.r, testColor.g, testColor.b, 0.5);
            ledController.updateStrip();
            await timer(1000); // 1 segundo por color
        }

        // Limpiar al final
        ledController.clearStrip();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
            test: 'completed',
            colors: colors.length
        }));

    } catch (error) {
        console.error('Error en test de colores:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
            error: 'Error in color test',
            details: error.message 
        }));
    }
}

module.exports = {
    singleFrame,
    spectacle,
    testColors,
    ledController
};
