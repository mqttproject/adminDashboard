import { useState, useRef, useEffect } from 'react'
import { Draggable } from 'react-beautiful-dnd'
import { FaServer } from '@react-icons/all-files/fa/FaServer'
import { FaDatabase } from '@react-icons/all-files/fa/FaDatabase'
import { FaEllipsisV } from '@react-icons/all-files/fa/FaEllipsisV'
import { FaGripVertical } from '@react-icons/all-files/fa/FaGripVertical'
import DeviceList from './DeviceList'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'

const SimulatorCard = ({
    simulator,
    index,
    onEditTitle,
    onRemoveFromRoom,
    rooms,
    onAddToRoom,
    inRoom
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const [title, setTitle] = useState(simulator.title)
    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef(null)
    const inputRef = useRef(null)

    // Ensure we have a stable draggableId
    const draggableId = simulator.id.toString();

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
                                    <Card className="absolute right-0 mt-2 w-48 z-10">
                                        <div className="py-1">
                                            {inRoom && (
                                                <Button
                                                    variant="ghost"
                                                    className="w-full text-left justify-start px-4 py-2 text-sm"
                                                    onClick={() => {
                                                        onRemoveFromRoom(simulator.id)
                                                        setShowMenu(false)
                                                    }}
                                                >
                                                    Remove from room
                                                </Button>
                                            )}
                                            <div className="border-t my-1"></div>
                                            {rooms.map(room => (
                                                <Button
                                                    key={room.id}
                                                    variant="ghost"
                                                    className="w-full text-left justify-start px-4 py-2 text-sm"
                                                    onClick={() => {
                                                        onAddToRoom(room.id)
                                                        setShowMenu(false)
                                                    }}
                                                >
                                                    Add to {room.title}
                                                </Button>
                                            ))}
                                        </div>
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
                            <p className="text-sm text-muted-foreground">Simulator</p>
                        </div>

                        <DeviceList devices={simulator.devices} />
                    </div>
                </Card>
            )}
        </Draggable>
    )
}

export default SimulatorCard