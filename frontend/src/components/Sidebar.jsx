import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaChartPie } from '@react-icons/all-files/fa/FaChartPie'
import { FaHome } from '@react-icons/all-files/fa/FaHome'
import { FaCog } from '@react-icons/all-files/fa/FaCog'
import { FaSignOutAlt } from '@react-icons/all-files/fa/FaSignOutAlt'
import { FaServer } from '@react-icons/all-files/fa/FaServer'
import { FaPlus } from '@react-icons/all-files/fa/FaPlus'
import { FaChevronDown } from '@react-icons/all-files/fa/FaChevronDown'
import { FaChevronUp } from '@react-icons/all-files/fa/FaChevronUp'
import { useAuth } from '../context/AuthContext'
import { ScrollArea } from './ui/scroll-area'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Button } from './ui/button'
// Import logo
import hiveiotLogo from '../visual/hiveiot.svg'

const Sidebar = ({ simulators = [] }) => {
    const [active, setActive] = useState('dashboard')
    const [showSimulators, setShowSimulators] = useState(true)
    const { logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout();
        navigate('/login');
    }

    return (
        <div className="h-screen w-64 bg-primary flex flex-col overflow-hidden border-r border-primary/20">
            {/* Logo and app name */}
            <div className="flex items-center justify-center p-4 h-16 border-b border-primary/20">
                <div className="flex flex-col items-center">
                    <img 
                        src={hiveiotLogo} 
                        alt="HiveIoT Logo" 
                        className="h-15 w-auto filter brightness-0 invert" 
                    />
                </div>
            </div>
            
            {/* Navigation buttons */}
            <div className="p-3 space-y-2">
                <Button 
                    variant={active === 'dashboard' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${active === 'dashboard' ? '' : 'text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10'}`}
                    onClick={() => setActive('dashboard')}
                >
                    <FaChartPie className="mr-2" size={16} />
                    Dashboard
                </Button>
                
                <Button 
                    variant={active === 'addNew' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${active === 'addNew' ? '' : 'text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10'}`}
                    onClick={() => setActive('addNew')}
                >
                    <FaPlus className="mr-2" size={16} />
                    Add new
                </Button>
            </div>
            
            {/* Simulators section */}
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between p-4 text-primary-foreground">
                    <div className="flex items-center">
                        <FaServer className="mr-2" size={14} />
                        <span className="font-medium">Simulators</span>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/10"
                        onClick={() => setShowSimulators(!showSimulators)}
                    >
                        {showSimulators ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                    </Button>
                </div>
                
                {showSimulators && (
                    <ScrollArea className="h-[calc(100vh-16rem)]">
                        <div className="px-3 py-2">
                            {simulators.length === 0 ? (
                                <div className="text-sm text-primary-foreground/70 text-center py-4">
                                    No simulators found
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {simulators.map(simulator => (
                                        <SimulatorItem key={simulator.id} simulator={simulator} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </div>
            
            <Separator className="bg-primary/20" />
            
            {/* Footer buttons */}
            <div className="p-3 space-y-2">
                <Button 
                    variant="ghost" 
                    className="w-full justify-start text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
                >
                    <FaCog className="mr-2" size={16} />
                    Settings
                </Button>
                
                <Button 
                    variant="ghost" 
                    className="w-full justify-start text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={handleLogout}
                >
                    <FaSignOutAlt className="mr-2" size={16} />
                    Logout
                </Button>
            </div>
        </div>
    )
}

// Simulator item component
const SimulatorItem = ({ simulator }) => {
    const isOnline = simulator.status === 'online'
    
    return (
        <div className="group p-2 rounded-md hover:bg-primary-foreground/10 cursor-pointer">
            <div className="flex items-center justify-between">
                <div className="truncate">
                    <div className="text-sm font-medium text-primary-foreground">{simulator.title}</div>
                    <div className="text-xs w-30 text-primary-foreground/70 truncate ">{simulator.id}</div>
                </div>
                <Badge variant={isOnline ? "success" : "danger"} className="ml-2 px-1.5 py-0">
                    {isOnline ? "Online" : "Offline"}
                </Badge>
            </div>
            
            {simulator.devices && simulator.devices.length > 0 && (
                <div className="mt-1">
                    <div className="text-xs text-primary-foreground/70">
                        {simulator.devices.length} {simulator.devices.length === 1 ? 'device' : 'devices'}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Sidebar