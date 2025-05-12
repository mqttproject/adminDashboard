import { useState, useRef, useEffect, useMemo } from 'react'
import { Draggable } from 'react-beautiful-dnd'
import { FaServer } from '@react-icons/all-files/fa/FaServer'
import { FaDatabase } from '@react-icons/all-files/fa/FaDatabase'
import { FaEllipsisV } from '@react-icons/all-files/fa/FaEllipsisV'
import { FaGripVertical } from '@react-icons/all-files/fa/FaGripVertical'
import { FaChevronLeft } from '@react-icons/all-files/fa/FaChevronLeft'
import { FaChevronRight } from '@react-icons/all-files/fa/FaChevronRight'
import { FaTrash } from '@react-icons/all-files/fa/FaTrash'
import { FaPlus } from '@react-icons/all-files/fa/FaPlus'
import { v4 as uuidv4 } from 'uuid' // Import UUID v4 generator
import DeviceList from './DeviceList'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Switch } from './ui/switch'
import { Textarea } from './ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from './ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select"
import { Badge } from './ui/badge'
import { toast } from 'sonner'
import { apiService } from '../services/api'

// Import TanStack Table components
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table"

const SimulatorCard = ({
    simulator,
    index,
    onEditTitle,
    onRemoveFromRoom,
    rooms,
    onAddToRoom,
    inRoom,
    refreshData
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const [title, setTitle] = useState(simulator.title)
    const [showMenu, setShowMenu] = useState(false)
    const [showDetailsDialog, setShowDetailsDialog] = useState(false)
    const [showAddDeviceDialog, setShowAddDeviceDialog] = useState(false)
    const menuRef = useRef(null)
    const inputRef = useRef(null)

    // Device form states
    const [deviceTitle, setDeviceTitle] = useState('') // Changed from deviceId to deviceTitle
    const [deviceAction, setDeviceAction] = useState('defaultAction')
    const [deviceBroker, setDeviceBroker] = useState('tcp://localhost:1883')
    const [bulkDevicesJson, setBulkDevicesJson] = useState('')
    const [isAddingDevice, setIsAddingDevice] = useState(false)
    const [addDeviceError, setAddDeviceError] = useState('')
    
    // Bulk device generation states
    const [devicePrefix, setDevicePrefix] = useState('device')
    const [deviceCount, setDeviceCount] = useState(3)
    const [generateBulkView, setGenerateBulkView] = useState(false)

    // Table pagination state
    const [pageIndex, setPageIndex] = useState(0)
    const [pageSize, setPageSize] = useState(10)
    
    // Device action states
    const [deviceToDelete, setDeviceToDelete] = useState(null)
    const [isDeviceActionLoading, setIsDeviceActionLoading] = useState(null)
    
    const tableState = useRef({
        pagination: {
            pageIndex: 0,
            pageSize: 10,
        }
    });
    
    const dialogStateRef = useRef({ wasOpen: false, simulatorId: null });
    const draggableId = simulator.id.toString();

    // Helper function to generate a unique ID from a title
    const generateUniqueId = (title) => {
        // Clean the title (remove special chars, spaces, etc.)
        const cleanTitle = title.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
        // Generate UUID and append to title
        return `${cleanTitle}-${uuidv4()}`;
    };

    // Open Add Device Dialog
    const handleAddDevice = () => {
        setShowAddDeviceDialog(true)
        // Reset form states
        setDeviceTitle('') // Reset title instead of id
        setDeviceAction('defaultAction')
        setDeviceBroker('tcp://localhost:1883')
        setBulkDevicesJson('')
        setAddDeviceError('')
        setDevicePrefix('device')
        setDeviceCount(3)
        setGenerateBulkView(false)
    }

    // Generate bulk devices JSON
    const generateBulkDevices = () => {
        try {
            const count = parseInt(deviceCount)
            if (isNaN(count) || count <= 0 || count > 100) {
                setAddDeviceError('Count must be between 1 and 100')
                return
            }

            const devices = {}
            for (let i = 1; i <= count; i++) {
                // Generate a unique ID for each device
                const deviceTitle = `${devicePrefix}${i}`
                const uniqueId = generateUniqueId(deviceTitle)
                
                devices[uniqueId] = {
                    id: uniqueId,
                    action: deviceAction,
                    broker: deviceBroker
                }
            }

            setBulkDevicesJson(JSON.stringify({ devices }, null, 2))
            setAddDeviceError('')
        } catch (error) {
            setAddDeviceError('Error generating devices: ' + error.message)
        }
    }

    // Add a single device
    const handleAddSingleDevice = async () => {
        if (!simulator.url) {
            setAddDeviceError('Simulator URL is required')
            return
        }

        if (!deviceTitle || !deviceAction || !deviceBroker) {
            setAddDeviceError('All fields are required')
            return
        }

        setIsAddingDevice(true)
        setAddDeviceError('')

        try {
            // Generate a unique ID based on the title
            const uniqueId = generateUniqueId(deviceTitle)
            
            await apiService.addDevice(uniqueId, {
                action: deviceAction,
                broker: deviceBroker,
                simulatorUrl: simulator.url,
                simulatorId: simulator.id
            })

            toast.success('Device Added', {
                description: `Device "${deviceTitle}" has been added successfully.`
            })
            
            setShowAddDeviceDialog(false)
            await refreshData() // Refresh data to show new device
        } catch (error) {
            console.error('Error adding device:', error)
            setAddDeviceError(error.response?.data?.error || 'Failed to add device')
            toast.error('Error Adding Device', {
                description: error.response?.data?.error || 'Failed to add device'
            })
        } finally {
            setIsAddingDevice(false)
        }
    }

    // Add bulk devices
    const handleAddBulkDevices = async () => {
        if (!simulator.url) {
            setAddDeviceError('Simulator URL is required')
            return
        }

        let devicesObj
        try {
            // If the JSON doesn't parse, this will throw an error
            const parsed = JSON.parse(bulkDevicesJson)
            if (!parsed.devices || typeof parsed.devices !== 'object') {
                setAddDeviceError('JSON must contain a "devices" object')
                return
            }
            
            // Validate device structure
            for (const [key, device] of Object.entries(parsed.devices)) {
                if (!device.id || !device.action || !device.broker) {
                    setAddDeviceError(`Device ${key} is missing required fields (id, action, broker)`)
                    return
                }
            }
            
            devicesObj = parsed.devices
        } catch (error) {
            setAddDeviceError('Invalid JSON: ' + error.message)
            return
        }

        setIsAddingDevice(true)
        setAddDeviceError('')

        try {
            await apiService.addBulkDevices({
                simulatorUrl: simulator.url,
                devices: devicesObj,
                simulatorId: simulator.id
            })

            toast.success('Devices Added', {
                description: `${Object.keys(devicesObj).length} devices have been added successfully.`
            })
            
            setShowAddDeviceDialog(false)
            await refreshData() // Refresh data to show new devices
        } catch (error) {
            console.error('Error adding devices:', error)
            setAddDeviceError(error.response?.data?.error || 'Failed to add devices')
            toast.error('Error Adding Devices', {
                description: error.response?.data?.error || 'Failed to add devices'
            })
        } finally {
            setIsAddingDevice(false)
        }
    }

    // Handle device toggle (on/off)
    const handleDeviceToggle = async (device) => {
        if (!refreshData) {
            console.error("refreshData function is not provided to SimulatorCard");
            toast.error("Error", {
                description: "Cannot refresh data after action."
            });
            return;
        }
        
        setIsDeviceActionLoading(device.id);
        try {
            if (device.on) {
                await apiService.turnDeviceOff(device.id);
                toast.success("Device Turned Off", {
                    description: `Device ${device.id} is now off.`
                });
            } else {
                await apiService.turnDeviceOn(device.id);
                toast.success("Device Turned On", {
                    description: `Device ${device.id} is now on.`
                });
            }
            await refreshData(); // Refresh data to update UI with new device state
        } catch (error) {
            console.error('Error toggling device:', error);
            toast.error("Error", {
                description: error.response?.data?.error || "Could not toggle device state."
            });
        } finally {
            setIsDeviceActionLoading(null);
        }
    };

    // Confirm device deletion (shows alert dialog)
    const confirmDeleteDevice = (device) => {
        setDeviceToDelete(device);
    };

    // Execute device deletion after confirmation
    const executeDeleteDevice = async () => {
        if (!deviceToDelete || !refreshData) {
            if (!refreshData) console.error("refreshData function is not provided to SimulatorCard");
            return;
        }
        
        setIsDeviceActionLoading(deviceToDelete.id);
        try {
            await apiService.deleteDevice(deviceToDelete.id);
            toast.success("Device Deleted", {
                description: `Device ${deviceToDelete.id} has been removed.`
            });
            setDeviceToDelete(null); // Close dialog
            await refreshData(); // Refresh data after deletion
        } catch (error) {
            console.error('Error deleting device:', error);
            toast.error("Error", {
                description: error.response?.data?.error || "Could not delete device."
            });
        } finally {
            setIsDeviceActionLoading(null);
        }
    };

    // Define table columns with added functionality
    const columns = useMemo(() => [
        {
            id: "statusIndicator", 
            header: "Status",
            cell: ({ row }) => {
                const device = row.original;
                return (
                    <div className="flex items-center justify-center">
                        <div 
                            className={`w-3 h-3 rounded-full ${device.on ? 'bg-green-500' : 'bg-red-500'}`}
                            title={device.on ? 'Online' : 'Offline'}
                        ></div>
                        {device.rebooting && (
                            <Badge variant="outline" className="ml-2 text-xs">
                                Rebooting
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "id",
            header: "ID",
            cell: ({ row }) => <div className="font-medium">{row.getValue("id")}</div>,
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => row.original.type || "Generic",
        },
        {
            accessorKey: "action",
            header: "Last Action",
            cell: ({ row }) => row.getValue("action") || "N/A",
        },
        {
            accessorKey: "lastUpdated",
            header: "Last Updated",
            cell: ({ row }) => {
                const value = row.getValue("lastUpdated");
                return value ? new Date(value).toLocaleString() : "N/A";
            },
        },
        {
            id: "toggle",
            header: () => <div className="text-center">On/Off</div>,
            cell: ({ row }) => {
                const device = row.original;
                return (
                    <div className="flex justify-center">
                        <Switch
                            checked={device.on}
                            onCheckedChange={() => handleDeviceToggle(device)}
                            disabled={isDeviceActionLoading === device.id || device.rebooting}
                            aria-label={`Toggle device ${device.on ? 'off' : 'on'}`}
                        />
                    </div>
                );
            },
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const device = row.original;
                return (
                    <div className="text-right">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => confirmDeleteDevice(device)}
                            disabled={isDeviceActionLoading === device.id || device.rebooting}
                            title="Delete device"
                        >
                            <FaTrash className="h-4 w-4" />
                            <span className="sr-only">Delete device</span>
                        </Button>
                    </div>
                );
            },
        },
    ], [isDeviceActionLoading, handleDeviceToggle]);

    const tableKey = useMemo(() => `simulator-table-${simulator.id}`, [simulator.id]);
    const data = useMemo(() => simulator.devices || [], [simulator.devices]);

    const tableInstanceRef = useRef(null);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            pagination: {
                pageIndex,
                pageSize,
            },
        },
        onPaginationChange: (updater) => {
            if (typeof updater === 'function') {
                const newPagination = updater({
                    pageIndex,
                    pageSize,
                });
                setPageIndex(newPagination.pageIndex);
                setPageSize(newPagination.pageSize);
                tableState.current.pagination = newPagination;
            } else {
                setPageIndex(updater.pageIndex);
                setPageSize(updater.pageSize);
                tableState.current.pagination = updater;
            }
        },
        manualPagination: false,
        pageCount: Math.ceil((data?.length || 0) / pageSize) || 1,
        autoResetPageIndex: false,
    });

    useEffect(() => {
        tableInstanceRef.current = table;
    }, [table]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isEditing])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        if (showDetailsDialog) {
            if (!dialogStateRef.current.wasOpen) {
                if (dialogStateRef.current.simulatorId === simulator.id && 
                    tableState.current.pagination) {
                    setPageIndex(tableState.current.pagination.pageIndex);
                    setPageSize(tableState.current.pagination.pageSize);
                } else {
                    setPageIndex(0);
                }
                dialogStateRef.current.simulatorId = simulator.id;
            }
        }
        
        dialogStateRef.current.wasOpen = showDetailsDialog;
        
        if (!showDetailsDialog) {
            tableState.current.pagination = {
                pageIndex,
                pageSize
            };
        }
    }, [showDetailsDialog, simulator.id, pageIndex, pageSize]);

    useEffect(() => {
        if (dialogStateRef.current.wasOpen) {
            setPageIndex(0);
            tableState.current.pagination.pageIndex = 0;
            tableState.current.pagination.pageSize = pageSize;
        }
    }, [pageSize]);

    useEffect(() => {
        const maxPage = Math.max(0, Math.ceil((simulator.devices?.length || 0) / pageSize) - 1);
        if (pageIndex > maxPage && maxPage >= 0) {
            setPageIndex(maxPage);
            tableState.current.pagination.pageIndex = maxPage;
        }
    }, [simulator.devices, pageSize, pageIndex]);

    const handleTitleSubmit = () => {
        onEditTitle(simulator.id, title)
        setIsEditing(false)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleTitleSubmit()
        } else if (e.key === 'Escape') {
            setTitle(simulator.title)
            setIsEditing(false)
        }
    }

    return (
        <>
            <Draggable draggableId={draggableId} index={index} type="SIMULATOR">
                {(provided, snapshot) => (
                    <Card
                        className={`overflow-hidden ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        data-rbd-draggable-id={draggableId}
                    >
                        <div className="p-4 border-b flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${simulator.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="font-medium">{simulator.status === 'online' ? 'Online' : 'Offline'}</span>
                            </div>
                            <div className="flex items-center">
                                <div className="relative" ref={menuRef}>
                                    <button
                                        className="p-1 text-muted-foreground hover:text-primary rounded"
                                        onClick={() => setShowMenu(!showMenu)}
                                    >
                                        <FaEllipsisV />
                                    </button>
                                    {showMenu && (
                                        <Card className="absolute right-0 mt-2 w-48 z-50">
                                            <div>
                                                {inRoom && (
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full text-left justify-start px-4 py-2 text-sm hover:bg-accent"
                                                        onClick={() => {
                                                            onRemoveFromRoom(simulator.id)
                                                            setShowMenu(false)
                                                        }}
                                                    >
                                                        Remove from room
                                                    </Button>
                                                )}
                                                {rooms.map(room => (
                                                    <Button
                                                        key={room.id}
                                                        variant="ghost"
                                                        className="w-full text-left justify-start px-4 py-2 text-sm hover:bg-accent"
                                                        onClick={() => {
                                                            onAddToRoom(room.id)
                                                            setShowMenu(false)
                                                        }}
                                                    >
                                                        Add to {room.title}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                className="w-full text-left justify-start px-4 py-2 text-sm hover:bg-accent"
                                                onClick={() => {
                                                    setShowDetailsDialog(true)
                                                    setShowMenu(false)
                                                }}
                                            >
                                                Configure
                                            </Button>
                                        </Card>
                                    )}
                                </div>
                                <div
                                    {...provided.dragHandleProps}
                                    className="p-1 ml-1 text-muted-foreground hover:text-foreground cursor-grab"
                                    title="Drag to move"
                                >
                                    <FaGripVertical />
                                </div>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="mb-4">
                                <p className="text-sm text-muted-foreground">{simulator.url}</p>
                                <div className="flex items-center justify-between">
                                    {isEditing ? (
                                        <Input
                                            ref={inputRef}
                                            type="text"
                                            className="border rounded px-2 py-1 w-full"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            onBlur={handleTitleSubmit}
                                            onKeyDown={handleKeyDown}
                                        />
                                    ) : (
                                        <h3
                                            className="font-semibold text-lg truncate hover:underline cursor-pointer"
                                            onClick={() => setIsEditing(true)}
                                            title="Click to edit"
                                        >
                                            {simulator.title}
                                        </h3>
                                    )}
                                    <div className="flex items-center space-x-2">
                                        <FaServer className="text-muted-foreground" />
                                        <FaDatabase className="text-muted-foreground" />
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">{simulator.id}</p>
                            </div>

                            <DeviceList devices={simulator.devices} />
                        </div>
                    </Card>
                )}
            </Draggable>

            {/* Simulator Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="sm:max-w-[900px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <FaServer className="text-primary" /> 
                            {simulator.title}
                            <Badge className="ml-2" variant={simulator.status === 'online' ? "success" : "destructive"}>
                                {simulator.status === 'online' ? 'Online' : 'Offline'}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription>
                            Simulator ID: <span className="font-mono">{simulator.id}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div>
                            <h3 className="font-medium mb-2">Details</h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 text-sm">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span className="col-span-2 font-medium">{simulator.status}</span>
                                </div>
                                <div className="grid grid-cols-3 text-sm">
                                    <span className="text-muted-foreground">URL:</span>
                                    <span className="col-span-2 font-mono text-xs break-all">{simulator.url || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-3 text-sm">
                                    <span className="text-muted-foreground">Devices:</span>
                                    <span className="col-span-2 font-medium">{simulator.devices?.length || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-medium mb-2">Configuration</h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 text-sm">
                                    <span className="text-muted-foreground">Type:</span>
                                    <span className="col-span-2">Standard Simulator</span>
                                </div>
                                <div className="grid grid-cols-3 text-sm">
                                    <span className="text-muted-foreground">Version:</span>
                                    <span className="col-span-2">1.0</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="py-2">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-medium">Devices</h3>
                            <Button 
                                size="sm" 
                                className="h-8" 
                                onClick={handleAddDevice}
                                disabled={simulator.status !== 'online'}
                            >
                                <FaPlus className="mr-2 h-4 w-4" />
                                Add Device
                            </Button>
                        </div>
                        
                        {data && data.length > 0 ? (
                            <>
                                <div className="border rounded-md">
                                    <div className="max-h-[400px] overflow-auto">
                                        <Table key={tableKey}>
                                            <TableHeader>
                                                {table.getHeaderGroups().map((headerGroup) => (
                                                    <TableRow key={headerGroup.id}>
                                                        {headerGroup.headers.map((header) => (
                                                            <TableHead key={header.id}>
                                                                {header.isPlaceholder
                                                                    ? null
                                                                    : flexRender(
                                                                        header.column.columnDef.header,
                                                                        header.getContext()
                                                                    )}
                                                            </TableHead>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableHeader>
                                            <TableBody>
                                                {table.getRowModel().rows?.length ? (
                                                    table.getRowModel().rows.map((row) => (
                                                        <TableRow
                                                            key={row.id}
                                                            data-state={row.getIsSelected() && "selected"}
                                                        >
                                                            {row.getVisibleCells().map((cell) => (
                                                                <TableCell key={cell.id}>
                                                                    {flexRender(
                                                                        cell.column.columnDef.cell,
                                                                        cell.getContext()
                                                                    )}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={columns.length}
                                                            className="h-24 text-center"
                                                        >
                                                            No devices found.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                                
                                {/* Pagination Controls */}
                                <div className="flex items-center justify-between space-x-2 py-4">
                                    <div className="flex-1 text-sm text-muted-foreground">
                                        Showing {table.getRowModel().rows.length === 0 
                                            ? 0 
                                            : table.getState().pagination.pageIndex * pageSize + 1
                                        } to {Math.min(
                                            (table.getState().pagination.pageIndex + 1) * pageSize, 
                                            table.getRowModel().rows.length
                                        )} of {table.getRowModel().rows.length} devices
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <p className="text-sm font-medium">Rows per page</p>
                                        <Select
                                            value={`${pageSize}`}
                                            onValueChange={(value) => {
                                                setPageSize(Number(value))
                                            }}
                                        >
                                            <SelectTrigger className="h-8 w-[70px]">
                                                <SelectValue placeholder={`${pageSize}`} />
                                            </SelectTrigger>
                                            <SelectContent side="top">
                                                {[5, 10, 20, 30, 40, 50].map((size) => (
                                                    <SelectItem key={size} value={`${size}`}>
                                                        {size}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            className="h-8 w-8 p-0"
                                            onClick={() => table.previousPage()}
                                            disabled={!table.getCanPreviousPage()}
                                        >
                                            <span className="sr-only">Go to previous page</span>
                                            <FaChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                                            Page {table.getState().pagination.pageIndex + 1} of{" "}
                                            {table.getPageCount()}
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="h-8 w-8 p-0"
                                            onClick={() => table.nextPage()}
                                            disabled={!table.getCanNextPage()}
                                        >
                                            <span className="sr-only">Go to next page</span>
                                            <FaChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No devices connected to this simulator
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Device Dialog */}
            <Dialog open={showAddDeviceDialog} onOpenChange={setShowAddDeviceDialog}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <FaPlus className="text-primary" /> 
                            Add Devices to {simulator.title}
                        </DialogTitle>
                        <DialogDescription>
                            Add one or multiple devices to this simulator.
                        </DialogDescription>
                    </DialogHeader>

                    {addDeviceError && (
                        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
                            {addDeviceError}
                        </div>
                    )}

                    <Tabs defaultValue="single">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="single">Single Device</TabsTrigger>
                            <TabsTrigger value="bulk">Bulk Addition</TabsTrigger>
                        </TabsList>

                        <TabsContent value="single" className="space-y-4 py-4">
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="deviceTitle" className="text-sm font-medium block mb-1">
                                        Device Name
                                    </label>
                                    <Input
                                        id="deviceTitle"
                                        value={deviceTitle}
                                        onChange={(e) => setDeviceTitle(e.target.value)}
                                        placeholder="Enter device name (e.g. Coffee Machine)"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        A unique ID will be generated automatically.
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="deviceAction" className="text-sm font-medium block mb-1">
                                        Action
                                    </label>
                                    <Input
                                        id="deviceAction"
                                        value={deviceAction}
                                        onChange={(e) => setDeviceAction(e.target.value)}
                                        placeholder="Device action"
                                    />
                                </div>
                                
                                <div>
                                    <label htmlFor="deviceBroker" className="text-sm font-medium block mb-1">
                                        MQTT Broker URL
                                    </label>
                                    <Input
                                        id="deviceBroker"
                                        value={deviceBroker}
                                        onChange={(e) => setDeviceBroker(e.target.value)}
                                        placeholder="tcp://localhost:1883"
                                    />
                                </div>
                            </div>
                            
                            <DialogFooter className="pt-4">
                                <Button variant="outline" onClick={() => setShowAddDeviceDialog(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleAddSingleDevice} 
                                    disabled={isAddingDevice}
                                >
                                    {isAddingDevice ? 'Adding...' : 'Add Device'}
                                </Button>
                            </DialogFooter>
                        </TabsContent>

                        <TabsContent value="bulk" className="py-4 space-y-4">
                            <div className="flex flex-col space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setGenerateBulkView(!generateBulkView)}
                                    >
                                        {generateBulkView ? 'Edit JSON Directly' : 'Generate Devices'}
                                    </Button>
                                </div>

                                {generateBulkView ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="devicePrefix" className="text-sm font-medium block mb-1">
                                                    Device Name Prefix
                                                </label>
                                                <Input
                                                    id="devicePrefix"
                                                    value={devicePrefix}
                                                    onChange={(e) => setDevicePrefix(e.target.value)}
                                                    placeholder="device"
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    A number will be added to this prefix
                                                </p>
                                            </div>
                                            
                                            <div>
                                                <label htmlFor="deviceCount" className="text-sm font-medium block mb-1">
                                                    Count (max 100)
                                                </label>
                                                <Input
                                                    id="deviceCount"
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    value={deviceCount}
                                                    onChange={(e) => setDeviceCount(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label htmlFor="bulkAction" className="text-sm font-medium block mb-1">
                                                Action
                                            </label>
                                            <Input
                                                id="bulkAction"
                                                value={deviceAction}
                                                onChange={(e) => setDeviceAction(e.target.value)}
                                                placeholder="Device action"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label htmlFor="bulkBroker" className="text-sm font-medium block mb-1">
                                                MQTT Broker URL
                                            </label>
                                            <Input
                                                id="bulkBroker"
                                                value={deviceBroker}
                                                onChange={(e) => setDeviceBroker(e.target.value)}
                                                placeholder="tcp://localhost:1883"
                                            />
                                        </div>
                                        
                                        <Button 
                                            variant="secondary" 
                                            className="w-full" 
                                            onClick={generateBulkDevices}
                                        >
                                            Generate JSON
                                        </Button>
                                    </div>
                                ) : (
                                    <div>
                                        <label htmlFor="bulkDevicesJson" className="text-sm font-medium block mb-1">
                                            Devices JSON
                                        </label>
                                        <Textarea
                                            id="bulkDevicesJson"
                                            value={bulkDevicesJson}
                                            onChange={(e) => setBulkDevicesJson(e.target.value)}
                                            placeholder={`{
  "devices": {
    "coffee-machine-1234abcd": {
      "id": "coffee-machine-1234abcd",
      "action": "coffeeAction",
      "broker": "tcp://localhost:1883"
    },
    "thermostat-5678efgh": {
      "id": "thermostat-5678efgh",
      "action": "thermostatAction",
      "broker": "tcp://localhost:1883"
    }
  }
}`}
                                            className="font-mono h-[200px]"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            JSON must include a "devices" object with device IDs as keys. 
                                            Each device ID should be unique.
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <DialogFooter className="pt-4">
                                <Button variant="outline" onClick={() => setShowAddDeviceDialog(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleAddBulkDevices}
                                    disabled={isAddingDevice}
                                >
                                    {isAddingDevice ? 'Adding...' : 'Add Devices'}
                                </Button>
                            </DialogFooter>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Delete Device Confirmation Dialog */}
            {deviceToDelete && (
                <AlertDialog open={!!deviceToDelete} onOpenChange={() => setDeviceToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the device
                                <span className="font-semibold"> {deviceToDelete.id}</span>.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel 
                                onClick={() => setDeviceToDelete(null)} 
                                disabled={isDeviceActionLoading}
                            >
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={executeDeleteDevice}
                                disabled={isDeviceActionLoading}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                                {isDeviceActionLoading ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    )
}

export default SimulatorCard