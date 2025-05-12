import { FaKey } from '@react-icons/all-files/fa/FaKey'
import { FaVideo } from '@react-icons/all-files/fa/FaVideo'


const DeviceList = ({ devices = [] }) => {
    if (!devices || devices.length === 0) {
        return (
            <div className="mt-4">
                <h4 className="font-medium mb-2">Devices</h4>
                <p className="text-sm text-muted-foreground">No devices connected</p>
            </div>
        )
    }

    return (
        <div className="mt-4">
            <h4 className="font-medium mb-2">Devices ({devices.length})</h4>
            {/* <div className="space-y-2">
                {devices.map((device, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-accent p-2 rounded-md">
                        <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                            <div className="text-sm font-medium">
                                {device.id}
                            </div>
                            <span className="text-xs text-muted-foreground">{device.ip}</span>
                        </div>
                    </div>
                ))}
            </div> */}
        </div>
    )
}

export default DeviceList