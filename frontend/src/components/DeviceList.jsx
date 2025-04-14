import { FaKey } from '@react-icons/all-files/fa/FaKey'
import { FaVideo } from '@react-icons/all-files/fa/FaVideo'


const DeviceList = ({ devices }) => {
    if (!devices || devices.length === 0) {
        return <p className="text-sm text-gray-500">No devices</p>
    }

    return (
        <div>
            <p className="text-sm text-gray-500 mb-2">Devices</p>
            <div className="space-y-2">
                {devices.map(device => (
                    <div key={device.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                            {device.type === 'motion_sensor' ? (
                                <FaVideo className="text-blue-500 mr-2" />
                            ) : (
                                <FaKey className="text-blue-500 mr-2" />
                            )}
                            <div>
                                <p className="font-medium">{device.name}</p>
                                <p className="text-xs text-gray-500">Room {device.room}</p>
                            </div>
                        </div>
                        <span className="text-xs text-gray-500">{device.ip}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default DeviceList