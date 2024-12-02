from kasa.iot import IotPlug
import asyncio
import sys
import argparse

# Device configurations
PS4_PLUG = "192.168.1.144"  # Update this if needed
XBOX_PLUG = None  # Add your Xbox plug IP when you have it

async def get_plug_state(ip: str) -> bool:
    """Get the current state of a plug."""
    try:
        device = IotPlug(ip)
        await device.update()
        return device.is_on
    except Exception as e:
        print(f"Error getting plug state: {str(e)}")
        return False

async def turn_on_plug(ip: str) -> bool:
    """Turn on a plug."""
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
    """Turn off a plug."""
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
    """Control a specific device."""
    if not ip:
        print(f"Error: No IP address provided for device {device}")
        return

    name = device.upper()

    try:
        device = IotPlug(ip)
        await device.update()

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
    parser = argparse.ArgumentParser(description='Control PS4 and Xbox power plugs')
    parser.add_argument('device', choices=['ps5', 'xbox', 'switch', 'pc'], help='Device to control', type=str.lower)
    parser.add_argument('action', choices=['on', 'off', 'status'], help='Action to perform', type=str.lower)
    parser.add_argument('--ip', help='IP address of the device', required=True)

    args = parser.parse_args()

    asyncio.run(control_device(args.device, args.action, args.ip))

if __name__ == "__main__":
    main()
