import { useState } from 'react'
import StrictModeDroppable from './StrictModeDroppable'
import InstanceCard from './InstanceCard'
import { FaCog } from '@react-icons/all-files/fa/FaCog'

const RoomGroup = ({
    room,
    instances,
    onAddToRoom,
    onRemoveFromRoom,
    onEditInstanceTitle,
    allRooms,
    droppableId,
    isStandalone = false
}) => {
    const [isExpanded, setIsExpanded] = useState(true)

    return (
        <div className="bg-white rounded-lg shadow">
            {!isStandalone && (
                <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center">
                        <h2 className="text-xl font-semibold">{room?.title || 'Room'}</h2>
                        <button
                            className="ml-2 text-gray-500 hover:text-primary"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? '▼' : '►'}
                        </button>
                    </div>
                    <button className="p-2 text-gray-500 hover:text-primary rounded-full">
                        <FaCog />
                    </button>
                </div>
            )}

            <StrictModeDroppable
                droppableId={droppableId}
                type="INSTANCE"
                direction="horizontal"
                isDropDisabled={!isExpanded && !isStandalone}
            >
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`transition-all duration-300 ${(!isExpanded && !isStandalone) ? 'h-0 overflow-hidden p-0' : 'p-4'
                            } ${snapshot.isDraggingOver ? 'bg-blue-100 rounded-lg' : ''
                            }`}
                    >
                        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${instances.length === 0 ? 'min-h-[100px]' : ''}`}>
                            {instances.map((instance, index) => (
                                <InstanceCard
                                    key={instance.id}
                                    instance={instance}
                                    index={index}
                                    onEditTitle={onEditInstanceTitle}
                                    onRemoveFromRoom={(instanceId) => onRemoveFromRoom(instanceId, room?.id)}
                                    rooms={isStandalone ? allRooms : allRooms?.filter(r => r.id !== room.id)}
                                    onAddToRoom={(roomId) => onAddToRoom(instance.id, roomId)}
                                    inRoom={!isStandalone}
                                />
                            ))}

                            {/* Empty state */}
                            {instances.length === 0 && (
                                <div className="h-24 col-span-3 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                                    Drop instances here
                                </div>
                            )}

                            {/* This must be AFTER all draggable items for react-beautiful-dnd to work */}
                            {provided.placeholder}
                        </div>
                    </div>
                )}
            </StrictModeDroppable>
        </div>
    )
}

export default RoomGroup