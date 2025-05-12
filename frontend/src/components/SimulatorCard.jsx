import { useState, useRef, useEffect, useMemo } from 'react'
import { Draggable } from 'react-beautiful-dnd'
import { FaServer } from '@react-icons/all-files/fa/FaServer'
import { FaDatabase } from '@react-icons/all-files/fa/FaDatabase'
import { FaEllipsisV } from '@react-icons/all-files/fa/FaEllipsisV'
import { FaGripVertical } from '@react-icons/all-files/fa/FaGripVertical'
import { FaChevronLeft } from '@react-icons/all-files/fa/FaChevronLeft'
import { FaChevronRight } from '@react-icons/all-files/fa/FaChevronRight'
import { FaTrash } from '@react-icons/all-files/fa/FaTrash'
import DeviceList from './DeviceList'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Switch } from './ui/switch'
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
import { Toaster } from './ui/sonner'
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
    const menuRef = useRef(null)
    const inputRef = useRef(null)

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

    // Handle device toggle (on/off)
    const handleDeviceToggle = async (device) => {
        if (!refreshData) {
            console.error("refreshData function is not provided to SimulatorCard");
            Toaster({ 
                variant: "destructive", 
                title: "Error", 
                description: "Cannot refresh data after action." 
            });
            return;
        }
        
        setIsDeviceActionLoading(device.id);
        try {
            if (device.on) {
                await apiService.turnDeviceOff(device.id);
                Toaster({ 
                    title: "Device Turned Off", 
                    description: `Device ${device.id} is now off.` 
                });
            } else {
                await apiService.turnDeviceOn(device.id);
                Toaster({ 
                    title: "Device Turned On", 
                    description: `Device ${device.id} is now on.` 
                });
            }
            await refreshData(); // Refresh data to update UI with new device state
        } catch (error) {
            console.error('Error toggling device:', error);
            Toaster({ 
                variant: "destructive", 
                title: "Error", 
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
            Toaster({ 
                title: "Device Deleted", 
                description: `Device ${deviceToDelete.id} has been removed.` 
            });
            setDeviceToDelete(null); // Close dialog
            await refreshData(); // Refresh data after deletion
        } catch (error) {
            console.error('Error deleting device:', error);
            Toaster({ 
                variant: "destructive", 
                title: "Error", 
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
    ], [isDeviceActionLoading]);

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
                                <p className="text-sm text-muted-foreground">Simulator</p>
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
                        <h3 className="font-medium mb-3">Devices</h3>
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