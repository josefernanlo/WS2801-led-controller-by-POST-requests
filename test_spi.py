#!/usr/bin/env python3
"""
Script de prueba para SPI y WS2801
Usar para verificar que la conexión SPI funciona correctamente
"""

import spidev
import time
import sys

def test_spi_connection():
    """Prueba básica de conexión SPI"""
    try:
        spi = spidev.SpiDev()
        spi.open(0, 0)  # Bus 0, Device 0
        spi.max_speed_hz = 1000000  # 1MHz
        spi.mode = 0
        
        print("✓ Conexión SPI establecida")
        print(f"  - Velocidad máxima: {spi.max_speed_hz} Hz")
        print(f"  - Modo: {spi.mode}")
        
        # Test básico enviando datos
        test_data = [0xFF, 0x00, 0x00] * 10  # Rojo en 10 LEDs
        spi.xfer2(test_data)
        
        print("✓ Datos enviados correctamente")
        
        spi.close()
        return True
        
    except Exception as e:
        print(f"✗ Error en conexión SPI: {e}")
        return False

def test_led_colors():
    """Prueba de colores básicos"""
    try:
        spi = spidev.SpiDev()
        spi.open(0, 0)
        spi.max_speed_hz = 1000000
        spi.mode = 0
        
        num_leds = 10  # Probar solo 10 LEDs
        
        colors = [
            ("Rojo", [255, 0, 0]),
            ("Verde", [0, 255, 0]),
            ("Azul", [0, 0, 255]),
            ("Blanco", [255, 255, 255]),
            ("Amarillo", [255, 255, 0]),
            ("Magenta", [255, 0, 255]),
            ("Cian", [0, 255, 255])
        ]
        
        for color_name, rgb in colors:
            print(f"Probando {color_name}...")
            
            # Crear buffer para todos los LEDs
            buffer = []
            for i in range(num_leds):
                buffer.extend(rgb)
            
            # Enviar datos
            spi.xfer2(buffer)
            
            # Latch (pausa para que los LEDs procesen)
            time.sleep(0.001)
            spi.xfer2([0x00])
            
            time.sleep(1)  # Mostrar color por 1 segundo
        
        # Apagar todos los LEDs
        print("Apagando LEDs...")
        buffer = [0, 0, 0] * num_leds
        spi.xfer2(buffer)
        time.sleep(0.001)
        spi.xfer2([0x00])
        
        spi.close()
        print("✓ Test de colores completado")
        return True
        
    except Exception as e:
        print(f"✗ Error en test de colores: {e}")
        return False

def test_spi_speeds():
    """Prueba diferentes velocidades SPI"""
    speeds = [500000, 1000000, 2000000, 4000000]  # 0.5, 1, 2, 4 MHz
    
    for speed in speeds:
        try:
            spi = spidev.SpiDev()
            spi.open(0, 0)
            spi.max_speed_hz = speed
            spi.mode = 0
            
            # Test de velocidad enviando datos de prueba
            test_data = [255, 0, 0] * 100  # 100 LEDs rojos
            
            start_time = time.time()
            spi.xfer2(test_data)
            end_time = time.time()
            
            transfer_time = (end_time - start_time) * 1000  # en ms
            
            print(f"✓ Velocidad {speed:,} Hz: {transfer_time:.2f}ms para 300 bytes")
            
            spi.close()
            
        except Exception as e:
            print(f"✗ Error a velocidad {speed:,} Hz: {e}")

def main():
    print("=== Test WS2801 para Raspberry Pi ===\n")
    
    # Verificar que estamos en Raspberry Pi
    try:
        with open('/proc/device-tree/model', 'r') as f:
            model = f.read()
            if 'Raspberry Pi' not in model:
                print("⚠ Advertencia: No se detectó Raspberry Pi")
            else:
                print(f"✓ Detectado: {model.strip()}")
    except:
        print("⚠ No se pudo detectar el modelo del dispositivo")
    
    print("\n1. Probando conexión SPI...")
    if not test_spi_connection():
        print("Error: No se pudo establecer conexión SPI")
        print("Verifica que SPI esté habilitado: sudo raspi-config")
        sys.exit(1)
    
    print("\n2. Probando velocidades SPI...")
    test_spi_speeds()
    
    print("\n3. Probando colores LED...")
    response = input("¿Continuar con test de colores? (y/N): ")
    if response.lower() == 'y':
        test_led_colors()
    
    print("\n=== Test completado ===")

if __name__ == "__main__":
    try:
        import spidev
    except ImportError:
        print("Error: spidev no está instalado")
        print("Instalar con: pip3 install spidev")
        sys.exit(1)
    
    main()
