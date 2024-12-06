```python
"""
@fileoverview Smart Plug Control System
Python script for controlling TP-Link Kasa smart plugs connected to gaming consoles.
Provides command-line interface for power control and status monitoring of
connected devices through local network communication.

@revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Smart plug control implementation
"""

from kasa.iot import IotPlug
import asyncio
import sys
import argparse

# Device configuration constants
# Default IP addresses for connected devices
PS4_PLUG = "192.168.1.144"  # Primary gaming console plug
XBOX_PLUG = None  # Reserved for future Xbox integration

async def get_plug_state(ip: str) -> bool:
    """
    Retrieves the current power state of a smart plug.
    
    @param ip: IP address of the smart plug
    @return: True if plug is on, False if off or error occurs
    """
    try:
        device = IotPlug(ip)
        await device.update()
        return device.is_on
    except Exception as e:
        print(f"Error getting plug state: {str(e)}")
        return False

async def turn_on_plug(ip: str) -> bool:
    """
    Powers on a smart plug if it's currently off.
    
    @param ip: IP address of the smart plug
    @return: True if operation succeeds, False if error occurs
    """
    try:
        device = IotPlug(ip)
        await device.update()
        if not device.is_on:
            await device.turn_on()
        return True
    except Exception as e:
        print(f"Error turning on plug: {str(e)}")
        return False

async def turn_off_plug(ip: str) -> bool:
    """
    Powers off a smart plug if it's currently on.
    
    @param ip: IP address of the smart plug
    @return: True if operation succeeds, False if error occurs
    """
    try:
        device = IotPlug(ip)
        await device.update()
        if device.is_on:
            await device.turn_off()
        return True
    except Exception as e:
        print(f"Error turning off plug: {str(e)}")
        return False

async def control_device(device: str, action: str, ip: str = None) -> None:
    """
    Controls a specific gaming device's power state through its smart plug.
    Handles power on/off operations and status checks with error handling.
    
    @param device: Device identifier ('ps5', 'xbox', 'switch', 'pc')
    @param action: Control action ('on', 'off', 'status')
    @param ip: IP address of the device's smart plug
    """
    if not ip:
        print(f"Error: No IP address provided for device {device}")
        return

    name = device.upper()

    try:
        # Initialize and update device state
        device = IotPlug(ip)
        await device.update()

        # Execute requested action
        if action.lower() == "on":
            if not device.is_on:
                await device.turn_on()
            print(f"{name} turned ON successfully")
        elif action.lower() == "off":
            if device.is_on:
                await device.turn_off()
            print(f"{name} turned OFF successfully")
        elif action.lower() == "status":
            state = device.is_on
            print(f"{name} is currently {'ON' if state else 'OFF'}")
        else:
            print(f"Unknown action: {action}")
    except Exception as e:
        print(f"Error controlling {name} at IP {ip}: {str(e)}")

def main():
    """
    Main entry point for command-line interface.
    Parses command line arguments and executes requested device control operations.
    
    Command format:
    python plug.py <device> <action> --ip <device_ip>
    """
    parser = argparse.ArgumentParser(description='Control PS4 and Xbox power plugs')
    parser.add_argument('device', choices=['ps5', 'xbox', 'switch', 'pc'], 
                       help='Device to control', type=str.lower)
    parser.add_argument('action', choices=['on', 'off', 'status'], 
                       help='Action to perform', type=str.lower)
    parser.add_argument('--ip', help='IP address of the device', required=True)

    args = parser.parse_args()

    # Execute device control in async context
    asyncio.run(control_device(args.device, args.action, args.ip))

if __name__ == "__main__":
    main()
```