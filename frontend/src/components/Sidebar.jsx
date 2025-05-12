import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaChartPie } from '@react-icons/all-files/fa/FaChartPie'
import { FaPlus } from '@react-icons/all-files/fa/FaPlus'
import { FaCog } from '@react-icons/all-files/fa/FaCog'
import { FaSignOutAlt } from '@react-icons/all-files/fa/FaSignOutAlt'
import { FaServer } from '@react-icons/all-files/fa/FaServer'
import { FaChevronDown } from '@react-icons/all-files/fa/FaChevronDown'
import { FaChevronUp } from '@react-icons/all-files/fa/FaChevronUp'
import { FaClock } from '@react-icons/all-files/fa/FaClock'
import { FaCopy } from '@react-icons/all-files/fa/FaCopy'
import { useAuth } from '../context/AuthContext'
import { ScrollArea } from './ui/scroll-area'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Alert, AlertDescription } from './ui/alert'
import { apiService } from '../services/api'
import hiveiotLogo from '../visual/hiveiot.svg'

const Sidebar = ({ simulators = [], awaitingSimulators = [] }) => {
    const [active, setActive] = useState('dashboard');
    const [showSimulators, setShowSimulators] = useState(true);
    const [showAwaitingSimulators, setShowAwaitingSimulators] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [simulatorTitle, setSimulatorTitle] = useState('');
    const [timeToLive, setTimeToLive] = useState('30d');
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showToken, setShowToken] = useState(false);

    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    }

    const handleAddNew = () => {
        setActive('addNew');
        setShowAddModal(true);
        setSimulatorTitle('');
        setTimeToLive('30d');
        setToken('');
        setError('');
        setShowToken(false);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await apiService.addSimulator({
                title: simulatorTitle,
                timeToLive: timeToLive
            });

            setToken(response.data.token);
            setIsLoading(false);
            setShowToken(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create simulator');
            setIsLoading(false);
        }
    }

    const copyTokenToClipboard = () => {
        navigator.clipboard.writeText(token)
            .then(() => {
                console.log('Token copied to clipboard');
            })
            .catch(err => {
                console.error('Failed to copy token: ', err);
            });
    }

    const closeModal = () => {
        setShowAddModal(false);
        if (!token) {
            setActive('dashboard');
        }
    }

    return (
        <div className="h-screen w-64 bg-primary flex flex-col border-r border-primary/20">
            {/* Fixed Header */}
            <div className="flex-none flex items-center justify-center p-10 h-16 border-b border-primary/20">
                <div className="flex flex-col items-center">
                    <img
                        src={hiveiotLogo}
                        alt="HiveIoT Logo"
                        className="h-15 w-auto filter brightness-0 invert"
                    />
                </div>
            </div>

            {/* Fixed Navigation */}
            <div className="flex-none p-3 space-y-2">
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
                    onClick={handleAddNew}
                >
                    <FaPlus className="mr-2" size={16} />
                    Add new
                </Button>
            </div>

            {/* Add New Simulator Modal */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <FaServer className="text-primary" />
                            Add New Simulator
                        </DialogTitle>
                    </DialogHeader>

                    {error && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {!showToken ? (
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-sm font-medium">
                                    Simulator Title
                                </Label>
                                <Input
                                    id="title"
                                    value={simulatorTitle}
                                    onChange={(e) => setSimulatorTitle(e.target.value)}
                                    placeholder="Enter simulator name"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="timeToLive" className="text-sm font-medium flex justify-between">
                                    <span>Token Time to Live</span>
                                    <span className="text-muted-foreground">(Optional)</span>
                                </Label>
                                <Input
                                    id="timeToLive"
                                    value={timeToLive}
                                    onChange={(e) => setTimeToLive(e.target.value)}
                                    placeholder="30d"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Examples: 30d (30 days), 12h (12 hours), 60m (60 minutes)
                                </p>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button variant="outline" type="button" onClick={closeModal}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Creating...' : 'Create Simulator'}
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="token" className="text-sm font-medium">
                                    Simulator Token
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="token"
                                        type="password"
                                        value={token}
                                        readOnly
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full"
                                        onClick={copyTokenToClipboard}
                                        title="Copy token to clipboard"
                                    >
                                        <FaCopy className="h-4 w-4" />
                                        <span className="sr-only">Copy token</span>
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    This token will be required to connect your simulator. Copy it now - you won't be able to see it again.
                                </p>
                            </div>

                            <DialogFooter>
                                <Button variant="secondary" onClick={closeModal}>
                                    Done
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Main Content Area */}
            <div className="flex flex-col flex-auto overflow-hidden">
                {/* Online Simulators Section */}
                <div className="flex-none">
                    <div className="flex items-center justify-between p-4 text-primary-foreground">
                        <div className="flex items-center">
                            <FaServer className="mr-2" size={14} />
                            <span className="font-medium">Online Simulators</span>
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
                </div>

                {showSimulators && (
                    <div className="flex-grow">
                        <ScrollArea className="h-[calc(100vh-350px)]">
                            <div className="px-3 py-2">
                                {simulators.length === 0 ? (
                                    <div className="text-sm text-primary-foreground/70 text-center py-4">
                                        No online simulators found
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
                    </div>
                )}

                {/* Awaiting Simulators Section */}
                <div className="flex-none mt-2">
                    <div className="flex items-center justify-between p-4 text-primary-foreground">
                        <div className="flex items-center">
                            <FaClock className="mr-2" size={14} />
                            <span className="font-medium">Pending Simulators</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/10"
                            onClick={() => setShowAwaitingSimulators(!showAwaitingSimulators)}
                        >
                            {showAwaitingSimulators ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                        </Button>
                    </div>
                </div>

                {showAwaitingSimulators && (
                    <div className="flex-none">
                        <ScrollArea className="h-32">
                            <div className="px-3 py-2">
                                {awaitingSimulators.length === 0 ? (
                                    <div className="text-sm text-primary-foreground/70 text-center py-2">
                                        No pending simulators
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {awaitingSimulators.map(simulator => (
                                            <AwaitingSimulatorItem key={simulator._id || simulator.expectedToken} simulator={simulator} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>

            {/* Fixed Footer */}
            <div className="flex-none mt-auto">
                <Separator className="bg-primary/20" />
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
        </div>
    )
}

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
                    { isOnline ? "Online" : "Offline"}
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

const AwaitingSimulatorItem = ({ simulator }) => {
    return (
        <div className="group p-2 rounded-md hover:bg-primary-foreground/10">
            <div className="flex items-center justify-between">
                <div className="truncate">
                    <div className="text-sm font-medium text-primary-foreground">{simulator.title}</div>
                    <div className="text-xs text-primary-foreground/70">Awaiting connection</div>
                </div>
                <Badge variant="warning" className="ml-2 px-1.5 py-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                    Pending
                </Badge>
            </div>
        </div>
    )
}

export default Sidebar